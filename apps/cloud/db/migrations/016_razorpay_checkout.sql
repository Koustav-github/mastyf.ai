-- Migration 016: Razorpay Standard Checkout. Each paid order buys 30 days of a plan for a
-- workspace (licenses) and keeps the buyer's Shield license key (commercial_entitlements) valid.

CREATE TABLE IF NOT EXISTS razorpay_orders (
  id TEXT PRIMARY KEY, -- Razorpay order id (order_...)
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  org_id TEXT NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  plan TEXT NOT NULL, -- developer, team
  amount INTEGER NOT NULL CHECK (amount >= 100), -- paise
  currency TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'created' CHECK (status IN ('created', 'paid')),
  payment_id TEXT UNIQUE,
  paid_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_razorpay_orders_org ON razorpay_orders(org_id);
CREATE INDEX IF NOT EXISTS idx_razorpay_orders_user ON razorpay_orders(user_id);

-- Keys we issue ourselves carry their own paid-through time; Lemon Squeezy keys keep NULL.
ALTER TABLE commercial_entitlements ADD COLUMN IF NOT EXISTS source TEXT NOT NULL DEFAULT 'lemonsqueezy';
ALTER TABLE commercial_entitlements ADD COLUMN IF NOT EXISTS expires_at TIMESTAMPTZ;
