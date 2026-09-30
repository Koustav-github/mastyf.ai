/**
 * Tests for the capability artifact + drift gate (phase 3, item 9).
 *
 * The property: a capability that silently loses `live` must block the deploy,
 * and the refusal must be a named reason rather than an unexplained crashloop.
 * These exercise the real filesystem, because a gate that only works against a
 * stubbed fs is not the gate that runs in the container.
 */
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdtemp, readFile, writeFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { publishCapabilityArtifact } from '../../src/agent-gateway/index.js';
import { setAgenticContainer } from '../../src/utils/agentic-container.js';
import {
  buildCapabilityReport,
  buildCapabilityArtifact,
  type CapabilityArtifact,
} from '../../src/agent-gateway/capabilities.js';

const KEYS = [
  'MASTYF_AGENT_GATEWAY_CAPABILITY_REPORT',
  'MASTYF_AGENT_GATEWAY_CAPABILITY_BASELINE',
  'MASTYF_AI_AGENTIC_ENABLED',
  'DB_TYPE',
  'MASTYF_AI_DB_PATH',
] as const;

let saved: Record<string, string | undefined> = {};
let dir = '';

beforeEach(async () => {
  saved = {};
  for (const k of KEYS) {
    saved[k] = process.env[k];
    delete process.env[k];
  }
  process.env['DB_TYPE'] = 'sqlite';
  process.env['MASTYF_AI_DB_PATH'] = '/var/mastyf/history.db';
  setAgenticContainer(null);
  dir = await mkdtemp(join(tmpdir(), 'cap-artifact-'));
});

afterEach(async () => {
  for (const k of KEYS) {
    if (saved[k] === undefined) delete process.env[k];
    else process.env[k] = saved[k] as string;
  }
  setAgenticContainer(null);
  await rm(dir, { recursive: true, force: true });
});

const report = () => buildCapabilityReport({ requestTokensMode: 'zeroed' });

describe('capability artifact', () => {
  it('does nothing when neither path is configured', async () => {
    expect(await publishCapabilityArtifact(report())).toBeNull();
  });

  it('writes a parseable artifact, creating parent directories', async () => {
    const target = join(dir, 'nested', 'deep', 'capabilities.json');
    process.env['MASTYF_AGENT_GATEWAY_CAPABILITY_REPORT'] = target;
    expect(await publishCapabilityArtifact(report())).toBeNull();

    const parsed = JSON.parse(await readFile(target, 'utf8')) as CapabilityArtifact;
    expect(parsed.schemaVersion).toBe(1);
    expect(Array.isArray(parsed.capabilities)).toBe(true);
    expect(parsed.capabilities.length).toBeGreaterThan(0);
    expect(parsed).toEqual(buildCapabilityArtifact(report()));
  });

  it('names the failure instead of crashing when the target is unwritable', async () => {
    process.env['MASTYF_AGENT_GATEWAY_CAPABILITY_REPORT'] = join(dir, 'capabilities.json');
    // A path whose parent is an existing *file* cannot be created.
    const blocker = join(dir, 'blocker');
    await writeFile(blocker, 'x', 'utf8');
    process.env['MASTYF_AGENT_GATEWAY_CAPABILITY_REPORT'] = join(blocker, 'capabilities.json');

    const err = await publishCapabilityArtifact(report());
    expect(err).toBeTruthy();
    expect(err).toMatch(/failed to write the capability artifact/i);
  });
});

describe('capability drift gate', () => {
  it('passes when the live report matches the baseline byte for byte', async () => {
    const baseline = join(dir, 'baseline.json');
    await writeFile(baseline, JSON.stringify(buildCapabilityArtifact(report()), null, 2), 'utf8');
    process.env['MASTYF_AGENT_GATEWAY_CAPABILITY_BASELINE'] = baseline;
    expect(await publishCapabilityArtifact(report())).toBeNull();
  });

  it('blocks and explains when a capability drops out of live', async () => {
    const baseline = join(dir, 'baseline.json');
    // Baseline captured with a wired agentic container => certification `live`.
    setAgenticContainer({} as never);
    const live = buildCapabilityReport({ requestTokensMode: 'zeroed' });
    await writeFile(baseline, JSON.stringify(buildCapabilityArtifact(live), null, 2), 'utf8');
    setAgenticContainer(null);
    process.env['MASTYF_AGENT_GATEWAY_CAPABILITY_BASELINE'] = baseline;

    // Now the container is gone: certification silently becomes unavailable.
    const err = await publishCapabilityArtifact(report());
    expect(err).toBeTruthy();
    expect(err).toMatch(/capability drift/i);
    expect(err).toMatch(/mcp-certification: live -> unavailable/i);
  });

  it('blocks on an unreadable or malformed baseline rather than serving blind', async () => {
    process.env['MASTYF_AGENT_GATEWAY_CAPABILITY_BASELINE'] = join(dir, 'nope.json');
    expect(await publishCapabilityArtifact(report())).toMatch(/could not read/i);

    const junk = join(dir, 'junk.json');
    await writeFile(junk, '{"nope": true}', 'utf8');
    process.env['MASTYF_AGENT_GATEWAY_CAPABILITY_BASELINE'] = junk;
    expect(await publishCapabilityArtifact(report())).toMatch(/not a capability artifact/i);
  });

  it('writes the artifact even while refusing, so the failure is diagnosable', async () => {
    const baseline = join(dir, 'baseline.json');
    const artifact = join(dir, 'out.json');
    setAgenticContainer({} as never);
    await writeFile(baseline, JSON.stringify(buildCapabilityArtifact(buildCapabilityReport({ requestTokensMode: 'zeroed' })), null, 2), 'utf8');
    setAgenticContainer(null);

    process.env['MASTYF_AGENT_GATEWAY_CAPABILITY_BASELINE'] = baseline;
    process.env['MASTYF_AGENT_GATEWAY_CAPABILITY_REPORT'] = artifact;
    expect(await publishCapabilityArtifact(report())).toMatch(/drift/i);
    expect(JSON.parse(await readFile(artifact, 'utf8'))).toEqual(buildCapabilityArtifact(report()));
  });
});
