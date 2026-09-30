/**
 * Tests for the strict-mode startup precondition (phase 1, item 6).
 *
 * The property: enabling fail-closed dependency handling without the shared
 * state that makes it meaningful must be refused *by name*, before the container
 * is built, rather than discovered as a `process.exit(1)` from several frames
 * inside `createContainer` -- which presents as an unexplained crashloop.
 */
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { strictModePrecondition } from '../../src/agent-gateway/index.js';

const KEYS = [
  'MASTYF_AI_STRICT_MODE',
  'REDIS_URL',
  'REDIS_SENTINELS',
  'REDIS_CLUSTER_NODES',
  'REPLICA_COUNT',
  'KUBERNETES_SERVICE_HOST',
] as const;

let saved: Record<string, string | undefined> = {};

beforeEach(() => {
  saved = {};
  for (const k of KEYS) {
    saved[k] = process.env[k];
    delete process.env[k];
  }
});

afterEach(() => {
  for (const k of KEYS) {
    if (saved[k] === undefined) delete process.env[k];
    else process.env[k] = saved[k] as string;
  }
});

describe('strict mode requires shared state when scaled', () => {
  it('refuses strict mode with no Redis on multiple replicas', () => {
    process.env['MASTYF_AI_STRICT_MODE'] = 'true';
    process.env['REPLICA_COUNT'] = '3';
    const reason = strictModePrecondition();
    expect(reason).toBeTruthy();
    // The message has to name the fix, or an operator is left guessing.
    expect(reason).toMatch(/REDIS_URL/);
    expect(reason).toMatch(/REPLICA_COUNT=3/);
  });

  it('refuses in Kubernetes even at a nominal single replica', () => {
    process.env['MASTYF_AI_STRICT_MODE'] = 'true';
    process.env['KUBERNETES_SERVICE_HOST'] = '10.0.0.1';
    expect(strictModePrecondition()).toBeTruthy();
  });

  it('accepts strict mode with Redis on multiple replicas', () => {
    process.env['MASTYF_AI_STRICT_MODE'] = 'true';
    process.env['REPLICA_COUNT'] = '3';
    process.env['REDIS_URL'] = 'redis://cache:6379';
    expect(strictModePrecondition()).toBeNull();
  });

  it('accepts either sentinel or cluster configuration', () => {
    process.env['MASTYF_AI_STRICT_MODE'] = 'true';
    process.env['REPLICA_COUNT'] = '2';
    process.env['REDIS_SENTINELS'] = 'a:26379,b:26379';
    expect(strictModePrecondition()).toBeNull();

    delete process.env['REDIS_SENTINELS'];
    process.env['REDIS_CLUSTER_NODES'] = 'n1:6379,n2:6379';
    expect(strictModePrecondition()).toBeNull();
  });

  it('allows a single replica without Redis, where in-process state is complete', () => {
    // Not an oversight: with one replica the LRU caches are the entire world, so
    // there is no cross-replica divergence for strict mode to guard against.
    process.env['MASTYF_AI_STRICT_MODE'] = 'true';
    process.env['REPLICA_COUNT'] = '1';
    expect(strictModePrecondition()).toBeNull();
  });

  it('does not apply when strict mode is off', () => {
    process.env['REPLICA_COUNT'] = '5';
    process.env['KUBERNETES_SERVICE_HOST'] = '10.0.0.1';
    expect(strictModePrecondition()).toBeNull();
  });
});
