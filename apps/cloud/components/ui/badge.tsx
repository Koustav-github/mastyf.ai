import * as React from 'react';
import { cn } from '@/lib/utils';

export interface BadgeProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: 'default' | 'secondary' | 'outline' | 'destructive' | 'success' | 'warning' | 'live';
}

function Badge({ className, variant = 'default', ...props }: BadgeProps) {
  const variantStyles = {
    default: 'bg-amber-500/10 text-amber-400 border-amber-500/30',
    secondary: 'bg-white/5 text-slate-300 border-white/10',
    outline: 'border-slate-700 text-slate-300',
    destructive: 'bg-red-500/10 text-red-400 border-red-500/30',
    success: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30',
    warning: 'bg-amber-500/15 text-amber-300 border-amber-500/40',
    live: 'bg-amber-500/10 text-amber-400 border-amber-500/40 shadow-[0_0_12px_rgba(245,158,11,0.2)]',
  };

  return (
    <div
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-mono font-semibold transition-colors',
        variantStyles[variant],
        className
      )}
      {...props}
    />
  );
}

export { Badge };
