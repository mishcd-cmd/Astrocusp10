// netlify/functions/checkout.ts
import type { Handler } from '@netlify/functions';
import Stripe from 'stripe';

// Use your live or test secret key
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY as string, {
  apiVersion: '2022-11-15',
});

export const handler: Handler = async (event) => {
  try {
    if (!process.env.STRIPE_SECRET_KEY) {
      console.error('[checkout] Missing STRIPE_SECRET_KEY');
      return {
        statusCode: 500,
        body: 'Stripe is not configured on the server',
      };
    }

    if (event.httpMethod !== 'POST') {
      return {
        statusCode: 405,
        body: 'Method Not Allowed',
      };
    }

    if (!event.body) {
      return {
        statusCode: 400,
        body: 'Missing request body',
      };
    }

    const body = JSON.parse(event.body);

    const mode: 'subscription' | 'payment' =
      body.mode === 'subscription' ? 'subscription' : 'payment';

    const priceId: string | undefined = body.priceId;
    const successUrl: string | undefined = body.successUrl;
    const cancelUrl: string | undefined = body.cancelUrl;

    if (!priceId || !successUrl || !cancelUrl) {
      console.error('[checkout] Missing required fields', { priceId, successUrl, cancelUrl });
      return {
        statusCode: 400,
        body: 'priceId, successUrl, and cancelUrl are required',
      };
    }

    console.log('[checkout] Creating session', { mode, priceId, successUrl, cancelUrl });

    const session = await stripe.checkout.sessions.create({
      mode,
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      success_url: successUrl,
      cancel_url: cancelUrl,
      // You can add customer_email, metadata etc here if you want
    });

    if (!session.url) {
      console.error('[checkout] No session URL returned from Stripe');
      return {
        statusCode: 500,
        body: 'Failed to create Stripe Checkout session',
      };
    }

    return {
      statusCode: 200,
      body: JSON.stringify({ url: session.url }),
      headers: {
        'Content-Type': 'application/json',
      },
    };
  } catch (error: any) {
    console.error('[checkout] Error creating session', error);
    return {
      statusCode: 500,
      body: error?.message || 'Checkout failed',
    };
  }
};


