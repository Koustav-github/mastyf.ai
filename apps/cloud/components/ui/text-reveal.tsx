'use client';

import * as React from 'react';
import { motion, Variants } from 'motion/react';
import { cn } from '@/lib/utils';

export interface TextRevealProps {
  text: string;
  className?: string;
  delay?: number;
  stagger?: number;
  highlightWords?: string[];
  highlightClass?: string;
}

export function TextReveal({
  text,
  className,
  delay = 0,
  stagger = 0.04,
  highlightWords = [],
  highlightClass = 'text-amber-400 font-bold',
}: TextRevealProps) {
  const words = text.split(' ');

  const container: Variants = {
    hidden: { opacity: 0 },
    visible: (i = 1) => ({
      opacity: 1,
      transition: {
        staggerChildren: stagger,
        delayChildren: delay * i,
      },
    }),
  };

  const child: Variants = {
    hidden: {
      opacity: 0,
      y: 12,
      filter: 'blur(4px)',
    },
    visible: {
      opacity: 1,
      y: 0,
      filter: 'blur(0px)',
      transition: {
        type: 'spring',
        damping: 18,
        stiffness: 120,
      },
    },
  };

  return (
    <motion.span
      className={cn('inline-block', className)}
      variants={container}
      initial="hidden"
      animate="visible"
    >
      {words.map((word, index) => {
        // Strip punctuation for matching highlights
        const cleanWord = word.replace(/[^a-zA-Z0-9]/g, '');
        const isHighlight = highlightWords.some(
          (hw) => hw.toLowerCase() === cleanWord.toLowerCase()
        );

        return (
          <motion.span
            key={`${word}-${index}`}
            variants={child}
            className={cn('inline-block mr-[0.25em]', isHighlight && highlightClass)}
          >
            {word}
          </motion.span>
        );
      })}
    </motion.span>
  );
}
