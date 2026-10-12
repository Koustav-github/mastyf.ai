import Link from 'next/link';
import { GITHUB_REPO_URL } from '@/lib/github-links';
import { SUPPORT_MAILTO } from '@/lib/support';
import { ShieldCheck, ExternalLink } from 'lucide-react';

interface FooterLink {
  label: string;
  href: string;
  external?: boolean;
}

const FOOTER_COLUMNS: Record<string, FooterLink[]> = {
  Product: [
    { label: 'Mastyf Shield (Desktop)', href: '/#scanner' },
    { label: 'Mastyf Gateway (Runtime)', href: '/developers' },
    { label: 'Mastyf Swarm (Adversarial CI)', href: '/platform#swarm' },
    { label: 'Mastyf Trust (MCP Registry)', href: '#registry' },
    { label: 'Fleet Control Plane', href: '/pilot' },
    { label: 'Pricing & Licensing', href: '#pricing' },
  ],
  Research: [
    { label: 'Mastyf Guard 1.5B (HF Weights)', href: 'https://huggingface.co/Rudraneel93/mastyf-guard-1.5b-v2-boundary-sharpened', external: true },
    { label: 'SSRN Preprint (#7505299)', href: 'https://papers.ssrn.com/sol3/papers.cfm?abstract_id=7505299', external: true },
    { label: 'Author ORCID (0009-0009-6173-0262)', href: 'https://orcid.org/0009-0009-6173-0262', external: true },
    { label: 'InjecAgent 4,216 Evaluation', href: '#model-explorer' },
    { label: 'AgentDojo NeurIPS Benchmark', href: '#model-explorer' },
    { label: 'Formal Proofs (Theorems 1–3)', href: '#academic-paper' },
  ],
  Developers: [
    { label: 'Documentation & CLI', href: '/developers' },
    { label: 'Free Agent Security Check', href: '#scanner' },
    { label: 'CMQ Bypass Suite (15 Vectors)', href: '#cmq' },
    { label: 'Threat Lab Simulator', href: '#threat-lab' },
    { label: 'GitHub Repository', href: GITHUB_REPO_URL, external: true },
    { label: 'OWASP Agentic Compliance', href: 'https://github.com/mastyf-ai/mastyf.ai/blob/main/docs/ENTERPRISE_EVIDENCE_PACK.md', external: true },
  ],
  Company: [
    { label: 'About Mastyf AI Lab', href: '/research' },
    { label: '30-Day Enterprise Pilot', href: '/pilot' },
    { label: 'Security & Bug Bounty', href: 'mailto:security@mastyf.ai', external: true },
    { label: 'Contact Support', href: SUPPORT_MAILTO, external: true },
    { label: 'Terms & Licensing', href: '/terms' },
    { label: 'Privacy Policy', href: '/privacy' },
  ],
};

export function ModernFooter() {
  return (
    <footer className="relative bg-[#020307] text-slate-400 border-t border-white/[0.08] pt-20 pb-12 px-6">
      <div className="max-w-[1180px] mx-auto">
        
        {/* Main 5-Column Grid */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-8 lg:gap-12 mb-16">
          
          {/* Brand Info Column */}
          <div className="col-span-2 md:col-span-1">
            <Link href="/" className="flex items-center gap-2 mb-4">
              <div className="w-8 h-8 rounded-lg bg-amber-500/10 border border-amber-500/25 flex items-center justify-center text-amber-400">
                <ShieldCheck className="w-4 h-4 text-amber-400" />
              </div>
              <span className="text-base font-extrabold text-white font-mono">mastyf<span className="text-amber-400">.ai</span></span>
            </Link>

            <p className="text-xs text-slate-400 leading-relaxed mb-4">
              The execution security boundary for AI agents and connected MCP tools. 
              Grounded in formal research, deterministic microsecond mediation, and open-source models.
            </p>

            <div className="flex items-center gap-2 text-[11px] font-mono text-emerald-400">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <span>Reference Monitor Active · v2.2</span>
            </div>
          </div>

          {/* Nav Columns */}
          {Object.entries(FOOTER_COLUMNS).map(([title, links]) => (
            <div key={title}>
              <h5 className="text-xs font-mono font-bold uppercase tracking-wider text-white mb-4">
                {title}
              </h5>
              <ul className="space-y-2 text-xs">
                {links.map((link) => (
                  <li key={link.label}>
                    <Link
                      href={link.href}
                      target={link.external ? '_blank' : undefined}
                      rel={link.external ? 'noreferrer' : undefined}
                      className="hover:text-slate-200 transition-colors inline-flex items-center gap-1 text-slate-400"
                    >
                      <span>{link.label}</span>
                      {link.external && <ExternalLink className="w-2.5 h-2.5 text-slate-500" />}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}

        </div>

        {/* Bottom Bar */}
        <div className="pt-8 border-t border-white/[0.06] flex flex-col md:flex-row items-center justify-between gap-4 text-xs font-mono text-slate-500">
          <div>
            © {new Date().getFullYear()} Mastyf AI Research Laboratory, Kolkata, India. All rights reserved.
          </div>

          <div className="flex items-center gap-4">
            <span>AGPL-3.0 Self-Hostable Core</span>
            <span>·</span>
            <span>Ed25519 Verifiable Receipts</span>
          </div>
        </div>

      </div>
    </footer>
  );
}
