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
  hemisphere: any; // DB can be 'Southern'/'Northern' OR 'SH'/'NH'
  date: string;

  // Possible column names in DB (you said you have both sets)
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

/** Convert any label into a DB-safe slug.
    "Aries–Taurus Cusp" -> "aries-taurus"
    "Aries-Taurus" -> "aries-taurus"
    "cusp of power" -> "cusp-of-power" (we will NOT use this for DB unless mapped)
*/
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
   MARKETING CUSP NAME MAP (ONLY if your profile uses these)
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
   HEMISPHERE
========================================================= */
function hemiToBothDbForms(hemi?: HemiAny): { long: HemiLong; short: HemiShort } {
  const v = (hemi || 'Southern').toString().toLowerCase();
  const long: HemiLong = v === 'northern' || v === 'nh' ? 'Northern' : 'Southern';
  const short: HemiShort = long === 'Northern' ? 'NH' : 'SH';
  return { long, short };
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

function ymdLocal(d = new Date()) {
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
}

// Use Sydney time on web to match how you are publishing content.
// On native, local time is already the user's calendar day.
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
  return ymdLocal(d);
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
   SIGN RESOLUTION (FORCE CUSP DB SLUG)
   DB rows use:
     sign = "aries-taurus"  (for cusp)
     sign = "taurus"        (for normal sign)
========================================================= */
function resolveDbSignFromUser(user: any): { dbSign: string; display: string; attempts: string[] } {
  const primary = toDbSlug(user?.cuspResult?.primarySign || '');
  const secondary = toDbSlug(
    user?.cuspResult?.secondarySign ||
    (user as any)?.cuspResult?.secondarySign ||
    ''
  );

  // 1) Force cusp from primary + secondary whenever possible
  if (primary && secondary && primary !== secondary) {
    const cusp = `${primary}-${secondary}`;
    return {
      dbSign: cusp,
      display: slugToDisplay(cusp),
      attempts: [cusp], // IMPORTANT: do not fall back to single signs first
    };
  }

  // 2) Marketing name mapping (only if needed)
  const cuspNameKey = squashSpaces(user?.cuspResult?.cuspName || '').toLowerCase();
  if (cuspNameKey && CUSP_NAME_TO_DB_SLUG[cuspNameKey]) {
    const cusp = CUSP_NAME_TO_DB_SLUG[cuspNameKey];
    return { dbSign: cusp, display: slugToDisplay(cusp), attempts: [cusp] };
  }

  // 3) Last resort: if cuspName itself is a usable zodiac slug
  const cuspSlug = toDbSlug(user?.cuspResult?.cuspName || '');
  if (cuspSlug.includes('-')) {
    const parts = cuspSlug.split('-').filter(Boolean);
    if (parts.length === 2 && isSingleZodiacSignSlug(parts[0]) && isSingleZodiacSignSlug(parts[1])) {
      return { dbSign: cuspSlug, display: slugToDisplay(cuspSlug), attempts: [cuspSlug] };
    }
  }

  // 4) Fall back to preferred or primary single sign
  const preferred = toDbSlug(user?.preferred_sign || '');
  const single = primary || preferred || secondary || '';
  return {
    dbSign: single,
    display: slugToDisplay(single),
    attempts: single ? [single] : [],
  };
}

/* =========================================================
   DB FETCH
========================================================= */
function extractDailyFields(r: any) {
  // You said your table has both:
  // daily_horoscope / affirmation / deeper_insight
  // and also segment / daily / deeper
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

async function fetchRowsForDate(
  date: string,
  hemisphereLong: HemiLong,
  hemisphereShort: HemiShort,
  debug?: boolean
): Promise<DailyRow[]> {
  const hemiAttempts = [hemisphereLong, hemisphereShort];

  for (const hemi of hemiAttempts) {
    const { data, error } = await supabase
      .from('horoscope_cache')
      .select('*')
      .eq('hemisphere', hemi)
      .eq('date', date);

    if (debug) {
      console.log('[daily] DB rows', {
        date,
        hemi,
        count: data?.length ?? 0,
        sample: data?.slice(0, 10)?.map((x: any) => x.sign),
      });
    }

    if (!error && data && data.length) {
      return data.map((r: any) => {
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
  }

  return [];
}

/* =========================================================
   PUBLIC API
========================================================= */
export async function getDailyForecast(
  signIn: string,
  hemisphereIn: HemiAny,
  opts?: {
    userId?: string;
    forceDate?: string;
    debug?: boolean;
  }
): Promise<DailyRow | null> {
  const debug = !!opts?.debug;
  const { long: hemiLong, short: hemiShort } = hemiToBothDbForms(hemisphereIn);

  const inputSlug = toDbSlug(signIn);
  const anchors = opts?.forceDate ? [opts.forceDate] : buildDailyAnchors();

  if (debug) {
    console.log('[daily] resolve', {
      input: signIn,
      inputSlug,
      hemiLong,
      hemiShort,
      anchors,
    });
  }

  if (!inputSlug) return null;

  for (const date of anchors) {
    const rows = await fetchRowsForDate(date, hemiLong, hemiShort, debug);
    if (!rows.length) continue;

    // 1) Exact match on slug, using BOTH r.sign and r.segment
    const exact = rows.find(r => {
      const rowKey = toDbSlug(r.sign || '');
      const segKey = toDbSlug((r as any).segment || '');
      return rowKey === inputSlug || segKey === inputSlug;
    });
    if (exact) return exact;

    // 2) As an absolute last resort, allow "includes" but only if it cannot cause Taurus stealing Aries-Taurus
    // (we only allow includes when the input is a single sign)
    if (isSingleZodiacSignSlug(inputSlug)) {
      const loose = rows.find(r => {
        const rowKey = toDbSlug(r.sign || '');
        const segKey = toDbSlug((r as any).segment || '');
        return rowKey.includes(inputSlug) || segKey.includes(inputSlug);
      });
      if (loose) return loose;
    }
  }

  if (debug) console.warn('[daily] not found', { signIn, inputSlug, hemiLong, hemiShort });
  return null;
}

/* =========================================================
   SCREEN WRAPPER (FORCE CUSP FROM PROFILE)
========================================================= */
export async function getAccessibleHoroscope(
  user: any,
  opts?: {
    forceDate?: string;
    debug?: boolean;
  }
) {
  const hemisphere: HemiAny = user?.hemisphere || 'Southern';
  const debug = !!opts?.debug;

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
    userId: user?.id || user?.email,
    forceDate: opts?.forceDate,
    debug,
  });

  if (!row) return null;

  // Ensure we return content from whichever column set is populated
  const { daily, affirmation, deeper } = extractDailyFields(row);

  return {
    date: row.date,
    sign: resolved.display, // nice display label
    hemisphere: row.hemisphere,
    daily: daily || '',
    affirmation: affirmation || '',
    deeper: deeper || '',
    raw: row,
  };
}
