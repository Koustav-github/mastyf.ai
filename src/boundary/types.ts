/**
 * Mastyf Complete-Mediation Qualification (CMQ) Type Definitions.
 *
 * Formal verification that an autonomous agent has no usable path
 * to a protected side effect except through Mastyf.
 */

export interface ProtectedServiceSpec {
  name: string;
  endpoint: string;
  protocol: 'mcp' | 'http' | 'https' | 'postgres' | 'tcp' | 'uds';
  requiredAuth?: string;
  expectedWorkloadIdentity?: string;
}

export interface BoundaryManifest {
  version: string;
  deployment: {
    name: string;
    environment?: 'local' | 'docker' | 'kubernetes' | 'production' | string;
    platform?: 'darwin' | 'linux' | 'win32' | 'container' | string;
  };
  agent: {
    identity: string;
    network?: string;
    allowedCapabilities?: string[];
    restrictedEnv?: string[];
  };
  protectedServices: ProtectedServiceSpec[];
  mediation: {
    gateway: string;
    allowedIngress?: string[];
    allowedEgress?: string[];
    udsSocketPath?: string;
    mTLS?: boolean;
    failClosed: boolean;
  };
  credentials: {
    agentAccess: 'none' | string[];
    gatewayAccess: string[];
    canaryToken?: string;
  };
}

export interface TopologyFinding {
  id: string;
  category: 'network' | 'credentials' | 'socket' | 'shell' | 'process' | 'filesystem';
  title: string;
  severity: 'PASS' | 'WARN' | 'FAIL';
  detail: string;
  remediation?: string;
}

export interface TopologyInspectionReport {
  timestamp: string;
  deploymentName: string;
  platform: string;
  checksCount: number;
  passCount: number;
  warnCount: number;
  failCount: number;
  verdict: 'INSPECT_PASSED' | 'INSPECT_WARNING' | 'INSPECT_FAILED';
  findings: TopologyFinding[];
}

export type CMQEscapeVector =
  | 'normal_mcp_call'
  | 'direct_mcp_connection'
  | 'direct_http_api'
  | 'alternate_hostname_ip'
  | 'ipv6_bypass'
  | 'unix_socket_direct'
  | 'shell_escape'
  | 'subprocess_spawn'
  | 'env_credential_leak'
  | 'mounted_secrets_leak'
  | 'reused_credentials'
  | 'tool_chaining_escape'
  | 'concurrent_race_evasion'
  | 'fail_closed_direct_fallback'
  | 'tool_identity_spoofing';

export interface CMQSingleTestResult {
  vector: CMQEscapeVector;
  title: string;
  target: string;
  mediated: boolean;
  sideEffectObserved: boolean;
  networkBlocked: boolean;
  credentialDenied: boolean;
  result: 'PASS' | 'FAIL' | 'INCONCLUSIVE';
  details: string;
}

export type CMQQualificationVerdict = 'QUALIFIED' | 'NOT_QUALIFIED' | 'INCONCLUSIVE';

export interface CMQAttestationReport {
  qualificationId: string;
  version: string;
  deploymentName: string;
  timestamp: string;
  scope: string;
  summary: {
    protectedServicesCount: number;
    totalTestsRun: number;
    passedTests: number;
    failedTests: number;
    inconclusiveTests: number;
    unauthorizedSideEffectsObserved: number;
    unmediatedSuccessfulPaths: number;
  };
  verdict: CMQQualificationVerdict;
  statement: string;
  testResults: CMQSingleTestResult[];
  inspection: TopologyInspectionReport;
  hashes: {
    deploymentManifestHash: string;
    testSuiteVersion: string;
  };
  signature?: {
    algorithm: string;
    publicKeyPem: string;
    signatureBase64: string;
  };
}
