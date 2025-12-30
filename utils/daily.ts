'use client';

import { supabase } from '@/utils/supabase';

/* =========================================================
   TYPES
========================================================= */
export type HemiShort = 'NH' | 'SH';
export type HemiLong = 'Northern' | 'Southern';
export type HemiAny = HemiShort | HemiLong;

export type DailyRow = {
  sign: string;
  hemisphere: any;
  date: string;

  daily_horoscope?: string;
  affirmation?: string;
  deeper_insight?: string;

  segment?: string;
  daily?: string;
  deeper?: string;

  __source_table__?: 'horoscope_cache';
  [key: string]: any;
};

/* =========================================================
   STRING HELPERS
========================================================= */
function squashSpaces(s: string) {
  return (s || '').replace(/\s+/g, ' ').trim();
}

function normalizeDashes(s: string) {
  return (s || '').replace(/[_\u2012\u2013\u2014\u2015]/g, '-');
}

function stripTrailingCusp(s: string) {
  return (s || '').replace(/\s*cusp\s*$/i, '').trim();
}

function toTitleCaseWord(w: string) {
  return w ? w[0].toUpperCase() + w.slice(1).toLowerCase() : '';
}

function toDbSlug(input: string): string {
  const s = stripTrailingCusp(normalizeDashes(squashSpaces(input))).toLowerCase();
  return s
    .replace(/[^a-z\s-]/g, ' ')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^\-+|\-+$/g, '');
}

function slugToDisplay(slug: string): string {
  const parts = (slug || '').split('-').filter(Boolean);
  if (parts.length === 2) return `${toTitleCaseWord(parts[0])}-${toTitleCaseWord(parts[1])}`;
  if (parts.length === 1) return toTitleCaseWord(parts[0]);
  return slug;
}

function isSingleZodiacSignSlug(slug: string): boolean {
  const s = (slug || '').toLowerCase();
  return [
    'aries','taurus','gemini','cancer','leo','virgo',
    'libra','scorpio','sagittarius','capricorn','aquarius','pisces',
  ].includes(s);
}

/* =========================================================
   MARKETING CUSP MAP (ONLY if your profile uses these)
========================================================= */
const CUSP_NAME_TO_DB_SLUG: Record<string, string> = {
  'cusp of power': 'aries-taurus',
  'cusp of energy': 'taurus-gemini',
  'cusp of magic': 'gemini-cancer',
  'cusp of oscillation': 'cancer-leo',
  'cusp of exposure': 'leo-virgo',
  'cusp of beauty': 'virgo-libra',
  'cusp of drama': 'libra-scorpio',
  'cusp of revolution': 'scorpio-sagittarius',
  'cusp of prophecy': 'sagittarius-capricorn',
  'cusp of mystery': 'capricorn-aquarius',
  'cusp of sensitivity': 'aquarius-pisces',
};

/* =========================================================
   HEMISPHERE NORMALISATION (tolerant)
========================================================= */
function hemiToCanonicalLong(hemi?: any): HemiLong {
  const v = squashSpaces(String(hemi ?? '')).toLowerCase();
  if (!v) return 'Southern';
  if (v === 'nh' || v.includes('north')) return 'Northern';
  return 'Southern';
}

function hemiToCanonicalShort(long: HemiLong): HemiShort {
  return long === 'Northern' ? 'NH' : 'SH';
}

function hemiMatchesRow(rowHemi: any, wantLong: HemiLong): boolean {
  const row = squashSpaces(String(rowHemi ?? '')).toLowerCase();
  const want = wantLong.toLowerCase();
  const wantShort = hemiToCanonicalShort(wantLong).toLowerCase();

  // Accept lots of messy variants
  if (!row) return false;
  if (row === want) return true;
  if (row === wantShort) return true;

  if (wantLong === 'Southern') {
    if (row.includes('south')) return true;
    if (row.includes('sh')) return true;
  } else {
    if (row.includes('north')) return true;
    if (row.includes('nh')) return true;
  }

  // also accept strings like "Southern Hemisphere"
  if (row.includes(want)) return true;

  return false;
}

/* =========================================================
   DATE HELPERS (Sydney + UTC)
========================================================= */
function pad2(n: number) {
  return `${n}`.padStart(2, '0');
}

function ymdUTC(d = new Date()) {
  return `${d.getUTCFullYear()}-${pad2(d.getUTCMonth() + 1)}-${pad2(d.getUTCDate())}`;
}

function ymdSydney(d = new Date()) {
  try {
    const parts = new Intl.DateTimeFormat('en-AU', {
      timeZone: 'Australia/Sydney',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).formatToParts(d);

    const get = (type: string) => parts.find(p => p.type === type)?.value || '';
    const y = get('year');
    const m = get('month');
    const day = get('day');
    if (y && m && day) return `${y}-${m}-${day}`;
  } catch {}
  // fallback to local if Intl timezone fails
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
}

function buildDailyAnchors(d = new Date()) {
  const oneDay = 86400000;

  const sydneyToday = ymdSydney(d);
  const utcToday = ymdUTC(d);

  const sydneyYesterday = ymdSydney(new Date(d.getTime() - oneDay));
  const utcYesterday = ymdUTC(new Date(d.getTime() - oneDay));

  const sydneyTomorrow = ymdSydney(new Date(d.getTime() + oneDay));
  const utcTomorrow = ymdUTC(new Date(d.getTime() + oneDay));

  return Array.from(
    new Set([sydneyToday, utcToday, sydneyYesterday, utcYesterday, sydneyTomorrow, utcTomorrow])
  );
}

/* =========================================================
   SIGN RESOLUTION (force cusp for DB)
========================================================= */
function resolveDbSignFromUser(user: any): { dbSign: string; display: string } {
  const primary = toDbSlug(user?.cuspResult?.primarySign || '');
  const secondary = toDbSlug(
    user?.cuspResult?.secondarySign ||
    (user as any)?.cuspResult?.secondarySign ||
    ''
  );

  // 1) Always prefer cusp slug if we have both
  if (primary && secondary && primary !== secondary) {
    const cusp = `${primary}-${secondary}`;
    return { dbSign: cusp, display: slugToDisplay(cusp) };
  }

  // 2) Marketing name mapping
  const cuspNameKey = squashSpaces(user?.cuspResult?.cuspName || '').toLowerCase();
  if (cuspNameKey && CUSP_NAME_TO_DB_SLUG[cuspNameKey]) {
    const cusp = CUSP_NAME_TO_DB_SLUG[cuspNameKey];
    return { dbSign: cusp, display: slugToDisplay(cusp) };
  }

  // 3) Fallback to single sign
  const preferred = toDbSlug(user?.preferred_sign || '');
  const single = primary || preferred || secondary || '';
  return { dbSign: single, display: slugToDisplay(single) };
}

/* =========================================================
   FIELD EXTRACTION (handles your "starts again with segment/daily/deeper")
========================================================= */
function extractDailyFields(r: any) {
  const daily =
    r.daily_horoscope ??
    r.daily ??
    r.horoscope ??
    '';

  const affirmation =
    r.affirmation ??
    r.daily_affirmation ??
    '';

  const deeper =
    r.deeper_insight ??
    r.deeper ??
    r.deeperInsights ??
    '';

  return { daily, affirmation, deeper };
}

/* =========================================================
   DB FETCH (date only, tolerant hemisphere in JS)
========================================================= */
async function fetchRowsForDate(
  date: string,
  wantLong: HemiLong,
  debug?: boolean
): Promise<DailyRow[]> {
  const { data, error } = await supabase
    .from('horoscope_cache')
    .select('*')
    .eq('date', date);

  const count = data?.length ?? 0;

  if (debug) {
    console.log('[daily] DB rows (date only)', {
      date,
      wantLong,
      count,
      sampleSigns: (data || []).slice(0, 12).map((x: any) => x.sign),
      sampleHemis: (data || []).slice(0, 12).map((x: any) => x.hemisphere),
    });
  }

  if (error || !data || !data.length) return [];

  // Filter hemisphere locally (tolerant)
  const filtered = data.filter((r: any) => hemiMatchesRow(r.hemisphere, wantLong));

  if (debug) {
    console.log('[daily] rows after hemi filter', {
      date,
      wantLong,
      kept: filtered.length,
      keptSample: filtered.slice(0, 12).map((x: any) => ({ sign: x.sign, hemi: x.hemisphere })),
    });
  }

  return filtered.map((r: any) => {
    const { daily, affirmation, deeper } = extractDailyFields(r);
    return {
      sign: r.sign,
      hemisphere: r.hemisphere,
      date: r.date,
      daily_horoscope: daily,
      affirmation,
      deeper_insight: deeper,
      __source_table__: 'horoscope_cache',
      ...r,
    };
  });
}

/* =========================================================
   PUBLIC API
========================================================= */
export async function getDailyForecast(
  signIn: string,
  hemisphereIn: HemiAny,
  opts?: {
    forceDate?: string;
    debug?: boolean;
  }
): Promise<DailyRow | null> {
  const debug = !!opts?.debug;

  const wantLong = hemiToCanonicalLong(hemisphereIn);
  const inputSlug = toDbSlug(signIn);

  const anchors = opts?.forceDate ? [opts.forceDate] : buildDailyAnchors();

  if (debug) {
    console.log('[daily] resolve', {
      input: signIn,
      inputSlug,
      wantLong,
      wantShort: hemiToCanonicalShort(wantLong),
      anchors,
    });
  }

  if (!inputSlug) return null;

  for (const date of anchors) {
    const rows = await fetchRowsForDate(date, wantLong, debug);
    if (!rows.length) continue;

    // 1) Exact match on slug using r.sign OR r.segment
    const exact = rows.find(r => {
      const signKey = toDbSlug(r.sign || '');
      const segKey = toDbSlug((r as any).segment || '');
      return signKey === inputSlug || segKey === inputSlug;
    });

    if (exact) return exact;

    // 2) Only allow loose match if the input is a single sign
    // This prevents Taurus stealing Aries-Taurus.
    if (isSingleZodiacSignSlug(inputSlug)) {
      const loose = rows.find(r => {
        const signKey = toDbSlug(r.sign || '');
        const segKey = toDbSlug((r as any).segment || '');
        return signKey.includes(inputSlug) || segKey.includes(inputSlug);
      });
      if (loose) return loose;
    }
  }

  if (debug) console.warn('[daily] not found', { signIn, inputSlug, wantLong });
  return null;
}

/* =========================================================
   SCREEN WRAPPER (force cusp from user profile)
========================================================= */
export async function getAccessibleHoroscope(
  user: any,
  opts?: {
    forceDate?: string;
    debug?: boolean;
  }
) {
  const debug = !!opts?.debug;

  const hemisphere: HemiAny = user?.hemisphere || 'Southern';
  const resolved = resolveDbSignFromUser(user);

  if (debug) {
    console.log('[daily] profile sign', {
      primary: user?.cuspResult?.primarySign,
      secondary: user?.cuspResult?.secondarySign,
      cuspName: user?.cuspResult?.cuspName,
      preferred_sign: user?.preferred_sign,
      resolved,
      hemisphere,
    });
  }

  if (!resolved.dbSign) return null;

  const row = await getDailyForecast(resolved.dbSign, hemisphere, {
    forceDate: opts?.forceDate,
    debug,
  });

  if (!row) return null;

  const { daily, affirmation, deeper } = extractDailyFields(row);

  return {
    date: row.date,
    sign: resolved.display,
    hemisphere: row.hemisphere,
    daily: daily || '',
    affirmation: affirmation || '',
    deeper: deeper || '',
    raw: row,
  };
}
