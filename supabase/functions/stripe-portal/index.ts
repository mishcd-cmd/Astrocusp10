import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const ORIGIN_FALLBACK = "https://www.astrocusp.com.au";
const STRIPE_SECRET = Deno.env.get("STRIPE_SECRET_KEY");
const PORTAL_RETURN_URL = Deno.env.get("PORTAL_RETURN_URL") || ORIGIN_FALLBACK;

function corsHeaders(origin: string | null): Headers {
  const h = new Headers();
  h.set("Access-Control-Allow-Origin", origin || Deno.env.get("ALLOWED_ORIGIN") || ORIGIN_FALLBACK);
  h.set("Access-Control-Allow-Headers", "authorization, x-client-info, apikey, content-type");
  h.set("Access-Control-Allow-Methods", "POST, OPTIONS");
  h.set("Access-Control-Allow-Credentials", "true");
  h.set("Access-Control-Max-Age", "86400");
  h.set("Vary", "Origin");
  return h;
}

function okJson(data: unknown, origin: string | null, status = 200) {
  const h = corsHeaders(origin);
  h.set("Content-Type", "application/json; charset=utf-8");
  return new Response(JSON.stringify(data), { status, headers: h });
}

function errJson(message: string, origin: string | null, status = 400) {
  return okJson({ error: message }, origin, status);
}

Deno.serve(async (req) => {
  const origin = req.headers.get("Origin");

  if (req.method === "OPTIONS") {
    return new Response("ok", { status: 200, headers: corsHeaders(origin) });
  }
  if (req.method !== "POST") {
    return errJson("Method not allowed", origin, 405);
  }
  if (!STRIPE_SECRET) {
    return errJson("Server misconfigured (STRIPE_SECRET_KEY)", origin, 500);
  }

  const auth = req.headers.get("Authorization") || "";
  const token = auth.startsWith("Bearer ") ? auth.slice(7) : null;
  if (!token) return errJson("Missing bearer token", origin, 401);

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY");
  if (!supabaseUrl || !supabaseAnonKey) {
    return errJson("Server misconfigured (SUPABASE_URL/ANON_KEY)", origin, 500);
  }

  const userRes = await fetch(`${supabaseUrl}/auth/v1/user`, {
    headers: { Authorization: `Bearer ${token}`, apikey: supabaseAnonKey },
  });
  if (!userRes.ok) return errJson("Invalid or expired token", origin, 401);

  const user = await userRes.json().catch(() => null);
  const email = user?.email as string | undefined;
  const userId = user?.id as string | undefined;
  if (!userId) return errJson("Auth user missing", origin, 401);

  // find/create customer
  let customerId: string | null = null;
  const search = await fetch("https://api.stripe.com/v1/customers/search", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${STRIPE_SECRET}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({ query: `email:"${email}"` }),
  });
  if (search.ok) {
    const s = await search.json();
    if (s?.data?.length > 0) customerId = s.data[0].id;
  }
  if (!customerId) {
    const createRes = await fetch("https://api.stripe.com/v1/customers", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${STRIPE_SECRET}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({
        email: email ?? "",
        "metadata[supabase_user_id]": userId,
      }),
    });
    if (!createRes.ok) {
      const txt = await createRes.text();
      return errJson(`Stripe customer create failed: ${txt}`, origin, 500);
    }
    const c = await createRes.json();
    customerId = c.id;
  }

  const portalRes = await fetch("https://api.stripe.com/v1/billing_portal/sessions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${STRIPE_SECRET}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({
      customer: customerId!,
      return_url: PORTAL_RETURN_URL,
    }),
  });
  if (!portalRes.ok) {
    const txt = await portalRes.text();
    return errJson(`Stripe portal error: ${txt}`, origin, 500);
  }

  const portal = await portalRes.json();
  return okJson({ url: portal.url }, origin, 200);
});
