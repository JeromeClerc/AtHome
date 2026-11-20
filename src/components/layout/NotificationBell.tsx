import { Bell, CalendarClock, CheckCheck, CheckCircle2, MessageSquareText, UserPlus, XCircle } from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'
import { fr } from 'date-fns/locale'
import { useNavigate } from 'react-router-dom'
import { Dropdown, EmptyState } from '@/components/ui'
import { useAtome } from '@/hooks/useAtome'
import { useNotifications } from '@/hooks/useNotifications'
import type { AppNotification, NotificationType } from '@/types'
import { cn } from '@/utils/cn'

const ICONS: Record<NotificationType, typeof Bell> = {
  change_request: CalendarClock,
  change_counter_proposed: CalendarClock,
  change_approved: CheckCircle2,
  change_rejected: XCircle,
  note_added: MessageSquareText,
  member_joined: UserPlus,
}

/** Cloche de notifications : compteur de non-lus + popover (demandes à valider, notes de l'autre parent). */
export function NotificationBell() {
  const { atome } = useAtome()
  const { items, unreadCount, markRead, markAllRead } = useNotifications()
  const navigate = useNavigate()

  const open = (n: AppNotification, close: () => void) => {
    void markRead(n.id)
    close()
    const params = new URLSearchParams()
    if (n.date) params.set('date', n.date)
    if (n.refId && n.type !== 'note_added') params.set('request', n.refId)
    navigate(`/${atome.slug}?${params.toString()}`)
  }

  return (
    <Dropdown
      className="w-[min(92vw,24rem)]"
      trigger={({ toggle, open: isOpen }) => (
        <button
          type="button"
          onClick={toggle}
          aria-expanded={isOpen}
          aria-label={`Notifications (${unreadCount} non lues)`}
          className="relative cursor-pointer rounded-full p-2 text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
        >
          <Bell className="h-5 w-5" />
          {unreadCount > 0 && (
            <span className="absolute -right-0.5 -top-0.5 flex h-5 min-w-5 items-center justify-center rounded-full bg-rose-600 px-1 text-[10px] font-bold text-white">
              {unreadCount > 9 ? '9+' : unreadCount}
            </span>
          )}
        </button>
      )}
    >
      {(close) => (
        <div>
          <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3 dark:border-slate-800">
            <p className="font-semibold">Notifications</p>
            {unreadCount > 0 && (
              <button type="button" onClick={() => void markAllRead()} className="inline-flex items-center gap-1 text-xs text-brand-600 hover:underline">
                <CheckCheck className="h-3.5 w-3.5" /> Tout marquer comme lu
              </button>
            )}
          </div>
          {items.length === 0 ? (
            <EmptyState icon={<Bell className="h-5 w-5" />} title="Aucune notification" />
          ) : (
            <ul className="max-h-[60dvh] divide-y divide-slate-100 overflow-y-auto dark:divide-slate-800">
              {items.map((n) => {
                const Icon = ICONS[n.type]
                return (
                  <li key={n.id}>
                    <button
                      type="button"
                      onClick={() => open(n, close)}
                      className={cn(
                        'flex w-full gap-3 px-4 py-3 text-left hover:bg-slate-50 dark:hover:bg-slate-800/60',
                        !n.read && 'bg-brand-50/60 dark:bg-brand-500/10',
                      )}
                    >
                      <Icon className="mt-0.5 h-4 w-4 shrink-0 text-slate-500" aria-hidden />
                      <span className="min-w-0 flex-1">
                        <span className="flex items-center gap-2 text-sm font-medium">
                          {n.title}
                          {!n.read && <span className="h-2 w-2 rounded-full bg-brand-600" aria-label="non lue" />}
                        </span>
                        <span className="line-clamp-2 text-xs text-slate-600 dark:text-slate-400">{n.body}</span>
                        {n.createdAt && (
                          <span className="text-[11px] text-slate-400">
                            {formatDistanceToNow(n.createdAt.toDate(), { addSuffix: true, locale: fr })}
                          </span>
                        )}
                      </span>
                    </button>
                  </li>
                )
              })}
            </ul>
          )}
        </div>
      )}
    </Dropdown>
  )
}
