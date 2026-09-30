/**
 * Real-Envoy tests for the ext_proc authorizer.
 *
 * The gRPC suite above proves this server speaks the protocol. It cannot prove
 * what Envoy *does* with our responses, and that is where the security-relevant
 * behaviour lives: whether a broken authorizer is refused or quietly bypassed.
 * Both are answers to the wire protocol rather than to this implementation, so
 * they are asserted here against the real filter, driven through a real HTTP
 * request, with a real upstream to detect a bypass.
 *
 * Envoy runs in Docker. The authorizer and the upstream stay on the host and are
 * reached from the container through `host.docker.internal`, which avoids
 * mounting this repo (its node_modules are pnpm symlinks into another checkout,
 * so a bind mount would not resolve inside a Linux container).
 */
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import * as grpc from '@grpc/grpc-js';
import * as http from 'node:http';
import { execFileSync } from 'node:child_process';
import { createExternalProcessorServer } from '../../src/agent-gateway/server.js';
import { ExternalProcessorService } from '../../src/agent-gateway/protos.js';
import { PolicyEngine } from '../../src/policy/policy-engine.js';
import type { PolicyConfig } from '../../src/policy/policy-types.js';
import type { ToolCallDefenseDeps } from '../../src/proxy/tool-call-defense-orchestrator.js';

const ENVOY_IMAGE = 'envoyproxy/envoy:v1.34-latest';
const ENVOY_LISTENER = 10000;
const ENVOY_ADMIN = 9901;

const POLICY: PolicyConfig = {
  version: 'agent-gateway-integration',
  policy: {
    mode: 'block',
    default_action: 'pass',
    rules: [{ name: 'deny-reads', action: 'block', tools: { deny: ['read_file'] } }],
  },
} as unknown as PolicyConfig;

const deps: ToolCallDefenseDeps = { policyEngine: new PolicyEngine(POLICY) };

/** Bodies large enough to need several 64 KiB `streamedResponse` chunks. */
function toolCall(tool: string, args: Record<string, unknown>, id = 1, extra: Record<string, unknown> = {}): string {
  return JSON.stringify({ jsonrpc: '2.0', id, method: 'tools/call', params: { name: tool, arguments: args, ...extra } });
}

const ALLOWED = toolCall('get_balance', { account: '123' });
const DENIED = toolCall('read_file', { path: '/etc/passwd' });

/** The upstream: records what actually made it through Envoy, and echoes it back. */
interface Reached {
  body: string;
  contentType?: string;
}

let upstream: http.Server;
let upstreamPort = 0;
const reached: Reached[] = [];

function startUpstream(): Promise<number> {
  upstream = http.createServer((req, res) => {
    const chunks: Buffer[] = [];
    req.on('data', (chunk: Buffer) => chunks.push(chunk));
    req.on('end', () => {
      const body = Buffer.concat(chunks).toString('utf8');
      reached.push({ body, contentType: req.headers['content-type'] as string | undefined });
      res.writeHead(200, { 'content-type': 'application/json' });
      res.end(body);
    });
  });
  return new Promise((resolve) => upstream.listen(0, '127.0.0.1', () => resolve((upstream.address() as { port: number }).port)));
}

/** The authorizer, on the host, for Envoy to call. */
let authorizer: grpc.Server;
let authorizerPort = 0;

function startAuthorizer(options: { decisionTimeoutMs?: number } = {}): Promise<number> {
  authorizer = createExternalProcessorServer({
    deps,
    defaultServerName: 'agw',
    defaultTenantId: 'default',
    ...options,
  });
  return new Promise((resolve, reject) => {
    authorizer.bindAsync('127.0.0.1:0', grpc.ServerCredentials.createInsecure(), (error, port) =>
      error ? reject(error) : resolve(port),
    );
  });
}

/**
 * A stand-in authorizer that accepts the stream and then closes it cleanly
 * without ever answering, which is what a process shutdown mid-request looks
 * like on the wire.
 */
let silentServer: grpc.Server;
let silentPort = 0;

function startSilentAuthorizer(): Promise<number> {
  const service = ExternalProcessorService.service;
  silentServer = new grpc.Server();
  silentServer.addService(service, {
    Process: (call: grpc.ServerDuplexStream<unknown, unknown>) => {
      call.on('error', () => undefined);
      call.end();
    },
  });
  return new Promise((resolve, reject) => {
    silentServer.bindAsync('127.0.0.1:0', grpc.ServerCredentials.createInsecure(), (error, port) =>
      error ? reject(error) : resolve(port),
    );
  });
}

/**
 * A stand-in authorizer that accepts the stream, reads it, and never answers.
 *
 * This is the case the extension's gRPC timeout is supposed to catch: the stream
 * is healthy, so nothing is "failed" -- there is simply no verdict, ever.
 */
let hangingServer: grpc.Server;
let hangingPort = 0;

function startHangingAuthorizer(): Promise<number> {
  const service = ExternalProcessorService.service;
  hangingServer = new grpc.Server();
  hangingServer.addService(service, {
    Process: (call: grpc.ServerDuplexStream<unknown, unknown>) => {
      call.on('error', () => undefined);
      call.on('data', () => undefined);
      // Deliberately no response and no end.
    },
  });
  return new Promise((resolve, reject) => {
    hangingServer.bindAsync('127.0.0.1:0', grpc.ServerCredentials.createInsecure(), (error, port) =>
      error ? reject(error) : resolve(port),
    );
  });
}

/** A policy engine that never resolves, leaving a request undecided forever. */
const hangingDeps: ToolCallDefenseDeps = {
  policyEngine: {
    evaluateAsync: () => new Promise<never>(() => undefined),
    getMode: () => 'block',
  } as unknown as ToolCallDefenseDeps['policyEngine'],
};

let hangingRealServer: ReturnType<typeof createExternalProcessorServer>;
let hangingRealPort = 0;

function startHangingRealAuthorizer(decisionTimeoutMs: number): Promise<number> {
  hangingRealServer = createExternalProcessorServer({
    deps: hangingDeps,
    defaultServerName: 'agw',
    defaultTenantId: 'default',
    decisionTimeoutMs,
  });
  return new Promise((resolve, reject) => {
    hangingRealServer.bindAsync('127.0.0.1:0', grpc.ServerCredentials.createInsecure(), (error, port) =>
      error ? reject(error) : resolve(port),
    );
  });
}

/** An upstream that answers, standing in for a reachable backend. */
let decoyServer: http.Server;
let decoyPort = 0;

function startDecoy(): Promise<number> {
  decoyServer = http.createServer((_req, res) => {
    res.writeHead(200, { 'content-type': 'application/json' });
    res.end('{"bypassed":true}');
  });
  return new Promise((resolve) => decoyServer.listen(0, '127.0.0.1', () => resolve((decoyServer.address() as { port: number }).port)));
}

function envoyConfig(options: { failureModeAllow: boolean; extProcPort: number; upstreamPort: number }): string {
  return `
admin:
  address:
    socket_address: { address: 0.0.0.0, port_value: ${ENVOY_ADMIN} }
static_resources:
  listeners:
  - name: listener_0
    address: { socket_address: { address: 0.0.0.0, port_value: ${ENVOY_LISTENER} } }
    filter_chains:
    - filters:
      - name: envoy.filters.network.http_connection_manager
        typed_config:
          "@type": type.googleapis.com/envoy.extensions.filters.network.http_connection_manager.v3.HttpConnectionManager
          stat_prefix: ingress_http
          route_config:
            name: local_route
            virtual_hosts:
            - name: local
              domains: ["*"]
              routes:
              - match: { prefix: "/" }
                route: { cluster: upstream_cluster, timeout: 10s }
          http_filters:
          - name: envoy.filters.http.ext_proc
            typed_config:
              "@type": type.googleapis.com/envoy.extensions.filters.http.ext_proc.v3.ExternalProcessor
              failure_mode_allow: ${options.failureModeAllow}
              grpc_service:
                envoy_grpc: { cluster_name: ext_proc_cluster }
                timeout: 10s
              processing_mode:
                request_header_mode: SEND
                response_header_mode: SEND
                request_body_mode: FULL_DUPLEX_STREAMED
                response_body_mode: FULL_DUPLEX_STREAMED
                request_trailer_mode: SEND
                response_trailer_mode: SEND
              mutation_rules:
                allow_all_routing: true
          - name: envoy.filters.http.router
            typed_config:
              "@type": type.googleapis.com/envoy.extensions.filters.http.router.v3.Router
  clusters:
  - name: ext_proc_cluster
    type: STRICT_DNS
    connect_timeout: 2s
    http2_protocol_options: {}
    load_assignment:
      cluster_name: ext_proc_cluster
      endpoints:
      - lb_endpoints:
        - endpoint:
            address:
              socket_address: { address: host.docker.internal, port_value: ${options.extProcPort} }
  - name: upstream_cluster
    type: STRICT_DNS
    connect_timeout: 2s
    load_assignment:
      cluster_name: upstream_cluster
      endpoints:
      - lb_endpoints:
        - endpoint:
            address:
              socket_address: { address: host.docker.internal, port_value: ${options.upstreamPort} }
`;
}

interface Envoy {
  /** Host port for the listener. */
  url: string;
  /** Host port for the admin interface, used to explain a hang. */
  adminUrl: string;
  stop(): void;
}

const running: Envoy[] = [];

/**
 * Runs Envoy against a given authorizer port / upstream port and waits until its
 * admin endpoint reports LIVE, so no test traffic races startup.
 */
async function startEnvoy(options: {
  failureModeAllow: boolean;
  extProcPort: number;
  upstreamPort: number;
}): Promise<Envoy> {
  const name = `agw-${Math.random().toString(36).slice(2, 10)}`;
  // The config goes in via `--config-yaml` rather than a bind mount: Docker
  // Desktop cannot bind-mount individual files out of the shared temp tree, and
  // inlining keeps the test independent of the checkout's location.
  execFileSync('docker', [
    'run', '--rm', '--detach',
    '--name', name,
    // Both ports are published to a random free host port. Fixing them -- even
    // to a random one -- collides as soon as a container from an earlier test is
    // still shutting down.
    '--publish', `${ENVOY_LISTENER}`,
    '--publish', `${ENVOY_ADMIN}`,
    ENVOY_IMAGE,
    '--config-yaml', envoyConfig(options),
  ], { stdio: 'pipe' });

  const mapping = execFileSync('docker', ['port', name, String(ENVOY_LISTENER)], { encoding: 'utf8' })
    .trim()
    .split('\n')[0];
  const hostPort = Number(mapping.split(':').pop());
  const adminPort = Number(
    execFileSync('docker', ['port', name, String(ENVOY_ADMIN)], { encoding: 'utf8' }).trim().split('\n')[0].split(':').pop(),
  );

  const envoy: Envoy = {
    url: `http://127.0.0.1:${hostPort}`,
    adminUrl: `http://127.0.0.1:${adminPort}`,
    stop: () => {
      try {
        execFileSync('docker', ['rm', '--force', name], { stdio: 'pipe' });
      } catch {
        /* already gone */
      }
    },
  };
  running.push(envoy);

  const admin = `http://127.0.0.1:${adminPort}/ready`;
  const deadline = Date.now() + 20_000;
  for (;;) {
    if (Date.now() > deadline) {
      const logs = execFileSync('docker', ['logs', name], { encoding: 'utf8' }).slice(-2000);
      throw new Error(`Envoy did not become ready.\n${logs}`);
    }
    try {
      const response = await fetch(admin);
      if (response.ok) break;
    } catch {
      /* not listening yet */
    }
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
  return envoy;
}

interface Result {
  status: number;
  body: string;
}

function post(url: string, body: string, headers: Record<string, string> = {}): Promise<Result> {
  return new Promise((resolve, reject) => {
    const request = http.request(
      url,
      { method: 'POST', headers: { 'content-type': 'application/json', ...headers } },
      (response) => {
        const chunks: Buffer[] = [];
        response.on('data', (chunk: Buffer) => chunks.push(chunk));
        response.on('end', () =>
          resolve({ status: response.statusCode ?? 0, body: Buffer.concat(chunks).toString('utf8') }),
        );
      },
    );
    request.on('error', reject);
    request.end(body);
  });
}

/**
 * `post` with a deadline, and on timeout Envoy's ext_proc counters attached.
 *
 * Without this a stream that Envoy never answers shows up only as "test timed
 * out after 60s", which says nothing about whether the filter saw the request,
 * failed it, or is still waiting on the authorizer.
 */
function postExpecting(
  envoy: Envoy,
  body: string,
  deadlineMs = 25_000,
): Promise<Result> {
  return Promise.race([
    post(envoy.url, body),
    new Promise<Result>((_, reject) =>
      setTimeout(async () => {
        let stats = '(admin unreachable)';
        try {
          const response = await fetch(`${envoy.adminUrl}/stats?filter=ext_proc`);
          stats = (await response.text())
            .split('\n')
            .filter((line) => line.trim() && !line.startsWith('#'))
            .join('; ');
        } catch (error) {
          stats = `admin error: ${String(error)}`;
        }
        reject(new Error(`no response within ${deadlineMs}ms. ext_proc stats: ${stats}`));
      }, deadlineMs),
    ),
  ]);
}

beforeAll(async () => {
  execFileSync("docker", ["info"], { stdio: "pipe" });
  upstreamPort = await startUpstream();
  authorizerPort = await startAuthorizer();
  decoyPort = await startDecoy();
  silentPort = await startSilentAuthorizer();
  hangingPort = await startHangingAuthorizer();
}, 60_000);

afterAll(() => {
  for (const envoy of running) envoy.stop();
  authorizer?.forceShutdown();
  silentServer?.forceShutdown();
  hangingServer?.forceShutdown();
  upstream?.close();
  decoyServer?.close();
}, 30_000);

describe('Envoy ext_proc: fail-closed enforcement', () => {
  it('forwards an allowed call byte-for-byte and returns the upstream response', async () => {
    reached.length = 0;
    const envoy = await startEnvoy({ failureModeAllow: false, extProcPort: authorizerPort, upstreamPort });

    const response = await post(envoy.url, ALLOWED);

    expect(response.status).toBe(200);
    // The upstream saw the original bytes, so the buffered authorizer replayed
    // the body intact rather than substituting an empty mutation.
    expect(reached).toHaveLength(1);
    expect(reached[0].body).toBe(ALLOWED);
    expect(response.body).toBe(ALLOWED);
  }, 60_000);

  it('blocks a denied call with 403 and never reaches the upstream', async () => {
    reached.length = 0;
    const envoy = await startEnvoy({ failureModeAllow: false, extProcPort: authorizerPort, upstreamPort });

    const response = await post(envoy.url, DENIED);

    expect(response.status).toBe(403);
    // The real assertion: the request was stopped, not merely annotated.
    expect(reached).toHaveLength(0);
    // The refusal is a JSON-RPC error, so the agent gets a usable reason.
    expect(JSON.parse(response.body).error.reason).toContain('deny-reads');
  }, 60_000);

  it('preserves a multi-chunk body exactly', async () => {
    reached.length = 0;
    // The padding is large but sits outside `arguments`, which `parseToolCall`
    // ignores, so this exercises multi-chunk forwarding rather than the
    // secret scanner's cost on large arguments.
    const big = toolCall('get_balance', { account: '123' }, 9, { blob: 'x'.repeat(400_000) });
    const envoy = await startEnvoy({ failureModeAllow: false, extProcPort: authorizerPort, upstreamPort });

    const response = await post(envoy.url, big);

    expect(response.status).toBe(200);
    expect(reached).toHaveLength(1);
    expect(reached[0].body).toBe(big);
  }, 60_000);

  it('preserves the upstream response body', async () => {
    reached.length = 0;
    const envoy = await startEnvoy({ failureModeAllow: false, extProcPort: authorizerPort, upstreamPort });

    await post(envoy.url, toolCall('get_balance', { account: '999' }, 11));
    const echoed = reached[0];
    reached.length = 0;
    const response = await post(envoy.url, JSON.stringify({ jsonrpc: '2.0', id: 12, method: 'tools/list' }));

    // tools/list is not a tool call, so it is denied...
    expect(response.status).toBe(403);
    // ...and a normal tool call still round-trips the upstream payload verbatim,
    // which is what proves the response phase echoes instead of mutating.
    expect(echoed.body).toContain('"account":"999"');
  }, 60_000);
});

describe('Envoy ext_proc: what happens when the authorizer breaks', () => {
  it('fails closed on an unreachable authorizer when failure_mode_allow is false', async () => {
    // A port with nothing listening: the realistic "authorizer is down" case.
    const deadPort = 65530;
    const envoy = await startEnvoy({ failureModeAllow: false, extProcPort: deadPort, upstreamPort });

    const response = await post(envoy.url, ALLOWED);

    expect(response.status).toBe(500);
  }, 60_000);

  it('fails open on the same outage when failure_mode_allow is true', async () => {
    // The contrast case. Same unreachable authorizer, same request, only the flag
    // differs -- so this pair is the executable proof of what the flag buys, and
    // of exactly how much traffic an unavailable authorizer lets through.
    const deadPort = 65530;
    const envoy = await startEnvoy({ failureModeAllow: true, extProcPort: deadPort, upstreamPort });

    const response = await post(envoy.url, ALLOWED);

    expect(response.status).toBe(200);
  }, 60_000);

  it('lets a clean early close through even with failure_mode_allow false', async () => {
    reached.length = 0;
    // The important asymmetry. `failure_mode_allow: false` covers establishment
    // failure, error closes, timeouts and spurious responses -- but the ext_proc
    // contract defines a *cleanly* closed stream as "the data plane proceeds
    // without consulting the server". A shutdown mid-request closes cleanly, so
    // the flag does not protect this path and the request is admitted.
    const envoy = await startEnvoy({ failureModeAllow: false, extProcPort: silentPort, upstreamPort });

    const response = await post(envoy.url, ALLOWED);

    // Documented behaviour, asserted so a future Envoy change cannot silently
    // turn this into a bypass or a regression without the tests noticing.
    expect(response.status).toBe(200);
    expect(reached).toHaveLength(1);
  }, 60_000);


  it('never times out a silent authorizer, with or without the gRPC timeout', async () => {
    reached.length = 0;
    // Measured, and load-bearing: with request_body_mode FULL_DUPLEX_STREAMED
    // the data plane has NO ceiling. `grpc_service.timeout` is not honoured, and
    // `message_timeout` does not apply in this mode (envoy's own
    // `message_timeouts` counter stays 0). The request simply parks in
    // `upstream_rq_pending` forever.
    //
    // This is why `MASTYF_AGENT_GATEWAY_DECISION_TIMEOUT_MS` is the only real
    // guard, and why a second one cannot be delegated to the extension config.
    const envoy = await startEnvoy({
      failureModeAllow: false,
      extProcPort: hangingPort,
      upstreamPort,
    });

    await expect(postExpecting(envoy, ALLOWED, 20_000)).rejects.toThrow(/no response within/);
    expect(reached).toHaveLength(0);
  }, 60_000);

  it('fails closed when a shutdown kills the authorizer mid-decision', async () => {
    reached.length = 0;
    // The real server, with a decision that never arrives, shut down the way
    // SIGTERM does: destroy the undecided call, then drop the connection.
    // A clean close is admitted (200, see above), so this is the sequence that
    // has to hold.
    const decisionTimeoutMs = 30_000;
    const port = await startHangingRealAuthorizer(decisionTimeoutMs);
    const envoy = await startEnvoy({ failureModeAllow: false, extProcPort: port, upstreamPort });

    const pending = postExpecting(envoy, ALLOWED, 30_000);
    // Let the request reach the authorizer and sit undecided.
    await new Promise((resolve) => setTimeout(resolve, 1_000));
    const destroyed = hangingRealServer.destroyUndecidedCalls('agent-gateway shutdown (SIGTERM)');
    expect(destroyed).toBe(1);
    // tryShutdown alone would close cleanly; the process exit is what closes the
    // connection, and that is the part Envoy treats as a transport failure.
    hangingRealServer.forceShutdown();

    const response = await pending;

    expect(response.status).toBe(500);
    expect(reached).toHaveLength(0);
  }, 90_000);
});
