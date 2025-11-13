// Helper to open billing portal without cookies (works on web and native)
import { supabase } from '@/utils/supabase';
import { Linking, Platform } from 'react-native';

async function openBillingPortalSafe() {
  const base =
    process.env.EXPO_PUBLIC_SUPABASE_URL ||
    process.env.NEXT_PUBLIC_SUPABASE_URL;

  if (!base) {
    throw new Error('Missing Supabase URL config (EXPO_PUBLIC_SUPABASE_URL)');
  }

  // Get Supabase JWT
  const { data, error } = await supabase.auth.getSession();
  if (error) throw new Error(error.message || 'Auth error');
  const token = data?.session?.access_token;
  if (!token) throw new Error('Not authenticated');

  // Call your Edge Function with JWT, no cookies
  const res = await fetch(`${base}/functions/v1/stripe-portal`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    credentials: 'omit',           // critical: no cookies on web
    body: JSON.stringify({}),      // nothing else needed
  });

  if (!res.ok) {
    const txt = await res.text().catch(() => '');
    throw new Error(txt || `Portal endpoint error ${res.status}`);
  }

  const json = await res.json().catch(() => ({}));
  const portalUrl = json?.url;
  if (!portalUrl) throw new Error('Portal URL missing');

  if (Platform.OS === 'web') {
    window.location.assign(portalUrl);
  } else {
    await Linking.openURL(portalUrl);
  }
}
