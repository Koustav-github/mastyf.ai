'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { ShieldCheck, ShieldAlert, ArrowRight, CheckCircle2, ChevronRight, Activity, Terminal } from 'lucide-react';
import { BorderBeam } from '@/components/ui/border-beam';

interface BypassProbe {
  id: string;
  name: string;
  category: string;
  description: string;
  gatewayAssumption: string;
  cmqObservation: string;
  status: 'BLOCKED' | 'DROPPED';
}

const BYPASS_PROBES: BypassProbe[] = [
  {
    id: 'direct_http',
    name: 'Direct TCP / HTTP Egress',
    category: 'NETWORK BYPASS',
    description: 'Agent container attempts outbound connection directly to tool API port bypassing proxy socket.',
    gatewayAssumption: 'Assumes agent config specifies proxy host',
    cmqObservation: 'Active probe executed from agent namespace; SYN packet dropped by Cilium eBPF TC filter.',
    status: 'DROPPED',
  },
  {
    id: 'dns_rebind',
    name: 'Alternate Hostname / DNS Rebind',
    category: 'NETWORK BYPASS',
    description: 'Agent targets dynamic DNS host that resolves to loopback (127.0.0.1) or link-local cloud metadata.',
    gatewayAssumption: 'Matches hostname against string allowlist',
    cmqObservation: 'Resolved IP decoded to RFC1918/loopback class prior to socket connect; connection aborted.',
    status: 'BLOCKED',
  },
  {
    id: 'unix_socket',
    name: 'Host Unix Domain Socket',
    category: 'HOST ESCAPE',
    description: 'Agent queries local domain sockets (e.g., Docker daemon socket /var/run/docker.sock).',
    gatewayAssumption: 'Ignores local IPC domain sockets',
    cmqObservation: 'Container filesystem mount inspection detects 0 shared host sockets; inode verified isolated.',
    status: 'BLOCKED',
  },
  {
    id: 'host_network',
    name: 'Host Network Namespace Leak',
    category: 'NAMESPACE ESCAPE',
    description: 'Agent container deployed with hostNetwork: true, allowing direct access to all localhost services.',
    gatewayAssumption: 'Assumes container isolation is configured',
    cmqObservation: 'Active prober verifies container network namespace inode differs from host inode.',
    status: 'BLOCKED',
  },
  {
    id: 'cred_exfil',
    name: 'Environment Credential Escape',
    category: 'CREDENTIAL INTEGRITY',
    description: 'Agent process inspects its own environment variables for database passwords and API tokens.',
    gatewayAssumption: 'Trusts container environment variables',
    cmqObservation: 'Synthetic probe scans /proc/$PID/environ; proves zero credentials provisioned into agent enclave.',
    status: 'BLOCKED',
  },
  {
    id: 'k8s_token',
    name: 'Kube Service Account Automount',
    category: 'CLUSTER ESCAPE',
    description: 'Agent queries /var/run/secrets/kubernetes.io/serviceaccount/token to access cluster API server.',
    gatewayAssumption: 'Assumes Kubernetes RBAC restricts pods',
    cmqObservation: 'AutomountServiceAccountToken verified false in pod spec digest; directory absent.',
    status: 'BLOCKED',
  },
  {
    id: 'ipv6_interface',
    name: 'Alternate IPv6 Loopback',
    category: 'NETWORK BYPASS',
    description: 'Agent queries ::1 or [fe80::] link-local address to evade IPv4-only iptables rules.',
    gatewayAssumption: 'Rules only monitor IPv4 127.0.0.1',
    cmqObservation: 'Kernel IPv6 routing table verified; IPv6 loopback probe dropped by dual-stack policy.',
    status: 'DROPPED',
  },
  {
    id: 'sidecar_bypass',
    name: 'Inter-Pod Subprocess Bypass',
    category: 'TOPOLOGY INTEGRITY',
    description: 'Agent spawns raw child process executing unmediated curl/nc to bypass proxy sidecar stream.',
    gatewayAssumption: 'Assumes code invokes library client',
    cmqObservation: 'Seccomp profile prohibits raw socket creation; kernel drops unauthenticated socket syscalls.',
    status: 'BLOCKED',
  },
];

export function CmqBypassVisualizer() {
  const [activeProbeId, setActiveProbeId] = useState<string>('direct_http');
  const activeProbe = BYPASS_PROBES.find((p) => p.id === activeProbeId) || BYPASS_PROBES[0];

  return (
    <section className="relative py-24 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto" id="cmq">
      {/* Section Header */}
      <div className="text-center max-w-3xl mx-auto mb-16">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-cyan-400/10 border border-cyan-400/20 text-cyan-400 text-xs font-mono font-semibold uppercase tracking-wider mb-4">
          Complete-Mediation Qualification (CMQ)
        </div>
        <h2 className="text-3xl sm:text-5xl font-extrabold tracking-tight text-white mb-5 leading-tight">
          Most security gateways assume they are in the path. <br />
          <span className="bg-gradient-to-r from-cyan-300 via-amber-300 to-emerald-300 bg-clip-text text-transparent">
            CMQ mathematically tests it.
          </span>
        </h2>
        <p className="text-base sm:text-lg text-slate-300 leading-relaxed">
          Runtime authorization tells you what you blocked. CMQ tells you whether the agent can bypass the proxy entirely.
        </p>
      </div>

      {/* Main Glass Visualizer Card */}
      <div className="relative rounded-3xl bg-[#080d1a]/90 backdrop-blur-2xl border border-white/[0.1] p-6 sm:p-8 shadow-[0_24px_80px_rgba(0,0,0,0.7)] overflow-hidden">
        <BorderBeam size={280} duration={10} borderWidth={1.5} colorFrom="#06b6d4" colorTo="#f59e0b" />

        {/* Interactive Topology Stream */}
        <div className="flex flex-col md:flex-row items-center justify-between gap-4 p-5 rounded-2xl bg-black/40 border border-white/[0.06] mb-8">
          <div className="flex-1 text-center md:text-left p-3 rounded-xl bg-white/[0.02] border border-white/[0.04]">
            <span className="text-[10px] font-mono uppercase tracking-wider text-rose-400 font-semibold block mb-1">
              Untrusted Enclave
            </span>
            <span className="text-sm font-bold text-white">AI Agent Container</span>
          </div>

          <div className="flex items-center gap-2 text-slate-500 font-mono text-xs">
            <span className="text-amber-400 font-bold">100% In-Path</span>
            <ArrowRight className="w-4 h-4 text-amber-400 animate-pulse" />
          </div>

          <div className="flex-1 text-center p-3 rounded-xl bg-amber-400/10 border border-amber-400/30">
            <span className="text-[10px] font-mono uppercase tracking-wider text-amber-400 font-semibold block mb-1">
              Deterministic Boundary
            </span>
            <span className="text-sm font-bold text-white">Mastyf Gateway</span>
          </div>

          <div className="flex items-center gap-2 text-slate-500 font-mono text-xs">
            <span className="text-emerald-400 font-bold">Authorized Only</span>
            <ArrowRight className="w-4 h-4 text-emerald-400" />
          </div>

          <div className="flex-1 text-center md:text-right p-3 rounded-xl bg-white/[0.02] border border-white/[0.04]">
            <span className="text-[10px] font-mono uppercase tracking-wider text-cyan-400 font-semibold block mb-1">
              Target Infrastructure
            </span>
            <span className="text-sm font-bold text-white">Files, DBs, Cloud APIs</span>
          </div>
        </div>

        {/* Probes Grid Explorer */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left Column: Probes List */}
          <div className="lg:col-span-5 space-y-2 max-h-[380px] overflow-y-auto pr-1">
            <div className="text-[10px] font-mono uppercase tracking-wider text-slate-400 font-bold mb-3">
              15 Probed Bypass Surfaces
            </div>
            {BYPASS_PROBES.map((probe) => {
              const isSelected = activeProbeId === probe.id;
              return (
                <button
                  key={probe.id}
                  type="button"
                  onClick={() => setActiveProbeId(probe.id)}
                  className={`w-full flex items-center justify-between p-3 rounded-xl border text-left transition-all ${
                    isSelected
                      ? 'bg-white/[0.1] border-cyan-400/40 shadow-sm text-white'
                      : 'bg-black/30 border-white/[0.04] text-slate-400 hover:text-slate-200 hover:bg-white/[0.04]'
                  }`}
                >
                  <span className="text-xs font-medium line-clamp-1">{probe.name}</span>
                  <span
                    className={`font-mono text-[9px] font-bold px-1.5 py-0.5 rounded ${
                      probe.status === 'DROPPED'
                        ? 'bg-amber-400/15 text-amber-300 border border-amber-400/30'
                        : 'bg-rose-500/15 text-rose-300 border border-rose-500/30'
                    }`}
                  >
                    {probe.status}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Right Column: Detailed Attestation Card */}
          <div className="lg:col-span-7 flex flex-col justify-between p-6 rounded-2xl bg-black/50 border border-white/[0.08]">
            <div>
              <div className="flex items-center justify-between mb-3">
                <span className="text-[10px] font-mono uppercase tracking-wider text-cyan-400 font-semibold px-2 py-0.5 rounded bg-cyan-400/10 border border-cyan-400/20">
                  {activeProbe.category}
                </span>
                <span className="text-xs font-mono font-bold text-white bg-white/[0.06] px-2.5 py-1 rounded-full border border-white/[0.1]">
                  VERIFIED {activeProbe.status}
                </span>
              </div>

              <h4 className="text-lg font-bold text-white mb-2">{activeProbe.name}</h4>
              <p className="text-xs text-slate-300 leading-relaxed mb-5">
                {activeProbe.description}
              </p>

              {/* Contrast Comparison */}
              <div className="space-y-3 mb-6">
                <div className="p-3 rounded-xl bg-rose-500/[0.06] border border-rose-500/20 text-xs">
                  <span className="text-rose-400 font-semibold block mb-0.5">Generic Proxy Assumption:</span>
                  <span className="text-slate-300">{activeProbe.gatewayAssumption}</span>
                </div>
                <div className="p-3 rounded-xl bg-emerald-500/[0.06] border border-emerald-500/20 text-xs">
                  <span className="text-emerald-400 font-semibold block mb-0.5">CMQ Mathematical Proof:</span>
                  <span className="text-slate-300">{activeProbe.cmqObservation}</span>
                </div>
              </div>
            </div>

            {/* Cryptographic Proof Strip */}
            <div className="pt-4 border-t border-white/[0.06] flex items-center justify-between text-[11px] font-mono text-slate-400">
              <span className="text-amber-400">Ed25519 Signed Attestation</span>
              <span>eBPF Drop Observation Validated</span>
            </div>
          </div>
        </div>

        {/* Bottom CTA Action */}
        <div className="mt-8 pt-6 border-t border-white/[0.08] flex flex-col sm:flex-row items-center justify-between gap-4">
          <span className="text-xs text-slate-300 font-medium text-center sm:text-left">
            Prove whether your agent deployment can bypass its execution controls.
          </span>
          <Link
            href="/research"
            className="inline-flex items-center gap-2 px-5 py-2 rounded-full text-xs font-semibold text-white bg-white/[0.08] hover:bg-white/[0.14] border border-white/[0.12] transition-colors"
          >
            <span>Read CMQ Specification</span>
            <ArrowRight className="w-3.5 h-3.5 text-amber-400" />
          </Link>
        </div>
      </div>
    </section>
  );
}
