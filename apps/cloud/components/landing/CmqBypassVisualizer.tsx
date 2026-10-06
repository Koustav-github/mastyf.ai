'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { ShieldCheck, ShieldAlert, ArrowRight } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { BorderBeam } from '@/components/ui/border-beam';
import { AnimatedNumber } from '@/components/ui/animated-number';

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
    name: 'Alternate Hostname / DNS Rebinding',
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
    name: 'Alternate IPv6 Loopback Interface',
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
    <section className="cmq-bypass-section" id="cmq">
      <div className="section-container">
        {/* Section Header */}
        <div className="section-header">
          <div className="section-tag">COMPLETE-MEDIATION QUALIFICATION (CMQ)</div>
          <h2 className="section-title">
            Most security gateways assume they are in the path. <br />
            <span className="gold-highlight">CMQ tests it.</span>
          </h2>
          <p className="section-subtitle">
            Runtime authorization tells you what you blocked. CMQ tells you whether the agent can go around it.
          </p>
        </div>

        {/* Visual Architecture Diagram */}
        <div className="cmq-architecture-card relative overflow-hidden">
          <BorderBeam
            size={300}
            duration={11}
            borderWidth={1.5}
            colorFrom="#06b6d4"
            colorTo="#f59e0b"
          />

          <div className="cmq-topology-strip">
            <div className="topology-node node-agent">
              <span className="node-title">AI AGENT</span>
              <span className="node-sub">Untrusted Process Enclave</span>
            </div>

            <div className="topology-vector-arrow">
              <span className="vector-label">Primary Path</span>
              <span className="vector-line" />
            </div>

            <div className="topology-node node-mastyf">
              <span className="node-title">MASTYF GATEWAY</span>
              <span className="node-sub">Runtime Execution Boundary</span>
            </div>

            <div className="topology-vector-arrow">
              <span className="vector-label">Authorized Only</span>
              <span className="vector-line" />
            </div>

            <div className="topology-node node-tool">
              <span className="node-title">PROTECTED TOOLS</span>
              <span className="node-sub">Filesystems, DBs, Cloud APIs</span>
            </div>
          </div>

          <div className="cmq-escape-probes-banner">
            <div className="probes-banner-title">
              <span className="cmq-pulse" />
              <span>
                <AnimatedNumber value={15} /> BYPASS SURFACES PROBED EMPIRICALLY
              </span>
            </div>
            <p className="probes-banner-desc">
              Inspect the deployment. Probe the boundary. Measure bypass paths. Bind the result to deployment state.
              Produce independently verifiable evidence.
            </p>
          </div>

          {/* Interactive Probes Explorer */}
          <div className="cmq-probes-explorer-grid">
            <div className="probes-list-column">
              <div className="probes-list-header">TESTED BYPASS VECTORS</div>
              <div className="probes-buttons-list">
                {BYPASS_PROBES.map((probe) => (
                  <button
                    key={probe.id}
                    type="button"
                    onClick={() => setActiveProbeId(probe.id)}
                    className={`probe-item-btn ${activeProbeId === probe.id ? 'active' : ''}`}
                  >
                    <span className={`probe-status-tag ${probe.status.toLowerCase()}`}>
                      {probe.status}
                    </span>
                    <span className="probe-btn-name">{probe.name}</span>
                  </button>
                ))}
              </div>
            </div>

            <div className="probe-detail-column">
              <div className="probe-detail-card">
                <div className="probe-detail-header">
                  <div>
                    <Badge variant="outline" className="text-[10px] text-slate-400 border-white/10 mb-1">
                      {activeProbe.category}
                    </Badge>
                    <h4 className="probe-detail-title">{activeProbe.name}</h4>
                  </div>
                  <Badge
                    variant={activeProbe.status === 'DROPPED' ? 'warning' : 'destructive'}
                    className="text-xs uppercase"
                  >
                    {activeProbe.status}
                  </Badge>
                </div>

                <p className="probe-description">{activeProbe.description}</p>

                <div className="probe-contrast-box">
                  <div className="contrast-row assumption">
                    <span className="contrast-label">Generic Gateway:</span>
                    <span className="contrast-val">{activeProbe.gatewayAssumption}</span>
                  </div>
                  <div className="contrast-row observation">
                    <span className="contrast-label">CMQ Attested Proof:</span>
                    <span className="contrast-val">{activeProbe.cmqObservation}</span>
                  </div>
                </div>

                <div className="probe-evidence-row">
                  <span className="evidence-badge">INDEPENDENTLY VERIFIABLE EVIDENCE</span>
                  <span className="evidence-hash">Binds podSpecDigest + containerInode + eBPF drop observation</span>
                </div>
              </div>
            </div>
          </div>

          {/* Bottom Callout */}
          <div className="cmq-card-footer">
            <div className="footer-callout-text">
              Prove whether your agent deployment can bypass its execution controls.
            </div>
            <Link href="/research" className="btn-secondary-hero">
              Read CMQ Specification Document -&gt;
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
