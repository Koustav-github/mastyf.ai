import * as React from 'react';
import { cn } from '@/lib/utils';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'default' | 'secondary' | 'outline' | 'ghost' | 'destructive' | 'link' | 'accent';
  size?: 'default' | 'sm' | 'lg' | 'icon';
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = 'default', size = 'default', ...props }, ref) => {
    const variantStyles = {
      default:
        'bg-amber-400 text-slate-950 font-bold hover:bg-amber-300 shadow-[0_0_20px_rgba(245,158,11,0.25)] border border-amber-300/40 active:translate-y-[1px]',
      accent:
        'bg-cyan-500 text-slate-950 font-bold hover:bg-cyan-400 shadow-[0_0_20px_rgba(6,182,212,0.25)] border border-cyan-400/40 active:translate-y-[1px]',
      secondary:
        'bg-white/5 text-slate-200 hover:bg-white/10 border border-white/10 hover:border-white/20 active:translate-y-[1px]',
      outline:
        'bg-transparent border border-slate-700 text-slate-200 hover:bg-slate-800/60 hover:border-slate-600 active:translate-y-[1px]',
      ghost:
        'bg-transparent text-slate-300 hover:bg-white/5 hover:text-white',
      destructive:
        'bg-red-500/10 text-red-400 border border-red-500/30 hover:bg-red-500/20 active:translate-y-[1px]',
      link:
        'text-amber-400 underline-offset-4 hover:underline p-0 h-auto font-normal',
    };

    const sizeStyles = {
      default: 'h-10 px-4 py-2 text-sm',
      sm: 'h-8 px-3 text-xs',
      lg: 'h-12 px-6 text-base',
      icon: 'h-9 w-9 p-0',
    };

    return (
      <button
        ref={ref}
        className={cn(
          'inline-flex items-center justify-center rounded-lg font-medium transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400/50 disabled:pointer-events-none disabled:opacity-50 select-none cursor-pointer',
          variantStyles[variant],
          sizeStyles[size],
          className
        )}
        {...props}
      />
    );
  }
);
Button.displayName = 'Button';

export { Button };
