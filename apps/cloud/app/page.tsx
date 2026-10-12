import { safeAuth } from '@/lib/safe-auth';
import { ModernNav } from '@/components/ModernNav';
import { UltraHero } from '@/components/landing/UltraHero';
import { UnifiedProductStage } from '@/components/landing/UnifiedProductStage';
import { BenchmarkProofSection } from '@/components/landing/BenchmarkProofSection';
import { DeveloperSection } from '@/components/landing/DeveloperSection';
import { ModernPricing } from '@/components/landing/ModernPricing';
import { ModernFooter } from '@/components/ModernFooter';
import './mastyf-design-system.css';
import './globals.css';

export default async function HomePage() {
  const session = await safeAuth();

  return (
    <div className="relative bg-[#030509] text-slate-100 overflow-x-hidden min-h-screen selection:bg-amber-500/20 selection:text-amber-300">
      {/* Background Dot Grid */}
      <div className="m-grid-bg" aria-hidden="true" />

      {/* Floating Modern Navigation */}
      <ModernNav session={!!session} />

      <main className="relative z-10">
        
        {/* Act 1: Core Thesis & Live Telemetry Stream */}
        <UltraHero />

        {/* Act 2: Unified Interactive Product Stage (Models · Pipeline · Scanner · Threat Lab) */}
        <UnifiedProductStage />

        {/* Act 3: Empirical Validation & SSRN Preprint Proofs (4,040 Cases) */}
        <BenchmarkProofSection />

        {/* Act 4: Developer Quickstart in 30 Seconds (npx · Docker · Ollama · SDK) */}
        <DeveloperSection />

        {/* Act 5: Commercial Tiers & Competitor Matrix */}
        <ModernPricing />

      </main>

      {/* Institutional Research Footer */}
      <ModernFooter />
    </div>
  );
}
