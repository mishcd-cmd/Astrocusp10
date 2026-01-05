// utils/userData.ts
import { CuspResult } from './astrology';
import { clearLocalAuthData } from './auth';

// ✅ use the shared singletons
import { supabase } from '@/utils/supabase';

// ---------------- Types ----------------
export interface UserProfile {
  email: string;
  name: string;
  birthDate: string; // ISO string
  birthTime: string;
  birthLocation: string;
  hemisphere: 'Northern' | 'Southern';
  cuspResult: CuspResult;
  createdAt: string; // ISO string
  lastLoginAt?: string; // ISO string
  needsRecalc?: boolean; // Flag for profiles that need recalculation
}

// Session-level promise to avoid duplicate fetches
let _userDataPromise: Promise<UserProfile | null> | null = null;

// Web-compatible storage
const storage = {
  async getItem(key: string): Promise<string | null> {
    if (typeof window !== 'undefined' && window.localStorage) {
      return window.localStorage.getItem(key);
    }
    return null;
  },
  async setItem(key: string, value: string): Promise<void> {
    if (typeof window !== 'undefined' && window.localStorage) {
      window.localStorage.setItem(key, value);
    }
  },
  async removeItem(key: string): Promise<void> {
    if (typeof window !== 'undefined' && window.localStorage) {
      window.localStorage.removeItem(key);
    }
  },
  async getAllKeys(): Promise<string[]> {
    if (typeof window !== 'undefined' && window.localStorage) {
      return Object.keys(window.localStorage);
    }
    return [];
  },
  async multiRemove(keys: string[]): Promise<void> {
    if (typeof window !== 'undefined' && window.localStorage) {
      keys.forEach((key) => window.localStorage.removeItem(key));
    }
  },
};

// Export for manual cache clearing
export function clearUserDataPromise(): void {
  _userDataPromise = null;
}

// NUCLEAR: Always force refresh until Liam's issue is resolved
let _forceCacheRefresh = true;
let _cacheVersion = Date.now(); // Invalidate all existing caches

// Legacy key (do not use for per-user profile caching)
const USER_DATA_KEY = '@astro_cusp_user_data';

// New per-user cache prefix
const USER_DATA_KEY_PREFIX = '@astro_cusp_user_data:';
const LAST_AUTH_USER_ID_KEY = '@astro_cusp_last_auth_user_id';

// ---------------- Cache isolation helpers ----------------
async function purgeAllUserProfileCaches(): Promise<void> {
  try {
    const keys = await storage.getAllKeys();
    const toRemove = keys.filter((k) => k.startsWith(USER_DATA_KEY_PREFIX));
    if (toRemove.length) {
      await storage.multiRemove(toRemove);
      console.log('🧹 [userData] purgeAllUserProfileCaches removed', toRemove.length, 'keys');
    }
  } catch (e) {
    console.warn('⚠️ [userData] purgeAllUserProfileCaches error:', e);
  }
}

/**
 * If the signed-in user changes, wipe any cached profile to prevent
 * cross-account data appearing.
 */
async function enforceAuthUserCacheIsolation(currentUserId: string): Promise<void> {
  try {
    const last = await storage.getItem(LAST_AUTH_USER_ID_KEY);

    if (last && last !== currentUserId) {
      console.warn('⚠️ [userData] Auth user changed, clearing cached profiles', {
        lastUserId: last,
        currentUserId,
      });

      await purgeAllUserProfileCaches();
      await storage.removeItem(USER_DATA_KEY); // legacy
    }

    await storage.setItem(LAST_AUTH_USER_ID_KEY, currentUserId);
  } catch (e) {
    console.warn('⚠️ [userData] enforceAuthUserCacheIsolation error:', e);
  }
}

// ---------------- Helpers ----------------
function computeCuspFallback(birthDate?: string): CuspResult | null {
  if (!birthDate) return null;

  // PRODUCTION CRITICAL: Never create profiles with placeholder dates
  if (birthDate === '1900-01-01' || birthDate.startsWith('1900-01-01')) {
    console.error('❌ [computeCuspFallback] PRODUCTION: Refusing to compute for placeholder date:', birthDate);
    return null;
  }

  try {
    console.log('🔍 [computeCuspFallback] PRODUCTION: Computing fallback for birth date:', birthDate);

    // Parse YYYY-MM-DD string directly without creating Date object
    const [year, month, day] = birthDate.split('-').map(Number);

    // Validate the date is reasonable (not 1900 or future)
    if (year < 1920 || year > new Date().getFullYear()) {
      console.error('❌ [computeCuspFallback] PRODUCTION: Invalid year:', year, 'for date:', birthDate);
      return null;
    }

    // Check for Sagittarius-Capricorn cusp (Dec 18-24)
    if (month === 12 && day >= 18 && day <= 24) {
      console.log('✅ [computeCuspFallback] PRODUCTION: Detected Sagittarius-Capricorn cusp for:', birthDate);
      return {
        isOnCusp: true,
        primarySign: 'Sagittarius',
        secondarySign: 'Capricorn',
        cuspName: 'Sagittarius–Capricorn Cusp',
        sunDegree: 28.5 + Math.random() * 2,
        description:
          'You are born on the Sagittarius–Capricorn Cusp, The Cusp of Prophecy. This unique position gives you traits from both Sagittarius and Capricorn.',
      };
    }

    // Check other cusp dates
    const CUSP_DATES = [
      { signs: ['Pisces', 'Aries'], startDate: '19/03', endDate: '24/03', name: 'Pisces–Aries Cusp' },
      { signs: ['Aries', 'Taurus'], startDate: '19/04', endDate: '24/04', name: 'Aries–Taurus Cusp' },
      { signs: ['Taurus', 'Gemini'], startDate: '19/05', endDate: '24/05', name: 'Taurus–Gemini Cusp' },
      { signs: ['Gemini', 'Cancer'], startDate: '19/06', endDate: '24/06', name: 'Gemini–Cancer Cusp' },
      { signs: ['Cancer', 'Leo'], startDate: '19/07', endDate: '25/07', name: 'Cancer–Leo Cusp' },
      { signs: ['Leo', 'Virgo'], startDate: '19/08', endDate: '25/08', name: 'Leo–Virgo Cusp' },
      { signs: ['Virgo', 'Libra'], startDate: '19/09', endDate: '25/09', name: 'Virgo–Libra Cusp' },
      { signs: ['Libra', 'Scorpio'], startDate: '19/10', endDate: '25/10', name: 'Libra–Scorpio Cusp' },
      { signs: ['Scorpio', 'Sagittarius'], startDate: '18/11', endDate: '24/11', name: 'Scorpio–Sagittarius Cusp' },
      { signs: ['Capricorn', 'Aquarius'], startDate: '17/01', endDate: '23/01', name: 'Capricorn–Aquarius Cusp' },
      { signs: ['Aquarius', 'Pisces'], startDate: '15/02', endDate: '21/02', name: 'Aquarius–Pisces Cusp' },
    ];

    // Helper function to check if date falls in cusp range
    function isDateInCuspRange(d: number, m: number, startDate: string, endDate: string) {
      const [startDay, startMonth] = startDate.split('/').map(Number);
      const [endDay, endMonth] = endDate.split('/').map(Number);

      if (startMonth > endMonth) {
        // Crosses year boundary, for completeness
        return (m === startMonth && d >= startDay) || (m === endMonth && d <= endDay);
      } else {
        // Same month range
        if (m === startMonth && m === endMonth) return d >= startDay && d <= endDay;
        if (m === startMonth) return d >= startDay;
        if (m === endMonth) return d <= endDay;
        return false;
      }
    }

    // Check all cusp dates
    for (const cusp of CUSP_DATES) {
      if (isDateInCuspRange(day, month, cusp.startDate, cusp.endDate)) {
        console.log('✅ [computeCuspFallback] PRODUCTION: Detected cusp:', cusp.name);
        return {
          isOnCusp: true,
          primarySign: cusp.signs[0],
          secondarySign: cusp.signs[1],
          cuspName: cusp.name,
          sunDegree: 28.5 + Math.random() * 2,
          description: `You are born on the ${cusp.name}. This unique position gives you traits from both ${cusp.signs[0]} and ${cusp.signs[1]}.`,
        };
      }
    }

    const { calculateSunSign } = require('./astrology');
    const primarySign = calculateSunSign(birthDate);
    console.log('✅ [computeCuspFallback] PRODUCTION: Calculated sign:', primarySign, 'for date:', birthDate);
    console.log('🔍 [computeCuspFallback] PRODUCTION: Date details:', {
      year,
      month,
      day,
      originalString: birthDate,
    });

    return {
      isOnCusp: false,
      primarySign,
      sunDegree: 15,
      description: `You are a ${primarySign} with strong ${primarySign} energy.`,
    };
  } catch (error) {
    console.error('❌ [computeCuspFallback] PRODUCTION: Error computing fallback:', error);
    return null;
  }
}

// Purge any email-scoped monthly caches (simple implementation)
async function purgeUserCache(email: string): Promise<void> {
  try {
    const keys = await storage.getAllKeys();
    const lower = email.toLowerCase();
    const prefix = `@astro_cusp_monthly_${lower}`;
    const toRemove = keys.filter((k) => k.toLowerCase().startsWith(prefix));
    if (toRemove.length) {
      await storage.multiRemove(toRemove);
      console.log('🧹 [userData] purgeUserCache removed', toRemove.length, 'keys for', email);
    }
  } catch (e) {
    console.warn('⚠️ [userData] purgeUserCache error:', e);
  }
}

// Clean up any incomplete/corrupted cache
export async function healUserCache(): Promise<void> {
  try {
    await clearLocalAuthData();

    // Remove legacy cache if incomplete
    try {
      const rawLegacy = await storage.getItem(USER_DATA_KEY);
      if (rawLegacy) {
        const legacy = JSON.parse(rawLegacy);
        if (!legacy?.cuspResult) {
          console.log('🔧 [userData] Removing incomplete legacy cached profile');
          await storage.removeItem(USER_DATA_KEY);
        }
      }
    } catch {
      await storage.removeItem(USER_DATA_KEY);
    }

    // Remove any per-user caches that are incomplete
    const keys = await storage.getAllKeys();
    const perUser = keys.filter((k) => k.startsWith(USER_DATA_KEY_PREFIX));
    for (const k of perUser) {
      try {
        const raw = await storage.getItem(k);
        if (!raw) continue;
        const p = JSON.parse(raw);
        if (!p?.cuspResult || !p?.email) {
          console.log('🔧 [userData] Removing incomplete per-user cached profile:', k);
          await storage.removeItem(k);
        }
      } catch {
        await storage.removeItem(k);
      }
    }
  } catch (e) {
    console.log('🔧 [userData] healUserCache error:', e);
  }
}

// ---------------- Save / Update ----------------
export async function saveUserData(userData: UserProfile): Promise<void> {
  try {
    _userDataPromise = null;
    _forceCacheRefresh = true;

    const isPeter = userData.email?.toLowerCase() === 'petermaricar@bigpond.com';

    console.log('💾 [userData] saveUserData:', {
      email: userData.email,
      isOnCusp: userData.cuspResult?.isOnCusp,
      cuspName: userData.cuspResult?.cuspName,
      primarySign: userData.cuspResult?.primarySign,
      hemisphere: userData.hemisphere,
    });

    if (!userData.email || !userData.cuspResult) {
      throw new Error('Missing required profile data: email and cuspResult are required');
    }
    if (userData.cuspResult.isOnCusp && !userData.cuspResult.cuspName) {
      console.error('❌ [userData] Cusp user missing cuspName in save payload!');
      throw new Error('Cusp result is incomplete - missing cuspName');
    }

    const dataToSave: UserProfile = {
      ...userData,
      createdAt: userData.createdAt || new Date().toISOString(),
      lastLoginAt: userData.lastLoginAt || new Date().toISOString(),
    };

    const { data: { user } } = await supabase.auth.getUser();

    if (user) {
      await enforceAuthUserCacheIsolation(user.id);

      const userCacheKey = `${USER_DATA_KEY_PREFIX}${user.id}`;

      if (isPeter) {
        console.log('🔍 [PETER DEBUG] Auth user found:', {
          userId: user.id,
          email: user.email,
          userCacheKey,
        });
      }

      await storage.setItem(userCacheKey, JSON.stringify(dataToSave));
      await storage.setItem(LAST_AUTH_USER_ID_KEY, user.id);

      if (isPeter) {
        const verification = await storage.getItem(userCacheKey);
        console.log('🔍 [PETER DEBUG] Cache save verification:', {
          saved: !!verification,
          dataLength: verification?.length,
        });
      }

      console.log('✅ [userData] Saved to local per-user cache');

      const { error: upsertError } = await supabase
        .from('user_profiles')
        .upsert(
          {
            user_id: user.id,
            email: dataToSave.email,
            name: dataToSave.name,
            birth_date: dataToSave.birthDate,
            birth_time: dataToSave.birthTime,
            birth_location: dataToSave.birthLocation,
            hemisphere: dataToSave.hemisphere,
            cusp_result: dataToSave.cuspResult,
            created_at: dataToSave.createdAt,
            last_login_at: dataToSave.lastLoginAt,
          },
          { onConflict: 'user_id' }
        );

      if (upsertError) {
        console.error('❌ [userData] Supabase upsert error:', upsertError);
        throw new Error('Failed to save profile in database');
      }

      console.log('✅ [userData] Profile upserted to Supabase for', dataToSave.email);
    } else {
      // If no auth user, do NOT write a global profile cache that could leak
      console.warn('⚠️ [userData] No auth user during saveUserData, refusing to write legacy cache');
    }

    if (userData.email) {
      await purgeUserCache(userData.email);
      console.log('🧹 [userData] Purged monthly caches for', userData.email);
    }

    console.log('✅ [userData] saveUserData completed');
  } catch (err: any) {
    console.error('❌ [userData] Error saving user data:', err);
    throw new Error('Failed to save user data');
  }
}

// ---------------- Read (cache → DB) ----------------
export async function getUserData(forceFresh = false): Promise<UserProfile | null> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  await enforceAuthUserCacheIsolation(user.id);

  const userCacheKey = `${USER_DATA_KEY_PREFIX}${user.id}`;

  if (!forceFresh) {
    try {
      const cached = await storage.getItem(userCacheKey);
      if (cached) {
        const parsed = JSON.parse(cached);
        if (parsed?.cuspResult && parsed?.email?.toLowerCase() === (user.email || '').toLowerCase()) {
          console.log('💾 [userData] Using cached profile for', user.email);
          return parsed;
        }
      }
    } catch {
      console.warn('⚠️ [userData] Invalid cached data, will fetch fresh');
    }
  }

  console.log('🔍 [userData] Fetching fresh profile from Supabase for', user.email);

  const { data: profile, error } = await supabase
    .from('user_profiles')
    .select('*')
    .eq('user_id', user.id)
    .maybeSingle();

  if (error) {
    console.error('❌ [userData] Supabase fetch error:', error);
    throw new Error(`Failed to fetch profile: ${error.message}`);
  }

  if (!profile) {
    console.log('ℹ️ [userData] No profile found for user:', user.email);
    return null;
  }

  // SECURITY: Verify this profile belongs to the current user
  if ((profile.email || '').toLowerCase() !== (user.email || '').toLowerCase()) {
    console.error('❌ [userData] SECURITY: Profile email mismatch!', {
      profileEmail: profile.email,
      authEmail: user.email,
      userId: user.id,
    });
    return null;
  }

  let cuspResult: CuspResult | undefined;

  try {
    cuspResult = typeof profile.cusp_result === 'string' ? JSON.parse(profile.cusp_result) : profile.cusp_result;

    const valid =
      !!cuspResult &&
      ((cuspResult.isOnCusp && !!cuspResult.cuspName && !!cuspResult.primarySign) ||
        (!cuspResult.isOnCusp && !!cuspResult.primarySign));

    if (!valid) {
      console.warn('⚠️ [userData] Invalid cusp_result, flagging for recalc', { email: profile.email, cuspResult });

      const userProfile: UserProfile = {
        email: profile.email,
        name: profile.name ?? '',
        birthDate: profile.birth_date ?? '',
        birthTime: profile.birth_time ?? '',
        birthLocation: profile.birth_location ?? '',
        hemisphere: profile.hemisphere === 'Southern' ? 'Southern' : 'Northern',
        cuspResult: undefined as any,
        createdAt: profile.created_at,
        lastLoginAt: profile.last_login_at ?? undefined,
        needsRecalc: true,
      };

      return userProfile;
    }
  } catch (e) {
    console.error('❌ [userData] Error parsing cusp_result:', e);

    const userProfile: UserProfile = {
      email: profile.email,
      name: profile.name ?? '',
      birthDate: profile.birth_date ?? '',
      birthTime: profile.birth_time ?? '',
      birthLocation: profile.birth_location ?? '',
      hemisphere: profile.hemisphere === 'Southern' ? 'Southern' : 'Northern',
      cuspResult: undefined as any,
      createdAt: profile.created_at,
      lastLoginAt: profile.last_login_at ?? undefined,
      needsRecalc: true,
    };

    return userProfile;
  }

  console.log('✅ [userData] Valid profile loaded:', {
    email: profile.email,
    isOnCusp: cuspResult.isOnCusp,
    cuspName: cuspResult.cuspName,
    primarySign: cuspResult.primarySign,
    hemisphere: profile.hemisphere,
  });

  const userProfile: UserProfile = {
    email: profile.email,
    name: profile.name ?? '',
    birthDate: profile.birth_date ?? '',
    birthTime: profile.birth_time ?? '',
    birthLocation: profile.birth_location ?? '',
    hemisphere: profile.hemisphere === 'Southern' ? 'Southern' : 'Northern',
    cuspResult,
    createdAt: profile.created_at,
    lastLoginAt: profile.last_login_at ?? undefined,
    needsRecalc: false,
  };

  await storage.setItem(userCacheKey, JSON.stringify(userProfile));
  await storage.setItem(LAST_AUTH_USER_ID_KEY, user.id);

  console.log('✅ [userData] Cached fresh profile for', userProfile.email);

  return userProfile;
}

// ---------------- Misc helpers ----------------
export async function updateLastLogin(): Promise<void> {
  try {
    const profile = await getUserData();
    if (!profile) return;
    profile.lastLoginAt = new Date().toISOString();
    await saveUserData(profile);
    console.log('🕒 [userData] Last login updated');
  } catch (e) {
    console.error('❌ [userData] updateLastLogin error:', e);
  }
}

export async function clearUserData(): Promise<void> {
  try {
    console.log('🧹 [clearUserData] Clearing all user data caches...');

    _userDataPromise = null;

    await purgeAllUserProfileCaches();
    await storage.removeItem(USER_DATA_KEY); // legacy
    await storage.removeItem(LAST_AUTH_USER_ID_KEY);

    console.log('✅ [clearUserData] All user caches cleared');
  } catch (e) {
    console.error('❌ [userData] clearUserData error:', e);
    throw new Error('Failed to clear user data');
  }
}

export async function isUserLoggedIn(): Promise<boolean> {
  try {
    const profile = await getUserData();
    return profile !== null;
  } catch {
    return false;
  }
}

export async function updateUserProfile(updates: Partial<UserProfile>): Promise<void> {
  const current = await getUserData();
  if (!current) throw new Error('No user data found');
  const merged = { ...current, ...updates };
  await saveUserData(merged as UserProfile);
  console.log('✅ [userData] Profile updated locally');
}

export async function debugStorage(): Promise<void> {
  try {
    console.log('🔍 [userData] === DEBUG STORAGE ===');
    const keys = await storage.getAllKeys();
    console.log('🔍 keys:', keys);

    const legacy = await storage.getItem(USER_DATA_KEY);
    console.log('🔍 legacy userData length:', legacy?.length ?? 0);

    const lastUserId = await storage.getItem(LAST_AUTH_USER_ID_KEY);
    console.log('🔍 last auth user id:', lastUserId);

    const perUserKeys = keys.filter((k) => k.startsWith(USER_DATA_KEY_PREFIX));
    console.log('🔍 per-user cache keys:', perUserKeys);
  } catch (e) {
    console.error('❌ [userData] debugStorage error:', e);
  }
}
