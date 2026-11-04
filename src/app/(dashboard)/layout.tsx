import { Sidebar } from '@/components/layout/sidebar';
import { MobileNav } from '@/components/layout/mobile-nav';
import { PrivacyProvider } from '@/contexts/privacy-context';

export default function DashboardShellLayout({ children }: { children: React.ReactNode }) {
  return (
    <PrivacyProvider>
      <div className="min-h-screen md:flex">
        <Sidebar />
        <div className="min-w-0 flex-1">
          <MobileNav />
          <main className="p-4 md:p-8">{children}</main>
        </div>
      </div>
    </PrivacyProvider>
  );
}
