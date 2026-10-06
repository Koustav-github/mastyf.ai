'use client';

import * as React from 'react';
import { motion, useSpring, useTransform } from 'motion/react';
import { cn } from '@/lib/utils';

export interface AnimatedNumberProps {
  value: number;
  duration?: number;
  format?: (n: number) => string;
  className?: string;
}

export function AnimatedNumber({
  value,
  duration = 1.2,
  format = (n) => Math.round(n).toString(),
  className,
}: AnimatedNumberProps) {
  const spring = useSpring(0, {
    stiffness: 80,
    damping: 20,
    duration: duration * 1000,
  });

  const display = useTransform(spring, (current) => format(current));

  React.useEffect(() => {
    spring.set(value);
  }, [spring, value]);

  return (
    <motion.span className={cn('inline-block font-mono tabular-nums', className)}>
      {display}
    </motion.span>
  );
}
