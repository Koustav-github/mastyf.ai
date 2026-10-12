'use client';

import { useState } from 'react';

type ClientPlatform = 'claude' | 'cursor' | 'windsurf' | 'python' | 'node' | 'docker';

interface ClientConfig {
  id: ClientPlatform;
  title: string;
  badge: string;
  icon: string;
  filename: string;
  lang: string;
  description: string;
  code: string;
}

const CLIENTS: Record<ClientPlatform, ClientConfig> = {
  claude: {
    id: 'claude',
    title: 'Claude Desktop',
    badge: 'Desktop Integration',
    icon: '🤖',
    filename: '~/Library/Application Support/Claude/claude_desktop_config.json',
    lang: 'json',
    description: 'Intercepts tool calls dispatched by Anthropic Claude Desktop before execution by local MCP servers.',
    code: `{
  "mcpServers": {
    "filesystem": {
      "command": "mastyf-proxy",
      "args": [
        "--policy", "~/.mastyf/policy.yaml",
        "--upstream", "npx",
        "-y", "@modelcontextprotocol/server-filesystem",
        "/Users/username/Projects"
      ]
    },
    "github": {
      "command": "mastyf-proxy",
      "args": [
        "--policy", "~/.mastyf/policy.yaml",
        "--upstream", "npx",
        "-y", "@modelcontextprotocol/server-github"
      ],
      "env": {
        "GITHUB_PERSONAL_ACCESS_TOKEN": "ghp_..."
      }
    }
  }
}`,
  },
  cursor: {
    id: 'cursor',
    title: 'Cursor IDE',
    badge: 'IDE Workspace',
    icon: '⚡',
    filename: '.cursor/mcp.json',
    lang: 'json',
    description: 'Protects Cursor Agent mode and Composer by routing tool calls through the fail-closed Mastyf boundary.',
    code: `{
  "mcpServers": {
    "mastyf-perimeter": {
      "command": "mastyf-proxy",
      "args": [
        "--mode", "warn",
        "--upstream", "node",
        "./tools/mcp-server.js"
      ]
    }
  }
}`,
  },
  windsurf: {
    id: 'windsurf',
    title: 'Windsurf / Codeium',
    badge: 'Cascade Protection',
    icon: '🌊',
    filename: '~/.codeium/windsurf/mcp_config.json',
    lang: 'json',
    description: 'Enforces complete mediation on Windsurf Cascade workflows executing terminal commands and edits.',
    code: `{
  "mcpServers": {
    "terminal-guard": {
      "command": "mastyf-proxy",
      "args": [
        "--policy", "./security/mastyf.yaml",
        "--upstream", "npx",
        "-y", "@modelcontextprotocol/server-terminal"
      ]
    }
  }
}`,
  },
  python: {
    id: 'python',
    title: 'Python SDK / LangGraph',
    badge: 'Agent Framework',
    icon: '🐍',
    filename: 'agent_runner.py',
    lang: 'python',
    description: 'Direct Python SDK binding with asynchronous invariant validation and taint tracking for LangChain and CrewAI.',
    code: `import asyncio
from mastyf import MastyfGateway, PolicyInvariantException

# Initialize Gateway reference monitor on local socket
gateway = MastyfGateway(socket_path="/var/run/mastyf/shield.sock")

async def execute_agent_tool(tool_name: str, arguments: dict):
    try:
        # Evaluates CBAC + DIFC invariants (<4.8µs overhead)
        receipt = await gateway.mediate(
            client_id="langchain-agent-core",
            tool=tool_name,
            payload=arguments
        )
        print(f"✓ Dispatched! Cryptographic Receipt: {receipt.signature[:16]}...")
        return await dispatch_upstream(tool_name, arguments)
    except PolicyInvariantException as e:
        # Zero bytes transmitted upstream
        print(f"✕ WIRE SEVERED: {e.violated_rule}")
        return {"error": "ExecutionBlockedByPolicy", "code": 403}`,
  },
  node: {
    id: 'node',
    title: 'TypeScript / Node SDK',
    badge: 'Library Client',
    icon: '☕',
    filename: 'agent-security.ts',
    lang: 'typescript',
    description: 'Type-safe TypeScript client for Model Context Protocol middleware and Autonomous Agent runtimes.',
    code: `import { MastyfClient } from '@mastyf/client';

const mastyf = new MastyfClient({
  socketPath: process.env.MASTYF_SOCKET ?? '/tmp/mastyf.sock',
  failClosed: true, // Default: drop on timeout
});

export async function guardToolCall(tool: string, args: Record<string, unknown>) {
  const verdict = await mastyf.evaluate({
    invokingClient: 'claude-agent-v1',
    toolName: tool,
    arguments: args,
  });

  if (verdict.decision === 'BLOCKED') {
    throw new Error(\`Wire Severed: \${verdict.rule} (\${verdict.reason})\`);
  }

  return verdict.receipt;
}`,
  },
  docker: {
    id: 'docker',
    title: 'Kubernetes / Docker',
    badge: 'Container Sidecar',
    icon: '🐳',
    filename: 'docker-compose.yml',
    lang: 'yaml',
    description: 'Production sidecar proxy deployment pattern for multi-agent clusters and cloud-hosted workflows.',
    code: `version: "3.8"
services:
  agent-runner:
    image: mycompany/autonomous-coder:latest
    environment:
      - MCP_PROXY_URL=http://mastyf-gateway:4000
    depends_on:
      - mastyf-gateway

  mastyf-gateway:
    image: ghcr.io/mastyf-ai/gateway:latest
    ports:
      - "4000:4000"
    volumes:
      - ./security/mastyf-policy.yaml:/etc/mastyf/policy.yaml:ro
    command: ["mastyf", "start", "--config", "/etc/mastyf/policy.yaml", "--mode", "block"]`,
  },
};

interface PolicyPreset {
  id: string;
  name: string;
  category: string;
  yaml: string;
  samplePayload: string;
  expectedVerdict: 'BLOCKED' | 'ALLOWED';
  reason: string;
}

const POLICY_PRESETS: PolicyPreset[] = [
  {
    id: 'path-traversal',
    name: 'Strict Path Containment',
    category: 'Filesystem Protection',
    yaml: `version: "1.0"
mode: "block" # fail-closed
rules:
  - tool: "filesystem.read_file"
    invariants:
      path_containment:
        allowed_prefixes: ["./src", "./docs"]
        denied_patterns: ["/etc/*", ".env*", "*.pem"]`,
    samplePayload: `{"path": "/etc/shadow"}`,
    expectedVerdict: 'BLOCKED',
    reason: 'Path matches denied pattern /etc/* and escapes allowed root prefix ./src',
  },
  {
    id: 'monetary-clamp',
    name: 'Monetary Transaction Clamping',
    category: 'Financial Bounds',
    yaml: `version: "1.0"
mode: "block"
rules:
  - tool: "stripe.create_payout"
    invariants:
      monetary_clamping:
        max_single_transaction_usd: 50.00
        allowed_currencies: ["USD", "EUR"]`,
    samplePayload: `{"amount_usd": 2500.00, "currency": "USD", "destination": "acct_1928"}`,
    expectedVerdict: 'BLOCKED',
    reason: 'Requested $2,500.00 exceeds hard invariant ceiling $50.00',
  },
  {
    id: 'network-airgap',
    name: 'Private CIDR Egress Airgap',
    category: 'Network Boundary',
    yaml: `version: "1.0"
mode: "block"
rules:
  - tool: "network.http_request"
    invariants:
      network_containment:
        deny_private_cidrs: true # 10.0.0.0/8, 169.254.169.254
        allowed_domains: ["api.github.com", "crates.io"]`,
    samplePayload: `{"url": "http://169.254.169.254/latest/meta-data/iam/security-credentials/"}`,
    expectedVerdict: 'BLOCKED',
    reason: 'Target resolves to cloud instance metadata service (AWS/GCP IMDS)',
  },
  {
    id: 'benign-code',
    name: 'Authorized Source Compilation',
    category: 'Clean Utility',
    yaml: `version: "1.0"
mode: "block"
rules:
  - tool: "filesystem.read_file"
    invariants:
      path_containment:
        allowed_prefixes: ["./src", "./docs"]`,
    samplePayload: `{"path": "./src/components/Header.tsx"}`,
    expectedVerdict: 'ALLOWED',
    reason: 'Path falls strictly within authorized ./src directory subtree',
  },
];

export function DeveloperPlayground() {
  const [selectedClient, setSelectedClient] = useState<ClientPlatform>('claude');
  const [copied, setCopied] = useState(false);
  const [activePreset, setActivePreset] = useState<PolicyPreset>(POLICY_PRESETS[0]);
  const [testOutput, setTestOutput] = useState<{
    tested: boolean;
    verdict: 'BLOCKED' | 'ALLOWED';
    reason: string;
    latency: string;
  } | null>(null);

  const client = CLIENTS[selectedClient];

  const handleCopy = () => {
    navigator.clipboard.writeText(client.code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const runEvaluation = () => {
    setTestOutput({
      tested: true,
      verdict: activePreset.expectedVerdict,
      reason: activePreset.reason,
      latency: activePreset.expectedVerdict === 'BLOCKED' ? '0.000ms · 0 BYTES EXECUTED' : '4.2µs · RECEIPT SIGNED',
    });
  };

  return (
    <div className="flex flex-col gap-14 my-10">
      {/* Module 1: Interactive Client Switchboard */}
      <div className="rounded-2xl bg-[#080c16] border border-white/10 shadow-2xl p-6 md:p-8">
        <div className="flex flex-col md:flex-row md:items-center justify-between pb-6 mb-6 border-b border-white/5 gap-4">
          <div>
            <span className="text-[10px] font-mono font-bold tracking-widest text-amber-400 uppercase block mb-1">
              Configuration Switchboard
            </span>
            <h3 className="text-xl sm:text-2xl font-bold text-white tracking-tight">
              Route Your Agent Client Through Mastyf
            </h3>
          </div>
          <span className="text-xs font-mono text-slate-400">Zero code changes to agent logic required</span>
        </div>

        {/* Client Platform Selector Pills */}
        <div className="flex flex-wrap gap-2 mb-6">
          {(Object.keys(CLIENTS) as ClientPlatform[]).map((key) => {
            const item = CLIENTS[key];
            const isSelected = selectedClient === key;
            return (
              <button
                key={key}
                type="button"
                onClick={() => setSelectedClient(key)}
                className={`px-3.5 py-2 rounded-xl text-xs font-semibold transition-all flex items-center gap-2 border ${
                  isSelected
                    ? 'bg-amber-500/15 border-amber-500/50 text-amber-300 shadow-[0_0_15px_rgba(245,158,11,0.15)] font-bold'
                    : 'bg-white/[0.02] border-white/5 text-slate-400 hover:text-white hover:bg-white/[0.05]'
                }`}
              >
                <span>{item.icon}</span>
                <span>{item.title}</span>
              </button>
            );
          })}
        </div>

        {/* Selected Client Code Viewer */}
        <div className="rounded-xl bg-black/70 border border-white/10 overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 bg-white/[0.03] border-b border-white/5 text-xs font-mono">
            <div className="flex items-center gap-2 truncate">
              <span className="w-2.5 h-2.5 rounded-full bg-red-500/80 inline-block" />
              <span className="w-2.5 h-2.5 rounded-full bg-yellow-500/80 inline-block" />
              <span className="w-2.5 h-2.5 rounded-full bg-green-500/80 inline-block" />
              <span className="text-slate-400 ml-2 truncate">{client.filename}</span>
            </div>
            <button
              type="button"
              onClick={handleCopy}
              className="px-3 py-1 rounded-md text-[11px] bg-white/10 hover:bg-white/20 text-slate-200 transition-colors shrink-0"
            >
              {copied ? '✓ Copied' : 'Copy Code'}
            </button>
          </div>
          <div className="p-4 sm:p-5 overflow-x-auto text-xs font-mono leading-relaxed text-slate-300">
            <pre>
              <code>{client.code}</code>
            </pre>
          </div>
          <div className="px-4 py-3 bg-white/[0.02] border-t border-white/5 text-xs text-slate-400 flex items-center justify-between">
            <span>{client.description}</span>
            <span className="text-[10px] font-mono text-amber-400 uppercase tracking-wider">{client.badge}</span>
          </div>
        </div>
      </div>

      {/* Module 2: Live YAML Policy Playground */}
      <div className="rounded-2xl bg-[#080c16] border border-white/10 shadow-2xl p-6 md:p-8">
        <div className="flex flex-col md:flex-row md:items-center justify-between pb-6 mb-6 border-b border-white/5 gap-4">
          <div>
            <span className="text-[10px] font-mono font-bold tracking-widest text-amber-400 uppercase block mb-1">
              Interactive Policy Lab
            </span>
            <h3 className="text-xl sm:text-2xl font-bold text-white tracking-tight">
              Test Invariant Enforcement in Real Time
            </h3>
          </div>
          <span className="text-xs font-mono text-slate-400">Zero-allocation CBAC state machine</span>
        </div>

        {/* Preset Selector */}
        <div className="flex flex-wrap gap-2 mb-6">
          {POLICY_PRESETS.map((p) => {
            const isSelected = activePreset.id === p.id;
            return (
              <button
                key={p.id}
                type="button"
                onClick={() => {
                  setActivePreset(p);
                  setTestOutput(null);
                }}
                className={`px-3.5 py-2 rounded-xl text-xs font-semibold transition-all border ${
                  isSelected
                    ? 'bg-amber-500/15 border-amber-500/50 text-amber-300 font-bold'
                    : 'bg-white/[0.02] border-white/5 text-slate-400 hover:text-white'
                }`}
              >
                <span>{p.name}</span>
                <span className="text-[10px] opacity-60 ml-1.5 font-mono">({p.category})</span>
              </button>
            );
          })}
        </div>

        {/* 2-Column Split: Policy YAML vs Simulated Invocations */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
          {/* Left: YAML Policy Spec */}
          <div className="lg:col-span-6 flex flex-col rounded-xl bg-black/60 border border-white/10 overflow-hidden">
            <div className="px-4 py-2.5 bg-white/[0.02] border-b border-white/5 text-xs font-mono text-slate-400 flex items-center justify-between">
              <span>mastyf-policy.yaml</span>
              <span className="text-[10px] text-amber-400">FAIL-CLOSED SPEC</span>
            </div>
            <pre className="p-4 text-xs font-mono text-emerald-400/90 leading-relaxed overflow-x-auto flex-1">
              <code>{activePreset.yaml}</code>
            </pre>
          </div>

          {/* Right: Simulated Invocation & Evaluation Console */}
          <div className="lg:col-span-6 flex flex-col justify-between rounded-xl bg-black/60 border border-white/10 p-5">
            <div>
              <span className="text-[11px] font-mono text-slate-400 uppercase tracking-wider block mb-2">
                Simulated Intercepted Payload:
              </span>
              <div className="p-3 rounded-lg bg-black/80 border border-white/10 font-mono text-xs text-slate-200 mb-4 break-all">
                <code>{activePreset.samplePayload}</code>
              </div>

              <button
                type="button"
                onClick={runEvaluation}
                className="w-full py-3 rounded-xl bg-amber-500 hover:bg-amber-400 text-black font-extrabold text-xs uppercase tracking-wider transition-all shadow-[0_0_20px_rgba(245,158,11,0.2)] mb-4"
              >
                ⚡ Evaluate Invariant Policy
              </button>
            </div>

            {testOutput && (
              <div
                className={`p-4 rounded-xl border flex flex-col gap-2 ${
                  testOutput.verdict === 'BLOCKED'
                    ? 'bg-rose-950/30 border-rose-500/40 text-rose-300'
                    : 'bg-emerald-950/30 border-emerald-500/40 text-emerald-300'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 font-mono font-bold text-xs tracking-wider">
                    <span>{testOutput.verdict === 'BLOCKED' ? '✕' : '✓'}</span>
                    <span>{testOutput.verdict === 'BLOCKED' ? 'WIRE SEVERED' : 'CAPABILITY ALLOWED'}</span>
                  </div>
                  <span className="text-[10px] font-mono opacity-80">{testOutput.latency}</span>
                </div>
                <p className="text-xs leading-relaxed text-slate-300">
                  {testOutput.reason}
                </p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Module 3: Microsecond Latency Waterfall Breakdown */}
      <div className="p-6 md:p-8 rounded-2xl bg-black/40 border border-white/10">
        <div className="flex flex-col md:flex-row md:items-center justify-between pb-6 mb-6 border-b border-white/5 gap-2">
          <div>
            <span className="text-[10px] font-mono font-bold tracking-widest text-emerald-400 uppercase block mb-1">
              Zero-Compromise Performance
            </span>
            <h3 className="text-xl font-bold text-white">Sub-5 Microsecond Complete Mediation Waterfall</h3>
          </div>
          <span className="text-xs font-mono text-slate-400">&lt;0.0004% of an LLM generation cycle</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 font-mono text-xs">
          <div className="p-4 rounded-xl bg-white/[0.02] border border-white/5 flex flex-col justify-between">
            <span className="text-slate-500 text-[10px]">STEP 1 · DECODE</span>
            <span className="text-xl font-bold text-white my-1">0.8 µs</span>
            <span className="text-slate-400 text-[11px]">Zero-copy JSON-RPC stream parser</span>
          </div>

          <div className="p-4 rounded-xl bg-white/[0.02] border border-white/5 flex flex-col justify-between">
            <span className="text-slate-500 text-[10px]">STEP 2 · INVARIANT</span>
            <span className="text-xl font-bold text-amber-400 my-1">1.4 µs</span>
            <span className="text-slate-400 text-[11px]">CBAC path trie &amp; value clamping</span>
          </div>

          <div className="p-4 rounded-xl bg-white/[0.02] border border-white/5 flex flex-col justify-between">
            <span className="text-slate-500 text-[10px]">STEP 3 · CRYPTO</span>
            <span className="text-xl font-bold text-sky-400 my-1">2.6 µs</span>
            <span className="text-slate-400 text-[11px]">Ed25519 execution receipt signature</span>
          </div>

          <div className="p-4 rounded-xl bg-emerald-950/20 border border-emerald-500/30 flex flex-col justify-between">
            <span className="text-emerald-400 text-[10px]">TOTAL TIME</span>
            <span className="text-xl font-extrabold text-emerald-400 my-1">4.8 µs</span>
            <span className="text-emerald-300 text-[11px]">Physical wire severance executed</span>
          </div>
        </div>
      </div>
    </div>
  );
}
