import { NextResponse } from 'next/server';
import { fulfillOrder } from '@/lib/billing/fulfillment';
import { paidOrderFromEvent, verifyWebhookSignature, type RazorpayWebhook } from '@/lib/razorpay';

export const dynamic = 'force-dynamic';

/**
 * POST /api/webhooks/razorpay — activates a paid order even when the buyer closed the tab
 * before the Checkout handler ran. Subscribe to `order.paid` (and optionally
 * `payment.captured`) in the Razorpay dashboard with RAZORPAY_WEBHOOK_SECRET.
 */
export async function POST(request: Request) {
  const secret = process.env.RAZORPAY_WEBHOOK_SECRET?.trim();
  if (!secret) {
    console.error('[Razorpay Webhook] RAZORPAY_WEBHOOK_SECRET is not configured');
    return NextResponse.json({ error: 'Webhook secret is not configured' }, { status: 500 });
  }

  const rawBody = await request.text();
  const signature = request.headers.get('x-razorpay-signature') ?? '';
  if (!signature || !verifyWebhookSignature(rawBody, signature, secret)) {
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 });
  }

  let event: RazorpayWebhook;
  try {
    event = JSON.parse(rawBody) as RazorpayWebhook;
  } catch {
    return NextResponse.json({ error: 'Malformed JSON payload' }, { status: 400 });
  }

  const paid = paidOrderFromEvent(event);
  if (!paid) return NextResponse.json({ received: true, ignored: event.event ?? 'unknown' });

  try {
    const result = await fulfillOrder(paid.orderId, paid.paymentId);
    // Orders created outside this app (e.g. in the Razorpay dashboard) are not ours to fulfil.
    return NextResponse.json({ received: true, status: result.status });
  } catch (error) {
    console.error('[Razorpay Webhook] could not fulfil order', paid, error);
    // A 5xx makes Razorpay retry the delivery.
    return NextResponse.json({ error: 'Could not record the payment' }, { status: 500 });
  }
}
