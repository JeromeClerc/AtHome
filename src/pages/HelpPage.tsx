import {
  Atom,
  Baby,
  Bell,
  CalendarDays,
  CheckCircle2,
  CircleHelp,
  Printer,
  Scale,
  Settings,
  ShieldCheck,
  Sparkles,
  Users,
  Wand2,
} from 'lucide-react'
import { Link } from 'react-router-dom'
import { Alert, Badge, Card, CardHeader } from '@/components/ui'
import { HOUSEHOLD_STYLES, NOTE_AUTHOR_COLORS, ROLE_BADGE, ROLE_LABELS } from '@/config/theme'
import { useAtome } from '@/hooks/useAtome'
import { cn } from '@/utils/cn'

const SECTIONS = [
  { id: 'roles', label: '1. Rôles & Métaphore atomique', icon: Atom },
  { id: 'fonctionnalites', label: '2. Fonctionnalités du planning', icon: CalendarDays },
  { id: 'demandes-biff', label: '3. Demandes & Médiation BIFF', icon: ShieldCheck },
  { id: 'calculs', label: '4. Modes de calcul & Calendrier VD', icon: Wand2 },
  { id: 'statistiques', label: '5. Statistiques & Période globale', icon: Scale },
  { id: 'impression', label: '6. Impression & Export PDF', icon: Printer },
  { id: 'parametrages', label: '7. Paramétrages & Notifications', icon: Settings },
] as const

/**
 * Page « Aide » : documentation complète d'At Home (métaphore atomique, rôles, fonctionnalités,
 * règles de calcul du calendrier vaudois, sas BIFF, statistiques et paramétrages).
 */
export function HelpPage() {
  const { atome } = useAtome()
  const base = `/${atome.slug}`

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      {/* Bannière d'introduction + Sommaire rapide */}
      <Card className="p-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-brand-600 dark:text-brand-400">
              <CircleHelp className="h-4 w-4" /> Centre d&apos;aide &amp; Documentation
            </div>
            <h1 className="mt-1 text-2xl font-bold text-slate-900 dark:text-white">Guide complet d&apos;At Home</h1>
            <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
              Tout savoir sur la gestion de la garde alternée, les règles de calcul du calendrier vaudois, le workflow de validation et les
              paramétrages de votre Atome <strong>{atome.name}</strong>.
            </p>
          </div>
        </div>

        <nav aria-label="Sommaire de l'aide" className="mt-5 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {SECTIONS.map(({ id, label, icon: Icon }) => (
            <a
              key={id}
              href={`#${id}`}
              className="flex items-center gap-2.5 rounded-xl border border-slate-200/80 bg-slate-50/70 px-3.5 py-2.5 text-sm font-medium text-slate-700 transition hover:border-brand-300 hover:bg-brand-50/50 hover:text-brand-700 dark:border-slate-800 dark:bg-slate-800/40 dark:text-slate-200 dark:hover:border-brand-700 dark:hover:bg-brand-950/40"
            >
              <Icon className="h-4 w-4 shrink-0 text-brand-600 dark:text-brand-400" />
              <span className="truncate">{label}</span>
            </a>
          ))}
        </nav>
      </Card>

      {/* 1. Rôles & Métaphore atomique */}
      <section id="roles" className="scroll-mt-20">
        <Card>
          <CardHeader
            title="1. La métaphore atomique & les rôles de chacun"
            description="At Home structure chaque famille comme un Atome privé et sécurisé, où chaque membre dispose de droits adaptés à son rôle."
          />
          <div className="space-y-4 p-5 text-sm leading-relaxed text-slate-700 dark:text-slate-300">
            <div className="rounded-xl border border-slate-200 bg-slate-50/60 p-4 dark:border-slate-800 dark:bg-slate-800/30">
              <p className="font-semibold text-slate-900 dark:text-white">Qu&apos;est-ce qu&apos;un Atome ?</p>
              <p className="mt-1 text-slate-600 dark:text-slate-400">
                Un <strong>Atome</strong> est l&apos;espace privé et isolé d&apos;une famille, identifié par son adresse unique (ici{' '}
                <code>/{atome.slug}</code>). Seuls les membres invités dans cet Atome peuvent consulter ses données. Un même compte peut
                appartenir à un ou plusieurs Atomes.
              </p>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="rounded-xl border border-sky-200/80 bg-sky-50/40 p-4 dark:border-sky-900/50 dark:bg-sky-950/20">
                <div className="flex items-center justify-between gap-2">
                  <span className="font-semibold text-slate-900 dark:text-white">Foyer 1 — {atome.households.electron.label}</span>
                  <Badge className={ROLE_BADGE.electron}>{ROLE_LABELS.electron}</Badge>
                </div>
                <p className="mt-2 text-xs text-slate-600 dark:text-slate-400">
                  Parent créateur de l&apos;Atome. Dispose de tous les droits parentaux : configuration des foyers, génération du planning
                  automatique, propositions et arbitrages des demandes d&apos;échange, gestion des fiches enfants, ajout de notes et envoi
                  des invitations.
                </p>
              </div>

              <div className="rounded-xl border border-amber-200/80 bg-amber-50/40 p-4 dark:border-amber-900/50 dark:bg-amber-950/20">
                <div className="flex items-center justify-between gap-2">
                  <span className="font-semibold text-slate-900 dark:text-white">Foyer 2 — {atome.households.positron.label}</span>
                  <Badge className={ROLE_BADGE.positron}>{ROLE_LABELS.positron}</Badge>
                </div>
                <p className="mt-2 text-xs text-slate-600 dark:text-slate-400">
                  Second parent (invité par e-mail). Dispose exactement des <strong>mêmes droits que l&apos;Électron</strong> : co-gestion
                  du planning, demandes de modification, validation ou refus des demandes de l&apos;autre parent, fiches enfants, notes et
                  invitations.
                </p>
              </div>

              <div className="rounded-xl border border-emerald-200/80 bg-emerald-50/40 p-4 dark:border-emerald-900/50 dark:bg-emerald-950/20">
                <div className="flex items-center justify-between gap-2">
                  <span className="font-semibold text-slate-900 dark:text-white">Enfant</span>
                  <Badge className={ROLE_BADGE.proton}>{ROLE_LABELS.proton}</Badge>
                </div>
                <p className="mt-2 text-xs text-slate-600 dark:text-slate-400">
                  Chaque enfant possède une fiche Proton. S&apos;il est invité comme utilisateur, il peut consulter le planning familial et
                  ajouter des notes sur les jours (ex. affaires de sport, devoirs), sans pouvoir modifier la garde.
                  <br />
                  <strong>Règle de majorité (18 ans) :</strong> dès ses 18 ans révolus, sa fiche personnelle devient en lecture seule pour
                  les parents ; seul le Proton lié à son compte peut alors la modifier.
                </p>
              </div>

              <div className="rounded-xl border border-fuchsia-200/80 bg-fuchsia-50/40 p-4 dark:border-fuchsia-900/50 dark:bg-fuchsia-950/20">
                <div className="flex items-center justify-between gap-2">
                  <span className="font-semibold text-slate-900 dark:text-white">Tiers neutre</span>
                  <Badge className={ROLE_BADGE.neutron}>{ROLE_LABELS.neutron}</Badge>
                </div>
                <p className="mt-2 text-xs text-slate-600 dark:text-slate-400">
                  Médiateur familial, avocat, curateur ou proche invité à titre consultatif. Son accès est verrouillé en{' '}
                  <strong>lecture seule stricte</strong> (interface et règles de base de données) : il consulte le planning, l&apos;historique
                  et les statistiques d&apos;équité, sans jamais pouvoir modifier un jour ni publier de note.
                </p>
              </div>
            </div>
          </div>
        </Card>
      </section>

      {/* 2. Fonctionnalités du planning */}
      <section id="fonctionnalites" className="scroll-mt-20">
        <Card>
          <CardHeader
            title="2. Fonctionnalités du planning & lecture du calendrier"
            description="Un calendrier temps réel pensé pour la clarté quotidienne sur mobile comme sur ordinateur."
          />
          <div className="space-y-4 p-5 text-sm leading-relaxed text-slate-700 dark:text-slate-300">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="rounded-xl border border-slate-200 p-4 dark:border-slate-800">
                <h3 className="font-semibold text-slate-900 dark:text-white">4 vues &amp; navigation souple</h3>
                <ul className="mt-2 list-disc space-y-1 pl-4 text-xs text-slate-600 dark:text-slate-400">
                  <li>
                    <strong>Vue Mois</strong> : vision globale du mois avec code couleur par foyer, fériés, vacances et notes.
                  </li>
                  <li>
                    <strong>Vue Semaine</strong> : détail des 7 jours (affichage vertical adapté aux écrans mobiles).
                  </li>
                  <li>
                    <strong>Vue Année</strong> : 12 mini-mois permettant d&apos;embrasser toute l&apos;année d&apos;un coup d&apos;œil.
                  </li>
                  <li>
                    <strong>Vue Jour &amp; Panneau latéral</strong> : détail complet d&apos;une date (attributions par enfant, intitulé du
                    jour férié ou des vacances scolaires, demandes en cours et notes du jour).
                  </li>
                  <li>
                    <strong>Filtre par enfant</strong> : lorsqu&apos;il y a plusieurs enfants, filtrez l&apos;affichage sur un enfant ou
                    affichez toute la fratrie (les cases se divisent alors en bandes si les enfants ne sont pas dans le même foyer).
                  </li>
                </ul>
              </div>

              <div className="rounded-xl border border-slate-200 p-4 dark:border-slate-800">
                <h3 className="font-semibold text-slate-900 dark:text-white">Sélection multiple &amp; repères visuels</h3>
                <ul className="mt-2 list-disc space-y-1 pl-4 text-xs text-slate-600 dark:text-slate-400">
                  <li>
                    <strong>Sélection de jours</strong> : cliquez sur un ou plusieurs jours pour les sélectionner ; maintenez{' '}
                    <kbd className="rounded border border-slate-300 px-1 py-0.5 text-[11px] dark:border-slate-700">Maj</kbd> + clic pour
                    sélectionner instantanément toute une plage de dates.
                  </li>
                  <li>
                    <strong>Couleurs des foyers</strong> : bleu ciel pour{' '}
                    <span className={cn('font-semibold', HOUSEHOLD_STYLES.electron.text)}>{HOUSEHOLD_STYLES.electron.label}</span>, ambre
                    pour <span className={cn('font-semibold', HOUSEHOLD_STYLES.positron.text)}>{HOUSEHOLD_STYLES.positron.label}</span>{' '}
                    (teinte plus soutenue les samedis et dimanches).
                  </li>
                  <li>
                    <strong>Jours fériés &amp; vacances VD</strong> : numéro du jour en rouge avec icône drapeau pour les fériés officiels
                    vaudois ; barre violette au bas de la case pendant les vacances scolaires vaudoises.
                  </li>
                  <li>
                    <strong>Demande en attente</strong> : fond hachuré, bordure pointillée de la couleur du foyer proposé et icône horloge.
                  </li>
                  <li>
                    <strong>Notes du jour</strong> : pastilles colorées selon le rôle de l&apos;auteur (
                    <span className="inline-flex items-center gap-1">
                      <span className={cn('inline-block h-2 w-2 rounded-full', NOTE_AUTHOR_COLORS.electron.dot)} /> Électron
                    </span>
                    ,{' '}
                    <span className="inline-flex items-center gap-1">
                      <span className={cn('inline-block h-2 w-2 rounded-full', NOTE_AUTHOR_COLORS.positron.dot)} /> Positron
                    </span>
                    ,{' '}
                    <span className="inline-flex items-center gap-1">
                      <span className={cn('inline-block h-2 w-2 rounded-full', NOTE_AUTHOR_COLORS.proton.dot)} /> Enfant
                    </span>
                    ).
                  </li>
                </ul>
              </div>
            </div>
          </div>
        </Card>
      </section>

      {/* 3. Demandes de modification & Sas BIFF */}
      <section id="demandes-biff" className="scroll-mt-20">
        <Card>
          <CardHeader
            title="3. Workflow de validation des modifications & Sas de médiation BIFF"
            description="Aucune modification de garde n'est appliquée sans l'accord explicite de l'autre parent."
          />
          <div className="space-y-4 p-5 text-sm leading-relaxed text-slate-700 dark:text-slate-300">
            <Alert tone="info">
              <strong>Principe fondamental :</strong> un jour déjà attribué ne peut jamais être modifié unilatéralement. Tout changement
              passe par une <strong>demande de modification</strong> validée par l&apos;autre foyer (règle contrôlée jusque dans le moteur
              de sécurité Firestore).
            </Alert>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="rounded-xl border border-slate-200 p-4 dark:border-slate-800">
                <h3 className="flex items-center gap-2 font-semibold text-slate-900 dark:text-white">
                  <CheckCircle2 className="h-4 w-4 text-emerald-600" /> Cycle de vie d&apos;une demande
                </h3>
                <ol className="mt-2 list-decimal space-y-1.5 pl-4 text-xs text-slate-600 dark:text-slate-400">
                  <li>
                    <strong>Proposition (En attente)</strong> : un parent sélectionne un ou plusieurs jours sur le calendrier, clique sur{' '}
                    <em>« Attribuer… »</em>, choisit les enfants, le foyer souhaité et un commentaire facultatif.
                  </li>
                  <li>
                    <strong>Arbitrage par l&apos;autre parent</strong> : le parent destinataire reçoit une notification et peut :
                    <ul className="mt-1 list-disc space-y-1 pl-4">
                      <li>
                        <strong>Approuver</strong> : le planning est immédiatement mis à jour et verrouillé comme <em>échange validé</em>.
                      </li>
                      <li>
                        <strong>Modifier (Contre-proposer)</strong> : ajuster les dates ou enfants ; la balle repart alors dans le camp du
                        premier parent (ping-pong constructif).
                      </li>
                      <li>
                        <strong>Rejeter</strong> : refuser la demande avec un motif obligatoire passant par le sas BIFF.
                      </li>
                    </ul>
                  </li>
                  <li>
                    <strong>Après un rejet</strong> : le parent demandeur peut <strong>Réviser</strong> sa demande ou l&apos;
                    <strong>Annuler</strong>.
                  </li>
                </ol>
              </div>

              <div className="rounded-xl border border-brand-200 bg-brand-50/40 p-4 dark:border-brand-900/50 dark:bg-brand-950/25">
                <h3 className="flex items-center gap-2 font-semibold text-brand-800 dark:text-brand-200">
                  <Sparkles className="h-4 w-4 text-brand-600" /> Sas de reformulation IA BIFF (motifs de refus)
                </h3>
                <p className="mt-2 text-xs text-slate-600 dark:text-slate-400">
                  Pour préserver une communication parentale sereine lors d&apos;un refus, At Home intègre un sas obligatoire basé sur la
                  méthode de médiation familiale <strong>BIFF</strong> (<em>Brief, Informative, Friendly, Firm</em> — Bref, Informatif,
                  Amical et Ferme) :
                </p>
                <ul className="mt-2 list-disc space-y-1 pl-4 text-xs text-slate-600 dark:text-slate-400">
                  <li>
                    Vous exprimez librement votre motif dans le champ <em>Brouillon privé</em>.
                  </li>
                  <li>
                    Au clic sur <strong>« Préparer le refus »</strong>, le médiateur IA supprime toute tension ou jugement pour ne conserver
                    que le <strong>fait objectif</strong> (indisponibilité, engagement pris, contrainte logistique) en 2 à 3 phrases calmes
                    et neutres.
                  </li>
                  <li>
                    Vous pouvez cliquer sur <strong>« Régénérer »</strong> ou <strong>« Valider et envoyer le refus »</strong>.
                  </li>
                  <li>
                    <strong>Confidentialité stricte :</strong> votre brouillon brut reste uniquement en mémoire locale et n&apos;est{' '}
                    <strong>jamais enregistré</strong> dans la base de données.
                  </li>
                </ul>
              </div>
            </div>
          </div>
        </Card>
      </section>

      {/* 4. Modes de calcul & Calendrier vaudois */}
      <section id="calculs" className="scroll-mt-20">
        <Card>
          <CardHeader
            title="4. Méthode transparente de génération du planning (en 4 phases)"
            description="Un algorithme neutre, conforme au droit suisse de la garde alternée 50/50 et conçu pour éviter tout conflit logistique entre les parents."
          />
          <div className="space-y-4 p-5 text-sm leading-relaxed text-slate-700 dark:text-slate-300">
            <Alert tone="info">
              <strong>Principe d&apos;équité et de neutralité :</strong> la méthode de calcul d&apos;At Home est 100 % déterministe. Aucun
              parent ne « choisit » ses semaines à la carte lors de la génération automatique : le planning découle mathématiquement de la
              première semaine de garde sélectionnée et applique 4 phases objectives pour répartir équitablement les semaines d&apos;école,
              les vacances scolaires vaudoises, les jours fériés et les fêtes majeures, tout en privilégiant de <strong>grands blocs de garde</strong>{' '}
              afin que les passages de relais s&apos;effectuent au maximum via l&apos;école.
            </Alert>

            <div className="rounded-xl border border-slate-200 bg-slate-50/60 p-4 text-xs dark:border-slate-800 dark:bg-slate-800/30">
              <p className="font-semibold text-slate-900 dark:text-white">
                Principe de base du relais hebdomadaire (Semaine A / Semaine B — 50/50)
              </p>
              <ul className="mt-1.5 list-disc space-y-1 pl-4 text-slate-600 dark:text-slate-400">
                <li>
                  En période scolaire, le parent qui entame sa semaine de garde récupère les enfants <strong>le lundi à la sortie de l&apos;école</strong>,
                  les accueille toute la semaine ainsi que le week-end, puis les dépose <strong>à l&apos;école le lundi matin suivant</strong>.
                </li>
                <li>
                  Conformément aux exigences suisses en matière de garde alternée, l&apos;algorithme veille à ce que chaque parent profite
                  d&apos;environ <strong>50 % des jours de vacances scolaires</strong>, <strong>50 % des jours fériés</strong>, et d&apos;une{' '}
                  <strong>alternance une année sur deux sur les fêtes pivots (Pâques, Noël et Nouvel An)</strong>.
                </li>
                <li>
                  <strong>Équilibre pluriannuel :</strong> l&apos;algorithme ne cherche pas à forcer artificiellement un 50,0 % / 50,0 % au
                  jour près sur une seule année civile (ce qui obligerait à découper des week-ends ou des jours fériés). Si une année se
                  conclut à 51 % / 49 %, l&apos;inversion automatique des fêtes et le cycle hebdomadaire produisent naturellement 49 % / 51 %
                  l&apos;année suivante.
                </li>
              </ul>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="rounded-xl border border-slate-200 p-4 dark:border-slate-800">
                <h3 className="font-semibold text-slate-900 dark:text-white">Phase 1 — Répartition de base</h3>
                <p className="mt-1.5 text-xs text-slate-600 dark:text-slate-400">
                  À partir de la date de départ sélectionnée (le lundi de la 1re semaine de garde), le générateur déroule l&apos;alternance
                  pure une semaine sur deux (lundi → dimanche), sans tenir compte à ce stade des vacances scolaires, des jours fériés ni des
                  fêtes majeures.
                </p>
                <p className="mt-2 text-xs text-slate-500">
                  <em>Autres cycles disponibles si souhaité :</em> 2-2-3, 2-2-5-5, Un week-end sur deux, ou cycle personnalisé.
                </p>
              </div>

              <div className="rounded-xl border border-slate-200 p-4 dark:border-slate-800">
                <h3 className="font-semibold text-slate-900 dark:text-white">Phase 2 — Répartition des vacances scolaires</h3>
                <ul className="mt-1.5 list-disc space-y-1.5 pl-4 text-xs text-slate-600 dark:text-slate-400">
                  <li>
                    <strong>Vacances de 1 jour à 1 semaine (ex. Pont de l&apos;Ascension, Relâches) :</strong> aucune modification. On suit
                    la répartition de la Phase 1 (« ça tombe comme ça tombe », sans casser le rythme hebdomadaire).
                  </li>
                  <li>
                    <strong>Vacances de 1 à 2 semaines (ex. Vacances d&apos;automne) :</strong> aucune modification. L&apos;alternance de
                    base une semaine sur deux attribue naturellement une semaine à chaque parent.
                  </li>
                  <li>
                    <strong>Vacances supérieures à 2 semaines (Vacances d&apos;été, ~7 semaines) :</strong> sans modifier le nombre total de
                    jours d&apos;été attribué à chaque parent par la Phase 1, l&apos;algorithme regroupe les semaines en{' '}
                    <strong>2 grands blocs contigus</strong> (le 1er bloc prolongeant le parent en charge à la sortie des classes fin juin,
                    le 2nd bloc allant jusqu&apos;à la rentrée d&apos;août). Cela évite les allers-retours hebdomadaires hors période scolaire.
                  </li>
                </ul>
              </div>

              <div className="rounded-xl border border-slate-200 p-4 dark:border-slate-800">
                <h3 className="font-semibold text-slate-900 dark:text-white">Phase 3 — Jours fériés vaudois</h3>
                <p className="mt-1 text-xs text-slate-600 dark:text-slate-400">
                  Pour éviter tout déplacement inutile un jour férié où il n&apos;y a pas d&apos;école :
                </p>
                <ul className="mt-1.5 list-disc space-y-1.5 pl-4 text-xs text-slate-600 dark:text-slate-400">
                  <li>
                    <strong>Jeudi de l&apos;Ascension + pont du vendredi :</strong> attribués au parent en charge cette semaine-là.
                  </li>
                  <li>
                    <strong>Lundi de Pentecôte :</strong> attribué au parent qui était en charge le week-end directement précédent (le
                    relais se faisant à l&apos;école le mardi matin).
                  </li>
                  <li>
                    <strong>1er août (Fête nationale) :</strong> attribué au parent en charge cette semaine-là.
                  </li>
                  <li>
                    <strong>Lundi du Jeûne fédéral :</strong> attribué au parent qui était en charge le week-end directement précédent.
                  </li>
                </ul>
              </div>

              <div className="rounded-xl border border-violet-200/80 bg-violet-50/40 p-4 dark:border-violet-900/50 dark:bg-violet-950/20">
                <h3 className="font-semibold text-slate-900 dark:text-white">Phase 4 — Fêtes majeures (Pâques, Noël &amp; Nouvel An)</h3>
                <ul className="mt-1.5 list-disc space-y-1.5 pl-4 text-xs text-slate-600 dark:text-slate-400">
                  <li>
                    <strong>Fériés et week-end de Pâques (Vendredi saint → Lundi de Pâques) :</strong> attribués au Parent 1 les{' '}
                    <strong>années paires</strong> et au Parent 2 les <strong>années impaires</strong>. Si l&apos;alternance de la Phase 1
                    attribue déjà le week-end de Pâques au bon parent, les semaines de vacances de Pâques ne sont pas modifiées (le Lundi de
                    Pâques reste simplement rattaché au week-end). Sinon, les deux semaines des vacances scolaires de Pâques sont
                    interverties pour que le parent désigné ait le week-end pascal + la 1re semaine, et l&apos;autre parent la 2e semaine.
                  </li>
                  <li>
                    <strong>Noël &amp; Nouvel An :</strong> les vacances scolaires d&apos;hiver sont découpées en{' '}
                    <strong>deux blocs égaux</strong> :
                    <ul className="mt-1 list-disc space-y-0.5 pl-4">
                      <li>
                        <strong>Années paires :</strong> Bloc 1 (incluant les <strong>24 et 25 décembre</strong>) au Parent 1 ; Bloc 2
                        (incluant les <strong>31.12 et 01.01</strong>) au Parent 2.
                      </li>
                      <li>
                        <strong>Années impaires :</strong> Bloc 1 (<strong>24 et 25 décembre</strong>) au Parent 2 ; Bloc 2 (
                        <strong>31.12 et 01.01</strong>) au Parent 1.
                      </li>
                    </ul>
                  </li>
                </ul>
              </div>
            </div>

            <div className="rounded-xl border border-slate-200 bg-slate-50/60 p-4 text-xs dark:border-slate-800 dark:bg-slate-800/30">
              <p className="font-semibold text-slate-900 dark:text-white">
                Préservation garantie des échanges validés et des demandes en cours
              </p>
              <p className="mt-1 text-slate-600 dark:text-slate-400">
                Lors d&apos;une régénération du planning automatique dans <em>Foyer &amp; invitations</em> :
              </p>
              <ul className="mt-1.5 list-disc space-y-1 pl-4 text-slate-600 dark:text-slate-400">
                <li>
                  <strong>Les modifications ponctuelles déjà validées d&apos;un commun accord ne sont jamais écrasées.</strong>
                </li>
                <li>
                  <strong>Les demandes de modification en cours (en attente d&apos;arbitrage) ne sont jamais perdues.</strong>
                </li>
                <li>
                  Une fois le planning généré, chaque parent peut à tout moment proposer un échange ponctuel sur n&apos;importe quel jour via
                  le calendrier.
                </li>
              </ul>
            </div>
          </div>
        </Card>
      </section>

      {/* 5. Statistiques & Fêtes majeures */}
      <section id="statistiques" className="scroll-mt-20">
        <Card>
          <CardHeader
            title="5. Statistiques d'équité, Moyenne pluriannuelle & Fêtes majeures"
            description="Des compteurs basés sur le nombre réel de jours de l'année (365 ou 366 jours) et une vue moyenne sur toute la période générée."
          />
          <div className="space-y-4 p-5 text-sm leading-relaxed text-slate-700 dark:text-slate-300">
            <p className="text-xs text-slate-600 dark:text-slate-400">
              En haut du tableau de bord (<Link to={base} className="font-medium text-brand-600 underline">Planning</Link>), le bandeau de
              répartition affiche la moyenne des enfants de l&apos;Atome sur les <strong>vrais jours calendaires de l&apos;année</strong>{' '}
              (sans additionner les enfants entre eux) :
            </p>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="rounded-xl border border-slate-200 p-3.5 text-xs dark:border-slate-800">
                <p className="font-semibold text-slate-900 dark:text-white">4 compteurs annuels (moyenne des enfants)</p>
                <ul className="mt-1.5 list-disc space-y-1 pl-4 text-slate-600 dark:text-slate-400">
                  <li>
                    <strong>Jours totaux</strong> : calculés sur les <strong>365 jours</strong> de l&apos;année (366 les années
                    bissextiles).
                  </li>
                  <li>
                    <strong>Vacances scolaires</strong> : calculées uniquement sur le nombre réel de jours de vacances scolaires vaudoises
                    de l&apos;année.
                  </li>
                  <li>
                    <strong>Jours fériés</strong> : calculés sur les <strong>9 jours fériés officiels</strong> vaudois de l&apos;année.
                  </li>
                  <li>
                    <strong>Week-ends</strong> : calculés sur les <strong>104 à 106 samedis et dimanches</strong> de l&apos;année.
                  </li>
                </ul>
              </div>
              <div className="rounded-xl border border-slate-200 p-3.5 text-xs dark:border-slate-800">
                <p className="font-semibold text-slate-900 dark:text-white">Encart « Fêtes majeures (Année sélectionnée) »</p>
                <p className="mt-1.5 text-slate-600 dark:text-slate-400">
                  Affiche quel foyer accueille les enfants sur les <strong>3 jalons pivots</strong> :
                </p>
                <ol className="mt-1.5 list-decimal space-y-1 pl-4 text-slate-600 dark:text-slate-400">
                  <li>
                    <strong>Pâques</strong> (dimanche de Pâques)
                  </li>
                  <li>
                    <strong>Noël (24 et 25.12)</strong> : affiche le foyer en charge des deux jours, ou <strong>les deux foyers</strong> si
                    le 24 est chez l&apos;un et le 25 chez l&apos;autre.
                  </li>
                  <li>
                    <strong>Nouvel An (31.12 et 01.01)</strong> : affiche le foyer en charge des deux jours, ou{' '}
                    <strong>les deux foyers</strong> si le 31.12 et le 01.01 sont répartis entre les deux parents.
                  </li>
                </ol>
              </div>
            </div>

            <div className="rounded-xl border border-brand-200 bg-brand-50/40 p-4 text-xs dark:border-brand-900/50 dark:bg-brand-950/25">
              <p className="font-semibold text-brand-900 dark:text-brand-100">
                Bouton de période globale générée (ex. « 2026-2040 ») — Moyenne annuelle sur l&apos;ensemble du planning
              </p>
              <p className="mt-1 text-slate-600 dark:text-slate-400">
                À côté des flèches permettant de naviguer d&apos;une année à l&apos;autre, un bouton affiche la{' '}
                <strong>période complète sur laquelle le planning a été généré</strong> (par exemple <code>2026-2040</code>). En cliquant
                dessus :
              </p>
              <ul className="mt-1.5 list-disc space-y-1 pl-4 text-slate-600 dark:text-slate-400">
                <li>
                  Les 4 compteurs (<strong>Jours totaux</strong>, <strong>Vacances scolaires</strong>, <strong>Jours fériés</strong> et{' '}
                  <strong>Week-ends</strong>) affichent la <strong>moyenne annuelle en jours/an et en pourcentage</strong> sur toute la
                  période générée (somme des jours de chaque année divisée par le nombre d&apos;années planifiées).
                </li>
                <li>
                  Cela permet de constater d&apos;un seul clic que, même si une année isolée est à 51 % / 49 %, la répartition s&apos;équilibre
                  parfaitement autour de <strong>50 % / 50 % sur la durée totale du planning</strong>.
                </li>
                <li>
                  L&apos;encart <em>Fêtes majeures</em> n&apos;est affiché qu&apos;en vue par année individuelle. Cliquez à nouveau sur le
                  bouton de période ou sur les flèches d&apos;année pour revenir à l&apos;année sélectionnée.
                </li>
              </ul>
            </div>
          </div>
        </Card>
      </section>

      {/* 6. Impression & Export PDF */}
      <section id="impression" className="scroll-mt-20">
        <Card>
          <CardHeader
            title="6. Impression & Export PDF du planning"
            description="Générez un document PDF clair et complet en un clic depuis le menu « Imprimer » de l'en-tête."
          />
          <div className="space-y-4 p-5 text-sm leading-relaxed text-slate-700 dark:text-slate-300">
            <p className="text-xs text-slate-600 dark:text-slate-400">
              Le bouton <strong>« Imprimer »</strong> situé dans l&apos;en-tête (entre <em>Planning</em> et <em>Aide</em>) ouvre une fenêtre
              permettant d&apos;exporter ou d&apos;imprimer le planning selon <strong>3 modes de sélection de période</strong> :
            </p>
            <div className="grid gap-3 sm:grid-cols-3">
              <div className="rounded-xl border border-slate-200 p-3.5 text-xs dark:border-slate-800">
                <p className="font-semibold text-slate-900 dark:text-white">1. Une année entière</p>
                <p className="mt-1 text-slate-600 dark:text-slate-400">
                  Génère les 12 mois de l&apos;année choisie en <strong>orientation Paysage (A4)</strong> sur une seule vue synthétique.
                </p>
              </div>
              <div className="rounded-xl border border-slate-200 p-3.5 text-xs dark:border-slate-800">
                <p className="font-semibold text-slate-900 dark:text-white">2. Un mois entier</p>
                <p className="mt-1 text-slate-600 dark:text-slate-400">
                  Génère la grille détaillée du mois sélectionné en <strong>orientation Portrait (A4)</strong> avec le nom du foyer sur
                  chaque jour, l&apos;intitulé des jours fériés et les barres de vacances scolaires.
                </p>
              </div>
              <div className="rounded-xl border border-slate-200 p-3.5 text-xs dark:border-slate-800">
                <p className="font-semibold text-slate-900 dark:text-white">3. Une plage de dates (JJ.MM.AAAA)</p>
                <p className="mt-1 text-slate-600 dark:text-slate-400">
                  Permet de saisir librement une date de début et une date de fin au format suisse <code>dd.mm.aaaa</code> (ex.{' '}
                  <code>01.06.2026</code> à <code>31.08.2026</code>) en <strong>orientation Paysage (A4)</strong>.
                </p>
              </div>
            </div>
            <div className="rounded-xl border border-slate-200 bg-slate-50/60 p-4 text-xs dark:border-slate-800 dark:bg-slate-800/30">
              <p className="font-semibold text-slate-900 dark:text-white">Informations incluses sur chaque document généré :</p>
              <ul className="mt-1.5 list-disc space-y-1 pl-4 text-slate-600 dark:text-slate-400">
                <li>
                  Le <strong>nom de l&apos;Atome</strong>, les enfants concernés et l&apos;intitulé de l&apos;année, du mois ou de la
                  période sélectionnée.
                </li>
                <li>
                  Un encart compact résumant la <strong>répartition des jours totaux</strong> (ainsi que des vacances scolaires, jours
                  fériés et week-ends) sur la période imprimée.
                </li>
                <li>
                  La <strong>légende complète</strong> (couleurs et noms des deux foyers, jours fériés officiels du Canton de Vaud et
                  vacances scolaires vaudoises).
                </li>
                <li>
                  Le document s&apos;ouvre dans un nouvel onglet prêt à être envoyé vers une imprimante ou enregistré via{' '}
                  <em>« Enregistrer au format PDF »</em>.
                </li>
              </ul>
            </div>
          </div>
        </Card>
      </section>

      {/* 7. Paramétrages possibles & Notifications */}
      <section id="parametrages" className="scroll-mt-20">
        <Card>
          <CardHeader
            title="7. Paramétrages possibles & Notifications"
            description="Où configurer vos foyers, vos invitations, vos enfants et vos alertes mobiles."
          />
          <div className="grid gap-4 p-5 sm:grid-cols-3">
            <Link
              to={`${base}/foyer`}
              className="group rounded-xl border border-slate-200 p-4 transition hover:border-brand-400 hover:bg-brand-50/30 dark:border-slate-800 dark:hover:border-brand-700 dark:hover:bg-brand-950/20"
            >
              <div className="flex items-center gap-2 font-semibold text-slate-900 group-hover:text-brand-600 dark:text-white dark:group-hover:text-brand-400">
                <Users className="h-4 w-4 text-brand-600" /> Foyer &amp; invitations
              </div>
              <p className="mt-2 text-xs text-slate-600 dark:text-slate-400">
                Personnalisez le nom de l&apos;Atome, le nom et l&apos;adresse postale des deux foyers (ex. <em>Chez Maman</em>,{' '}
                <em>Chez Papa</em>), invitez le second parent (Positron), les enfants (Protons) ou un tiers neutre (Neutron) par lien
                e-mail, et pilotez le générateur de planning.
              </p>
            </Link>

            <Link
              to={`${base}/enfants`}
              className="group rounded-xl border border-slate-200 p-4 transition hover:border-brand-400 hover:bg-brand-50/30 dark:border-slate-800 dark:hover:border-brand-700 dark:hover:bg-brand-950/20"
            >
              <div className="flex items-center gap-2 font-semibold text-slate-900 group-hover:text-brand-600 dark:text-white dark:group-hover:text-brand-400">
                <Baby className="h-4 w-4 text-brand-600" /> Enfants (Protons)
              </div>
              <p className="mt-2 text-xs text-slate-600 dark:text-slate-400">
                Ajoutez et mettez à jour les fiches de vos enfants (prénom, nom, date de naissance, genre, e-mail et téléphone optionnels).
                Consultez leur âge calculé et l&apos;état de liaison avec leur compte utilisateur.
              </p>
            </Link>

            <Link
              to={`${base}/profil`}
              className="group rounded-xl border border-slate-200 p-4 transition hover:border-brand-400 hover:bg-brand-50/30 dark:border-slate-800 dark:hover:border-brand-700 dark:hover:bg-brand-950/20"
            >
              <div className="flex items-center gap-2 font-semibold text-slate-900 group-hover:text-brand-600 dark:text-white dark:group-hover:text-brand-400">
                <Bell className="h-4 w-4 text-brand-600" /> Mon profil &amp; Mobile
              </div>
              <p className="mt-2 text-xs text-slate-600 dark:text-slate-400">
                Modifiez vos coordonnées, vérifiez votre numéro de mobile suisse (<code>+41…</code>) par SMS pour activer les notifications
                push sur votre téléphone (sur iPhone/iPad : ajoutez d&apos;abord l&apos;application sur l&apos;écran d&apos;accueil), ou
                changez votre e-mail et votre mot de passe.
              </p>
            </Link>
          </div>
        </Card>
      </section>
    </div>
  )
}
