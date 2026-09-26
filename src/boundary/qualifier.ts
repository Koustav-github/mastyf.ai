/**
 * CMQ Qualifier Engine.
 *
 * Runs the end-to-end Complete-Mediation Qualification process:
 * 1. Topology Inspection
 * 2. Canary Escape Suite Execution
 * 3. Side-Effect Invariant Verification
 * 4. Ed25519 Cryptographic Attestation Generation
 */

import crypto from 'node:crypto';
import chalk from 'chalk';
import { BoundaryManifest, CMQAttestationReport, CMQQualificationVerdict } from './types.js';
import { CMQCanaryHarness } from './canary-harness.js';
import { inspectTopology } from './inspector.js';
import { runEscapeSuite } from './escape-runner.js';

export async function runCompleteMediationQualification(
  manifest: BoundaryManifest,
  opts: {
    canaryId?: string;
    agentEnv?: NodeJS.ProcessEnv;
  } = {},
): Promise<CMQAttestationReport> {
  const qualificationId = `cmq_${crypto.randomBytes(6).toString('hex')}`;
  const timestamp = new Date().toISOString();

  // 1. Run Topology Inspection
  const inspection = await inspectTopology(manifest, opts.agentEnv);

  // 2. Start Canary Harness
  const harness = new CMQCanaryHarness(opts.canaryId);
  await harness.start();

  let testResults: import('./types.js').CMQSingleTestResult[] = [];
  try {
    // 3. Execute Escape Suite
    testResults = await runEscapeSuite(manifest, harness, opts.agentEnv);
  } finally {
    // 4. Shutdown Canary Harness
    await harness.stop();
  }

  // 5. Invariant Evaluation
  const unauthorizedSideEffects = harness.getUnauthorizedSideEffectsCount();
  const failedTests = testResults.filter((t) => t.result === 'FAIL').length;
  const passedTests = testResults.filter((t) => t.result === 'PASS').length;
  const inconclusiveTests = testResults.filter((t) => t.result === 'INCONCLUSIVE').length;
  const unmediatedSuccessfulPaths = testResults.filter((t) => !t.mediated && t.result === 'FAIL').length;

  let verdict: CMQQualificationVerdict = 'QUALIFIED';
  let statement = `Complete Mediation QUALIFIED — No unmediated execution paths or unauthorized side effects observed across the defined test suite for deployment "${manifest.deployment.name}".`;

  if (unauthorizedSideEffects > 0 || unmediatedSuccessfulPaths > 0 || failedTests > 0) {
    verdict = 'NOT_QUALIFIED';
    statement = `Complete Mediation FAILED — ${unauthorizedSideEffects} unauthorized side-effects observed outside Mastyf or ${failedTests} boundary tests failed.`;
  } else if (inspection.verdict === 'INSPECT_FAILED') {
    verdict = 'NOT_QUALIFIED';
    statement = `Complete Mediation FAILED — Deployment topology inspection failed critical boundary checks.`;
  }

  // 6. Generate Deterministic Deployment & Policy Hashes
  const manifestHash = crypto
    .createHash('sha256')
    .update(JSON.stringify(manifest))
    .digest('hex');

  // 7. Cryptographic Signature (Ed25519)
  const { publicKey, privateKey } = crypto.generateKeyPairSync('ed25519');
  const payloadToSign = JSON.stringify({
    qualificationId,
    deploymentName: manifest.deployment.name,
    timestamp,
    verdict,
    manifestHash,
    passedTests,
    unauthorizedSideEffects,
  });

  const signature = crypto.sign(null, Buffer.from(payloadToSign), privateKey);

  const report: CMQAttestationReport = {
    qualificationId,
    version: '1.0.0-cmq',
    deploymentName: manifest.deployment.name,
    timestamp,
    scope: `Tested deployment configuration "${manifest.deployment.name}" (${manifest.deployment.environment || 'local'}) only.`,
    summary: {
      protectedServicesCount: manifest.protectedServices.length,
      totalTestsRun: testResults.length,
      passedTests,
      failedTests,
      inconclusiveTests,
      unauthorizedSideEffectsObserved: unauthorizedSideEffects,
      unmediatedSuccessfulPaths,
    },
    verdict,
    statement,
    testResults,
    inspection,
    hashes: {
      deploymentManifestHash: manifestHash,
      testSuiteVersion: 'v1.0.0 (15 escape vectors)',
    },
    signature: {
      algorithm: 'Ed25519',
      publicKeyPem: publicKey.export({ type: 'spki', format: 'pem' }).toString(),
      signatureBase64: signature.toString('base64'),
    },
  };

  return report;
}

export function formatTerminalReport(report: CMQAttestationReport): string {
  const isQualified = report.verdict === 'QUALIFIED';
  const lines: string[] = [];

  lines.push('');
  lines.push(
    chalk.bold(
      isQualified
        ? chalk.bgGreen.black(' COMPLETE MEDIATION: QUALIFIED ')
        : chalk.bgRed.white(' COMPLETE MEDIATION: NOT QUALIFIED '),
    ),
  );
  lines.push(chalk.dim('─'.repeat(72)));
  lines.push(`${chalk.bold('Qualification ID:')} ${report.qualificationId}`);
  lines.push(`${chalk.bold('Deployment:')}       ${report.deploymentName}`);
  lines.push(`${chalk.bold('Scope:')}            ${report.scope}`);
  lines.push(`${chalk.bold('Timestamp:')}        ${report.timestamp}`);
  lines.push(chalk.dim('─'.repeat(72)));

  lines.push(chalk.bold('TOPOLOGY INSPECTION'));
  for (const f of report.inspection.findings) {
    const icon =
      f.severity === 'PASS'
        ? chalk.green('✓')
        : f.severity === 'WARN'
          ? chalk.yellow('⚠')
          : chalk.red('✗');
    lines.push(`  ${icon} [${f.category.toUpperCase()}] ${chalk.bold(f.title)}`);
    lines.push(`     ${chalk.dim(f.detail)}`);
  }

  lines.push('');
  lines.push(chalk.bold('ESCAPE VECTOR TEST RESULTS (15 VECTORS)'));
  for (const t of report.testResults) {
    const icon =
      t.result === 'PASS'
        ? chalk.green('✓')
        : t.result === 'WARN' as any
          ? chalk.yellow('⚠')
          : chalk.red('✗');
    const statusText =
      t.result === 'PASS'
        ? chalk.green('PASS')
        : t.result === 'WARN' as any
          ? chalk.yellow('WARN')
          : chalk.red('FAIL');

    lines.push(`  ${icon} ${chalk.bold(t.title)} ➔ ${statusText}`);
    lines.push(`     Target: ${chalk.cyan(t.target)} · ${chalk.dim(t.details)}`);
  }

  lines.push(chalk.dim('─'.repeat(72)));
  lines.push(chalk.bold('ATTESTATION SUMMARY'));
  lines.push(`  • Protected services:             ${report.summary.protectedServicesCount}`);
  lines.push(`  • Total escape tests executed:     ${report.summary.totalTestsRun}`);
  lines.push(`  • Tests passed:                   ${chalk.green(report.summary.passedTests)}`);
  lines.push(
    `  • Tests failed:                   ${
      report.summary.failedTests > 0 ? chalk.red(report.summary.failedTests) : chalk.green('0')
    }`,
  );
  lines.push(
    `  • Unauthorized side-effects:      ${
      report.summary.unauthorizedSideEffectsObserved > 0
        ? chalk.red.bold(report.summary.unauthorizedSideEffectsObserved)
        : chalk.green.bold('0')
    }`,
  );
  lines.push(
    `  • Unmediated successful paths:    ${
      report.summary.unmediatedSuccessfulPaths > 0
        ? chalk.red.bold(report.summary.unmediatedSuccessfulPaths)
        : chalk.green.bold('0')
    }`,
  );
  lines.push(chalk.dim('─'.repeat(72)));

  if (report.signature) {
    lines.push(chalk.bold('CRYPTOGRAPHIC PROOF'));
    lines.push(`  Algorithm:  ${report.signature.algorithm}`);
    lines.push(`  Signature:  ${report.signature.signatureBase64.slice(0, 32)}...`);
    lines.push(`  Statement:  ${chalk.italic(report.statement)}`);
  }
  lines.push('');

  return lines.join('\n');
}
