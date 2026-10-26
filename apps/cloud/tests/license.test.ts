import { describe, expect, it } from 'vitest';
import { cloudSsoFeatures } from '../lib/license';

describe('cloud SSO helpers', () => {
  it('includes all features for SSO exchange', () => {
    expect(cloudSsoFeatures()).toContain('dashboard');
    expect(cloudSsoFeatures()).toContain('websocket');
  });
});
