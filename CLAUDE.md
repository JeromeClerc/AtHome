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
1. **Aucune modification de garde directe.** Les jours (`days`) existants ne peuvent être modifiés que via une
   `ChangeRequest` passée à `approved` par l'*autre* parent (vérifié dans `firestore.rules` avec `getAfter`).
   La génération initiale ne fait que **créer** des jours inexistants.
2. **Machine à états ChangeRequest** (`src/utils/changeRequestMachine.ts`) :
   `pending` → `approved` | `counter_proposed` | `rejected` ; `counter_proposed` → idem (ping-pong) ;
   `rejected` → `pending` (le demandeur révise) | `cancelled`. Le rejet exige un motif écrit.
   `awaitingHousehold` = foyer qui doit agir ; seul celui-ci peut approuver/contre-proposer/rejeter.
3. **Jours fériés vaudois** (`src/config/vaudCalendar.ts`) : 1er janv., 2 janv., Vendredi saint, Lundi de Pâques,
   Ascension, Lundi de Pentecôte, 1er août, Lundi du Jeûne fédéral, Noël. Calculés (algorithme de Pâques).
4. **Règle des ponts** (`src/utils/scheduleGenerator.ts`) : un bloc de jours fériés qui touche un week-end
   (finit un vendredi / commence un lundi) est attribué au parent qui a le week-end adjacent.
5. **Vacances scolaires vaudoises** : table officielle par année scolaire + heuristique de repli pour les
   années non saisies (à mettre à jour chaque année depuis vd.ch).
6. **Majorité** (`src/utils/age.ts`) : dès 18 ans révolus, la fiche d'un proton est en lecture seule pour les
   parents ; seul le proton lié (`linkedUid`) peut l'éditer.
7. **Neutrons** : lecture seule stricte (UI + rules).
8. Notes : couleur selon le rôle de l'auteur (électron, positron, proton, neutron).

## Routes
| Route | Page | Accès |
|---|---|---|
| `/auth` | `AuthPage` (connexion, inscription, lien e-mail, mot de passe oublié ; exporte `CompleteProfileForm`) | public |
| `/invite/:token?a=<atomeId>` | `InviteAcceptPage` | public, puis connecté |
| `/` | choix / redirection vers l'Atome | connecté |
| `/setup` | `SetupAtomePage` (création, e-mail vérifié requis) | connecté |
| `/:atomeSlug` | `DashboardPage` (`?view=day|week|month|year&date=…&request=…`) | membre |
| `/:atomeSlug/enfants` | `ProtonsPage` | membre |
| `/:atomeSlug/foyer` | `FoyerPage` (dans `SetupAtomePage.tsx`) : foyers, invitations, générateur | membre |
| `/:atomeSlug/profil` | `ProfilePage` | membre |

## Écritures privilégiées (Cloud Functions, `functions/src/index.ts`)
- `acceptInvitation` (callable, région `europe-west6`) : seule voie d'ajout d'un membre.
- `onNotificationCreated` → push FCM vers `users/{uid}/fcmTokens` si `pushOptIn` **et** numéro vérifié
  (`getAuth().getUser(uid).phoneNumber`) ; nettoie les jetons invalides.
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
