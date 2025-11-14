// utils/openBillingPortal.ts
// Opens the Stripe Billing Portal securely via your Supabase Edge Function

import { supabase } from '@/utils/supabase';
import { Linking, Platform } from 'react-native';

// Pick up Supabase URL from your environment
const BASE =
  process.env.EXPO_PUBLIC_SUPABASE_URL ||
  process.env.NEXT_PUBLIC_SUPABASE_URL;

export async function openBillingPortal() {
  console.log('[openBillingPortal] Opening Stripe billing portal...');

  if (!BASE) throw new Error('Missing Supabase URL config');

  // Get the user’s JWT token
  const { data, error } = await supabase.auth.getSession();
  if (error) {
    console.error('[openBillingPortal] getSession error:', error);
    throw new Error(error.message || 'Auth error');
  }

  const token = data?.session?.access_token;
  if (!token) {
    console.error('[openBillingPortal] No access token found');
    throw new Error('Not authenticated');
  }

  // Call your Supabase Edge Function
  const res = await fetch(`${BASE}/functions/v1/stripe-portal`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    credentials: 'omit', // never send cookies, ensures CORS success
    body: JSON.stringify({}),
  });

  if (!res.ok) {
    const txt = await res.text().catch(() => '');
    console.error('[openBillingPortal] Non-OK response:', res.status, txt);
    throw new Error(txt || `stripe-portal error ${res.status}`);
  }

  // Parse returned JSON { url }
  const json = await res.json().catch(() => ({}));
  const portalUrl = (json as any)?.url as string | undefined;

  if (!portalUrl) {
    console.error('[openBillingPortal] Missing portal URL in response:', json);
    throw new Error('Portal URL missing');
  }

  console.log('[openBillingPortal] Redirecting to portal:', portalUrl);

  // Redirect to the portal
  if (Platform.OS === 'web') {
    // Single-page app stay mounted, Stripe takes over the URL
    window.location.assign(portalUrl);
  } else {
    await Linking.openURL(portalUrl);
  }
}
