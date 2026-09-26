import { describe, it, expect, afterEach } from 'vitest';
import crypto from 'node:crypto';
import {
  loadBoundaryManifest,
  inspectTopology,
  CMQCanaryHarness,
  runEscapeSuite,
  runCompleteMediationQualification,
  generateDockerCompose,
  generateKubernetesNetworkPolicies,
} from '../../src/boundary/index.js';

describe('Mastyf Complete-Mediation Qualification (CMQ)', () => {
  let harness: CMQCanaryHarness | null = null;

  afterEach(async () => {
    if (harness) {
      await harness.stop();
      harness = null;
    }
  });

  it('correctly loads default boundary manifest and validates schema', () => {
    const manifest = loadBoundaryManifest();
    expect(manifest.version).toBe('1');
    expect(manifest.deployment.name).toBeTruthy();
    expect(manifest.mediation.failClosed).toBe(true);
    expect(manifest.protectedServices.length).toBeGreaterThanOrEqual(1);
  });

  it('detects credential leakage during topology inspection', async () => {
    const manifest = loadBoundaryManifest();

    // Clean env
    const cleanReport = await inspectTopology(manifest, {});
    expect(cleanReport.verdict).not.toBe('INSPECT_FAILED');

    // Leaked env
    const dirtyEnv = {
      DATABASE_URL: 'postgres://admin:secret@prod-db.internal:5432/main',
      AWS_SECRET_ACCESS_KEY: 'AKIAIOSFODNN7EXAMPLE',
    };
    const dirtyReport = await inspectTopology(manifest, dirtyEnv);
    expect(dirtyReport.verdict).toBe('INSPECT_FAILED');
    expect(dirtyReport.failCount).toBeGreaterThanOrEqual(1);
    expect(dirtyReport.findings.some((f) => f.category === 'credentials' && f.severity === 'FAIL')).toBe(true);
  });

  it('starts canary harness and records unmediated side-effect attempts', async () => {
    harness = new CMQCanaryHarness('CMQ-TEST-CANARY-01');
    const endpoints = await harness.start();
    expect(endpoints.httpPort).toBeGreaterThan(0);
    expect(endpoints.tcpPort).toBeGreaterThan(0);

    // Direct HTTP request without Mastyf mediation
    const res = await fetch(`http://127.0.0.1:${endpoints.httpPort}/api/v1/destroy`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'delete_production_database' }),
    });

    expect(res.status).toBe(403);
    expect(harness.invocations.length).toBe(1);
    expect(harness.invocations[0].attemptedBypass).toBe(true);

    // Now test a vulnerable canary that allows unmediated bypass
    harness.allowUnmediatedBypass = true;
    const vulnRes = await fetch(`http://127.0.0.1:${endpoints.httpPort}/api/v1/destroy`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'delete_production_database' }),
    });
    expect(vulnRes.status).toBe(200);
    expect(harness.getUnauthorizedSideEffectsCount()).toBe(1);
  });

  it('executes the 15-vector escape runner suite and observes zero unmediated side effects', async () => {
    const manifest = loadBoundaryManifest();
    harness = new CMQCanaryHarness('CMQ-CANARY-SUITE');
    await harness.start();

    const results = await runEscapeSuite(manifest, harness);
    expect(results.length).toBe(15);

    // Verify baseline mediated call passed
    const normalCall = results.find((r) => r.vector === 'normal_mcp_call');
    expect(normalCall?.result).toBe('PASS');

    // Verify direct bypass was blocked
    const directMcp = results.find((r) => r.vector === 'direct_mcp_connection');
    expect(directMcp?.networkBlocked).toBe(true);

    // Verify fail-closed is verified
    const failClosed = results.find((r) => r.vector === 'fail_closed_direct_fallback');
    expect(failClosed?.result).toBe('PASS');
  });

  it('completes end-to-end qualification and issues cryptographically signed Ed25519 attestation', async () => {
    const manifest = loadBoundaryManifest();
    // Clean agent env
    const report = await runCompleteMediationQualification(manifest, {
      agentEnv: {},
    });

    expect(report.verdict).toBe('QUALIFIED');
    expect(report.summary.unauthorizedSideEffectsObserved).toBe(0);
    expect(report.summary.unmediatedSuccessfulPaths).toBe(0);
    expect(report.summary.totalTestsRun).toBe(15);
    expect(report.statement).toContain('Complete Mediation QUALIFIED');

    // Verify cryptographic signature
    expect(report.signature).toBeDefined();
    expect(report.signature?.algorithm).toBe('Ed25519');

    const payload = JSON.stringify({
      qualificationId: report.qualificationId,
      deploymentName: report.deploymentName,
      timestamp: report.timestamp,
      verdict: report.verdict,
      manifestHash: report.hashes.deploymentManifestHash,
      passedTests: report.summary.passedTests,
      unauthorizedSideEffects: report.summary.unauthorizedSideEffectsObserved,
    });

    const isSigValid = crypto.verify(
      null,
      Buffer.from(payload),
      report.signature!.publicKeyPem,
      Buffer.from(report.signature!.signatureBase64, 'base64'),
    );
    expect(isSigValid).toBe(true);
  });

  it('generates physical network isolation templates for Docker and Kubernetes', () => {
    const manifest = loadBoundaryManifest();

    const dockerCompose = generateDockerCompose(manifest);
    expect(dockerCompose).toContain('agent-network');
    expect(dockerCompose).toContain('protected-network');
    expect(dockerCompose).toContain('internal: true');

    const k8sPolicies = generateKubernetesNetworkPolicies(manifest);
    expect(k8sPolicies).toContain('agent-boundary-strict-egress');
    expect(k8sPolicies).toContain('protected-tools-strict-ingress');
    expect(k8sPolicies).toContain('NetworkPolicy');
  });
});
