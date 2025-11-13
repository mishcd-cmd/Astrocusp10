// project10/utils/billing.ts (only the getSubscriptionStatus export shown here)
// Keep your other exports (subscribeMonthly, etc.) as-is.

import { supabase } from '@/utils/supabase';

const BASE =
  process.env.EXPO_PUBLIC_SUPABASE_URL ||
  process.env.NEXT_PUBLIC_SUPABASE_URL;

type SubStatus = {
  active: boolean;
  plan?: 'monthly' | 'yearly' | null;
  renewsAt?: string | null;
  customerId?: string | null;
  price_id?: string | null;
  status?: string;
  email?: string | null;
} | null;

export async function getSubscriptionStatus(): Promise<SubStatus> {
  try {
    if (!BASE) {
      console.error('[billing] Missing Supabase URL config (EXPO_PUBLIC_SUPABASE_URL)');
      return { active: false, status: 'error:missing_base' };
    }

    const { data, error } = await supabase.auth.getSession();
    if (error) {
      console.error('[billing] auth.getSession error', error);
      return { active: false, status: 'error:no_session' };
    }
    const token = data?.session?.access_token;
    if (!token) {
      console.warn('[billing] No session token');
      return { active: false, status: 'error:no_token' };
    }

    const url = `${BASE}/functions/v1/subscription-status`;
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      credentials: 'omit', // keep cross-origin clean
      body: JSON.stringify({}),
    });

    if (!res.ok) {
      const text = await res.text().catch(() => '');
      console.error('[billing] subscription-status bad response', res.status, text);
      return { active: false, status: `error:${res.status}` };
    }

    const json = await res.json().catch(() => ({}));
    // Expecting the shape from the Edge Function
    return {
      active: !!json.active,
      plan: json.plan ?? null,
      renewsAt: json.renewsAt ?? null,
      customerId: json.customerId ?? null,
      price_id: json.price_id ?? null,
      status: json.status ?? 'unknown',
      email: json.email ?? null,
    };
  } catch (e: any) {
    console.error('[billing] getSubscriptionStatus exception', e?.message || e);
    return { active: false, status: 'error:exception' };
  }
}
