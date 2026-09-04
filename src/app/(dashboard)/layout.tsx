import { Sidebar } from '@/components/layout/sidebar';
import { PrivacyProvider } from '@/contexts/privacy-context';

export default function DashboardShellLayout({ children }: { children: React.ReactNode }) {
  return (
    <PrivacyProvider>
      <div className="flex min-h-screen">
        <Sidebar />
        <main className="flex-1 p-4 md:p-8">{children}</main>
      </div>
    </PrivacyProvider>
  );
}
