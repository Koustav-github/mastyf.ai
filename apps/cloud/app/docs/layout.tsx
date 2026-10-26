import { safeAuth } from '@/lib/safe-auth';
import { SiteFooter } from '@/components/SiteFooter';
import { SiteNav } from '@/components/SiteNav';
import { DocsSidebar } from '@/components/docs/DocsSidebar';

/** Every docs page: the site header, the topic sidebar, the page, the footer. */
export default async function DocsLayout({ children }: { children: React.ReactNode }) {
  const session = await safeAuth();

  return (
    <>
      <SiteNav session={!!session} />
      <div className="docs">
        <DocsSidebar />
        {children}
      </div>
      <SiteFooter />
    </>
  );
}
