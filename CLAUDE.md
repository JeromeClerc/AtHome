# CLAUDE.md — At Home

Contexte permanent du projet. À lire avant toute modification.

## Produit
**At Home** est un SaaS (français, localisé Suisse / Canton de Vaud) qui aide deux parents séparés à gérer la
garde alternée de leurs enfants : planning d'alternance, demandes de modification soumises à validation,
notes par jour et statistiques (jours, jours fériés, vacances scolaires).

Specs sources : `vendors/prompt_init.md` (besoin métier), `vendors/prompt_start.md` (spec détaillée),
`vendors/prompt_claude.md` (stack + arborescence imposée).

## Stack
- Vite + React 19 + TypeScript **strict** (aucun `any`), Tailwind CSS v4 (dark mode par classe `dark`).
- `lucide-react`, `clsx` + `tailwind-merge` (helper `cn()` dans `src/utils/cn.ts`), `date-fns` (locale `fr`).
- `react-router-dom` v7 (API v6 compatible).
- Firebase : Auth, **Firestore** (`onSnapshot` temps réel), Cloud Functions v2 (`functions/`), Cloud Messaging, Hosting.
- **Aucune extension Firebase, aucun service tiers (pas de Twilio)** — exigence du client :
  - connexion : e-mail/mot de passe + **lien de connexion e-mail** (Firebase Auth) ;
  - **invitations** : `sendSignInLinkToEmail` (e-mail envoyé par Firebase Auth) vers `/invite/<jeton>?a=<atomeId>` ;
  - **notifications téléphone** : mobile vérifié par SMS via Auth (fournisseur Téléphone, reCAPTCHA invisible),
    puis push **FCM** (`public/firebase-messaging-sw.js`, messages « data » {title, body, link, tag}).
    Firebase ne sait pas envoyer de SMS au contenu libre : ne pas réintroduire de SMS de notification.
- Tests : Vitest + React Testing Library (`npm test`).

## Commandes
- `npm run dev` · `npm run build` (inclut `tsc -b`) · `npm run typecheck` · `npm test` · `npm run lint`
- Functions : `cd functions && npm run build`
- Déploiement : `firebase deploy` (voir `docs/FIREBASE_SETUP.md`).

## Métaphore atomique (rôles)
| Terme | Signification | Rôle technique (`AtomeRole`) | Droits |
|---|---|---|---|
| Atome | Espace famille isolé (tenant), identifié par un `slug` unique | — | — |
| Électron | Foyer 1 (parent créateur) | `electron` | parent : planning, enfants, notes, invitations |
| Positron | Foyer 2 (parent invité) | `positron` | mêmes droits que l'Électron |
| Proton | Enfant (fiche) ; peut aussi être invité comme utilisateur | `proton` | lecture + notes |
| Neutron | Tiers neutre (avocat, médiateur…) | `neutron` | **lecture seule** planning + stats |

`Household = 'electron' | 'positron'` désigne un foyer de garde.

## Modèle de données Firestore
```
users/{uid}                      UserProfile (firstName, lastName, email, phone (copie du n° vérifié Auth), pushOptIn, atomeIds[])
users/{uid}/fcmTokens/{token}    Jeton FCM d'un appareil (propriétaire uniquement)
slugs/{slug}                     { atomeId, createdBy }  → garantit l'unicité du slug
atomes/{atomeId}/invitations/{token}  Invitation (role, email, status, expiresAt…). `get` public (jeton secret),
                                      `list` réservé aux membres. Acceptée via la Function `acceptInvitation`.
atomes/{atomeId}                 Atome (name, slug, members{uid:role}, memberUids[], memberProfiles{uid:{…}},
                                        households{electron, positron}, createdBy…)
atomes/{atomeId}/protons/{id}    Proton (firstName, lastName, birthDate 'yyyy-MM-dd', gender, email?, phone?,
                                         majorityAt Timestamp, linkedUid?)
atomes/{atomeId}/days/{yyyy-MM-dd}   CustodyDay { date, assignments{protonId: Household}, lastChangeRequestId? }
atomes/{atomeId}/changeRequests/{id} ChangeRequest (machine à états, voir plus bas)
atomes/{atomeId}/notes/{id}          DayNote (date, text, authorUid, authorRole, authorName)
atomes/{atomeId}/notifications/{id}  AppNotification (recipientUid, type, read…)
```
Les dates « jour » sont **toujours** des chaînes ISO `yyyy-MM-dd` (pas de fuseau). Affichage `dd.MM.yyyy`.

## Règles métier clés
1. **Aucune modification de garde manuelle directe.** Toute modification ponctuelle d'un jour existant passe par une
   `ChangeRequest` passée à `approved` par l'*autre* parent (vérifié dans `firestore.rules` avec `getAfter`), ce qui
   verrouille le jour avec `lastChangeRequestId`. Lors d'une régénération du planning automatique (`saveGeneratedSchedule`),
   seuls les jours non planifiés et les jours purement automatiques (`lastChangeRequestId == null`) sont créés ou recalculés :
   les jours modifiés manuellement et validés (`lastChangeRequestId != null`) ainsi que les demandes de modification en cours
   (`changeRequests`) sont **strictement préservés**.
2. **Machine à états ChangeRequest** (`src/utils/changeRequestMachine.ts`) :
   `pending` → `approved` | `counter_proposed` | `rejected` ; `counter_proposed` → idem (ping-pong) ;
   `rejected` → `pending` (le demandeur révise) | `cancelled`. Le rejet exige un motif écrit, qui passe
   obligatoirement par le **sas de reformulation BIFF** (`rewriteToBiff` via Gemini `gemini-2.5-flash`) :
   le brouillon brut reste en état local React et seule la version BIFF validée est sauvegardée dans Firestore.
   `awaitingHousehold` = foyer qui doit agir ; seul celui-ci peut approuver/contre-proposer/rejeter.
3. **Jours fériés vaudois** (`src/config/vaudCalendar.ts`) : 1er janv., 2 janv., Vendredi saint, Lundi de Pâques,
   Ascension, Lundi de Pentecôte, 1er août, Lundi du Jeûne fédéral, Noël. Calculés (algorithme de Pâques).
4. **Méthode de génération en 4 phases** (`src/utils/scheduleGenerator.ts`) :
   - **Phase 1 (Base)** : alternance à partir de `startDate` (1re semaine de garde).
   - **Phase 2 (Vacances scolaires)** : vacances ≤ 2 semaines inchangées ; vacances > 2 semaines (Été, ~7 sem.) regroupées en
     2 grands blocs contigus sans modifier le nombre total de jours d'été de la Phase 1.
   - **Phase 3 (Jours fériés)** : Jeudi de l'Ascension + pont du vendredi et 1er août attribués au parent de la semaine ;
     Lundi de Pentecôte et Lundi du Jeûne fédéral attribués au parent du week-end directement précédent.
   - **Phase 4 (Fêtes majeures)** :
     - *Pâques* : intervertit les 2 semaines des vacances de Pâques uniquement si la Phase 1 n'attribue pas le week-end pascal au bon parent
       (Parent 1 années paires, Parent 2 années impaires).
     - *Noël & Nouvel An* : découpe les vacances scolaires d'hiver en 2 blocs égaux — Bloc 1 (incluant 24 et 25.12) au Parent 1 les années
       paires (Parent 2 les années impaires), Bloc 2 (incluant 31.12 et 01.01) au Parent 2 les années paires (Parent 1 les années impaires).
5. **Statistiques d'équité & Fêtes majeures** (`src/utils/stats.ts`, `StatsBar.tsx`) :
   - Compteurs annuels exprimés en **vrais jours calendaires** (sur 365/366 j, 9 fériés, etc.) via la moyenne des enfants de l'Atome.
   - Bandeau **« Fêtes majeures »** sur les 3 jalons : Pâques (dimanche de Pâques), Noël (24 et 25.12 — affiche les deux foyers si partagé),
     et Nouvel An (31.12 et 01.01 — affiche les deux foyers si partagé).
6. **Vacances scolaires vaudoises** : table officielle par année scolaire + heuristique de repli pour les
   années non saisies (à mettre à jour chaque année depuis vd.ch).
7. **Majorité** (`src/utils/age.ts`) : dès 18 ans révolus, la fiche d'un proton est en lecture seule pour les
   parents ; seul le proton lié (`linkedUid`) peut l'éditer.
8. **Neutrons** : lecture seule stricte (UI + rules).
9. Notes : couleur selon le rôle de l'auteur (électron, positron, proton, neutron).

## Routes
| Route | Page | Accès |
|---|---|---|
| `/auth` | `AuthPage` (connexion, inscription, lien e-mail, mot de passe oublié ; exporte `CompleteProfileForm`) | public |
| `/invite/:token?a=<atomeId>` | `InviteAcceptPage` | public, puis connecté |
| `/` | choix / redirection vers l'Atome | connecté |
| `/setup` | `SetupAtomePage` (création, e-mail vérifié requis) | connecté |
| `/:atomeSlug` | `DashboardPage` (`?view=day|week|month|year&date=…&request=…`) | membre |
| `/:atomeSlug/aide` | `HelpPage` (documentation complète : rôles, fonctionnalités, calculs, sas BIFF, paramétrages) | membre |
| `/:atomeSlug/enfants` | `ProtonsPage` | membre |
| `/:atomeSlug/foyer` | `FoyerPage` (dans `SetupAtomePage.tsx`) : foyers, invitations, générateur | membre |
| `/:atomeSlug/profil` | `ProfilePage` | membre |

## Écritures privilégiées (Cloud Functions, `functions/src/index.ts`)
- `acceptInvitation` (callable, région `europe-west6`) : seule voie d'ajout d'un membre.
- `onNotificationCreated` → push FCM vers `users/{uid}/fcmTokens` si `pushOptIn` **et** numéro vérifié
  (`getAuth().getUser(uid).phoneNumber`) ; nettoie les jetons invalides.
- `rewriteToBiff` (callable, secret `GEMINI_API_KEY`) : reformule un motif de refus de modification de planning
  selon la méthode BIFF via `@google/genai` (`gemini-2.5-flash`).
- L'e-mail d'invitation est envoyé **côté client** par Firebase Auth (`invitation.service.ts`).
Les notifications in-app sont créées par le client dans le même lot que l'action qui les déclenche.

## État / points d'attention
- Vérifications : `npm run typecheck`, `npm test` (42 tests), `npm run build`, `cd functions && npm run build`.
- Un utilisateur connecté sans profil Firestore (compte créé par lien) est redirigé vers `CompleteProfileForm` (`RequireAuth`).
- `firestore.rules` n'a pas encore été validé dans l'émulateur (Java absent du poste) : il sera compilé
  au premier `firebase deploy --only firestore:rules` ; idéalement ajouter des tests `@firebase/rules-unit-testing`.
- Vacances scolaires officielles saisies pour 2025-26 et 2026-27 uniquement (estimation au-delà).
- Lint (oxlint) : avertissements React Compiler (`set-state-in-effect` sur les abonnements temps réel), pas d'erreurs.

## Conventions de code
- Arborescence imposée (voir `vendors/prompt_claude.md`) : `components/{ui,layout,calendar}`, `config`, `context`,
  `hooks`, `pages`, `services`, `types`, `utils`.
- Les **services** sont les seuls à importer le SDK Firestore/Auth ; les **hooks** encapsulent services +
  état React ; les **composants** n'appellent que des hooks.
- Logique pure (dates, planning, stats, machine à états) dans `utils/` / `config/` → testée avec Vitest.
- JSDoc en français sur les fonctions non triviales. Textes UI en français, placeholders suisses
  (`+41 79 123 45 67`, `Rue de Bourg 12`, `1003 Lausanne`).
- Imports via alias `@/` → `src/`.
- Couleurs métier centralisées dans `src/config/theme.ts` (électron = sky, positron = amber, etc.).
