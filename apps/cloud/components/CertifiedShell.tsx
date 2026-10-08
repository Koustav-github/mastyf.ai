import { SiteFooter } from '@/components/SiteFooter';
import { SiteNav } from '@/components/SiteNav';
import { safeAuth } from '@/lib/safe-auth';

type Props = { children: React.ReactNode };

export async function CertifiedShell({ children }: Props) {
  const session = await safeAuth();

  return (
    <div className="socket-shell landing">
      <SiteNav session={!!session} />
      {children}
      <SiteFooter />
    </div>
  );
}
