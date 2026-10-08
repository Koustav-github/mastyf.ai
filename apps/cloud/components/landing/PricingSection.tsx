import Link from 'next/link';
import { ArrowRight, Check } from 'lucide-react';
import { Flip } from '@/components/ui/Flip';
import { PRICING_TIERS } from './stats';

/** The five plans at a glance. Full feature lists live in the docs (#plans). */
export function PricingSection() {
  return (
    <section className="section section--flush-top" id="pricing" aria-label="Plans">
      <div className="tiers tiers--crisp" data-reveal>
        {PRICING_TIERS.map((tier) => {
          const buttonClass = `btn ${tier.featured ? 'btn-primary' : 'btn-secondary'}`;
          return (
            <article key={tier.id} className={`tier${tier.featured ? ' tier--featured' : ''}`}>
              <div className="tier__head">
                <h2 className="tier__name">
                  <Flip light="var(--accent)">{tier.name}</Flip>
                </h2>
                {tier.featured ? (
                  <span className="status status--active">
                    <span className="status__mark" aria-hidden="true">●</span>
                    Most popular
                  </span>
                ) : null}
              </div>
              <p className="tier__price">
                <span className="tier__amount">{tier.price}</span>
                <span className="tier__billing">{tier.billing}</span>
              </p>
              <p className="tier__desc">{tier.audience}</p>

              <ul className="tier__list">
                {tier.highlights.map((item) => (
                  <li key={item}>
                    <Check size={13} strokeWidth={2} aria-hidden="true" />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>

              <div className="tier__cta">
                {tier.external ? (
                  <a href={tier.href} className={buttonClass} target="_blank" rel="noopener noreferrer">
                    {tier.shortCta}
                  </a>
                ) : (
                  <Link href={tier.href} className={buttonClass}>
                    {tier.shortCta}
                  </Link>
                )}
              </div>
            </article>
          );
        })}
      </div>

      <div className="pricing-foot">
        <Link href="/docs#plans" className="link-icon">
          Compare every feature
          <ArrowRight size={13} strokeWidth={1.75} aria-hidden="true" />
        </Link>
        <Link href="/docs#faq" className="link-icon">
          Questions and answers
          <ArrowRight size={13} strokeWidth={1.75} aria-hidden="true" />
        </Link>
        <span>Payments by Lemon Squeezy. License keys arrive instantly.</span>
      </div>
    </section>
  );
}
