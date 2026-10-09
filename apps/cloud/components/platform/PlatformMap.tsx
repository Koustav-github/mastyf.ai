import Link from 'next/link';
import { ArrowRight, ArrowUpRight } from 'lucide-react';

type Part = { id: string; name: string; line: string };

const SHIELD: Part = { id: 'shield', name: 'Shield', line: 'On desktops: guards Claude Desktop, Cursor and other local agents.' };
const GATEWAY: Part = { id: 'gateway', name: 'Gateway', line: 'In production: a fail-closed proxy in front of your agents.' };
const SWARM: Part = { id: 'swarm', name: 'Swarm', line: 'Attacks your policy in CI, before an attacker does.' };
const TRUST: Part = { id: 'trust', name: 'Trust', line: 'Scores the MCP servers you install.' };
const CONTROL: Part = { id: 'control-plane', name: 'Control Plane', line: 'One policy for every agent, with signed audit trails.' };

function PartLink({ part, className = '' }: { part: Part; className?: string }) {
  return (
    <Link href={`/docs#${part.id}`} className={`pmap__part ${className}`.trim()}>
      <span className="pmap__name">
        {part.name}
        <ArrowUpRight size={13} strokeWidth={1.75} aria-hidden="true" />
      </span>
      <span className="pmap__line">{part.line}</span>
    </Link>
  );
}

/**
 * Where each Mastyf part sits relative to the one thing they all serve: the checkpoint
 * every tool call passes through. Each part links to its section in the docs.
 */
export function PlatformMap() {
  return (
    <figure className="pmap" aria-labelledby="pmap-caption">
      <PartLink part={CONTROL} className="pmap__band" />

      <div className="pmap__flow">
        <div className="pmap__end">
          <span className="pmap__name">Your agents</span>
          <span className="pmap__line">Claude, Cursor, LangChain, or your own</span>
        </div>

        <span className="pmap__arrow" aria-hidden="true">
          <span>tool call</span>
          <ArrowRight size={14} strokeWidth={1.75} />
        </span>

        <div className="pmap__check">
          <span className="pmap__check-label">Mastyf checkpoint</span>
          <PartLink part={SHIELD} />
          <PartLink part={GATEWAY} />
          <span className="pmap__check-note">Blocked calls stop here. Zero bytes reach a tool.</span>
        </div>

        <span className="pmap__arrow" aria-hidden="true">
          <span>allowed</span>
          <ArrowRight size={14} strokeWidth={1.75} />
        </span>

        <div className="pmap__end">
          <span className="pmap__name">Your tools</span>
          <span className="pmap__line">Files, shell, network, databases</span>
        </div>
      </div>

      <div className="pmap__support">
        <PartLink part={SWARM} className="pmap__swarm" />
        <PartLink part={TRUST} className="pmap__trust" />
      </div>

      <figcaption id="pmap-caption" className="sr-only">
        Agents send tool calls to the Mastyf checkpoint, made of Shield on desktops and Gateway in production. Only
        allowed calls reach your tools. Swarm tests the checkpoint&rsquo;s policy in CI, Trust scores the tool servers,
        and the Control Plane governs every agent.
      </figcaption>
    </figure>
  );
}
