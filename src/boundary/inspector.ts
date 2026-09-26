/**
 * CMQ Topology Inspector.
 *
 * Inspects host, container, and Kubernetes deployments to detect:
 * 1. Prohibited credentials leaked into agent environment.
 * 2. Unmediated direct listening sockets and ports.
 * 3. Shell and subprocess escape surface.
 * 4. Local filesystem permissions on secret stores (~/.ssh, ~/.aws, etc.).
 * 5. Network namespace boundaries.
 */

import os from 'node:os';
import fs from 'node:fs';
import path from 'node:path';
import { BoundaryManifest, TopologyFinding, TopologyInspectionReport } from './types.js';

const SENSITIVE_ENV_KEYS = [
  'DATABASE_URL',
  'POSTGRES_PASSWORD',
  'MYSQL_PWD',
  'AWS_SECRET_ACCESS_KEY',
  'GITHUB_TOKEN',
  'GH_TOKEN',
  'OPENAI_API_KEY',
  'ANTHROPIC_API_KEY',
  'SLACK_BOT_TOKEN',
  'VAULT_TOKEN',
];

const SENSITIVE_FILE_PATHS = [
  path.join(os.homedir(), '.ssh/id_rsa'),
  path.join(os.homedir(), '.ssh/id_ed25519'),
  path.join(os.homedir(), '.aws/credentials'),
  path.join(os.homedir(), '.kube/config'),
  '/var/run/secrets/kubernetes.io/serviceaccount/token',
  '/var/run/docker.sock',
];

export async function inspectTopology(
  manifest: BoundaryManifest,
  agentEnv?: NodeJS.ProcessEnv,
): Promise<TopologyInspectionReport> {
  const envToInspect = agentEnv !== undefined ? agentEnv : process.env;
  const findings: TopologyFinding[] = [];

  // 1. Inspect Environment Credentials
  const restrictedKeys = manifest.agent.restrictedEnv || SENSITIVE_ENV_KEYS;
  const foundLeakedKeys: string[] = [];

  for (const key of restrictedKeys) {
    if (envToInspect[key] && String(envToInspect[key]).trim().length > 0) {
      foundLeakedKeys.push(key);
    }
  }

  if (foundLeakedKeys.length > 0) {
    findings.push({
      id: 'FINDING-CRED-01',
      category: 'credentials',
      title: 'Sensitive Credentials Detected in Agent Environment',
      severity: 'FAIL',
      detail: `Agent environment contains ${foundLeakedKeys.length} sensitive secrets (${foundLeakedKeys.join(', ')}). An attacker or confabulating model can independently authenticate directly to protected infrastructure without passing through Mastyf.`,
      remediation: 'Strip credentials from agent process/container; inject authority through Mastyf Gateway headers or Vault integration.',
    });
  } else {
    findings.push({
      id: 'FINDING-CRED-00',
      category: 'credentials',
      title: 'Agent Credential Isolation Verified',
      severity: 'PASS',
      detail: 'No prohibited database or API tokens discovered in agent process environment.',
    });
  }

  // 2. Inspect Filesystem & Secret Store Accessibility
  const exposedFiles: string[] = [];
  for (const fp of SENSITIVE_FILE_PATHS) {
    try {
      if (fs.existsSync(fp)) {
        // Check if agent process can read it
        fs.accessSync(fp, fs.constants.R_OK);
        exposedFiles.push(fp);
      }
    } catch {
      // Inaccessible - good
    }
  }

  if (exposedFiles.length > 0) {
    findings.push({
      id: 'FINDING-FS-01',
      category: 'filesystem',
      title: 'Mounted Secret Stores Accessible by Agent',
      severity: 'WARN',
      detail: `Agent has read access to host credentials: ${exposedFiles.join(', ')}.`,
      remediation: 'Apply container mount masking or restrict Unix file permissions (chmod 600 or unmount in sandbox).',
    });
  } else {
    findings.push({
      id: 'FINDING-FS-00',
      category: 'filesystem',
      title: 'Secret Stores Protected Against Direct Access',
      severity: 'PASS',
      detail: 'No host SSH, AWS, or Kubernetes service account tokens directly accessible in agent sandbox.',
    });
  }

  // 3. Inspect Network Isolation & Protected Services
  const protectedServices = manifest.protectedServices || [];
  for (const s of protectedServices) {
    if (s.endpoint.includes('localhost') || s.endpoint.includes('127.0.0.1')) {
      findings.push({
        id: `FINDING-NET-${s.name}`,
        category: 'network',
        title: `Service "${s.name}" shares Loopback with Agent`,
        severity: 'WARN',
        detail: `Protected endpoint ${s.endpoint} shares the same network loopback as the agent. Direct bypass is possible unless protected tool enforces Mastyf Workload Identity.`,
        remediation: 'Deploy agent and protected tool on isolated bridge networks or distinct Kubernetes namespaces.',
      });
    } else {
      findings.push({
        id: `FINDING-NET-${s.name}-OK`,
        category: 'network',
        title: `Service "${s.name}" Segmented`,
        severity: 'PASS',
        detail: `Endpoint ${s.endpoint} requires gateway network route.`,
      });
    }
  }

  // 4. Inspect Shell Escape Surface
  const allowedCaps = manifest.agent.allowedCapabilities || [];
  const hasShellCap = allowedCaps.some((c) => c.includes('shell') || c.includes('terminal') || c.includes('exec'));

  if (hasShellCap) {
    findings.push({
      id: 'FINDING-SHELL-01',
      category: 'shell',
      title: 'Agent Possesses Shell / Command Execution Capability',
      severity: 'WARN',
      detail: 'Agent has execution capabilities that could be used to launch unmediated network sockets or curl child processes.',
      remediation: 'Constrain tool capability to CBAC digital hall-passes and enforce network egress filtering.',
    });
  } else {
    findings.push({
      id: 'FINDING-SHELL-00',
      category: 'shell',
      title: 'Shell Execution Restricted',
      severity: 'PASS',
      detail: 'Agent does not possess unrestricted shell or terminal execution capabilities.',
    });
  }

  // 5. Inspect Fail-Closed Configuration
  if (manifest.mediation.failClosed) {
    findings.push({
      id: 'FINDING-FAILCLOSED-00',
      category: 'network',
      title: 'Mediation Configured as Fail-Closed',
      severity: 'PASS',
      detail: 'If Mastyf process terminates or crashes, tool calls will abort rather than falling back to direct connection.',
    });
  } else {
    findings.push({
      id: 'FINDING-FAILCLOSED-01',
      category: 'network',
      title: 'Fail-Open Vulnerability Detected',
      severity: 'FAIL',
      detail: 'Mediation policy allows fail-open direct fallback if gateway is unavailable.',
      remediation: 'Set mediation.failClosed: true in boundary manifest.',
    });
  }

  const passCount = findings.filter((f) => f.severity === 'PASS').length;
  const warnCount = findings.filter((f) => f.severity === 'WARN').length;
  const failCount = findings.filter((f) => f.severity === 'FAIL').length;

  let verdict: TopologyInspectionReport['verdict'] = 'INSPECT_PASSED';
  if (failCount > 0) {
    verdict = 'INSPECT_FAILED';
  } else if (warnCount > 0) {
    verdict = 'INSPECT_WARNING';
  }

  return {
    timestamp: new Date().toISOString(),
    deploymentName: manifest.deployment.name,
    platform: manifest.deployment.platform || process.platform,
    checksCount: findings.length,
    passCount,
    warnCount,
    failCount,
    verdict,
    findings,
  };
}
