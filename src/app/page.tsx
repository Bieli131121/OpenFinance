import { redirect } from 'next/navigation';

// A raiz não tem conteúdo próprio: o middleware manda quem não está logado para
// /login; quem está logado cai no dashboard.
export default function RootPage() {
  redirect('/dashboard');
}
