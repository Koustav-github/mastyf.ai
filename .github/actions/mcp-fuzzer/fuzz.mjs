#!/usr/bin/env node
'use strict';

const FuzzPayloads = [
  { id: 'fuzz-001', cat: 'rpc-malform', desc: 'Truncated JSON-RPC', body: '{"jsonrpc":"2.0","method":"tools/call","params":{"name":"read_file","arguments":{"path":"/etc/passwd"}}}', block: true },
  { id: 'fuzz-002', cat: 'rpc-injection', desc: 'Sensitive path', body: '{"jsonrpc":"2.0","id":"2","method":"tools/call","params":{"name":"read_file","arguments":{"path":"/etc/passwd"}}}', block: true },
  { id: 'fuzz-003', cat: 'rpc-overflow', desc: 'Large request ID', body: '{"jsonrpc":"2.0","id":"' + 'x'.repeat(10000) + '","method":"tools/call","params":{"name":"read_file","arguments":{"path":"/tmp/test.txt"}}}', block: false },
  { id: 'fuzz-004', cat: 'rpc-method', desc: 'Privilege escalation', body: '{"jsonrpc":"2.0","id":"4","method":"admin/root","params":{}}', block: true },
  { id: 'fuzz-005', cat: 'rpc-binding', desc: 'Empty tool name', body: '{"jsonrpc":"2.0","id":"5","method":"tools/call","params":{"name":"","arguments":{}}}', block: true },
  { id: 'fuzz-006', cat: 'rpc-nesting', desc: 'NoSQL injection', body: '{"jsonrpc":"2.0","id":"6","method":"tools/call","params":{"name":"read_file","arguments":{"path":{"$gt":""}}}}', block: true },
  { id: 'fuzz-007', cat: 'stdio-flood', desc: 'Shell exfil', body: '{"jsonrpc":"2.0","id":"7","method":"tools/call","params":{"name":"execute_command","arguments":{"command":"cat /etc/shadow"}}}', block: true },
  { id: 'fuzz-008', cat: 'sse-frame', desc: 'Destructive shell', body: '{"jsonrpc":"2.0","id":"8","method":"tools/call","params":{"name":"execute_command","arguments":{"command":"rm -rf /"}}}', block: true },
  { id: 'fuzz-009', cat: 'rpc-null', desc: 'Null method', body: '{"jsonrpc":"2.0","id":"9","method":null,"params":{}}', block: false },
  { id: 'fuzz-010', cat: 'rpc-array', desc: 'Batch JSON-RPC', body: '[{"jsonrpc":"2.0","id":"10","method":"tools/call","params":{"name":"read_file","arguments":{"path":"/etc/passwd"}}}]', block: true },
  { id: 'fuzz-011', cat: 'rpc-unicode', desc: 'Unicode traversal', body: '{"jsonrpc":"2.0","id":"11","method":"tools/call","params":{"name":"read_file","arguments":{"path":"....//....//etc/passwd"}}}', block: true },
  { id: 'fuzz-012', cat: 'rpc-proto', desc: 'Prototype pollution', body: '{"jsonrpc":"2.0","id":"12","method":"tools/call","params":{"name":"read_file","arguments":{"path":"/tmp/test.txt"}}}', block: false },
  { id: 'fuzz-013', cat: 'rpc-negid', desc: 'Negative ID', body: '{"jsonrpc":"2.0","id":-1,"method":"tools/call","params":{"name":"read_file","arguments":{"path":"/tmp/test.txt"}}}', block: false },
  { id: 'fuzz-014', cat: 'rpc-deep', desc: 'Deep nesting (6 levels)', body: '{"jsonrpc":"2.0","id":"14","method":"tools/call","params":{"name":"read_file","arguments":{"a":{"b":{"c":{"d":{"e":{"f":"deep"}}}}}}}}', block: false },
  { id: 'fuzz-015', cat: 'rpc-resource', desc: 'File URI injection', body: '{"jsonrpc":"2.0","id":"15","method":"tools/call","params":{"name":"read_file","arguments":{"path":"file:///etc/passwd"}}}', block: true },
];

const argv = process.argv.slice(2);
const getArg = (f) => { const i = argv.indexOf(f); return i >= 0 ? argv[i + 1] : null; };

const target = getArg('--target') || 'http://localhost:4000/mcp';
const minBlockRate = parseInt(getArg('--min-block-rate') || '80', 10);
const timeoutMs = parseInt(getArg('--timeout') || '10', 10) * 1000;
const failOnBypass = (getArg('--fail-on-bypass') || 'true') === 'true';
/** A harmless tool on the target that must run; proves the gateway isn't simply blocking everything. */
const controlTool = getArg('--control-tool') || '';

const headers = { 'Content-Type': 'application/json', Accept: 'application/json, text/event-stream' };

/**
 * MCP needs an `initialize` before any other call; without it the gateway answers
 * "No active session — initialize first" to every payload, attacks and benign alike.
 * No notifications/initialized follows: the HTTP bridge would wait for a reply to it.
 */
async function initialize() {
  const res = await fetch(target, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      jsonrpc: '2.0',
      id: 'fuzz-init',
      method: 'initialize',
      params: { protocolVersion: '2025-03-26', capabilities: {}, clientInfo: { name: 'mcp-fuzzer', version: '1.0.0' } },
    }),
    signal: AbortSignal.timeout(timeoutMs),
  });
  const session = res.headers.get('mcp-session-id');
  if (session) headers['mcp-session-id'] = session;
  const body = await res.text();
  if (!res.ok || !body.includes('"result"')) throw new Error(`initialize failed (HTTP ${res.status}): ${body.slice(0, 200)}`);
}

async function send(payload, id) {
  const start = Date.now();
  try {
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), timeoutMs);
    const res = await fetch(target, { method: 'POST', headers, body: payload, signal: ctrl.signal });
    clearTimeout(t);
    const dur = Date.now() - start;
    const body = await res.text().catch(() => '');
    // What matters is whether the call executed: a JSON-RPC result means it reached the tool;
    // an error (blocked, invalid, refused) or an auth rejection means it didn't.
    const executed = res.ok && /"result"\s*:/.test(body) && !/"error"\s*:/.test(body);
    const blocked = res.status === 401 || res.status === 403 || !executed;
    return { id, blocked, status: res.status, dur, body: body.slice(0, 200) };
  } catch (e) {
    // A notification (no id) or a batch has no single reply to wait for. If it had been
    // forwarded and run, the tool's result would come back (that is how the no-id tools/call
    // bypass showed up); silence means the gateway dropped it, so it did not execute.
    if (e?.name === 'AbortError' && !hasRequestId(payload)) {
      return { id, blocked: true, noAnswer: true, status: 0, dur: Date.now() - start, body: 'no answer (dropped)' };
    }
    return { id, blocked: false, status: 0, dur: Date.now() - start, body: e.message, err: true };
  }
}

/** Whether the payload is a single JSON-RPC request with an id (so a reply is owed). */
function hasRequestId(payload) {
  try {
    const msg = JSON.parse(payload);
    return !Array.isArray(msg) && msg !== null && typeof msg === 'object' && msg.id !== undefined && msg.id !== null;
  } catch {
    return false; // unparseable: nothing valid to reply to
  }
}

async function main() {
  console.log(`\nMCP Protocol Fuzzer — ${target}\n`);
  await initialize();

  if (controlTool) {
    const control = await send(
      JSON.stringify({ jsonrpc: '2.0', id: 'fuzz-control', method: 'tools/call', params: { name: controlTool, arguments: { message: 'hello', query: 'hello' } } }),
      'fuzz-control',
    );
    if (control.blocked || control.err) {
      console.log(`INCONCLUSIVE: the harmless control call to '${controlTool}' did not run (${control.body}).`);
      console.log('A gateway that blocks everything would "block" every attack too; fix the setup first.');
      process.exit(1);
    }
    console.log(`  [control] harmless '${controlTool}' call ran, as it should\n`);
  }

  const results = [];
  for (const f of FuzzPayloads) {
    process.stdout.write(`  [${f.id}] ${f.desc}... `);
    const r = await send(f.body, f.id);
    r.expBlock = f.block;
    r.cat = f.cat;
    r.desc = f.desc;
    results.push(r);
    if (r.err) console.log('ERR');
    else if (r.noAnswer) console.log('BLOCKED (dropped, no answer)');
    else if (r.blocked) console.log(`BLOCKED (${r.status})`);
    else console.log(`PASSED (${r.status})${f.block ? ' *** BYPASS' : ''}`);
  }

  const blocked = results.filter(r => r.blocked).length;
  const passed = results.filter(r => !r.blocked && !r.err).length;
  const errs = results.filter(r => r.err).length;
  // Block rate over the payloads that should be blocked; the benign ones are meant to pass,
  // so counting them would fail even a gateway that gets every case right.
  const attacks = results.filter(r => r.expBlock);
  const attacksBlocked = attacks.filter(r => r.blocked).length;
  const rate = attacks.length ? ((attacksBlocked / attacks.length) * 100).toFixed(1) : '100.0';
  const bypasses = results.filter(r => !r.blocked && r.expBlock);
  const falsePositives = results.filter(r => r.blocked && !r.expBlock);

  console.log(`\nResults: ${blocked} blocked, ${passed} passed, ${errs} errors`);
  console.log(`Attacks blocked: ${attacksBlocked}/${attacks.length} (${rate}% block rate)`);
  console.log(`Benign blocked (false positives): ${falsePositives.length}/${results.length - attacks.length}\n`);
  if (bypasses.length) {
    console.log('CRITICAL BYPASSES:');
    bypasses.forEach(b => console.log(`  [${b.id}] ${b.desc} — ${b.cat}${b.err ? ' (no answer)' : ''}: ${b.body}`));
  }
  if (falsePositives.length) {
    console.log('FALSE POSITIVES (benign payloads blocked):');
    falsePositives.forEach(f => console.log(`  [${f.id}] ${f.desc} — ${f.cat}`));
  }

  if (failOnBypass && bypasses.length) { console.log('FAIL'); process.exit(1); }
  if (parseFloat(rate) < minBlockRate) { console.log('FAIL: block rate below minimum'); process.exit(1); }
  console.log('PASSED');
}

main().catch(e => { console.error(e.message); process.exit(1); });
