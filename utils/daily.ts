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

  // legacy / extra columns
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

function firstNonEmpty(...vals: any[]): string {
  for (const v of vals) {
    if (typeof v === 'string') {
      const t = v.trim();
      if (t) return t;
    } else if (v != null) {
      const t = String(v).trim();
      if (t) return t;
    }
  }
  return '';
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
   FIX: Use LOCAL calendar date, NOT UTC.
   This prevents midnight UTC from "missing" today's row in AU/NZ.
========================================================= */
function pad2(n: number) {
  return `${n}`.padStart(2, '0');
}

function anchorLocal(d = new Date()) {
  // Create a local-midnight date to avoid timezone drift
  const local = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  return `${local.getFullYear()}-${pad2(local.getMonth() + 1)}-${pad2(local.getDate())}`;
}

function buildDailyAnchors(d = new Date()) {
  // Use local calendar anchors, and keep a small fallback window
  const today = anchorLocal(d);
  const yesterday = anchorLocal(new Date(d.getTime() - 86400000));
  const tomorrow = anchorLocal(new Date(d.getTime() + 86400000));
  return [today, yesterday, tomorrow];
}

/* =========================================================
   SIGN RESOLUTION (force cusp for DB)
========================================================= */
function resolveDbSignFromUser(user: any): { dbSign: string; display: string; attempts: string[] } {
  const primary = toDbSlug(user?.cuspResult?.primarySign || '');
  const secondary = toDbSlug(
    (user as any)?.cuspResult?.secondarySign || user?.cuspResult?.secondarySign || ''
  );

  // 1) Force cusp from primary + secondary when available
  if (primary && secondary && primary !== secondary) {
    const cusp = `${primary}-${secondary}`;
    return { dbSign: cusp, display: slugToDisplay(cusp), attempts: [cusp, primary, secondary] };
  }

  // 2) Marketing cusp name mapping
  const cuspNameKey = squashSpaces(user?.cuspResult?.cuspName || '').toLowerCase();
  if (cuspNameKey && CUSP_NAME_TO_DB_SLUG[cuspNameKey]) {
    const cusp = CUSP_NAME_TO_DB_SLUG[cuspNameKey];
    return { dbSign: cusp, display: slugToDisplay(cusp), attempts: [cusp] };
  }

  // 3) Fall back to preferred_sign / primary sign
  const preferred = toDbSlug(user?.preferred_sign || '');
  const single = primary || preferred || secondary || '';
  return { dbSign: single, display: slugToDisplay(single), attempts: single ? [single] : [] };
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
  // Your DB might store hemisphere as "Southern" OR "SH"
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
        sample: data?.slice(0, 8)?.map((r: any) => ({
          sign: r.sign,
          segment: r.segment,
          hasDailyHoroscope: !!(r.daily_horoscope && String(r.daily_horoscope).trim()),
          hasDaily: !!(r.daily && String(r.daily).trim()),
          hasAffirmation: !!(r.affirmation && String(r.affirmation).trim()),
          hasDeeperInsight: !!(r.deeper_insight && String(r.deeper_insight).trim()),
          hasDeeper: !!(r.deeper && String(r.deeper).trim()),
        })),
      });
    }

    if (error || !data) continue;

    // Map BOTH schema variants into the unified fields
    return data.map((r: any) => {
      return {
        // Keep all original columns too
        ...r,

        // Identity
        sign: firstNonEmpty(r.sign, r.segment),
        segment: r.segment,
        hemisphere: r.hemisphere,
        date: r.date,

        // Content: prefer explicit columns, then legacy columns
        daily_horoscope: firstNonEmpty(r.daily_horoscope, r.daily, r.horoscope),
        affirmation: firstNonEmpty(r.affirmation, r.daily_affirmation),
        deeper_insight: firstNonEmpty(r.deeper_insight, r.deeper),

        // legacy passthrough (optional)
        daily: r.daily,
        deeper: r.deeper,

        __source_table__: 'horoscope_cache',
      } as DailyRow;
    });
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

  for (const date of anchors) {
    const rows = await fetchRowsForDate(date, hemiLong, hemiShort, debug);
    if (!rows.length) continue;

    // Build candidate slugs per row from BOTH sign and segment
    const rowKeySlug = (r: any) => toDbSlug(firstNonEmpty(r.segment, r.sign));

    // 1) Exact match first (prevents Taurus stealing Aries-Taurus)
    const exact = rows.find(r => rowKeySlug(r) === inputSlug);
    if (exact) return exact;

    // 2) If input is a cusp (contains '-'), do NOT fall back to single sign matches
    const inputIsCusp = inputSlug.includes('-');
    if (!inputIsCusp) {
      // For single sign inputs only, allow a conservative fallback
      const starts = rows.find(r => rowKeySlug(r).startsWith(inputSlug));
      if (starts) return starts;
    }
  }

  if (debug) console.warn('[daily] not found', { signIn, inputSlug, hemiLong, hemiShort });
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

  return {
    date: row.date,
    sign: resolved.display, // display label for UI
    hemisphere: row.hemisphere,

    // IMPORTANT: content pulled from merged fields
    daily: firstNonEmpty(row.daily_horoscope, row.daily),
    affirmation: firstNonEmpty(row.affirmation),
    deeper: firstNonEmpty(row.deeper_insight, row.deeper),

    raw: row,
  };
}
