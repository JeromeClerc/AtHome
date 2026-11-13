import { useCallback, useEffect, useMemo, useState } from 'react'
import { markAllNotificationsRead, markNotificationRead, subscribeNotifications } from '@/services/notification.service'
import type { AppNotification } from '@/types'
import { useAtome } from './useAtome'
import { useAuth } from './useAuth'

/** Notifications in-app de l'utilisateur pour l'Atome actif (temps réel). */
export function useNotifications() {
  const { atome } = useAtome()
  const { user } = useAuth()
  const [items, setItems] = useState<AppNotification[]>([])

  useEffect(() => {
    if (!user) return undefined
    return subscribeNotifications(atome.id, user.uid, setItems, () => setItems([]))
  }, [atome.id, user])

  const unread = useMemo(() => items.filter((n) => !n.read), [items])

  const markRead = useCallback((id: string) => markNotificationRead(atome.id, id), [atome.id])
  const markAllRead = useCallback(
    () => markAllNotificationsRead(atome.id, unread.map((n) => n.id)),
    [atome.id, unread],
  )

  return { items, unreadCount: unread.length, markRead, markAllRead }
}
