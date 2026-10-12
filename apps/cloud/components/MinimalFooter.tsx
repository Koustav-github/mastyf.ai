import Link from 'next/link';
import { GITHUB_REPO_URL } from '@/lib/github-links';
import { SUPPORT_EMAIL, SUPPORT_MAILTO } from '@/lib/support';

const LINKS = {
  Product: [
    { label: 'Agent Check (Free)', href: '/#scanner' },
    { label: 'Runtime Guard', href: '/#platform' },
    { label: 'CMQ Verify', href: '/#cmq' },
    { label: 'MCP Registry', href: '/#registry' },
    { label: 'Enterprise Fleet', href: '/pricing' },
    { label: 'Pricing', href: '/pricing' },
  ],
  Developers: [
    { label: 'Quickstart', href: '/developers' },
    { label: 'Documentation', href: '/developers#docs' },
    { label: 'GitHub (OSS)', href: GITHUB_REPO_URL, external: true },
    { label: 'TypeScript SDK', href: '/developers#sdks' },
    { label: 'Python SDK', href: '/developers#sdks' },
  ],
  Research: [
    { label: 'Academic Monograph', href: '/research' },
    { label: 'AgentDojo Benchmarks', href: '/research#benchmarks' },
    { label: 'Adversarial Corpus', href: '/research#attacks' },
    { label: 'Formal Specification', href: '/research#spec' },
  ],
  Company: [
    { label: SUPPORT_EMAIL, href: SUPPORT_MAILTO },
    { label: 'Trust & SOC2', href: '/trust' },
    { label: 'Terms', href: '/terms' },
    { label: 'Privacy', href: '/privacy' },
    { label: 'Status', href: 'https://status.mastyf.ai', external: true },
  ],
};

export function MinimalFooter() {
  return (
    <footer className="border-t border-white/[0.05] py-16 px-6">
      <div className="max-w-[1120px] mx-auto">
        {/* Top */}
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-12 mb-16">
          {/* Brand */}
          <div className="lg:col-span-1">
            <Link href="/" className="text-[16px] font-bold text-white tracking-[-0.02em] mb-3 block">
              mastyf<span className="text-amber-400">.ai</span>
            </Link>
            <p className="text-[12px] text-slate-600 leading-relaxed mb-4">
              Runtime authorization for autonomous AI agents.
            </p>
            <div className="flex items-center gap-1.5 text-[11px] font-mono text-emerald-500">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              All systems operational
            </div>
          </div>

          {/* Nav columns */}
          {Object.entries(LINKS).map(([group, items]) => (
            <div key={group}>
              <div className="text-[11px] font-mono font-bold uppercase tracking-[0.08em] text-slate-500 mb-4">
                {group}
              </div>
              <ul className="flex flex-col gap-2.5">
                {items.map((item) => (
                  <li key={item.label}>
                    {'external' in item && item.external ? (
                      <a
                        href={item.href}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-[12px] text-slate-500 hover:text-white transition-colors"
                      >
                        {item.label}
                      </a>
                    ) : (
                      <Link href={item.href} className="text-[12px] text-slate-500 hover:text-white transition-colors">
                        {item.label}
                      </Link>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        {/* Bottom */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pt-8 border-t border-white/[0.05]">
          <p className="text-[11px] font-mono text-slate-700">
            &copy; {new Date().getFullYear()} Mastyf.ai Inc. All rights reserved.
          </p>
          <p className="text-[11px] font-mono text-slate-700 sm:text-right max-w-sm">
            Security claims scoped to documented deployments and verification conditions.
          </p>
        </div>
      </div>
    </footer>
  );
}
