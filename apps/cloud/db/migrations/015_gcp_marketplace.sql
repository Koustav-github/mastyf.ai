-- Migration 015: Google Cloud Marketplace Procurement Integration
CREATE TABLE IF NOT EXISTS gcp_marketplace_accounts (
  id TEXT PRIMARY KEY,
  org_id TEXT REFERENCES organizations(id) ON DELETE SET NULL,
  billing_account_id TEXT,
  state TEXT NOT NULL DEFAULT 'ACCOUNT_PENDING_APPROVAL',
  raw_payload TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS gcp_marketplace_entitlements (
  id TEXT PRIMARY KEY,
  account_id TEXT NOT NULL,
  org_id TEXT REFERENCES organizations(id) ON DELETE SET NULL,
  plan_id TEXT,
  offer_id TEXT,
  state TEXT NOT NULL DEFAULT 'ENTITLEMENT_PENDING_APPROVAL',
  usage_reporting_id TEXT,
  raw_payload TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_gcp_marketplace_accounts_org_id ON gcp_marketplace_accounts(org_id);
CREATE INDEX IF NOT EXISTS idx_gcp_marketplace_entitlements_org_id ON gcp_marketplace_entitlements(org_id);
CREATE INDEX IF NOT EXISTS idx_gcp_marketplace_entitlements_account_id ON gcp_marketplace_entitlements(account_id);
