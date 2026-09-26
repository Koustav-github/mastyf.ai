/**
 * CMQ CLI Command Implementations.
 *
 * Provides `mastyf boundary` subcommands:
 * - inspect
 * - test
 * - qualify
 * - report
 * - template
 */

import fs from 'node:fs';
import path from 'node:path';
import chalk from 'chalk';
import { loadBoundaryManifest } from './manifest.js';
import { inspectTopology } from './inspector.js';
import { CMQCanaryHarness } from './canary-harness.js';
import { runEscapeSuite } from './escape-runner.js';
import { runCompleteMediationQualification, formatTerminalReport } from './qualifier.js';
import { generateDockerCompose, generateKubernetesNetworkPolicies } from './templates.js';

export async function handleBoundaryInspect(opts: { manifest?: string }): Promise<void> {
  const manifest = loadBoundaryManifest(opts.manifest);
  console.log(chalk.bold(`\nScanning deployment topology for: ${manifest.deployment.name}...`));

  const report = await inspectTopology(manifest);

  console.log(chalk.dim('─'.repeat(70)));
  for (const f of report.findings) {
    const icon =
      f.severity === 'PASS'
        ? chalk.green('✓')
        : f.severity === 'WARN'
          ? chalk.yellow('⚠')
          : chalk.red('✗');
    console.log(`${icon} [${f.category.toUpperCase()}] ${chalk.bold(f.title)}`);
    console.log(`   ${chalk.dim(f.detail)}`);
    if (f.remediation) {
      console.log(`   ${chalk.cyan('Remediation:')} ${f.remediation}`);
    }
  }
  console.log(chalk.dim('─'.repeat(70)));

  const verdictColor =
    report.verdict === 'INSPECT_PASSED'
      ? chalk.green.bold('INSPECT PASSED')
      : report.verdict === 'INSPECT_WARNING'
        ? chalk.yellow.bold('INSPECT WARNING')
        : chalk.red.bold('INSPECT FAILED');

  console.log(`Verdict: ${verdictColor} (${report.passCount} pass, ${report.warnCount} warn, ${report.failCount} fail)\n`);
}

export async function handleBoundaryTest(opts: { manifest?: string; canaryId?: string }): Promise<void> {
  const manifest = loadBoundaryManifest(opts.manifest);
  console.log(chalk.bold(`\nSpawning CMQ Canary Harness and testing 15 boundary escape vectors...`));

  const harness = new CMQCanaryHarness(opts.canaryId);
  const endpoints = await harness.start();

  console.log(chalk.dim(`Canary active: HTTP port ${endpoints.httpPort}, TCP port ${endpoints.tcpPort}`));

  try {
    const results = await runEscapeSuite(manifest, harness);
    console.log(chalk.dim('─'.repeat(70)));
    for (const r of results) {
      const icon = r.result === 'PASS' ? chalk.green('✓') : chalk.red('✗');
      console.log(`${icon} ${chalk.bold(r.title)} ➔ ${r.result === 'PASS' ? chalk.green('BLOCKED') : chalk.red('BYPASSED')}`);
      console.log(`   ${chalk.dim(r.details)}`);
    }
    console.log(chalk.dim('─'.repeat(70)));

    const unauthorized = harness.getUnauthorizedSideEffectsCount();
    if (unauthorized === 0) {
      console.log(chalk.green.bold(`✓ SUCCESS: 0 unauthorized side-effects observed outside Mastyf.\n`));
    } else {
      console.log(chalk.red.bold(`✗ VIOLATION: ${unauthorized} unauthorized side-effects reached canary directly!\n`));
    }
  } finally {
    await harness.stop();
  }
}

export async function handleBoundaryQualify(opts: {
  manifest?: string;
  output?: string;
  json?: boolean;
}): Promise<void> {
  const manifest = loadBoundaryManifest(opts.manifest);
  console.log(chalk.bold(`\nExecuting Complete-Mediation Qualification (CMQ) on: ${manifest.deployment.name}...`));

  const report = await runCompleteMediationQualification(manifest);

  if (opts.json) {
    console.log(JSON.stringify(report, null, 2));
  } else {
    console.log(formatTerminalReport(report));
  }

  const outputPath = opts.output || path.join(process.cwd(), 'cmq-attestation.json');
  fs.writeFileSync(outputPath, JSON.stringify(report, null, 2), 'utf-8');
  console.log(chalk.dim(`Cryptographic attestation certificate saved to: ${outputPath}\n`));

  if (report.verdict !== 'QUALIFIED') {
    process.exitCode = 1;
  }
}

export async function handleBoundaryReport(opts: { cert?: string }): Promise<void> {
  const certPath = opts.cert || path.join(process.cwd(), 'cmq-attestation.json');
  if (!fs.existsSync(certPath)) {
    console.error(chalk.red(`No CMQ attestation found at ${certPath}. Run 'mastyf boundary qualify' first.`));
    process.exitCode = 1;
    return;
  }

  try {
    const raw = fs.readFileSync(certPath, 'utf-8');
    const report = JSON.parse(raw);
    console.log(formatTerminalReport(report));
  } catch (err) {
    console.error(chalk.red(`Failed to parse attestation certificate: ${String(err)}`));
    process.exitCode = 1;
  }
}

export async function handleBoundaryTemplate(opts: {
  manifest?: string;
  type?: 'docker' | 'k8s' | 'all';
  outputDir?: string;
}): Promise<void> {
  const manifest = loadBoundaryManifest(opts.manifest);
  const outDir = opts.outputDir || process.cwd();
  const templateType = opts.type || 'all';

  if (templateType === 'docker' || templateType === 'all') {
    const dockerContent = generateDockerCompose(manifest);
    const dockerPath = path.join(outDir, 'docker-compose.boundary.yml');
    fs.writeFileSync(dockerPath, dockerContent, 'utf-8');
    console.log(chalk.green(`✓ Generated Docker dual-network isolation template: ${dockerPath}`));
  }

  if (templateType === 'k8s' || templateType === 'all') {
    const k8sContent = generateKubernetesNetworkPolicies(manifest);
    const k8sPath = path.join(outDir, 'k8s-network-policy.yaml');
    fs.writeFileSync(k8sPath, k8sContent, 'utf-8');
    console.log(chalk.green(`✓ Generated Kubernetes strict NetworkPolicy template: ${k8sPath}`));
  }
}
