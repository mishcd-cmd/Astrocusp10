// utils/billing.ts
import { Platform } from 'react-native';
import { supabase } from '@/utils/supabase';
import {
  checkoutSubscription,
  checkoutOneTime,
  isStripeConfigured,
} from './stripe';
import {
  STRIPE_PRICE_MONTHLY,
  STRIPE_PRICE_YEARLY,
  STRIPE_PRICE_ONEOFF,
} from './stripeConfig';
import { SITE_URL } from './urls';

export type SubscriptionCheck = {
  active: boolean;
  reason?: string; // 'no_session', 'edge_error', 'subscription_inactive', etc.
  source?: 'db' | 'stripe' | 'edge' | 'override' | 'none';
  status?: string; // 'active', 'trialing', 'past_due', 'inactive', 'unknown'
  plan?: 'monthly' | 'yearly';
  price_id?: string | null;
  current_period_end?: number | null;
  renewsAt?: string | null;
  customerId?: string | null;
  isVip?: boolean;
  [key: string]: any;
};

const isWeb = Platform.OS === 'web';

const SPECIAL_ACCOUNTS = new Set<string>([
  'mish.cd@gmail.com',
  'petermaricar@bigpond.com',
  'tsharna.kecek@gmail.com',
  'james.summerton@outlook.com',
  'xavier.cd@gmail.com',
  'xaviercd96@gmail.com',
  'adam.stead@techweave.co', // VIP Account
  'mish@fpanda.com.au', // VIP Account
  'michael.p.r.orourke@gmail.com', // VIP Account
]);

async function invokeStripeStatus(accessToken: string) {
  return supabase.functions.invoke('stripe-status', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: {},
  });
}

/**
 * Core subscription check. Raw shape including diagnostics.
 * Safe on all platforms.
 */
export async function hasActiveSubscription(): Promise<SubscriptionCheck> {
  try {
    console.log('🔍 [billing] Starting subscription check...');

    const {
      data: { session },
      error: sessionErr,
    } = await supabase.auth.getSession();
    if (sessionErr) console.warn('[billing] getSession error:', sessionErr);

    const accessToken = session?.access_token;
    if (!accessToken) {
      console.log('[billing] No session token, treating as not subscribed');
      return {
        active: false,
        reason: 'no_session',
        source: 'none',
        status: 'unknown',
      };
    }

    const userEmail = (session.user?.email ?? '').toLowerCase();

    if (userEmail && SPECIAL_ACCOUNTS.has(userEmail)) {
      console.log(`✅ [billing] Special account access granted: ${userEmail}`);
      return {
        active: true,
        reason: 'special_account',
        source: 'override',
        status: 'active',
        plan: 'yearly',
        price_id: null,
        current_period_end: null,
        renewsAt: null,
        customerId: `vip-${userEmail}`,
        isVip: true,
      };
    }

    console.log('[billing] Session found, checking subscription status…');

    let { data, error } = await invokeStripeStatus(accessToken);

    if (error && (error as any)?.status === 401) {
      console.warn(
        '[billing] stripe-status 401; retrying after session refresh…',
      );
      await supabase.auth.getSession();
      const refreshedToken =
        (await supabase.auth.getSession()).data.session?.access_token ??
        accessToken;
      ({ data, error } = await invokeStripeStatus(refreshedToken));
    }

    if (error) {
      console.warn('[billing] stripe-status error:', error);
      return {
        active: false,
        reason: 'edge_error',
        source: 'edge',
        status: 'unknown',
        edge_error: (error as any)?.message ?? String(error),
      } as any;
    }

    console.log('🔍 [billing] Stripe status response:', data);

    const raw: any = data || {};

    const status = raw.status || raw.subscription_status || 'unknown';

    const active =
      raw.active === true ||
      status === 'active' ||
      status === 'trialing' ||
      status === 'past_due';

    const plan: 'monthly' | 'yearly' | undefined =
      raw.plan ||
      (raw.price_interval === 'month'
        ? 'monthly'
        : raw.price_interval === 'year'
        ? 'yearly'
        : undefined);

    const price_id: string | null = raw.price_id ?? raw.priceId ?? null;

    const customerId: string | null =
      raw.customer_id ?? raw.customerId ?? null;

    const current_period_end: number | null =
      typeof raw.current_period_end === 'number'
        ? raw.current_period_end
        : typeof raw.currentPeriodEnd === 'number'
        ? raw.currentPeriodEnd
        : null;

    const renewsAt: string | null =
      raw.renewsAt ??
      (current_period_end
        ? new Date(current_period_end * 1000).toISOString()
        : null);

    const isVip = !!raw.isVip;

    return {
      active,
      source: raw.source ?? 'edge',
      status,
      plan,
      price_id,
      current_period_end,
      renewsAt,
      customerId,
      isVip,
      ...raw,
    };
  } catch (e: any) {
    console.error('[billing] Status exception:', e?.message || e);
    return {
      active: false,
      reason: 'billing_exception',
      source: 'none',
      status: 'unknown',
    };
  }
}

/**
 * Back compat alias.
 */
export async function getSubscriptionStatus(): Promise<SubscriptionCheck> {
  return hasActiveSubscription();
}

/* ---------- Checkout helpers ---------- */

export async function subscribeMonthly(): Promise<void> {
  console.log('=== SUBSCRIBE MONTHLY ===');

  if (!isWeb) {
    console.log('[billing] Stripe checkout blocked on native (monthly)');
    throw new Error(
      'Subscriptions are managed in the App Store on iOS. Please subscribe there or on the web.',
    );
  }

  const { getCurrentUser } = await import('./auth');
  const authUser = await getCurrentUser();

  if (!authUser) {
    throw new Error('Please sign in to subscribe');
  }

  console.log('User authenticated for monthly subscription:', authUser.email);

  if (!isStripeConfigured()) {
    throw new Error('Payment system not configured. Please contact support.');
  }

  if (!STRIPE_PRICE_MONTHLY) {
    throw new Error('Monthly subscription not configured');
  }

  console.log('Monthly price ID:', STRIPE_PRICE_MONTHLY);

  const siteUrl = SITE_URL;
  const successUrl = `${siteUrl}/`;
  const cancelUrl = `${siteUrl}/settings`;

  console.log('Checkout URLs (monthly):', { successUrl, cancelUrl });

  await checkoutSubscription({
    priceId: STRIPE_PRICE_MONTHLY,
    successUrl,
    cancelUrl,
  });
}

export async function subscribeYearly(): Promise<void> {
  console.log('=== SUBSCRIBE YEARLY ===');

  if (!isWeb) {
    console.log('[billing] Stripe checkout blocked on native (yearly)');
    throw new Error(
      'Subscriptions are managed in the App Store on iOS. Please subscribe there or on the web.',
    );
  }

  const { getCurrentUser } = await import('./auth');
  const authUser = await getCurrentUser();

  if (!authUser) {
    throw new Error('Please sign in to subscribe');
  }

  console.log('User authenticated for yearly subscription:', authUser.email);

  if (!isStripeConfigured()) {
    throw new Error('Payment system not configured. Please contact support.');
  }

  if (!STRIPE_PRICE_YEARLY) {
    throw new Error('Yearly subscription not configured');
  }

  const siteUrl = SITE_URL;
  const successUrl = `${siteUrl}/`;
  const cancelUrl = `${siteUrl}/settings`;

  console.log('Checkout URLs (yearly):', { successUrl, cancelUrl });

  await checkoutSubscription({
    priceId: STRIPE_PRICE_YEARLY,
    successUrl,
    cancelUrl,
  });
}

export async function buyOneOffReading(): Promise<void> {
  console.log('=== BUY ONE-OFF READING ===');

  if (!isWeb) {
    console.log('[billing] Stripe one-off checkout blocked on native');
    throw new Error(
      'Purchases are managed in the App Store on iOS. Please buy there or on the web.',
    );
  }

  const { getCurrentUser } = await import('./auth');
  const authUser = await getCurrentUser();

  if (!authUser) {
    throw new Error('Please sign in to purchase');
  }

  console.log('User authenticated for one-off purchase:', authUser.email);

  if (!isStripeConfigured()) {
    throw new Error('Payment system not configured. Please contact support.');
  }

  if (!STRIPE_PRICE_ONEOFF) {
    throw new Error('One-off reading not configured');
  }

  const siteUrl = SITE_URL;
  const successUrl = `${siteUrl}/`;
  const cancelUrl = `${siteUrl}/settings`;

  console.log('Checkout URLs (one-off):', { successUrl, cancelUrl });

  await checkoutOneTime({
    priceId: STRIPE_PRICE_ONEOFF,
    successUrl,
    cancelUrl,
  });
}

export async function upgradeToYearly(): Promise<{ message: string }> {
  console.log('=== UPGRADE TO YEARLY ===');
  await subscribeYearly();
  return { message: 'Redirecting to yearly subscription checkout...' };
}

/**
 * Billing portal helper.
 * Web: full page navigation to Stripe portal and back.
 * Native: blocked (web only feature).
 */
export async function openStripePortal(): Promise<void> {
  console.log('=== OPEN STRIPE PORTAL ===');

  if (!isWeb) {
    console.log('[billing] Stripe portal blocked on native');
    return;
  }

  const siteUrl = SITE_URL;

  const { data, error } = await supabase.functions.invoke('stripe-portal', {
    body: { returnUrl: `${siteUrl}/` },
  });

  if (error) {
    console.error('[billing] stripe-portal error:', error);
    throw new Error(error.message || 'Failed to open billing portal');
  }

  const url: string | undefined = (data as any)?.url;
  if (!url) {
    console.error('[billing] No portal URL returned from stripe-portal');
    throw new Error('No portal URL returned');
  }

  console.log('[billing] Navigating browser to Stripe portal:', url);
  window.location.href = url;
}
