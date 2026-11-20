import {
  Atom,
  Baby,
  Bell,
  CalendarDays,
  CheckCircle2,
  CircleHelp,
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
  { id: 'statistiques', label: '5. Statistiques & Fêtes majeures', icon: Scale },
  { id: 'parametrages', label: '6. Paramétrages & Notifications', icon: Settings },
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
            title="4. Modes de calcul du générateur & Calendrier officiel du Canton de Vaud"
            description="Comment At Home calcule automatiquement votre planning d'alternance, les ponts fériés et les blocs de fêtes."
          />
          <div className="space-y-4 p-5 text-sm leading-relaxed text-slate-700 dark:text-slate-300">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="rounded-xl border border-slate-200 p-4 dark:border-slate-800">
                <h3 className="font-semibold text-slate-900 dark:text-white">4.1 Modèles de cycles d&apos;alternance</h3>
                <p className="mt-1 text-xs text-slate-500">
                  Le cycle démarre à la date de début choisie (conseil : un lundi) avec le foyer sélectionné :
                </p>
                <ul className="mt-2 list-disc space-y-1.5 pl-4 text-xs text-slate-600 dark:text-slate-400">
                  <li>
                    <strong>Semaine A / Semaine B</strong> (cycle de 14 j) : 7 jours complets chez le foyer A, puis 7 jours chez le foyer B.
                  </li>
                  <li>
                    <strong>2-2-3</strong> (cycle de 14 j) : 2 j chez A (lun-mar), 2 j chez B (mer-jeu), 3 j week-end chez A (ven-dim), puis
                    inversion la semaine suivante.
                  </li>
                  <li>
                    <strong>2-2-5-5</strong> (cycle de 14 j) : lundi-mardi fixes chez A, mercredi-jeudi fixes chez B, et week-ends prolongés
                    de 3 jours alternés.
                  </li>
                  <li>
                    <strong>Un week-end sur deux</strong> (cycle de 14 j) : semaine chez le foyer principal, un week-end sur deux (sam-dim)
                    chez le second foyer.
                  </li>
                  <li>
                    <strong>Cycle personnalisé</strong> : séquence libre jour par jour saisie avec les lettres <code>E</code> (Électron) et{' '}
                    <code>P</code> (Positron), répétée automatiquement sur toute la période.
                  </li>
                </ul>
              </div>

              <div className="rounded-xl border border-slate-200 p-4 dark:border-slate-800">
                <h3 className="font-semibold text-slate-900 dark:text-white">4.2 Jours fériés vaudois &amp; règle des ponts</h3>
                <p className="mt-1 text-xs text-slate-600 dark:text-slate-400">
                  Les <strong>9 jours fériés officiels du Canton de Vaud</strong> sont calculés automatiquement pour chaque année :{' '}
                  <em>
                    Nouvel An (1er janv.), Saint-Berchtold (2 janv.), Vendredi saint, Lundi de Pâques, Ascension, Lundi de Pentecôte, Fête
                    nationale (1er août), Lundi du Jeûne fédéral (lundi suivant le 3e dimanche de septembre) et Noël (25 déc.)
                  </em>
                  .
                </p>
                <div className="mt-3 rounded-lg bg-slate-50 p-3 text-xs dark:bg-slate-800/50">
                  <p className="font-semibold text-slate-800 dark:text-slate-200">Règle automatique des ponts fériés :</p>
                  <ul className="mt-1 list-disc space-y-1 pl-4 text-slate-600 dark:text-slate-400">
                    <li>
                      Un jour (ou bloc de jours) férié en semaine qui <strong>se termine un vendredi</strong> est attribué au parent qui a
                      la garde le <strong>samedi suivant</strong>.
                    </li>
                    <li>
                      Un jour (ou bloc de jours) férié qui <strong>commence un lundi</strong> (ex. Lundi de Pentecôte, Lundi du Jeûne
                      fédéral) est attribué au parent qui a la garde le <strong>dimanche précédent</strong>.
                    </li>
                  </ul>
                </div>
              </div>
            </div>

            <div className="rounded-xl border border-violet-200/80 bg-violet-50/40 p-4 dark:border-violet-900/50 dark:bg-violet-950/20">
              <h3 className="font-semibold text-slate-900 dark:text-white">
                4.3 Règle d&apos;alternance par blocs des fêtes majeures (Noël / Nouvel An / Pâques)
              </h3>
              <p className="mt-1 text-xs text-slate-600 dark:text-slate-400">
                Lorsqu&apos;elle est activée dans le générateur, cette règle découpe équitablement les fêtes pivots et alterne
                automatiquement entre <strong>années paires</strong> et <strong>années impaires</strong> :
              </p>
              <div className="mt-3 grid gap-3 sm:grid-cols-3">
                <div className="rounded-lg border border-violet-200/60 bg-white/80 p-3 text-xs dark:border-violet-900/40 dark:bg-slate-900/60">
                  <p className="font-semibold text-slate-900 dark:text-white">Bloc 1 — Noël</p>
                  <p className="mt-1 text-slate-600 dark:text-slate-400">
                    Du <strong>début des vacances scolaires vaudoises d&apos;hiver</strong> jusqu&apos;au point médian (incluant toujours
                    les <strong>24 et 25 décembre</strong>).
                  </p>
                </div>
                <div className="rounded-lg border border-violet-200/60 bg-white/80 p-3 text-xs dark:border-violet-900/40 dark:bg-slate-900/60">
                  <p className="font-semibold text-slate-900 dark:text-white">Bloc 2 — Nouvel An</p>
                  <p className="mt-1 text-slate-600 dark:text-slate-400">
                    Du <strong>point médian jusqu&apos;à la fin des vacances d&apos;hiver</strong> (incluant toujours les{' '}
                    <strong>31 décembre et 1er janvier</strong>).
                  </p>
                </div>
                <div className="rounded-lg border border-violet-200/60 bg-white/80 p-3 text-xs dark:border-violet-900/40 dark:bg-slate-900/60">
                  <p className="font-semibold text-slate-900 dark:text-white">Bloc de Pâques</p>
                  <p className="mt-1 text-slate-600 dark:text-slate-400">
                    Week-end prolongé de 4 jours du <strong>Vendredi saint au Lundi de Pâques inclus</strong>, calculé dynamiquement selon
                    la date de Pâques de l&apos;année.
                  </p>
                </div>
              </div>
              <p className="mt-3 text-xs text-slate-600 dark:text-slate-400">
                <strong>Alternance automatique par année :</strong> les <strong>années paires</strong>, le Bloc 1 (Noël) et Pâques sont
                attribués au Parent A et le Bloc 2 (Nouvel An) au Parent B. Les <strong>années impaires</strong>, la répartition s&apos;
                inverse automatiquement (Bloc 1 Noël et Pâques au Parent B, Bloc 2 Nouvel An au Parent A). Un sélecteur permet d&apos;
                inverser le rôle Parent A / Parent B dans les réglages.
              </p>
            </div>

            <div className="rounded-xl border border-slate-200 bg-slate-50/60 p-4 text-xs dark:border-slate-800 dark:bg-slate-800/30">
              <p className="font-semibold text-slate-900 dark:text-white">
                4.4 Que se passe-t-il si je modifie les paramètres du générateur plus tard ?
              </p>
              <p className="mt-1 text-slate-600 dark:text-slate-400">
                Lorsque vous changez les paramètres dans <em>Foyer &amp; invitations</em> et cliquez sur{' '}
                <strong>« Générer et enregistrer »</strong> :
              </p>
              <ul className="mt-1.5 list-disc space-y-1 pl-4 text-slate-600 dark:text-slate-400">
                <li>Les nouveaux jours et les jours purement automatiques sont créés ou recalculés selon vos nouveaux paramètres.</li>
                <li>
                  <strong>Les jours modifiés manuellement et validés (échanges approuvés) sont strictement préservés</strong> et ne sont
                  jamais écrasés.
                </li>
                <li>
                  <strong>Les demandes de modification en cours sont intégralement conservées.</strong>
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
            title="5. Statistiques d'équité & Fêtes majeures"
            description="Suivez en temps réel l'équilibre des jours de garde sur l'année civile sélectionnée."
          />
          <div className="space-y-3 p-5 text-sm leading-relaxed text-slate-700 dark:text-slate-300">
            <p className="text-xs text-slate-600 dark:text-slate-400">
              En haut du tableau de bord (<Link to={base} className="font-medium text-brand-600 underline">Planning</Link>), le bandeau de
              répartition calcule en temps réel (en tenant compte de tous les échanges validés) :
            </p>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="rounded-xl border border-slate-200 p-3.5 text-xs dark:border-slate-800">
                <p className="font-semibold text-slate-900 dark:text-white">4 compteurs annuels de répartition</p>
                <ul className="mt-1.5 list-disc space-y-1 pl-4 text-slate-600 dark:text-slate-400">
                  <li>
                    <strong>Jours totaux</strong> (ou <em>Jours-enfants totaux</em> si tous les enfants sont affichés).
                  </li>
                  <li>
                    <strong>Vacances scolaires</strong> (périodes officielles du Canton de Vaud).
                  </li>
                  <li>
                    <strong>Jours fériés</strong> (les 9 fériés officiels vaudois).
                  </li>
                  <li>
                    <strong>Week-ends</strong> (samedis et dimanches de l&apos;année).
                  </li>
                </ul>
              </div>
              <div className="rounded-xl border border-slate-200 p-3.5 text-xs dark:border-slate-800">
                <p className="font-semibold text-slate-900 dark:text-white">Encart « Fêtes majeures (Année sélectionnée) »</p>
                <p className="mt-1.5 text-slate-600 dark:text-slate-400">
                  Affiche en un coup d&apos;œil quel foyer accueille les enfants sur les <strong>3 jalons clés</strong> de l&apos;année :
                </p>
                <ol className="mt-1.5 list-decimal space-y-1 pl-4 text-slate-600 dark:text-slate-400">
                  <li>
                    <strong>Pâques</strong> (basé sur le dimanche de Pâques)
                  </li>
                  <li>
                    <strong>Noël</strong> (basé sur le 25 décembre)
                  </li>
                  <li>
                    <strong>Nouvel An</strong> (basé sur le 1er janvier)
                  </li>
                </ol>
              </div>
            </div>
          </div>
        </Card>
      </section>

      {/* 6. Paramétrages possibles & Notifications */}
      <section id="parametrages" className="scroll-mt-20">
        <Card>
          <CardHeader
            title="6. Paramétrages possibles & Notifications"
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
