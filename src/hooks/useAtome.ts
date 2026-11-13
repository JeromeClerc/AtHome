import { useContext, useEffect, useState } from 'react'
import { AtomeContext, type AtomeContextValue } from '@/context/AtomeContext'
import { subscribeMyAtomes } from '@/services/atome.service'
import type { Atome } from '@/types'
import { useAuth } from './useAuth'

/** Atome actif (route `/:atomeSlug/...`). */
export function useAtome(): AtomeContextValue {
  const ctx = useContext(AtomeContext)
  if (!ctx) throw new Error('useAtome doit être utilisé dans <AtomeProvider>.')
  return ctx
}

/** Liste temps réel des Atomes de l'utilisateur connecté. */
export function useMyAtomes(): { atomes: Atome[]; loading: boolean } {
  const { user } = useAuth()
  const [atomes, setAtomes] = useState<Atome[]>([])
  const [loading, setLoading] = useState(true)
  useEffect(() => {
    if (!user) return undefined
    setLoading(true)
    return subscribeMyAtomes(
      user.uid,
      (list) => {
        setAtomes(list)
        setLoading(false)
      },
      () => setLoading(false),
    )
  }, [user])
  return { atomes, loading }
}
