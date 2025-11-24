// utils/supabase.ts
import 'react-native-url-polyfill/auto';
import { createClient } from '@supabase/supabase-js';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';

const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL!;
const SUPABASE_ANON = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY!;

if (!SUPABASE_URL || !SUPABASE_ANON) {
  console.warn('[supabase] Missing EXPO_PUBLIC_SUPABASE_URL or EXPO_PUBLIC_SUPABASE_ANON_KEY');
}

const isWeb = Platform.OS === 'web';

// Lazy-load localforage only on web so native never touches it
let webStore: any | null = null;

async function getWebStore() {
  if (!webStore) {
    const lf = (await import('localforage')).default;
    lf.config({
      name: 'astrocusp',
      storeName: 'auth',
      description: 'Supabase auth session',
    });
    webStore = lf;
  }
  return webStore;
}

// Storage adapter: IndexedDB on web, AsyncStorage on native
const storage = {
  getItem: async (key: string): Promise<string | null> => {
    try {
      if (isWeb) {
        const lf = await getWebStore();
        const v = await lf.getItem<string>(key);
        return v ?? null;
      }
      return await AsyncStorage.getItem(key);
    } catch (e) {
      console.warn('[supabase] storage.getItem error', e);
      return null;
    }
  },

  setItem: async (key: string, value: string): Promise<void> => {
    try {
      if (isWeb) {
        const lf = await getWebStore();
        await lf.setItem<string>(key, value);
        return;
      }
      await AsyncStorage.setItem(key, value);
    } catch (e) {
      console.warn('[supabase] storage.setItem error', e);
    }
  },

  removeItem: async (key: string): Promise<void> => {
    try {
      if (isWeb) {
        const lf = await getWebStore();
        await lf.removeItem(key);
        return;
      }
      await AsyncStorage.removeItem(key);
    } catch (e) {
      console.warn('[supabase] storage.removeItem error', e);
    }
  },
};

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON, {
  auth: {
    flowType: 'pkce',
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: false,
    storage,
    storageKey: 'astro-cusp-auth-session',
  },
});

// Helper
export async function getCurrentSession() {
  const { data, error } = await supabase.auth.getSession();
  if (error) console.warn('[supabase] getSession error:', error.message);
  return data.session ?? null;
}
