import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { GcpProcurementClient } from '../lib/gcp-procurement';
import { POST as webhookPost } from '../app/api/webhooks/gcp-marketplace/route';
import { POST as resolvePost } from '../app/api/marketplace/google/resolve/route';
import { NextRequest } from 'next/server';

describe('Google Cloud Marketplace Integration', () => {
  const originalFetch = global.fetch;

  beforeEach(() => {
    process.env.GCP_MARKETPLACE_ACCESS_TOKEN = 'test-mock-token';
    process.env.GCP_MARKETPLACE_PROVIDER_ID = 'test-provider';
  });

  afterEach(() => {
    global.fetch = originalFetch;
    vi.restoreAllMocks();
  });

  describe('GcpProcurementClient', () => {
    it('normalizes resource names and calls approve on entitlement', async () => {
      const fetchMock = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({}),
      });
      global.fetch = fetchMock as any;

      const client = new GcpProcurementClient('test-provider');
      await client.approveEntitlement('ent-abc-123');

      expect(fetchMock).toHaveBeenCalledWith(
        'https://cloudcommerceprocurement.googleapis.com/v1/providers/test-provider/entitlements/ent-abc-123:approve',
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({
            Authorization: 'Bearer test-mock-token',
          }),
        })
      );
    });

    it('resolves JWT token to GCP account resource', async () => {
      const fetchMock = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          account: 'providers/test-provider/accounts/acc-xyz-987',
        }),
      });
      global.fetch = fetchMock as any;

      const client = new GcpProcurementClient('test-provider');
      const res = await client.resolveAccount('mock-jwt-token');

      expect(res.account).toBe('providers/test-provider/accounts/acc-xyz-987');
      expect(fetchMock).toHaveBeenCalledWith(
        'https://cloudcommerceprocurement.googleapis.com/v1/providers/test-provider/accounts:resolve',
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify({ token: 'mock-jwt-token' }),
        })
      );
    });
  });

  describe('Webhook Route Handler (Pub/Sub)', () => {
    it('handles ENTITLEMENT_CREATION_REQUESTED and auto-approves', async () => {
      const fetchMock = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({}),
      });
      global.fetch = fetchMock as any;

      const eventPayload = {
        eventId: 'evt-001',
        eventType: 'ENTITLEMENT_CREATION_REQUESTED',
        entitlement: { id: 'ent-123', planId: 'starter' },
        account: { id: 'acc-456' },
      };

      const pubsubBody = {
        message: {
          data: Buffer.from(JSON.stringify(eventPayload)).toString('base64'),
          messageId: 'msg-999',
        },
      };

      const req = new NextRequest('http://localhost:3000/api/webhooks/gcp-marketplace', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(pubsubBody),
      });

      const response = await webhookPost(req);
      const resJson = await response.json();

      expect(response.status).toBe(200);
      expect(resJson.status).toBe('ACK');
      expect(resJson.eventId).toBe('evt-001');

      // Verified approveEntitlement was called
      expect(fetchMock).toHaveBeenCalledWith(
        'https://cloudcommerceprocurement.googleapis.com/v1/providers/test-provider/entitlements/ent-123:approve',
        expect.any(Object)
      );
    });

    it('rejects invalid Pub/Sub message payloads with 400', async () => {
      const req = new NextRequest('http://localhost:3000/api/webhooks/gcp-marketplace', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({}),
      });

      const response = await webhookPost(req);
      expect(response.status).toBe(400);
    });
  });

  describe('Token Resolution Route Handler', () => {
    it('resolves valid token and returns account details', async () => {
      const fetchMock = vi.fn().mockImplementation((url: string) => {
        if (url.includes(':resolve')) {
          return Promise.resolve({
            ok: true,
            json: async () => ({ account: 'providers/test-provider/accounts/acc-001' }),
          });
        }
        if (url.includes(':approve')) {
          return Promise.resolve({
            ok: true,
            json: async () => ({}),
          });
        }
        return Promise.resolve({
          ok: true,
          json: async () => ({
            name: 'providers/test-provider/accounts/acc-001',
            state: 'ACCOUNT_ACTIVE',
            billingAccountId: 'billing-999',
          }),
        });
      });
      global.fetch = fetchMock as any;

      const req = new NextRequest('http://localhost:3000/api/marketplace/google/resolve', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ token: 'mock-valid-jwt' }),
      });

      const response = await resolvePost(req);
      const resJson = await response.json();

      expect(response.status).toBe(200);
      expect(resJson.success).toBe(true);
      expect(resJson.account).toBe('providers/test-provider/accounts/acc-001');
      expect(resJson.billingAccountId).toBe('billing-999');
    });

    it('returns 400 when token is missing', async () => {
      const req = new NextRequest('http://localhost:3000/api/marketplace/google/resolve', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({}),
      });

      const response = await resolvePost(req);
      expect(response.status).toBe(400);
    });
  });
});
