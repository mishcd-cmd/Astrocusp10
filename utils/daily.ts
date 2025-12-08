// utils/daily.ts 
'use client';

import { supabase } from '@/utils/supabase';

// ----- Types -----
export type HemiShort = 'NH' | 'SH';
export type HemiAny = HemiShort | 'Northern' | 'Southern';

export type DailyRow = {
  sign: string;
  hemisphere: 'Northern' | 'Southern';
  date: string;               // "YYYY-MM-DD"
  daily_horoscope?: string;
  affirmation?: string;
  deeper_insight?: string;
  __source_table__?: 'horoscope_cache';
  [key: string]: any;
};

// -------------------------------------------------------
// Cusp name → canonical sign label mapping
// -------------------------------------------------------
const CUSP_NAME_TO_SIGN: Record<string, string> = {
  // All keys are lowercase, squashed spacing
  'cusp of power': 'Aries-Taurus Cusp',
  'cusp of energy': 'Taurus-Gemini Cusp',
  'cusp of magic': 'Gemini-Cancer Cusp',
  'cusp of oscillation': 'Cancer-Leo Cusp',
  'cusp of exposure': 'Leo-Virgo Cusp',
  'cusp of beauty': 'Virgo-Libra Cusp',
  'cusp of drama': 'Libra-Scorpio Cusp',
  'cusp of revolution': 'Scorpio-Sagittarius Cusp',
  'cusp of prophecy': 'Sagittarius-Capricorn Cusp',
  'cusp of mystery': 'Capricorn-Aquarius Cusp',
  'cusp of sensitivity': 'Aquarius-Pisces Cusp',
};

function resolveSignLabelForDaily(input: string): {
  lookupLabel: string;
  originalLabel: string;
  fromCuspMap: boolean;
} {
  const originalLabel = squashSpaces(input || '');
  const key = originalLabel.toLowerCase();
  const mapped = CUSP_NAME_TO_SIGN[key];

  if (mapped) {
    return {
      lookupLabel: mapped,
      originalLabel,
      fromCuspMap: true,
    };
  }

  return {
    lookupLabel: originalLabel,
    originalLabel,
    fromCuspMap: false,
  };
}

// ----- String helpers -----
function toTitleCaseWord(w: string) {
  return w ? w[0].toUpperCase() + w.slice(1).toLowerCase() : '';
}

function normalizeDashesToHyphen(s: string) {
  return (s || '').replace(/[\u2012\u2013\u2014\u2015]/g, '-'); // figure/en/em dashes -> hyphen
}

function squashSpaces(s: string) {
  return (s || '').replace(/\s+/g, ' ').trim();
}

function stripTrailingCusp(s: string) {
  return s.replace(/\s*cusp\s*$/i, '').trim();
}

/** A strict, display-friendly normalization (keeps title case and en dash) */
function normalizeSignForDaily(input: string): {
  primaryWithCusp?: string;   // "Aries–Taurus Cusp"
  primaryNoCusp: string;      // "Aries–Taurus" or "Aries"
  parts: string[];
  isCusp: boolean;
} {
  if (!input) return { primaryNoCusp: '', parts: [], isCusp: false };

  let s = squashSpaces(input);
  const isCusp = /\bcusp\b/i.test(s);
  const hyphenBase = normalizeDashesToHyphen(s);
  const noCusp = stripTrailingCusp(hyphenBase);

  const parts = noCusp
    .split('-')
    .map(part =>
      part
        .trim()
        .split(' ')
        .map(toTitleCaseWord)
        .join(' ')
    )
    .filter(Boolean);

  const baseEnDash = parts.join('–'); // for display
  const primaryNoCusp = baseEnDash;
  const primaryWithCusp = isCusp ? `${baseEnDash} Cusp` : undefined;

  return { primaryWithCusp, primaryNoCusp, parts, isCusp };
}

// ----- A lenient, comparison-focused normalizer (lowercase, hyphen, no extra spaces) -----
function canonSignForCompare(s: string) {
  const hyph = normalizeDashesToHyphen(s);
  return squashSpaces(hyph).toLowerCase();
}
function canonSignNoCusp(s: string) {
  return canonSignForCompare(stripTrailingCusp(s));
}

/** Build sign attempts in strict cusp-first order (no true-sign fallback for cusp unless enabled). */
function buildSignAttemptsForDaily(
  inputLabel: string,
  opts?: { allowTrueSignFallback?: boolean }
): string[] {
  const { primaryWithCusp, primaryNoCusp, parts, isCusp } = normalizeSignForDaily(inputLabel);
  const allowFallback = !!opts?.allowTrueSignFallback;

  const list: string[] = [];
  if (primaryWithCusp) list.push(primaryWithCusp);                    // en dash + "Cusp"
  if (primaryWithCusp) list.push(primaryWithCusp.replace(/–/g, '-')); // hyphen + "Cusp"
  if (primaryNoCusp) list.push(primaryNoCusp);                        // en dash no cusp
  if (primaryNoCusp) list.push(primaryNoCusp.replace(/–/g, '-'));     // hyphen no cusp

  if (!isCusp || allowFallback) {
    for (const p of parts) if (p) list.push(p);                       // fallback to each sign if allowed
  }
  return [...new Set(list)].filter(Boolean);
}

// Hemisphere normalisation to match DB ("Northern"/"Southern")
function hemiToDB(hemi?: HemiAny): 'Northern' | 'Southern' {
  const v = (hemi || 'Southern').toString().toLowerCase();
  if (v === 'northern' || v === 'nh') return 'Northern';
  return 'Southern';
}

// ----- Date helpers (timezone-safe, no string parsing) -----
function pad2(n: number) {
  return `${n}`.padStart(2, '0');
}

/**
 * Return YYYY-MM-DD for a given Date in the given IANA time zone.
 * We do not parse locale strings (which causes MM/DD vs DD/MM confusion).
 */
function ymdInTZ(d: Date, timeZone: string): string {
  const y = new Intl.DateTimeFormat('en-US', { timeZone, year: 'numeric' }).format(d);
  const m = new Intl.DateTimeFormat('en-US', { timeZone, month: '2-digit' }).format(d);
  const day = new Intl.DateTimeFormat('en-US', { timeZone, day: '2-digit' }).format(d);
  return `${y}-${m}-${day}`;
}

/** User time zone (falls back to UTC if unknown) */
function getUserTimeZone(): string {
  try {
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
    return tz || 'UTC';
  } catch {
    return 'UTC';
  }
}

// Legacy helpers (still used in logs/fallbacks)
function anchorLocal(d = new Date()) {
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
}
function anchorUTC(d = new Date()) {
  return `${d.getUTCFullYear()}-${pad2(d.getUTCMonth() + 1)}-${pad2(d.getUTCDate())}`;
}

/**
 * Build date anchors prioritizing the user's local day in their time zone,
 * then UTC, plus ±1-day in the user TZ to cover midnight edges.
 */
function buildDailyAnchors(d = new Date()): string[] {
  const userTZ = getUserTimeZone();

  const todayUser = ymdInTZ(d, userTZ);
  const yesterdayUser = ymdInTZ(new Date(d.getTime() - 24 * 60 * 60 * 1000), userTZ);
  const tomorrowUser = ymdInTZ(new Date(d.getTime() + 24 * 60 * 60 * 1000), userTZ);

  const todayUTC = anchorUTC(d);
  const todayLocal = anchorLocal(d); // device clock

  const anchors = [
    todayUser,
    todayUTC,
    todayLocal,
    yesterdayUser,
    tomorrowUser,
  ];

  return [...new Set(anchors)].filter(Boolean);
}

// ----- Cache helpers -----
const CACHE_VERSION = 'v2';

function cacheKeyDaily(
  userId: string | undefined,
  sign: string,
  hemi: 'Northern' | 'Southern',
  ymd: string
) {
  return `${CACHE_VERSION}:daily:${userId ?? 'anon'}:${sign}:${hemi}:${ymd}`;
}
function getFromCache<T = unknown>(key: string): T | null {
  try {
    if (typeof window === 'undefined') return null;
    const raw = window.localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : null;
  } catch {
    return null;
  }
}
function setInCache(key: string, value: unknown) {
  try {
    if (typeof window === 'undefined') return;
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* ignore */
  }
}

/** Does a DB row's sign match a candidate, once both are normalized? */
function rowMatchesSign(rowSign: string, candidate: string) {
  if (!rowSign || !candidate) return false;

  const canRow = canonSignForCompare(rowSign);
  const canRowNoCusp = canonSignNoCusp(rowSign);

  const canCand = canonSignForCompare(candidate);
  const canCandNoCusp = canonSignNoCusp(candidate);

  return (
    canRow === canCand ||
    canRow === canCandNoCusp ||
    canRowNoCusp === canCand ||
    canRowNoCusp === canCandNoCusp
  );
}

// ----- Extra lenient normaliser and row picker for odd DB sign strings -----

function normalizeLooseSign(raw: string | null | undefined): string {
  let s = (raw ?? '').toLowerCase();

  // Drop anything in parentheses for safety
  s = s.replace(/\(.*?\)/g, '');

  // Remove common hemisphere words
  s = s
    .replace(/\bnorthern hemisphere\b/g, '')
    .replace(/\bsouthern hemisphere\b/g, '')
    .replace(/\bnorthern\b/g, '')
    .replace(/\bsouthern\b/g, '');

  // Normalise dashes, then remove all non-letters
  s = normalizeDashesToHyphen(s);
  s = s.replace(/[^a-z]/g, '');

  return s.trim();
}

function pickBestDailyRow(
  rows: DailyRow[],
  signAttempts: string[]
): DailyRow | null {
  if (!rows || rows.length === 0) return null;

  const attemptsLoose = signAttempts
    .map(a => normalizeLooseSign(a))
    .filter(Boolean);

  if (!attemptsLoose.length) {
    return rows[0] ?? null;
  }

  for (const row of rows) {
    const rowLoose = normalizeLooseSign(row.sign);
    if (!rowLoose) continue;

    const ok = attemptsLoose.some(a => {
      if (!a) return false;
      return (
        rowLoose === a ||
        rowLoose.includes(a) ||
        a.includes(rowLoose)
      );
    });

    if (ok) return row;
  }

  return rows[0] ?? null;
}

// ------------------------
// DB fetchers
// ------------------------

/** Fetch all rows for a given date+hemi; we will match the sign client-side. */
async function fetchRowsForDate(
  date: string,
  hemi: 'Northern' | 'Southern',
  debug?: boolean
): Promise<{ rows: DailyRow[]; error: any }> {
  const { data, error } = await supabase
    .from('horoscope_cache')
    .select('sign, hemisphere, date, daily_horoscope, affirmation, deeper_insight')
    .eq('hemisphere', hemi)
    .eq('date', date);

  if (debug) {
    console.log('[daily] (horoscope_cache:list)', {
      date,
      hemisphere: hemi,
      error: error?.message || null,
      count: Array.isArray(data) ? data.length : 0,
      sampleSigns: Array.isArray(data)
        ? data.slice(0, 5).map(r => r.sign)
        : [],
    });
  }

  if (error) return { rows: [], error };

  const rows: DailyRow[] = (data || []).map(r => ({
    sign: r.sign,
    hemisphere: r.hemisphere,
    date: r.date,
    daily_horoscope: r.daily_horoscope || '',
    affirmation: r.affirmation || '',
    deeper_insight: r.deeper_insight || '',
    __source_table__: 'horoscope_cache',
  }));

  return { rows, error: null };
}

// ============================================================================
// PUBLIC API
// ============================================================================

export async function getDailyForecast(
  signIn: string,
  hemisphereIn: HemiAny,
  opts?: {
    userId?: string;
    forceDate?: string;        // if provided, overrides anchors entirely
    useCache?: boolean;
    debug?: boolean;
    allowTrueSignFallback?: boolean;
  }
): Promise<DailyRow | null> {
  const debug = !!opts?.debug;
  const userId = opts?.userId;
  const hemi = hemiToDB(hemisphereIn);

  const today = new Date();
  const anchors = opts?.forceDate ? [opts.forceDate] : buildDailyAnchors(today);

  // Resolve cusp names to sign pairs first
  const { lookupLabel, originalLabel, fromCuspMap } = resolveSignLabelForDaily(signIn);

  let signAttempts = buildSignAttemptsForDaily(lookupLabel, {
    allowTrueSignFallback: !!opts?.allowTrueSignFallback,
  });

  // Always include the original label at the end as a fallback attempt
  if (originalLabel && !signAttempts.includes(originalLabel)) {
    signAttempts = [...signAttempts, originalLabel];
  }

  if (debug) {
    console.log('[daily] attempts', {
      originalSign: signIn,
      lookupLabel,
      fromCuspMap,
      signAttempts,
      anchors,
      hemisphere: hemi,
      todayUserTZ: getUserTimeZone(),
      todayUTC: anchorUTC(today),
      todayLocal: anchorLocal(today),
    });
  }

  // Cache first (unless disabled)
  if (opts?.useCache !== false) {
    for (const dateStr of anchors) {
      for (const s of signAttempts) {
        const key = cacheKeyDaily(userId, s, hemi, dateStr);
        const cached = getFromCache<DailyRow>(key);
        if (
          cached &&
          cached.date === dateStr &&
          cached.hemisphere === hemi &&
          cached.sign === s
        ) {
          if (debug) {
            console.log('💾 [daily] cache hit', {
              key,
              sign: s,
              hemi,
              date: dateStr,
              source: cached.__source_table__,
            });
          }
          return cached;
        }
      }
    }
  }

  // DB tries: pull all rows for date+hemi, then match sign locally.
  for (const dateStr of anchors) {
    if (debug) {
      console.log(
        `[daily] Fetching list for date="${dateStr}", hemisphere="${hemi}"`
      );
    }
    const { rows, error } = await fetchRowsForDate(dateStr, hemi, debug);
    if (error) continue;
    if (!rows.length) {
      if (debug) {
        console.log(
          '[daily] no rows for that date+hemi, trying next anchor'
        );
      }
      continue;
    }

    // Try strict matcher first
    for (const cand of signAttempts) {
      const matchStrict = rows.find(r => rowMatchesSign(r.sign, cand));
      if (matchStrict) {
        const key = cacheKeyDaily(userId, matchStrict.sign, hemi, dateStr);
        setInCache(key, matchStrict);
        if (debug) {
          console.log('[daily] ✅ MATCH (strict)', {
            wantedAttempts: signAttempts,
            matchedRowSign: matchStrict.sign,
            hemi,
            date: dateStr,
            hasDaily: !!matchStrict.daily_horoscope,
            hasAff: !!matchStrict.affirmation,
            hasDeep: !!matchStrict.deeper_insight,
          });
        }
        return matchStrict;
      }
    }

    // Then lenient picker as a final fallback
    const match = pickBestDailyRow(rows, signAttempts);

    if (match) {
      const key = cacheKeyDaily(userId, match.sign, hemi, dateStr);
      setInCache(key, match);
      if (debug) {
        console.log('[daily] ✅ MATCH (lenient)', {
          wantedAttempts: signAttempts,
          matchedRowSign: match.sign,
          hemi,
          date: dateStr,
          hasDaily: !!match.daily_horoscope,
          hasAff: !!match.affirmation,
          hasDeep: !!match.deeper_insight,
        });
      }
      return match;
    }

    if (debug) {
      console.log(
        '[daily] no sign match among rows for date anchor; sample signs:',
        rows.slice(0, 5).map(r => r.sign)
      );
    }
  }

  if (debug) {
    console.warn('[daily] not found for', { signAttempts, anchors, hemi });
  }
  return null;
}

/** Convenience wrapper for screens */
export async function getAccessibleHoroscope(
  user: any,
  opts?: {
    forceDate?: string;
    useCache?: boolean;
    debug?: boolean;
  }
) {
  const hemisphere: HemiAny =
    user?.hemisphere === 'NH' || user?.hemisphere === 'SH'
      ? user.hemisphere
      : (user?.hemisphere as 'Northern' | 'Southern') || 'Southern';

  const signLabel =
    user?.cuspResult?.cuspName ||
    user?.cuspResult?.primarySign ||
    user?.preferred_sign ||
    '';

  const isCuspInput = /\bcusp\b/i.test(signLabel);

  const row = await getDailyForecast(signLabel, hemisphere, {
    userId: user?.id || user?.email,
    forceDate: opts?.forceDate,
    useCache: false,     // still forcing fresh DB reads while we stabilise
    debug: true,
    allowTrueSignFallback: !isCuspInput ? true : false,
  });

  if (!row) return null;

  return {
    date: row.date,
    sign: row.sign,
    hemisphere: row.hemisphere,
    daily: row.daily_horoscope || '',
    affirmation: row.affirmation || '',
    deeper: row.deeper_insight || '',
    raw: row,
  };
}

export const DailyHelpers = {
  normalizeSignForDaily,
  hemiToDB,
  anchorLocal,
  anchorUTC,
  ymdInTZ,
  buildDailyAnchors,
  buildSignAttemptsForDaily,
  cacheKeyDaily,
};
