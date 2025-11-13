// netlify/functions/checkout.ts 
import Stripe from "stripe"

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2024-06-20",
})

// Normalize and lock your site URL
function normalizeSiteUrl(raw?: string): string {
  let base = (raw && raw.trim()) || "https://www.astrocusp.com.au"
  base = base.replace(/^http:\/\//i, "https://")
  base = base.replace(/\/+$/, "")
  return base
}

function sameOriginOrNull(url: string | undefined, site: string): string | null {
  if (!url) return null
  try {
    const u = new URL(url)
    const s = new URL(site)
    return u.origin === s.origin ? u.toString() : null
  } catch {
    return null
  }
}

export const handler = async (event: any) => {
  if (event.httpMethod === "OPTIONS") {
    return {
      statusCode: 200,
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Headers": "authorization, content-type",
        "Access-Control-Allow-Methods": "POST, OPTIONS",
      },
    }
  }

  if (event.httpMethod !== "POST") {
    return { statusCode: 405, body: JSON.stringify({ error: "Method not allowed" }) }
  }

  try {
    const parsed = JSON.parse(event.body || "{}")
    const { priceId, mode = "subscription", successUrl, cancelUrl, email, returnPath } = parsed

    if (!priceId) {
      return { statusCode: 400, body: JSON.stringify({ error: "Price ID is required" }) }
    }

    const SITE = normalizeSiteUrl(process.env.SITE_URL)
    const encodedReturn = returnPath ? `&return=${encodeURIComponent(returnPath)}` : ""

    // Defaults carry the return path so we can jump back to the originating screen
    const DEFAULT_SUCCESS = `${SITE}/settings?status=success${encodedReturn}`
    const DEFAULT_CANCEL  = `${SITE}/settings?status=cancel${encodedReturn}`

    const SAFE_SUCCESS = sameOriginOrNull(successUrl, SITE) ?? DEFAULT_SUCCESS
    const SAFE_CANCEL  = sameOriginOrNull(cancelUrl,  SITE) ?? DEFAULT_CANCEL

    const session = await stripe.checkout.sessions.create({
      mode,
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: SAFE_SUCCESS,
      cancel_url: SAFE_CANCEL,
      billing_address_collection: "auto",
      customer_email: email,
    })

    return {
      statusCode: 200,
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ url: session.url }),
    }
  } catch (err: any) {
    console.error("Stripe error:", err)
    return { statusCode: 500, body: JSON.stringify({ error: err.message }) }
  }
}