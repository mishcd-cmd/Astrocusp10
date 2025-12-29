'use client';

import { supabase } from '@/utils/supabase';

/* =========================================================
   TYPES
========================================================= */
export type HemiShort = 'NH' | 'SH';
export type HemiAny = HemiShort | 'Northern' | 'Southern';

export type DailyRow = {
  sign: string;
  hemisphere: any;
  date: string;
  daily_horoscope?: string;
  affirmation?: string;
  deeper_insight?: string;
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
  // normalise various dash chars and underscores to a plain hyphen
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
  if (parts.length === 2) return `${toTitleCaseWord(parts[0])}-${toTitleCaseWord(parts[1])} Cusp`;
  if (parts.length === 1) return toTitleCaseWord(parts[0]);
  return slug;
}

/* =========================================================
   CUSP NAME MAP (marketing names -> DB slug)
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
function hemiToBothDbForms(hemi?: HemiAny): { long: 'Northern' | 'Southern'; short: HemiShort } {
  const v = (hemi || 'Southern').toString().toLowerCase();
  const long: 'Northern' | 'Southern' = v === 'northern' || v === 'nh' ? 'Northern' : 'Southern';
  const short: HemiShort = long === 'Northern' ? 'NH' : 'SH';
  return { long, short };
}

/* =========================================================
   DATE HELPERS
========================================================= */
function pad2(n: number) {
  return `${n}`.padStart(2, '0');
}

function anchorUTC(d = new Date()) {
  return `${d.getUTCFullYear()}-${pad2(d.getUTCMonth() + 1)}-${pad2(d.getUTCDate())}`;
}

function buildDailyAnchors(d = new Date()) {
  const today = anchorUTC(d);
  const yesterday = anchorUTC(new Date(d.getTime() - 86400000));
  const tomorrow = anchorUTC(new Date(d.getTime() + 86400000));
  return [today, yesterday, tomorrow];
}

/* =========================================================
   SIGN RESOLUTION (force cusp for DB)
========================================================= */
function resolveDbSignFromUser(user: any): { dbSign: string; display: string; attempts: string[] } {
  const primary = toDbSlug(user?.cuspResult?.primarySign || '');
  const secondary = toDbSlug(user?.cuspResult?.secondarySign || (user as any)?.cuspResult?.secondarySign || '');

  // 1) Force cusp from primary + secondary when available
  if (primary && secondary && primary !== secondary) {
    const cusp = `${primary}-${secondary}`;
    return {
      dbSign: cusp,
      display: slugToDisplay(cusp),
      attempts: [cusp, primary, secondary].filter(Boolean),
    };
  }

  // 2) Marketing cusp name mapping
  const cuspNameKey = squashSpaces(user?.cuspResult?.cuspName || '').toLowerCase();
  if (cuspNameKey && CUSP_NAME_TO_DB_SLUG[cuspNameKey]) {
    const cusp = CUSP_NAME_TO_DB_SLUG[cuspNameKey];
    return {
      dbSign: cusp,
      display: slugToDisplay(cusp),
      attempts: [cusp],
    };
  }

  // 3) Fall back to preferred_sign / primary sign
  const preferred = toDbSlug(user?.preferred_sign || '');
  const single = primary || preferred || secondary || '';
  return {
    dbSign: single,
    display: slugToDisplay(single),
    attempts: single ? [single] : [],
  };
}

/* =========================================================
   DB ROW NORMALISATION (THIS IS THE IMPORTANT FIX)
   Your table has sign columns and content columns split:
   - sign might be empty while segment has the real sign
   - daily_horoscope might be empty while daily has the content
========================================================= */
function normaliseDailyRow(r: any): DailyRow {
  // Some rows use sign, some use segment (your screenshot showed both)
  const resolvedSign =
    r?.segment ??
    r?.sign ??
    r?.sign_name ??
    r?.slug ??
    '';

  // Content fields can be in multiple columns depending on ingestion
  const resolvedDaily =
    r?.daily_horoscope ??
    r?.daily ??
    r?.horoscope ??
    r?.segment_daily ??
    r?.segment_horoscope ??
    '';

  const resolvedAffirmation =
    r?.affirmation ??
    r?.daily_affirmation ??
    r?.segment_affirmation ??
    '';

  const resolvedDeeper =
    r?.deeper_insight ??
    r?.deeper ??
    r?.segment_deeper ??
    r?.insight ??
    '';

  return {
    // IMPORTANT: use resolvedSign so matching works even if r.sign is blank
    sign: resolvedSign,
    hemisphere: r?.hemisphere,
    date: r?.date,

    daily_horoscope: resolvedDaily || '',
    affirmation: resolvedAffirmation || '',
    deeper_insight: resolvedDeeper || '',

    __source_table__: 'horoscope_cache',
    ...r,
  };
}

/* =========================================================
   DB FETCH
========================================================= */
async function fetchRowsForDate(
  date: string,
  hemisphereLong: 'Northern' | 'Southern',
  hemisphereShort: HemiShort,
  debug?: boolean
): Promise<DailyRow[]> {
  // Try both hemisphere formats, because your DB might be either
  const queries: Array<{ hemi: string }> = [{ hemi: hemisphereLong }, { hemi: hemisphereShort }];

  for (const q of queries) {
    const { data, error } = await supabase
      .from('horoscope_cache')
      .select('*')
      .eq('hemisphere', q.hemi)
      .eq('date', date);

    if (debug) {
      console.log('[daily] DB rows', {
        date,
        hemi: q.hemi,
        count: data?.length ?? 0,
        sample_sign: data?.slice(0, 8)?.map(r => r.sign),
        sample_segment: data?.slice(0, 8)?.map(r => (r as any).segment),
      });
    }

    if (!error && data && data.length) {
      return data.map(normaliseDailyRow);
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
    useCache?: boolean;
    debug?: boolean;
  }
): Promise<DailyRow | null> {
  const debug = !!opts?.debug;

  const { long: hemiLong, short: hemiShort } = hemiToBothDbForms(hemisphereIn);

  // Build attempts from the input sign (string-only callers)
  const inputSlug = toDbSlug(signIn);
  const inputAttempts = inputSlug ? [inputSlug] : [];

  const anchors = opts?.forceDate ? [opts.forceDate] : buildDailyAnchors();

  if (debug) {
    console.log('[daily] resolve', {
      input: signIn,
      inputSlug,
      attempts: inputAttempts,
      hemiLong,
      hemiShort,
      anchors,
    });
  }

  for (const date of anchors) {
    const rows = await fetchRowsForDate(date, hemiLong, hemiShort, debug);
    if (!rows.length) continue;

    // 1) Exact match first (prevents Taurus stealing Aries-Taurus)
    for (const attempt of inputAttempts) {
      const matchExact = rows.find(r => toDbSlug(r.sign) === attempt);
      if (matchExact) return matchExact;
    }

    // 2) Loose match as last resort only
    for (const attempt of inputAttempts) {
      const matchLoose = rows.find(r => toDbSlug(r.sign).includes(attempt));
      if (matchLoose) return matchLoose;
    }
  }

  if (debug) console.warn('[daily] not found', { signIn, hemiLong, hemiShort });
  return null;
}

/* =========================================================
   SCREEN WRAPPER (force cusp from user profile)
========================================================= */
export async function getAccessibleHoroscope(
  user: any,
  opts?: {
    forceDate?: string;
    useCache?: boolean;
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

  // Keep the DB row content, but force the sign label to the resolved display
  return {
    date: row.date,
    sign: resolved.display,
    hemisphere: row.hemisphere,
    daily: row.daily_horoscope || '',
    affirmation: row.affirmation || '',
    deeper: row.deeper_insight || '',
    raw: row,
  };
}
