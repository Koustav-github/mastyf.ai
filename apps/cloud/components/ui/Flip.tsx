import type { CSSProperties } from 'react';

type FlipProps = {
  children: string;
  /** Colour of the face that rolls into view; defaults to the current text colour. */
  light?: string;
  className?: string;
};

/**
 * Text that rolls on the X axis like a die when its link, button, or card is
 * hovered. The second face is decorative and hidden from assistive tech.
 */
export function Flip({ children, light, className }: FlipProps) {
  return (
    <span
      className={className ? `flip ${className}` : 'flip'}
      style={light ? ({ '--flip-light': light } as CSSProperties) : undefined}
    >
      <span className="flip__inner">
        <span className="flip__face flip__face--front">{children}</span>
        <span className="flip__face flip__face--back" aria-hidden="true">
          {children}
        </span>
      </span>
    </span>
  );
}
