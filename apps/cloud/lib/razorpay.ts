import { createHmac, timingSafeEqual } from 'crypto';

/**
 * Razorpay's Orders API and signature checks (Standard Checkout). Server only: the key secret
 * signs and verifies payments, so it never leaves this module's callers.
 * https://razorpay.com/docs/payments/payment-gateway/web-integration/standard/integration-steps/
 */

const RAZORPAY_API = 'https://api.razorpay.com/v1';

type Env = Record<string, string | undefined>;

export type RazorpayCredentials = { keyId: string; keySecret: string };

/** The API key pair, or null when payments are not configured on this deployment. */
export function razorpayCredentials(env: Env = process.env): RazorpayCredentials | null {
  const keyId = env.RAZORPAY_KEY_ID?.trim();
  const keySecret = env.RAZORPAY_KEY_SECRET?.trim();
  return keyId && keySecret ? { keyId, keySecret } : null;
}

export class RazorpayApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message);
    this.name = 'RazorpayApiError';
  }
}

export type RazorpayOrder = { id: string; amount: number; currency: string };

/** POST /v1/orders. `amount` is in paise; Razorpay's minimum is 100. */
export async function createRazorpayOrder(
  credentials: RazorpayCredentials,
  input: { amount: number; currency: string; receipt: string; notes?: Record<string, string> },
): Promise<RazorpayOrder> {
  if (!Number.isInteger(input.amount) || input.amount < 100) {
    throw new RazorpayApiError('Amount must be a whole number of paise, at least 100', 400);
  }
  const auth = Buffer.from(`${credentials.keyId}:${credentials.keySecret}`).toString('base64');
  const res = await fetch(`${RAZORPAY_API}/orders`, {
    method: 'POST',
    headers: { Authorization: `Basic ${auth}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ ...input, receipt: input.receipt.slice(0, 40) }),
    cache: 'no-store',
  });
  const body = (await res.json().catch(() => null)) as
    | (RazorpayOrder & { error?: { description?: string } })
    | null;
  if (!res.ok || !body?.id) {
    throw new RazorpayApiError(body?.error?.description || `Razorpay returned HTTP ${res.status}`, res.status);
  }
  return { id: body.id, amount: body.amount, currency: body.currency };
}

function hmacMatches(payload: string, secret: string, signature: string): boolean {
  const expected = Buffer.from(createHmac('sha256', secret).update(payload).digest('hex'));
  const given = Buffer.from(signature);
  return expected.length === given.length && timingSafeEqual(expected, given);
}

/** Checkout success: HMAC-SHA256(order_id + "|" + payment_id, key secret) must equal razorpay_signature. */
export function verifyPaymentSignature(
  payment: { orderId: string; paymentId: string; signature: string },
  keySecret: string,
): boolean {
  return hmacMatches(`${payment.orderId}|${payment.paymentId}`, keySecret, payment.signature);
}

/** Webhooks: HMAC-SHA256 of the raw request body with the webhook secret (X-Razorpay-Signature). */
export function verifyWebhookSignature(rawBody: string, signature: string, webhookSecret: string): boolean {
  return hmacMatches(rawBody, webhookSecret, signature);
}

type WebhookEntity = { id?: string; order_id?: string };
export type RazorpayWebhook = {
  event?: string;
  payload?: { payment?: { entity?: WebhookEntity }; order?: { entity?: WebhookEntity } };
};

/** The order and payment behind an event that means "money captured"; null for other events. */
export function paidOrderFromEvent(event: RazorpayWebhook): { orderId: string; paymentId: string } | null {
  const payment = event.payload?.payment?.entity;
  if (event.event === 'order.paid') {
    const orderId = event.payload?.order?.entity?.id ?? payment?.order_id;
    return orderId && payment?.id ? { orderId, paymentId: payment.id } : null;
  }
  if (event.event === 'payment.captured') {
    return payment?.order_id && payment.id ? { orderId: payment.order_id, paymentId: payment.id } : null;
  }
  return null;
}
