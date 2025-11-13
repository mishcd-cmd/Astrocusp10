// src/utils/stripe.ts
import { supabase } from './supabase'
import { isStripeConfigured, getSubscriptionProducts, type StripeProduct } from './stripeConfig'
import { Platform } from 'react-native'
import { SITE_URL } from './urls'

// Re-export for convenience
export { isStripeConfigured } from './stripeConfig'

export interface SubscriptionData {
  customer_id: string;
  subscription_id: string | null;
  subscription_status: string;
  price_id: string | null;
  current_period_start: number | null;
  current_period_end: number | null;
  cancel_at_period_end: boolean;
  payment_method_brand: string | null;
  payment_method_last4: string | null;
}

export interface OrderData {
  order_id: number;
  checkout_session_id: string;
  payment_intent_id: string;
  amount_subtotal: number;
  amount_total: number;
  currency: string;
  payment_status: string;
  order_status: string;
  order_date: string;
}

// ---------- helpers for checkout ----------

const CHECKOUT_ENDPOINT = '/.netlify/functions/checkout'

function getReturnPath(): string {
  if (typeof window === 'undefined') return '/'
  return window.location.pathname + window.location.search
}

async function openUrl(url: string) {
  if (Platform.OS === 'web') {
    // Navigate in the same tab so history and back behavior are consistent in-app
    window.location.href = url
  } else {
    const Linking = await import('expo-linking')
    const canOpen = await Linking.canOpenURL(url)
    if (!canOpen) throw new Error('Cannot open payment page on this device.')
    await Linking.openURL(url)
  }
}

async function postCheckout(body: Record<string, unknown>) {
  const res = await fetch(CHECKOUT_ENDPOINT, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  if (!res.ok) {
    let errText = 'Checkout failed'
    try {
      const j = await res.json()
      errText = j?.error || errText
    } catch {
      /* ignore */
    }
    throw new Error(errText)
  }
  const data = await res.json()
  const url = data?.url as string | undefined
  if (!url) throw new Error('No checkout URL returned')
  return url
}

// ---------- main checkout entry points ----------

export async function checkoutSubscription({
  priceId,
  successUrl,
  cancelUrl,
}: {
  priceId: string;
  successUrl?: string;
  cancelUrl?: string;
}) {
  console.log('=== START CHECKOUT (subscription) ===', { priceId })

  if (!isStripeConfigured()) {
    throw new Error('Stripe is not configured. Please contact support.')
  }

  // try to include user email if available (optional)
  let email: string | undefined
  try {
    const { data: { session } } = await supabase.auth.getSession()
    email = session?.user?.email ?? undefined
  } catch {
    /* optional */
  }

  const url = await postCheckout({
    priceId,
    mode: 'subscription',
    successUrl,
    cancelUrl,
    email,
    returnPath: getReturnPath(), // so we can jump back to where the user started
  })

  await openUrl(url)
}

export async function checkoutOneTime({
  priceId,
  successUrl,
  cancelUrl,
}: {
  priceId: string;
  successUrl?: string;
  cancelUrl?: string;
}) {
  console.log('=== START CHECKOUT (one-time) ===', { priceId })

  const url = await postCheckout({
    priceId,
    mode: 'payment',
    successUrl,
    cancelUrl,
    returnPath: getReturnPath(),
  })

  await openUrl(url)
}

// ---------- legacy API kept for compatibility (now forwards to Netlify) ----------

export async function createCheckoutSession(
  priceId: string,
  mode: 'payment' | 'subscription',
  successUrl: string,
  cancelUrl: string
): Promise<{ sessionId?: string; url?: string; error?: string }> {
  try {
    if (!isStripeConfigured()) {
      return { error: 'Stripe is not configured. Please set up your Stripe keys.' }
    }
    const url = await postCheckout({
      priceId,
      mode,
      successUrl,
      cancelUrl,
      returnPath: getReturnPath(),
    })
    return { url }
  } catch (err: any) {
    return { error: err?.message || 'Failed to create checkout session' }
  }
}

// ---------- queries and helpers that use Supabase (unchanged) ----------

export async function getUserSubscription(): Promise<SubscriptionData | null> {
  try {
    const { data: { session }, error: sessionError } = await supabase.auth.getSession()
    if (sessionError || !session) return null

    const { data, error } = await supabase
      .from('stripe_user_subscriptions')
      .select('*')
      .eq('customer_id', session.user.id)
      .maybeSingle()

    if (error) {
      console.error('Error fetching subscription:', error)
      return null
    }
    return data
  } catch (error) {
    console.error('Error fetching subscription:', error)
    return null
  }
}

export async function getUserOrders(): Promise<OrderData[]> {
  try {
    const { data, error } = await supabase
      .from('stripe_user_orders')
      .select('*')
      .order('order_date', { ascending: false })

    if (error) {
      console.error('Error fetching orders:', error)
      return []
    }
    return data || []
  } catch (error) {
    console.error('Error fetching orders:', error)
    return []
  }
}

export async function hasActiveSubscription(): Promise<boolean> {
  try {
    const { getSubscriptionStatus } = await import('./billing')
    const status = await getSubscriptionStatus()
    return status.active
  } catch (error) {
    console.error('Error checking subscription status:', error)
    return false
  }
}

export function getSubscriptionProduct(priceId: string): StripeProduct | null {
  const products = getSubscriptionProducts()
  return (
    products.find(p => p.priceId === priceId && p.mode === 'subscription') || null
  )
}

export async function getCurrentPlanName(): Promise<string> {
  try {
    const subscription = await getUserSubscription()
    if (!subscription?.price_id) return 'Free Plan'
    const products = getSubscriptionProducts()
    const product = products.find(p => p.priceId === subscription.price_id)
    return product?.name || 'Unknown Plan'
  } catch (error) {
    console.error('Error getting plan name:', error)
    return 'Free Plan'
  }
}

export function formatCurrency(amount: number, currency: string = 'AUD'): string {
  return new Intl.NumberFormat('en-AU', {
    style: 'currency',
    currency: currency.toUpperCase(),
  }).format(amount / 100)
}

export async function isSubscriptionCancelled(): Promise<boolean> {
  try {
    const subscription = await getUserSubscription()
    if (!subscription) return false
    return subscription.cancel_at_period_end || subscription.subscription_status === 'canceled'
  } catch (error) {
    console.error('Error checking cancellation status:', error)
    return false
  }
}
