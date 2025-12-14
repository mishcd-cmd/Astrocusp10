'use client';

import { supabase } from '@/utils/supabase';

/* =========================================================
   TYPES
========================================================= */
export type HemiShort = 'NH' | 'SH';
export type HemiAny = HemiShort | 'Northern' | 'Southern';

export type DailyRow = {
  sign: string;
  hemisphere: 'Northern' | 'Southern';
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
  return (s || '').replace(/[_\u2012\u2013\u2014\u2015]/g, '-');
}

function stripTrailingCusp(s: string) {
  return s.replace(/\s*cusp\s*$/i, '').trim();
}

function toTitleCaseWord(w: string) {
  return w ? w[0].toUpperCase() + w.slice(1).toLowerCase() : '';
}

/* =========================================================
   CANONICAL CUSP LABEL BUILDER
========================================================= */
function canonicalCuspLabel(input: string): string {
  const clean = stripTrailingCusp(normalizeDashes(squashSpaces(input)));
  const parts = clean
    .split('-')
    .map(p =>
      p
        .trim()
        .split(' ')
        .map(toTitleCaseWord)
        .join(' ')
    )
    .filter(Boolean);

  if (parts.length >= 2) {
    return `${parts.join('–')} Cusp`;
  }

  return parts[0] ?? input;
}

/* =========================================================
   CUSP NAME MAP (marketing names → canonical)
========================================================= */
const CUSP_NAME_TO_SIGN: Record<string, string> = {
  'cusp of power': 'Aries–Taurus Cusp',
  'cusp of energy': 'Taurus–Gemini Cusp',
  'cusp of magic': 'Gemini–Cancer Cusp',
  'cusp of oscillation': 'Cancer–Leo Cusp',
  'cusp of exposure': 'Leo–Virgo Cusp',
  'cusp of beauty': 'Virgo–Libra Cusp',
  'cusp of drama': 'Libra–Scorpio Cusp',
  'cusp of revolution': 'Scorpio–Sagittarius Cusp',
  'cusp of prophecy': 'Sagittarius–Capricorn Cusp',
  'cusp of mystery': 'Capricorn–Aquarius Cusp',
  'cusp of sensitivity': 'Aquarius–Pisces Cusp',
};

function resolveCanonicalSign(input: string): {
  canonical: string;
  lookupAttempts: string[];
  isCusp: boolean;
} {
  const original = squashSpaces(input);
  const key = original.toLowerCase();

  if (CUSP_NAME_TO_SIGN[key]) {
    const canon = CUSP_NAME_TO_SIGN[key];
    return {
      canonical: canon,
      lookupAttempts: [
        canon,
        canon.replace('–', '-'),
        stripTrailingCusp(canon),
        stripTrailingCusp(canon).replace('–', '-'),
      ],
      isCusp: true,
    };
  }

  const norm = normalizeDashes(original);
  const isCusp = /\bcusp\b/i.test(norm) || norm.includes('-');

  if (isCusp) {
    const canon = canonicalCuspLabel(norm);
    return {
      canonical: canon,
      lookupAttempts: [
        canon,
        canon.replace('–', '-'),
        stripTrailingCusp(canon),
        stripTrailingCusp(canon).replace('–', '-'),
      ],
      isCusp: true,
    };
  }

  return {
    canonical: original,
    lookupAttempts: [original],
    isCusp: false,
  };
}

/* =========================================================
   HEMISPHERE
========================================================= */
function hemiToDB(hemi?: HemiAny): 'Northern' | 'Southern' {
  const v = (hemi || 'Southern').toString().toLowerCase();
  return v === 'northern' || v === 'nh' ? 'Northern' : 'Southern';
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
   DB FETCH
========================================================= */
async function fetchRowsForDate(
  date: string,
  hemi: 'Northern' | 'Southern',
  debug?: boolean
): Promise<DailyRow[]> {
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
      sample: data?.slice(0, 5)?.map(r => r.sign),
    });
  }

  if (error || !data) return [];

  return data.map((r: any) => ({
    sign: r.sign,
    hemisphere: r.hemisphere,
    date: r.date,
    daily_horoscope:
      r.daily_horoscope ?? r.daily ?? r.horoscope ?? '',
    affirmation:
      r.affirmation ?? r.daily_affirmation ?? '',
    deeper_insight:
      r.deeper_insight ?? r.deeper ?? '',
    __source_table__: 'horoscope_cache',
    ...r,
  }));
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
  const hemi = hemiToDB(hemisphereIn);

  const { canonical, lookupAttempts, isCusp } = resolveCanonicalSign(signIn);
  const anchors = opts?.forceDate ? [opts.forceDate] : buildDailyAnchors();

  if (debug) {
    console.log('[daily] resolve', {
      input: signIn,
      canonical,
      lookupAttempts,
      hemi,
      anchors,
    });
  }

  for (const date of anchors) {
    const rows = await fetchRowsForDate(date, hemi, debug);
    if (!rows.length) continue;

    for (const attempt of lookupAttempts) {
      const match = rows.find(r =>
        normalizeDashes(r.sign).toLowerCase().includes(
          normalizeDashes(attempt).toLowerCase()
        )
      );

      if (match) {
        return {
          ...match,
          sign: isCusp ? canonical : match.sign,
        };
      }
    }
  }

  if (debug) console.warn('[daily] not found', { signIn, hemi });
  return null;
}

/* =========================================================
   SCREEN WRAPPER
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

  const signLabel =
    user?.cuspResult?.cuspName ||
    user?.cuspResult?.primarySign ||
    user?.preferred_sign ||
    '';

  const row = await getDailyForecast(signLabel, hemisphere, {
    userId: user?.id || user?.email,
    forceDate: opts?.forceDate,
    debug: opts?.debug,
  });

  if (!row) return null;

  return {
    date: row.date,
    sign: row.sign,               // ✅ NOW ALWAYS CANONICAL
    hemisphere: row.hemisphere,
    daily: row.daily_horoscope || '',
    affirmation: row.affirmation || '',
    deeper: row.deeper_insight || '',
    raw: row,
  };
}
