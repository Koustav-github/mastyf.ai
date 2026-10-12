'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { Search, ArrowRight, Terminal, Shield, BookOpen, DollarSign, ChevronRight, X, Command } from 'lucide-react';
import Link from 'next/link';

interface CommandItem {
  id: string;
  label: string;
  description?: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  group: string;
  badge?: string;
}

const COMMANDS: CommandItem[] = [
  { id: 'check-agent', label: 'Check Your Agent', description: 'Free exposure scan, 30 seconds', href: '/#check-agent', icon: Shield, group: 'Quick Actions', badge: 'FREE' },
  { id: 'deploy', label: 'Developer Quickstart', description: 'npx @mastyf/gateway setup', href: '/#deploy', icon: Terminal, group: 'Quick Actions', badge: 'NPX' },
  { id: 'pricing', label: 'View Pricing', description: 'Plans, tiers & enterprise', href: '/pricing', icon: DollarSign, group: 'Navigation' },
  { id: 'research', label: 'Academic Research', description: 'Formal monograph & benchmarks', href: '/research', icon: BookOpen, group: 'Navigation', badge: 'DTRAP' },
  { id: 'developers', label: 'Developer Docs', description: 'Architecture, SDKs & API', href: '/developers', icon: Terminal, group: 'Navigation' },
  { id: 'trust', label: 'Trust & Compliance', description: 'SOC2, security audits', href: '/trust', icon: Shield, group: 'Navigation' },
  { id: 'cmq', label: 'CMQ Boundary Qualification', description: '15-point escape vector suite', href: '/#cmq', icon: Shield, group: 'Products', badge: 'SPEC' },
  { id: 'registry', label: 'MCP Registry', description: 'Trust scores & package ratings', href: '/#registry', icon: Shield, group: 'Products', badge: 'PUBLIC' },
  { id: 'threat-lab', label: 'Threat Lab', description: 'Interactive attack simulation', href: '/#threat-lab', icon: Shield, group: 'Products', badge: 'SIM' },
];

const ICON_MAP: Record<string, React.ComponentType<{ className?: string }>> = {
  Shield,
  Terminal,
  BookOpen,
  DollarSign,
};

interface CommandPaletteProps {
  open: boolean;
  onClose: () => void;
}

export function CommandPalette({ open, onClose }: CommandPaletteProps) {
  const [query, setQuery] = useState('');
  const [selectedIdx, setSelectedIdx] = useState(0);
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);

  const filtered = query.trim()
    ? COMMANDS.filter(
        (c) =>
          c.label.toLowerCase().includes(query.toLowerCase()) ||
          c.description?.toLowerCase().includes(query.toLowerCase()) ||
          c.group.toLowerCase().includes(query.toLowerCase())
      )
    : COMMANDS;

  const groups = [...new Set(filtered.map((c) => c.group))];

  useEffect(() => {
    setSelectedIdx(0);
  }, [query, open]);

  useEffect(() => {
    if (open) {
      setTimeout(() => inputRef.current?.focus(), 50);
      setQuery('');
    }
  }, [open]);

  const handleSelect = useCallback(
    (item: CommandItem) => {
      router.push(item.href);
      onClose();
    },
    [router, onClose]
  );

  useEffect(() => {
    if (!open) return;

    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      } else if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSelectedIdx((p) => Math.min(p + 1, filtered.length - 1));
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSelectedIdx((p) => Math.max(p - 1, 0));
      } else if (e.key === 'Enter') {
        e.preventDefault();
        const item = filtered[selectedIdx];
        if (item) handleSelect(item);
      }
    };

    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [open, filtered, selectedIdx, handleSelect, onClose]);

  if (!open) return null;

  let flatIdx = -1;

  return (
    <div
      className="fixed inset-0 z-[200] flex items-start justify-center pt-[15vh] px-4"
      onClick={onClose}
    >
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" />

      {/* Panel */}
      <div
        className="relative w-full max-w-lg rounded-2xl bg-[#080d1a]/98 backdrop-blur-2xl border border-white/[0.15] shadow-[0_40px_100px_rgba(0,0,0,0.9)] overflow-hidden"
        onClick={(e) => e.stopPropagation()}
        style={{
          animation: 'palette-in 0.2s cubic-bezier(0.22,1,0.36,1)',
        }}
      >
        {/* Search input */}
        <div className="flex items-center gap-3 px-4 py-3.5 border-b border-white/[0.08]">
          <Search className="w-4 h-4 text-slate-400 shrink-0" />
          <input
            ref={inputRef}
            type="text"
            placeholder="Search pages, products, docs..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="flex-1 bg-transparent text-sm text-white placeholder:text-slate-500 outline-none"
          />
          <button
            onClick={onClose}
            className="p-1 rounded-lg hover:bg-white/[0.06] text-slate-500 hover:text-white transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Results */}
        <div className="max-h-80 overflow-y-auto py-2">
          {filtered.length === 0 ? (
            <p className="text-sm text-slate-500 text-center py-8">No results for &ldquo;{query}&rdquo;</p>
          ) : (
            groups.map((group) => {
              const items = filtered.filter((c) => c.group === group);
              return (
                <div key={group} className="mb-1">
                  <div className="px-4 py-1.5 text-[10px] font-mono font-bold uppercase tracking-widest text-slate-600">
                    {group}
                  </div>
                  {items.map((item) => {
                    flatIdx++;
                    const currentIdx = flatIdx;
                    const isSelected = selectedIdx === currentIdx;
                    const Icon = item.icon;
                    return (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => handleSelect(item)}
                        onMouseEnter={() => setSelectedIdx(currentIdx)}
                        className={`w-full flex items-center gap-3 px-4 py-2.5 text-left transition-colors ${
                          isSelected ? 'bg-white/[0.07]' : 'hover:bg-white/[0.04]'
                        }`}
                      >
                        <div className={`p-1.5 rounded-lg ${isSelected ? 'bg-amber-400/15 border border-amber-400/25' : 'bg-white/[0.04] border border-white/[0.06]'}`}>
                          <Icon className={`w-3.5 h-3.5 ${isSelected ? 'text-amber-400' : 'text-slate-400'}`} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className={`text-sm font-medium ${isSelected ? 'text-white' : 'text-slate-200'}`}>
                            {item.label}
                          </div>
                          {item.description && (
                            <div className="text-xs text-slate-500 truncate">{item.description}</div>
                          )}
                        </div>
                        {item.badge && (
                          <span className="text-[9px] font-mono font-bold tracking-wider px-1.5 py-0.5 rounded bg-amber-400/10 text-amber-400/80 border border-amber-400/20 shrink-0">
                            {item.badge}
                          </span>
                        )}
                        <ChevronRight className={`w-3.5 h-3.5 shrink-0 ${isSelected ? 'text-amber-400' : 'text-slate-600'}`} />
                      </button>
                    );
                  })}
                </div>
              );
            })
          )}
        </div>

        {/* Footer hint */}
        <div className="flex items-center justify-between px-4 py-2.5 border-t border-white/[0.06] text-[11px] font-mono text-slate-600">
          <div className="flex items-center gap-3">
            <span className="flex items-center gap-1"><kbd className="px-1 rounded bg-white/[0.06] text-slate-500">↑↓</kbd> navigate</span>
            <span className="flex items-center gap-1"><kbd className="px-1 rounded bg-white/[0.06] text-slate-500">↵</kbd> open</span>
            <span className="flex items-center gap-1"><kbd className="px-1 rounded bg-white/[0.06] text-slate-500">esc</kbd> close</span>
          </div>
          <div className="flex items-center gap-1 text-slate-700">
            <Command className="w-3 h-3" />
            <span>K</span>
          </div>
        </div>
      </div>

      <style>{`
        @keyframes palette-in {
          from { opacity: 0; transform: scale(0.96) translateY(-8px); }
          to { opacity: 1; transform: scale(1) translateY(0); }
        }
      `}</style>
    </div>
  );
}

/**
 * Hook to open the command palette with ⌘K / Ctrl+K.
 */
export function useCommandPalette() {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setOpen((p) => !p);
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  return { open, setOpen, close: () => setOpen(false) };
}
