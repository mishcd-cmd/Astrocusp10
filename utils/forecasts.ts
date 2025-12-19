import { supabase } from '@/utils/supabase';
import { Platform } from 'react-native';

if (typeof Platform === 'undefined') {
  (global as any).Platform = { OS: 'web' };
}

import {
  normalizeHemisphereLabel,
} from '@/utils/signs';

/* ----------------------------------------------------------------------------
 * Types
 * -------------------------------------------------------------------------- */
export interface ForecastRow {
  sign: string;
  hemisphere: string;
  date: string;
  monthly_forecast: string;
  forecast?: string;
}

export interface Forecast {
  sign: string;
  hemisphere: 'Northern' | 'Southern';
  forecast_date: string;
  forecast_month: string;
  forecast: string;
}

/* ----------------------------------------------------------------------------
 * Storage (web + native)
 * -------------------------------------------------------------------------- */
type AsyncStorageLike = {
  getItem(key: string): Promise<string | null>;
  setItem(key: string, value: string): Promise<void>;
  removeItem(key: string): Promise<void>;
  getAllKeys(): Promise<string[]>;
  multiRemove(keys: string[]): Promise<void>;
};

let RNAsyncStorage: AsyncStorageLike | null = null;
try {
  const mod = require('@react-native-async-storage/async-storage');
  RNAsyncStorage = mod?.default ?? mod;
} catch {
  RNAsyncStorage = null;
}

const storage = {
  async getItem(key: string) {
    if (Platform.OS === 'web' || !RNAsyncStorage) {
      try {
        return window?.localStorage?.getItem(key) ?? null;
      } catch {
        return null;
      }
    }
    return RNAsyncStorage.getItem(key);
  },
  async setItem(key: string, value: string) {
    if (Platform.OS === 'web' || !RNAsyncStorage) {
      try {
        window?.localStorage?.setItem(key, value);
      } catch {}
      return;
    }
    return RNAsyncStorage.setItem(key, value);
  },
  async getAllKeys() {
    if (Platform.OS === 'web' || !RNAsyncStorage) {
      try {
        return Object.keys(window?.localStorage ?? {});
      } catch {
        return [];
      }
    }
    return RNAsyncStorage.getAllKeys();
  },
  async multiRemove(keys: string[]) {
    if (Platform.OS === 'web' || !RNAsyncStorage) {
      try {
        keys.forEach(k => window?.localStorage?.removeItem(k));
      } catch {}
      return;
    }
    return RNAsyncStorage.multiRemove(keys);
  },
};

/* ----------------------------------------------------------------------------
 * Helpers
 * -------------------------------------------------------------------------- */
const ZODIAC = new Set([
  'aries','taurus','gemini','cancer','leo','virgo',
  'libra','scorpio','sagittarius','capricorn','aquarius','pisces'
]);

function asString(v: any): string {
  return typeof v === 'string' ? v : v == null ? '' : String(v);
}

function normaliseMonthlySign(raw: any): string {
  const s = asString(raw).trim();
  if (!s) return '';

  const cleaned = s
    .replace(/\s*cusp\s*$/i, '')
    .replace(/[–—−]/g, '-')
    .replace(/_/g, '-')
    .trim();

  const lower = cleaned.toLowerCase();
  const parts = lower.split('-').filter(Boolean);

  if (parts.length === 2 && ZODIAC.has(parts[0]) && ZODIAC.has(parts[1])) {
    return `${parts[0]}-${parts[1]}`;
  }

  return lower;
}

function buildMonthlySignAttempts(input: string): string[] {
  const base = normaliseMonthlySign(input);
  if (!base) return [];

  const parts = base.split('-').filter(Boolean);

  if (parts.length === 2) {
    const [a, b] = parts;
    return Array.from(new Set([
      `${a}-${b}`,
      `${a}-${b}-cusp`,
      `${a}-${b} cusp`,
      `${a}-${b}`,
      a,
      b,
    ]));
  }

  return [base];
}

function getMonthlyCacheKey(sign: string, hemisphere: string, month: string) {
  const hemi = hemisphere === 'Northern' ? 'NH' : 'SH';
  return `monthly_${sign}__${hemi}__${month}`;
}

/* ----------------------------------------------------------------------------
 * API
 * -------------------------------------------------------------------------- */
let requestId = 0;

export async function getLatestForecast(
  rawSign: any,
  rawHemisphere: any,
  targetMonth?: Date
): Promise<{ ok: true; row: ForecastRow } | { ok: false; reason: string }> {

  const myRequestId = ++requestId;

  const sign = normaliseMonthlySign(rawSign);
  if (!sign) return { ok: false, reason: 'empty_sign' };

  const hemisphere = normalizeHemisphereLabel(rawHemisphere);
  const hemiCode = hemisphere === 'Northern' ? 'NH' : 'SH';

  const now = targetMonth ?? new Date();
  const monthKey = now.toISOString().slice(0, 8) + '01';

  const cacheKey = getMonthlyCacheKey(sign, hemisphere, monthKey);

  try {
    const cached = await storage.getItem(cacheKey);
    if (cached) {
      return { ok: true, row: JSON.parse(cached) };
    }
  } catch {}

  const attempts = buildMonthlySignAttempts(sign);

  for (const attempt of attempts) {
    if (myRequestId !== requestId) {
      return { ok: false, reason: 'cancelled' };
    }

    const { data, error } = await supabase
      .from('monthly_forecasts')
      .select('sign, hemisphere, date, monthly_forecast')
      .eq('sign', attempt)
      .eq('hemisphere', hemiCode)
      .eq('date', monthKey)
      .limit(1);

    if (error || !data?.length) continue;

    const row = data[0] as ForecastRow;
    if (!row.monthly_forecast) continue;

    row.forecast = row.monthly_forecast;

    try {
      await storage.setItem(cacheKey, JSON.stringify(row));
    } catch {}

    return { ok: true, row };
  }

  return { ok: false, reason: 'not_found' };
}

/* ----------------------------------------------------------------------------
 * Legacy wrapper
 * -------------------------------------------------------------------------- */
export async function getForecast(
  signLabel: string,
  hemisphereLabel: 'Northern' | 'Southern'
): Promise<Forecast | null> {
  const res = await getLatestForecast(signLabel, hemisphereLabel);
  if (!res.ok) return null;

  return {
    sign: res.row.sign,
    hemisphere: normalizeHemisphereLabel(res.row.hemisphere),
    forecast_date: res.row.date,
    forecast_month: res.row.date,
    forecast: res.row.monthly_forecast,
  };
}
