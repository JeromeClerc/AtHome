import { Ban, Check, ChevronDown, Pencil, RefreshCw, ShieldCheck, Sparkles, X } from 'lucide-react'
import { useState } from 'react'
import { Alert, Badge, Button, Modal, Textarea } from '@/components/ui'
import { HOUSEHOLD_STYLES } from '@/config/theme'
import { useAtome } from '@/hooks/useAtome'
import { useScheduleActions } from '@/hooks/useSchedule'
import { toFrenchError } from '@/services/firestore.helpers'
import type { ChangeRequest, ChangeRequestStatus } from '@/types'
import { ACTION_LABELS, canPerform, STATUS_LABELS } from '@/utils/changeRequestMachine'
import { cn } from '@/utils/cn'
import { formatDateRanges } from '@/utils/dates'
import { ChangeRequestModal, type ChangeRequestMode } from './ChangeRequestModal'

const STATUS_BADGE: Record<ChangeRequestStatus, string> = {
  pending: 'bg-amber-100 text-amber-800 dark:bg-amber-900/50 dark:text-amber-200',
  counter_proposed: 'bg-violet-100 text-violet-800 dark:bg-violet-900/50 dark:text-violet-200',
  rejected: 'bg-rose-100 text-rose-800 dark:bg-rose-900/50 dark:text-rose-200',
  approved: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/50 dark:text-emerald-200',
  cancelled: 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300',
}

/**
 * Carte d'une demande de modification : résumé, historique, et actions possibles pour l'utilisateur
 * (approuver, contre-proposer, rejeter avec motif filtré via le sas BIFF, réviser, annuler) selon la machine à états.
 */
export function RequestCard({ request, highlighted = false }: { request: ChangeRequest; highlighted?: boolean }) {
  const { atome, protons, household } = useAtome()
  const { act, prepareBiffRejection } = useScheduleActions()
  const [modalMode, setModalMode] = useState<ChangeRequestMode | null>(null)
  const [rejecting, setRejecting] = useState(false)
  /** Brouillon brut saisi librement par le parent — uniquement conservé en état local, jamais persisté dans Firestore. */
  const [rawReason, setRawReason] = useState('')
  /** Version reformulée par Gemini selon la méthode BIFF (seule version autorisée à être envoyée). */
  const [biffProposal, setBiffProposal] = useState<string | null>(null)
  const [rewriting, setRewriting] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [showHistory, setShowHistory] = useState(false)

  const names = request.protonIds.map((id) => protons.find((p) => p.id === id)?.firstName ?? 'Enfant supprimé').join(', ')
  const can = (a: Parameters<typeof canPerform>[1]) => household !== null && canPerform(request, a, household)
  const waitingForMe = household === request.awaitingHousehold

  const run = async (fn: () => Promise<void>) => {
    setBusy(true)
    setError(null)
    try {
      await fn()
    } catch (e) {
      setError(toFrenchError(e))
    } finally {
      setBusy(false)
    }
  }

  const closeRejectModal = () => {
    setRejecting(false)
    setRawReason('')
    setBiffProposal(null)
    setError(null)
  }

  const handlePrepareBiff = async () => {
    if (!rawReason.trim()) return
    setRewriting(true)
    setError(null)
    try {
      const proposal = await prepareBiffRejection(rawReason)
      setBiffProposal(proposal)
    } catch (e) {
      setError(toFrenchError(e))
    } finally {
      setRewriting(false)
    }
  }

  return (
    <article
      className={cn(
        'rounded-xl border bg-white p-3 text-sm dark:bg-slate-900',
        highlighted ? 'border-brand-500 ring-2 ring-brand-500/30' : 'border-slate-200 dark:border-slate-800',
      )}
    >
      <div className="flex flex-wrap items-center gap-2">
        <Badge className={STATUS_BADGE[request.status]}>{STATUS_LABELS[request.status]}</Badge>
        {waitingForMe && request.status !== 'rejected' && <Badge className="bg-brand-600 text-white">À vous de valider</Badge>}
        {waitingForMe && request.status === 'rejected' && <Badge className="bg-rose-600 text-white">À réviser</Badge>}
      </div>
      <p className="mt-2 font-medium">{formatDateRanges(request.dates)}</p>
      <p className="text-slate-600 dark:text-slate-400">
        {names} →{' '}
        <span className={cn('font-semibold', HOUSEHOLD_STYLES[request.targetHousehold].text)}>
          {atome.households[request.targetHousehold].label || HOUSEHOLD_STYLES[request.targetHousehold].label}
        </span>
      </p>
      {request.comment && <p className="mt-1 italic text-slate-600 dark:text-slate-400">« {request.comment} »</p>}
      {request.status === 'rejected' && request.rejectionReason && (
        <Alert tone="error" className="mt-2">
          Motif du rejet : {request.rejectionReason}
        </Alert>
      )}

      <button
        type="button"
        onClick={() => setShowHistory((s) => !s)}
        className="mt-2 inline-flex items-center gap-1 text-xs text-slate-500 hover:underline"
        aria-expanded={showHistory}
      >
        <ChevronDown className={cn('h-3 w-3 transition', showHistory && 'rotate-180')} /> Historique ({request.history.length})
      </button>
      {showHistory && (
        <ol className="mt-1 space-y-1 border-l-2 border-slate-200 pl-3 text-xs dark:border-slate-700">
          {request.history.map((h, i) => (
            <li key={i}>
              <span className="font-medium">{ACTION_LABELS[h.action]}</span> par {h.byName} ·{' '}
              {new Date(h.at).toLocaleString('fr-CH', { dateStyle: 'short', timeStyle: 'short' })}
              {h.comment && <span className="block italic text-slate-500">« {h.comment} »</span>}
            </li>
          ))}
        </ol>
      )}

      {error && (
        <Alert tone="error" className="mt-2">
          {error}
        </Alert>
      )}

      <div className="mt-3 flex flex-wrap gap-2">
        {can('approve') && (
          <Button size="sm" variant="success" loading={busy} icon={<Check className="h-4 w-4" />} onClick={() => run(() => act(request, { action: 'approve' }))}>
            Approuver
          </Button>
        )}
        {can('counter_propose') && (
          <Button size="sm" variant="secondary" icon={<Pencil className="h-4 w-4" />} onClick={() => setModalMode('counter_propose')}>
            Modifier
          </Button>
        )}
        {can('reject') && (
          <Button size="sm" variant="danger" icon={<X className="h-4 w-4" />} onClick={() => setRejecting(true)}>
            Rejeter
          </Button>
        )}
        {can('revise') && (
          <Button size="sm" icon={<Pencil className="h-4 w-4" />} onClick={() => setModalMode('revise')}>
            Réviser
          </Button>
        )}
        {can('cancel') && (
          <Button size="sm" variant="ghost" loading={busy} icon={<Ban className="h-4 w-4" />} onClick={() => run(() => act(request, { action: 'cancel' }))}>
            Annuler la demande
          </Button>
        )}
      </div>

      {modalMode && (
        <ChangeRequestModal
          open
          mode={modalMode}
          initial={{ dates: request.dates, protonIds: request.protonIds, targetHousehold: request.targetHousehold, comment: request.comment }}
          onClose={() => setModalMode(null)}
          onSubmit={(draft) => act(request, { action: modalMode === 'revise' ? 'revise' : 'counter_propose', draft })}
        />
      )}

      <Modal
        open={rejecting}
        onClose={closeRejectModal}
        title="Rejeter la demande"
        description={formatDateRanges(request.dates)}
        size="md"
        footer={
          <>
            <Button variant="secondary" onClick={closeRejectModal} disabled={busy || rewriting}>
              Retour
            </Button>
            {!biffProposal ? (
              <Button
                icon={<Sparkles className="h-4 w-4" />}
                loading={rewriting}
                disabled={!rawReason.trim() || busy}
                onClick={() => void handlePrepareBiff()}
              >
                Préparer le refus
              </Button>
            ) : (
              <>
                <Button
                  variant="secondary"
                  icon={<RefreshCw className="h-4 w-4" />}
                  loading={rewriting}
                  disabled={!rawReason.trim() || busy}
                  onClick={() => void handlePrepareBiff()}
                >
                  Régénérer
                </Button>
                <Button
                  variant="danger"
                  loading={busy}
                  disabled={rewriting || !biffProposal.trim()}
                  onClick={() =>
                    run(async () => {
                      await act(request, { action: 'reject', reason: biffProposal })
                      closeRejectModal()
                    })
                  }
                >
                  Valider et envoyer le refus
                </Button>
              </>
            )}
          </>
        }
      >
        <div className="space-y-4">
          <Textarea
            label="Votre motif (brouillon privé)"
            required
            value={rawReason}
            maxLength={1000}
            onChange={(e) => {
              setRawReason(e.target.value)
              setBiffProposal(null)
            }}
            hint="Saisissez librement votre raison : ce brouillon reste strictement local et sera reformulé de manière factuelle et apaisée (méthode BIFF) avant tout envoi."
            placeholder="Ex. : Nous avons déjà réservé un week-end en montagne à ces dates."
          />

          {biffProposal && (
            <div className="rounded-xl border border-brand-200 bg-brand-50/70 p-3.5 dark:border-brand-900/60 dark:bg-brand-950/40">
              <div className="mb-1.5 flex items-center gap-1.5 text-xs font-semibold text-brand-700 dark:text-brand-300">
                <ShieldCheck className="h-4 w-4 shrink-0" />
                <span>Proposition reformulée (méthode BIFF)</span>
              </div>
              <p className="text-sm leading-relaxed text-slate-800 dark:text-slate-100">{biffProposal}</p>
              <p className="mt-2 text-[11px] text-slate-500 dark:text-slate-400">
                Seul ce message reformulé sera enregistré et transmis en notification à l&apos;autre parent.
              </p>
            </div>
          )}

          {error && <Alert tone="error">{error}</Alert>}
        </div>
      </Modal>
    </article>
  )
}
