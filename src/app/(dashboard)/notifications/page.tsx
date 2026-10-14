import { getNotifications, generateAutomaticAlerts } from '@/lib/supabase/queries/notifications';
import { markReadAction } from './actions';
const TYPE_ICONS: Record<string, string> = { budget_exceeded: '⚠️', low_balance: '💰', invoice_due: '💳', goal_behind: '🎯' };
export default async function NotificationsPage() {
  await generateAutomaticAlerts();
  const notifications = await getNotifications();
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Notificações</h1>
      <div className="space-y-2">
        {notifications.map((n) => (<div key={n.id} className={`flex items-start justify-between rounded-xl border p-4 ${n.read ? 'border-neutral-200 opacity-60 dark:border-neutral-800' : 'border-amber-300 dark:border-amber-800'}`}><div><p className="font-medium">{TYPE_ICONS[n.type] ?? '🔔'} {n.title}</p>{n.message && <p className="mt-1 text-sm text-neutral-500">{n.message}</p>}<p className="mt-1 text-xs text-neutral-400">{new Date(n.created_at).toLocaleString('pt-BR')}</p></div>{!n.read && (<form action={markReadAction}><input type="hidden" name="id" value={n.id} /><button type="submit" className="text-xs text-neutral-500 hover:text-neutral-700">Marcar como lida</button></form>)}</div>))}
        {notifications.length === 0 && <div className="rounded-2xl border border-dashed border-neutral-300 p-8 text-center text-neutral-500 dark:border-neutral-700">Nenhuma notificação por enquanto.</div>}
      </div>
    </div>
  );
}
