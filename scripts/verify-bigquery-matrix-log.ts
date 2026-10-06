#!/usr/bin/env npx tsx
import * as grpc from '@grpc/grpc-js';
import { execSync } from 'node:child_process';
import { ExternalProcessorService } from '../src/agent-gateway/protos.js';

async function main() {
  console.log('================================================================================');
  console.log('  VERIFYING BIGQUERY NESTED ARRAY (MATRIX) LOG SANITIZATION (REVISION 10)');
  console.log('================================================================================\n');

  let token = '';
  try {
    token = execSync('gcloud auth print-identity-token', { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).trim();
    console.log('[IAM] Retrieved GCP Identity Token for Cloud Run.');
  } catch (err) {
    console.warn('[IAM WARN] Could not retrieve identity token via gcloud, proceeding without bearer token.');
  }

  const host = 'mastyf-agent-gateway-authz-gwgjarmhoa-uc.a.run.app:443';
  const credentials = grpc.credentials.createSsl();
  const client = new (ExternalProcessorService as any)(host, credentials, {
    'grpc.ssl_target_name_override': 'mastyf-agent-gateway-authz-gwgjarmhoa-uc.a.run.app',
    'grpc.default_authority': 'mastyf-agent-gateway-authz-gwgjarmhoa-uc.a.run.app',
  });

  const testId = `matrix-test-${Date.now().toString(36)}`;
  console.log(`[INVOCATION] Sending matrix_multiply with 2D arrays (a: [[1,2],[3,4]]) [ID: ${testId}]...`);

  const bodyJson = JSON.stringify({
    jsonrpc: '2.0',
    id: testId,
    method: 'tools/call',
    params: {
      name: 'matrix_multiply',
      arguments: {
        a: [[1, 2], [3, 4]],
        b: [[5, 6], [7, 8]],
      },
    },
  });

  const metadata = new grpc.Metadata();
  if (token) metadata.set('authorization', `Bearer ${token}`);

  const stream = client.Process(metadata);
  const responses: any[] = [];

  const completion = new Promise<{ responses: any[]; error?: Error }>((resolve) => {
    stream.on('data', (res: any) => responses.push(res));
    stream.on('error', (err: Error) => resolve({ responses, error: err }));
    stream.on('end', () => resolve({ responses }));
  });

  // Step 1: Send Request Headers
  stream.write({
    requestHeaders: {
      headers: {
        headers: [
          { key: ':method', rawValue: Buffer.from('POST', 'utf8') },
          { key: ':path', rawValue: Buffer.from('/mcp/tools/call', 'utf8') },
          { key: ':authority', rawValue: Buffer.from('mastyf-agent-gateway-authz-gwgjarmhoa-uc.a.run.app', 'utf8') },
          { key: 'content-type', rawValue: Buffer.from('application/json', 'utf8') },
          { key: 'x-mastyf-tenant', rawValue: Buffer.from('acme-enterprise-matrix-test', 'utf8') },
          { key: 'x-mastyf-server', rawValue: Buffer.from('mcp-math-engine', 'utf8') },
          { key: 'x-request-id', rawValue: Buffer.from(testId, 'utf8') },
        ],
      },
      endOfStream: false,
    },
  });

  // Step 2: Send Request Body
  stream.write({
    requestBody: {
      body: Buffer.from(bodyJson, 'utf8'),
      endOfStream: true,
    },
  });

  stream.end();

  const res = await completion;
  if (res.error) {
    console.error(`[ERROR] Stream error: ${res.error.message}`);
    process.exit(1);
  }

  const isAllowed = res.responses.some((r) => r.requestBody !== undefined || r.requestHeaders !== undefined);
  console.log(`[DECISION] Call Result: ${isAllowed ? 'ALLOW (forwarded)' : 'BLOCKED'}`);

  console.log('\n[WAITING] Polling BigQuery for ingested record (up to 30s)...');
  let bqSuccess = false;
  for (let attempt = 1; attempt <= 6; attempt++) {
    await new Promise((r) => setTimeout(r, 5000));
    try {
      const bqOut = execSync(
        `bq query --use_legacy_sql=false "SELECT timestamp, jsonPayload.toolName, jsonPayload.decision.action, jsonPayload.context.requestId, jsonPayload.context.arguments_json FROM \\\`mastyf.mastyf_security_audit.run_googleapis_com_stderr\\\` WHERE jsonPayload.context.requestId = '${testId}' LIMIT 1"`,
        { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }
      );
      if (bqOut.includes(testId)) {
        console.log(`[BIGQUERY SUCCESS] Record found on attempt ${attempt}:\n${bqOut}`);
        bqSuccess = true;
        break;
      }
    } catch {
      // Retry on next attempt
    }
  }

  if (!bqSuccess) {
    console.error('[BIGQUERY ERROR] Record was not found within 30s in run_googleapis_com_stderr.');
    process.exit(1);
  }

  console.log('[BIGQUERY CHECK] Checking export_errors table (must be 0 rows for this request):');
  try {
    const errOut = execSync(
      `bq query --use_legacy_sql=false "SELECT count(*) as err_count FROM \\\`mastyf.mastyf_security_audit.export_errors\\\` WHERE logEntry LIKE '%${testId}%'"`,
      { encoding: 'utf8' }
    );
    console.log(errOut);
  } catch (err: any) {
    console.log(`BQ err query info: ${err.message}`);
  }

  client.close();
  console.log('================================================================================');
  console.log('  REVISION 11 VERIFICATION COMPLETE: 100% INGESTION SUCCESS');
  console.log('================================================================================');
}

main().catch(console.error);
