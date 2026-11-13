import { createContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import { useAuth } from '@/hooks/useAuth'
import { subscribeAtomeBySlug } from '@/services/atome.service'
import { toFrenchError } from '@/services/firestore.helpers'
import { subscribeProtons } from '@/services/proton.service'
import type { Atome, AtomeRole, Household, Proton } from '@/types'

export interface AtomeContextValue {
  atome: Atome
  role: AtomeRole
  /** Foyer de l'utilisateur s'il est parent, sinon null. */
  household: Household | null
  isParent: boolean
  /** Neutron (ou proton) : aucune modification du planning possible. */
  isReadOnly: boolean
  protons: Proton[]
  displayName: string
}

export const AtomeContext = createContext<AtomeContextValue | null>(null)

interface AtomeState {
  status: 'loading' | 'ready' | 'not-found' | 'error'
  atome: Atome | null
  error?: string
}

/**
 * Charge l'Atome correspondant au slug de l'URL (temps réel) et ses protons.
 * Affiche `fallback` pendant le chargement et `notFound` si l'utilisateur n'est pas membre.
 */
export function AtomeProvider({
  slug,
  children,
  fallback,
  notFound,
}: {
  slug: string
  children: ReactNode
  fallback: ReactNode
  notFound: (message?: string) => ReactNode
}) {
  const { user } = useAuth()
  const [state, setState] = useState<AtomeState>({ status: 'loading', atome: null })
  const [protons, setProtons] = useState<Proton[]>([])

  useEffect(() => {
    if (!user) return undefined
    setState({ status: 'loading', atome: null })
    return subscribeAtomeBySlug(
      slug,
      user.uid,
      (atome) => setState(atome ? { status: 'ready', atome } : { status: 'not-found', atome: null }),
      (e) => setState({ status: 'error', atome: null, error: toFrenchError(e) }),
    )
  }, [slug, user])

  const atomeId = state.atome?.id
  useEffect(() => {
    if (!atomeId) return undefined
    return subscribeProtons(atomeId, setProtons, () => setProtons([]))
  }, [atomeId])

  const value = useMemo<AtomeContextValue | null>(() => {
    if (!state.atome || !user) return null
    const role = state.atome.members[user.uid]
    if (!role) return null
    const household: Household | null = role === 'electron' || role === 'positron' ? role : null
    return {
      atome: state.atome,
      role,
      household,
      isParent: household !== null,
      isReadOnly: household === null,
      protons,
      displayName: state.atome.memberProfiles[user.uid]?.displayName ?? user.displayName ?? user.email ?? 'Moi',
    }
  }, [state.atome, user, protons])

  if (state.status === 'loading') return <>{fallback}</>
  if (state.status === 'error') return <>{notFound(state.error)}</>
  if (!value) return <>{notFound()}</>
  return <AtomeContext.Provider value={value}>{children}</AtomeContext.Provider>
}
