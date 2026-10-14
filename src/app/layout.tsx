import type { Metadata } from 'next';
import './globals.css';
export const metadata: Metadata = { title: 'OpenFinance Hub', description: 'Central financeira pessoal com Open Finance' };
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (<html lang="pt-BR"><body>{children}</body></html>);
}
