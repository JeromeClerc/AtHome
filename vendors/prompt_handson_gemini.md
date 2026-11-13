# Passation de projet : « At Home » (contexte complet pour reprise du développement)

## 0. Ton rôle et comment utiliser ce document

Tu es un **Senior Lead Frontend Architect / Full-Stack Developer** (React, TypeScript, Tailwind CSS, Firebase).
Tu reprends un projet existant, **déjà développé et fonctionnel au niveau du code**, nommé **At Home**, situé dans
`D:\Takk\App\AtHome` (Windows 11, Node 22, npm, Git Bash/PowerShell).

Ce document résume **tout ce qui a été mis en place, décidé, modifié et compris** lors des sessions précédentes.
Considère-le comme la source de vérité. Avant toute modification :

1. Lis ce document en entier.
2. Lis `CLAUDE.md` à la racine (mémoire technique du projet, à tenir à jour après chaque changement structurant).
3. Respecte les **décisions verrouillées** (section 3) : elles viennent explicitement du client.
4. Après chaque modification, exécute les vérifications de la section 10 et rapporte honnêtement les résultats.

L'utilisateur (le client) s'exprime en **français** ; réponds en français. L'interface de l'application est 100 % en français,
localisée pour la **Suisse, Canton de Vaud**.

---

## 1. Le produit

**At Home** est un SaaS qui aide deux parents séparés/divorcés à gérer la **garde alternée** de leurs enfants :

- planning d'alternance généré automatiquement (par enfant, sur une période) ;
- **aucune modification de garde n'est appliquée directement** : toute modification est une *demande* que l'autre parent
  approuve, contre-propose (ping-pong) ou rejette (motif obligatoire) ;
- notes libres par jour, colorées selon l'auteur ;
- statistiques : jours passés chez chaque parent, dont jours fériés vaudois, vacances scolaires vaudoises, week-ends ;
- invitations par e-mail (autre parent, tiers neutres, enfants) ;
- notifications in-app + push sur le téléphone ;
- responsive (mobile → desktop), mode sombre, temps réel.

### Métaphore atomique (vocabulaire métier obligatoire)

| Terme | Signification | `AtomeRole` | Droits |
|---|---|---|---|
| **Atome** | Espace privé d'une famille (tenant), identifié par un `slug` unique dans l'URL (`/famille-rochat`) | — | — |
| **Électron** | Foyer 1 = parent qui crée l'Atome | `electron` | parent : planning, enfants, notes, invitations |
| **Positron** | Foyer 2 = autre parent (invité) | `positron` | mêmes droits que l'Électron |
| **Proton** | Un enfant (fiche) ; peut aussi être invité comme utilisateur | `proton` | lecture + notes |
| **Neutron** | Tiers neutre (avocat, médiateur, curateur…) | `neutron` | **lecture seule** stricte (planning + stats) |

`Household = 'electron' | 'positron'` désigne un foyer de garde.

### Specs d'origine
Dans `vendors/` : `prompt_init.md` (besoin métier brut du client), `prompt_start.md` (spec détaillée),
`prompt_claude.md` (stack + arborescence imposée ; ce fichier est tronqué après la section 2, le « Plan d'exécution »
annoncé n'existe pas — les règles métier ont été prises dans les deux autres fichiers).

---

## 2. Stack technique (versions réellement installées)

- **Vite 8**, **React 19.3**, **TypeScript 7** (compilateur natif ; `strict: true`, `noUncheckedIndexedAccess`, **zéro `any`**).
- **Tailwind CSS 4** via `@tailwindcss/vite` ; dark mode par classe : `@custom-variant dark (&:where(.dark, .dark *));` dans `src/index.css`.
- `react-router-dom` **7** (API v6), `date-fns` 4 (locale `fr`), `lucide-react`, `clsx` + `tailwind-merge` (helper `cn()`).
- **Firebase JS SDK 13** : Auth, Firestore (cache persistant multi-onglets), Functions, Messaging (chargé dynamiquement).
- **Cloud Functions** : `firebase-functions` 7 (API v2), `firebase-admin` 14, Node 22, ESM, région **`europe-west6` (Zurich)**.
- Tests : **Vitest 5** + React Testing Library + jsdom. Lint : **oxlint**.
- Alias d'import `@/` → `src/`. Constante `__APP_VERSION__` injectée par Vite (version de `package.json`, affichée dans le footer).

---

## 3. Décisions verrouillées (exigences explicites du client — ne pas revenir dessus)

1. **Aucune extension Firebase** (Trigger Email, Send Messages with Twilio, etc. jugées obsolètes par le client) et
   **aucun service tiers** (pas de Twilio, SendGrid…).
2. **Login et invitations uniquement avec les fonctionnalités natives de Firebase Authentication** :
   - e-mail + mot de passe (inscription, vérification d'e-mail, mot de passe oublié, changement d'e-mail par `verifyBeforeUpdateEmail`) ;
   - **lien de connexion par e-mail** (`sendSignInLinkToEmail`) : utilisé pour la connexion sans mot de passe **et pour les invitations**.
     L'e-mail est envoyé **par Firebase Auth lui-même** ; l'URL de retour contient le jeton : `/invite/<token>?a=<atomeId>`.
3. **Notifications « via le numéro de téléphone » avec Firebase uniquement** : Firebase **ne peut pas envoyer de SMS au contenu libre**
   (seulement des codes de vérification). Solution retenue et validée :
   - le mobile est **vérifié par SMS** via Firebase Auth (fournisseur Téléphone, reCAPTCHA invisible) ;
   - les notifications arrivent sur ce téléphone en **push via Firebase Cloud Messaging (FCM)** ;
   - **ne jamais réintroduire de SMS de notification ni Twilio**.
4. Firestore (pas Realtime Database), données en **Suisse (`europe-west6`)**.
5. Arborescence imposée (voir section 5) ; services = seuls à importer le SDK Firebase ; hooks = logique + état ; composants = UI.

---

## 4. Modèle de données Firestore

```
users/{uid}                          UserProfile { uid, firstName, lastName, email, phone, pushOptIn, atomeIds[], createdAt, updatedAt }
                                       - phone = copie du numéro VÉRIFIÉ par Auth (source de vérité : user.phoneNumber côté Auth)
users/{uid}/fcmTokens/{token}        { token, userAgent, createdAt, lastSeenAt } — un doc par appareil, propriétaire uniquement
slugs/{slug}                         { atomeId, createdBy } — garantit l'unicité du slug (réservé dans la même transaction que l'Atome)
atomes/{atomeId}                     Atome { name, slug, createdBy, createdAt,
                                             members: { uid: AtomeRole }, memberUids: string[],
                                             memberProfiles: { uid: { displayName, role, email, protonId } },
                                             households: { electron: HouseholdInfo, positron: HouseholdInfo } }
                                       HouseholdInfo { label, ownerUid|null, inviteEmail?, street?, npa?, city? }
atomes/{id}/invitations/{token}      Invitation { token, atomeId, atomeSlug, atomeName, role, email, protonId?, invitedBy,
                                                  invitedByName, status: pending|accepted|revoked, createdAt, expiresAt (+14 j), acceptedBy }
                                       - `get` public (le jeton 192 bits est le secret), `list` réservé aux membres
atomes/{id}/protons/{protonId}       Proton { firstName, lastName, birthDate 'yyyy-MM-dd', gender female|male|other, email?, phone?,
                                              majorityAt: Timestamp (18 ans, dénormalisé pour les règles), linkedUid?, colorIndex }
atomes/{id}/days/{yyyy-MM-dd}        CustodyDay { date, assignments: { protonId: Household }, lastChangeRequestId?, updatedAt }
atomes/{id}/changeRequests/{id}      ChangeRequest { dates[], protonIds[], targetHousehold, status, createdBy, createdByHousehold,
                                                     awaitingHousehold, lastActorUid, comment?, rejectionReason?, history[], createdAt, updatedAt }
atomes/{id}/notes/{id}               DayNote { date, text (≤1000), authorUid, authorRole, authorName, createdAt }
atomes/{id}/notifications/{id}       AppNotification { recipientUid, type, title, body, actorUid, actorName, actorHousehold?, refId?, date?, read, createdAt }
```

- Les dates « jour » sont **toujours** des chaînes ISO `yyyy-MM-dd` (pas de fuseau). Affichage suisse `dd.MM.yyyy`.
- `history[]` utilise des horodatages ISO (string), car `serverTimestamp()` est interdit dans les tableaux.
- Index composites (`firestore.indexes.json`) : notifications (`recipientUid` + `createdAt desc`), changeRequests (`status` + `updatedAt desc`),
  atomes (`memberUids` array-contains + `slug`).
- Types TypeScript complets dans `src/types/{atome,schedule,user}.types.ts`.

---

## 5. Arborescence et rôle des fichiers

```
CLAUDE.md                       Mémoire technique (à maintenir)
README.md
docs/FIREBASE_SETUP.md          Guide pas à pas très détaillé (Auth lien e-mail + Téléphone, Firestore, Blaze, FCM/VAPID, Functions, Hosting, émulateurs, dépannage)
docs/GIT_SETUP.md               Guide pas à pas Git/GitHub, branches, commits conventionnels, CI/CD, secrets
.github/workflows/ci.yml        verify (typecheck, tests, build app + functions) → preview (PR, canal Hosting 7 j) / deploy (main, tout Firebase)
firebase.json                   Hosting (dist, SPA rewrite, cache, en-têtes sécurité, SW no-cache), règles, index, functions, émulateurs
firestore.rules                 Règles de sécurité (voir section 7)
firestore.indexes.json
.env.example                    VITE_FIREBASE_* (dont VITE_FIREBASE_VAPID_KEY), VITE_FIREBASE_FUNCTIONS_REGION, VITE_USE_EMULATORS
functions/
  src/index.ts                  acceptInvitation (callable) + onNotificationCreated (trigger → FCM)
  .env.example                  APP_URL, FUNCTIONS_REGION
public/
  firebase-messaging-sw.js      Service worker push « pur » (Push API) : affiche {title, body, link, tag}, ouvre le lien au clic
  manifest.webmanifest          PWA installable (obligatoire pour le push iOS)
  icon-192.png, icon-512.png, apple-touch-icon.png, favicon.svg
src/
  App.tsx                       Router, pages en lazy(), RequireAuth (+ gate profil manquant), HomeRedirect, AtomeRoute
  main.tsx, index.css, vite-env.d.ts
  assets/logo.svg               Logo (3 orbitales sky/amber/violet + maison + 2 enfants)
  components/ui/                Button, Field (Input/Select/Textarea/Checkbox), Modal (<dialog>), Misc (Card, Badge, Avatar, Spinner, Alert, EmptyState), Dropdown
  components/layout/            Logo, Header (logo + nom Atome | cloche, avatar+thème, menu), NotificationBell, Footer, MainLayout/CenteredLayout
  components/calendar/          DayCell, CalendarViews (Week/Month/Year), CalendarToolbar, Legend, ChangeRequestModal,
                                RequestCard (actions machine à états), NoteModal, DayDetailPanel, StatsBar, ScheduleGenerator
  config/firebase.ts            Init SDK depuis .env ; isFirebaseConfigured ; VAPID_KEY ; getMessagingIfSupported() (import dynamique)
  config/vaudCalendar.ts        Fériés vaudois calculés + vacances scolaires (table officielle + estimation)
  config/theme.ts               Couleurs/labels métier (HOUSEHOLD_STYLES, NOTE_AUTHOR_COLORS, ROLE_LABELS, PROTON_COLORS…)
  context/                      AuthContext (user, profile, loading, emailVerified, refresh), AtomeContext (atome, role, household, isParent, isReadOnly, protons), ThemeContext
  hooks/                        useAuth, useAtome/useMyAtomes, useSchedule/useCustodyDays/useScheduleActions, useNotifications, useStats, useTheme
  pages/                        AuthPage (+ export CompleteProfileForm), InviteAcceptPage, SetupAtomePage (+ export FoyerPage), DashboardPage, ProtonsPage, ProfilePage
  services/                     auth, user, atome, invitation, proton, schedule, notification, messaging, firestore.helpers (withId, toFrenchError)
  types/                        atome.types, schedule.types, user.types
  utils/                        dates, scheduleGenerator, changeRequestMachine, stats, age, strings (slugify, téléphone suisse, randomToken), calendarNavigation, cn
  test/setup.ts
vendors/                        Prompts d'origine + ce document
```

### Routes

| Route | Page | Accès |
|---|---|---|
| `/auth` | AuthPage (connexion, inscription, lien e-mail, mot de passe oublié ; finalise un lien de connexion) | public |
| `/invite/:token?a=<atomeId>` | InviteAcceptPage | public puis connecté |
| `/` | HomeRedirect (1 Atome → redirection ; plusieurs → choix ; aucun → /setup) | connecté |
| `/setup` | SetupAtomePage (création d'Atome ; **e-mail vérifié requis**) | connecté |
| `/:atomeSlug` | DashboardPage (`?view=day|week|month|year&date=yyyy-MM-dd&request=<id>`) | membre |
| `/:atomeSlug/enfants` | ProtonsPage | membre |
| `/:atomeSlug/foyer` | FoyerPage : nom de l'Atome, 2 foyers, membres & invitations, générateur de planning | membre |
| `/:atomeSlug/profil` | ProfilePage : identité, mobile & notifications, e-mail, mot de passe | membre |

`RequireAuth` : non connecté → `/auth` ; connecté **sans profil Firestore** (compte créé par lien) → `CompleteProfileForm`.

---

## 6. Règles métier et algorithmes (cœur du projet)

### 6.1 Calendrier vaudois (`src/config/vaudCalendar.ts`)
- **Jours fériés VD** calculés pour toute année : 1er janvier, 2 janvier (Saint-Berchtold), Vendredi saint, Lundi de Pâques, Ascension,
  Lundi de Pentecôte, 1er août, **Lundi du Jeûne fédéral** (lundi après le 3e dimanche de septembre), Noël.
  Pâques par l'algorithme de Meeus/Jones/Butcher.
- **Vacances scolaires VD** : table `OFFICIAL_SCHOOL_HOLIDAYS` indexée par année scolaire de début.
  Saisies : **2025-26** (source vd.ch, calendrier 2023-2031) et **2026-27** (agrégateurs concordants, *à revérifier sur vd.ch*).
  Au-delà : `estimateSchoolHolidays()` (heuristique : automne 2 sem. mi-octobre, Noël 2 sem., relâches 1 sem. fin février,
  Pâques 2 sem., pont de l'Ascension, été ~7 sem.), marquée `estimated: true` et affichée « (estimation ») dans l'UI.
  **À mettre à jour chaque année.**
- `buildCalendarIndex(start, end)` → `Map<date, { holiday, schoolHoliday }>` utilisée par les vues et les stats.

### 6.2 Générateur d'alternance (`src/utils/scheduleGenerator.ts`)
- Modèles (cycle de 14 jours sauf custom) : `weekly` (semaine A/B), `two-two-three`, `two-two-five-five`, `alternate-weekends`
  (semaine chez le 1er foyer, un week-end sur deux chez le 2e), `custom` (saisie « E E P P … », E = Électron, P = Positron).
- Le cycle démarre à `startDate` avec `firstHousehold` ; conseil UI : démarrer un lundi.
- **Règle des ponts** (`applyHolidayBridges`) : un bloc contigu de fériés en semaine qui **finit un vendredi** est attribué au parent
  du **samedi suivant** ; qui **commence un lundi** → au parent du **dimanche précédent** (si les deux, le week-end suivant l'emporte).
  Le cycle est étendu d'un jour de chaque côté pour traiter les bords de période.
- **Sauvegarde non destructive** (`saveGeneratedSchedule`) : crée les jours inexistants, complète les enfants manquants d'un jour
  existant, **n'écrase jamais** une attribution existante (lots de ≤ 450 écritures).

### 6.3 Machine à états des demandes (`src/utils/changeRequestMachine.ts`)
```
propose → pending ──approve──────────→ approved (définitif, applique les jours)
            │ ├──counter_propose──→ counter_proposed (mêmes transitions, la balle change de camp)
            │ └──reject (motif obligatoire)→ rejected ──revise──→ pending
            │                                    └──cancel──→ cancelled
            └──cancel (par le proposant)──→ cancelled
```
- `awaitingHousehold` = foyer qui doit agir. Seul lui peut approuver / contre-proposer / rejeter ; après un rejet, c'est le
  demandeur (devenu « attendu ») qui révise ou annule. Le proposant peut annuler tant que ce n'est pas approuvé.
- `actOnChangeRequest` : en cas d'approbation, met à jour les `days` **dans le même lot** (`set` + `mergeFields` sur
  `assignments.<protonId>` uniquement) avec `lastChangeRequestId`, et crée la notification pour l'autre parent.

### 6.4 Autres règles
- **Majorité** (`utils/age.ts`) : à 18 ans révolus, la fiche d'un Proton est en lecture seule pour les parents ;
  seul l'enfant lié (`linkedUid`) peut l'éditer. `majorityAt` dénormalisé pour les règles Firestore.
- **Neutrons** : lecture seule (UI : `isReadOnly`; règles : pas d'écriture planning/notes).
- **Notes** : couleur selon le rôle de l'auteur — Électron = sky, Positron = amber, Proton = emerald, Neutron = fuchsia.
- **Notifications in-app** : créées par le client dans le même lot que l'action (proposition, décision, note, + `member_joined`
  créée par la Function). La cloche liste les 50 dernières ; clic → dashboard sur la date / la demande.
- **Stats** (`utils/stats.ts`) : par enfant ou en « jours-enfants » (tous enfants) ; catégories total / vacances scolaires / fériés / week-ends.

### 6.5 Distinctions visuelles du calendrier (`DayCell`)
- Fond = couleur du foyer (Électron sky, Positron amber), **plus soutenue le week-end** ; découpé en bandes si les enfants diffèrent.
- Férié VD : numéro rouge + drapeau + nom. Vacances scolaires : barre violette en bas.
- Demande en attente : **hachures** (`stripes-pending`) + contour pointillé de la couleur du foyer proposé + icône horloge.
- Notes : pastilles couleur de l'auteur. Sélection : anneau bleu ; Maj+clic = plage. Aujourd'hui : numéro cerclé.
- Vues : Jour (panneau détaillé), Semaine (liste verticale sur mobile), Mois, Année (12 mini-mois).
  Navigation précédent/suivant par **jour, semaine, mois, année** + « Aujourd'hui ». Filtre par enfant.

---

## 7. Sécurité (`firestore.rules`)

- Isolation par Atome : lecture si `request.auth.uid in resource.data.memberUids` (Atome) ou membre (sous-collections).
- **Création d'Atome** : le créateur est l'unique membre `electron`, owner du foyer électron, positron sans owner,
  et le slug est réservé dans le même lot (`getAfter` croisé `slugs` ↔ `atomes`).
- **Mise à jour d'Atome** : parents → `name` et `households` (sans changer les `ownerUid`) ; tout membre → uniquement son
  `memberProfiles.{uid}` (sans changer son rôle). `members`/`memberUids` **jamais modifiables par un client** → seule la Function
  `acceptInvitation` (Admin SDK) ajoute un membre.
- **days** : création par un parent ; mise à jour seulement si (a) ajout d'enfants non planifiés sans modifier l'existant, ou
  (b) **`approvedInThisBatch()`** : la `changeRequest` référencée passe à `approved` dans ce lot (`get` ≠ approved, `getAfter` = approved),
  par l'utilisateur courant, la date fait partie de la demande et seules les clés `assignments` des enfants de la demande changent.
- **changeRequests** : transitions validées côté règles (`validTransition()`), historique +1 à chaque update, motif de rejet non vide.
- **protons** : parents tant que `request.time < majorityAt` ; ensuite seul `linkedUid`.
- **notes** : création par électron/positron/proton avec `authorRole == roleIn(atome)` ; suppression par l'auteur.
- **notifications** : lecture/mise à jour (`read`) par le destinataire ; création par un membre vers un membre.
- **invitations** : `get` public, `list` membres, création par un parent (rôle positron seulement si foyer libre), révocation.
- **users/{uid}** et **users/{uid}/fcmTokens/{token}** : propriétaire uniquement.
- ⚠️ **Les règles n'ont jamais été exécutées dans l'émulateur** (Java absent du poste). Elles seront compilées au premier
  `firebase deploy --only firestore:rules`. Chantier recommandé : tests `@firebase/rules-unit-testing`.

---

## 8. Flux d'authentification, d'invitation et de notification (implémentation actuelle)

### 8.1 Inscription / connexion (`AuthPage`, `auth.service.ts`)
- Inscription e-mail + mot de passe → profil `users/{uid}` (`createUserProfile`) → e-mail de vérification Firebase.
  **La création d'un Atome exige `emailVerified`** (écran « Confirmez votre adresse » avec « J'ai validé » / « Renvoyer »).
- Connexion par mot de passe, ou **« Recevoir un lien de connexion par e-mail »** (`sendLoginLink` : e-mail mémorisé en
  `localStorage` clé `athome.emailForSignIn`). Au retour sur `/auth`, `EmailLinkCompletion` finalise (auto si même navigateur,
  sinon redemande l'e-mail). `completeLinkSignIn` retire ensuite `apiKey/oobCode/mode/lang…` de l'URL.
- Compte créé par lien sans profil → `CompleteProfileForm` (prénom, nom ; mot de passe facultatif ici).
- `auth.languageCode = 'fr'`. Erreurs Firebase traduites par `toFrenchError()` (`services/firestore.helpers.ts`).

### 8.2 Invitation (`invitation.service.ts`, `InviteAcceptPage`, Function `acceptInvitation`)
1. Parent (FoyerPage › Membres & invitations) : rôle `positron` (si foyer libre) / `neutron` / `proton` (lié à une fiche enfant).
2. `createInvitation` : jeton `randomToken()` (24 octets hex), doc `atomes/{id}/invitations/{token}`, expiration 14 jours,
   puis `sendInvitationEmail` = `sendSignInLinkToEmail(auth, email, { url: /invite/<token>?a=<atomeId>, handleCodeInApp: true })`.
   Boutons **Renvoyer** (nouvel e-mail), **Lien** (copie), **Révoquer**.
3. L'invité clique : la page lit l'invitation (get public), **se connecte automatiquement** avec `signInWithEmailLink`
   et l'adresse de l'invitation (compte créé si besoin, e-mail vérifié).
4. `CompleteProfileForm requirePassword` : prénom, nom, **mot de passe obligatoire** (`updatePassword`).
5. « Rejoindre l'Atome » → callable `acceptInvitation({ atomeId, token })` : transaction Admin qui vérifie statut, expiration,
   **e-mail du jeton Auth == e-mail invité**, foyer positron libre ; ajoute `members/memberUids/memberProfiles`,
   `households.positron.ownerUid` (positron), `protons/{id}.linkedUid` (proton), marque l'invitation `accepted`,
   ajoute l'Atome à `users/{uid}.atomeIds`, crée une notification `member_joined` pour l'invitant.
   Redirection : positron → `/<slug>/foyer?bienvenue=1`, autres → dashboard.
- Cas gérés : lien expiré/déjà utilisé (« M'envoyer un nouveau lien de connexion »), mauvais compte connecté
  (« Continuer avec … » / « Changer de compte »), invitation expirée/révoquée/acceptée.
- Limite connue : le **contenu** de l'e-mail de lien n'est pas personnalisable ; il affiche « Se connecter à <Nom public du projet> »
  (à régler sur « At Home » dans la console). La page d'invitation affiche l'Atome, le rôle et l'invitant.

### 8.3 Notifications téléphone (`ProfilePage` › Mobile & notifications, `messaging.service.ts`, Function `onNotificationCreated`)
1. **Vérification du mobile** : `sendPhoneVerificationCode(e164, 'recaptcha-phone')` (RecaptchaVerifier invisible +
   `PhoneAuthProvider.verifyPhoneNumber`) → code SMS Firebase → `confirmPhoneCode` (`linkWithCredential` ou `updatePhoneNumber`),
   recopie `phone` dans `users/{uid}`.
2. **Activation sur l'appareil** : `getPushSupport()` (`not-configured` si pas de VAPID, `ios-needs-install` si iOS hors PWA,
   `unsupported`) → `Notification.requestPermission()` → enregistrement `/firebase-messaging-sw.js` → `getToken` (VAPID)
   → doc `users/{uid}/fcmTokens/{token}` + `pushOptIn: true`. Jeton de l'appareil mémorisé en `localStorage` (`athome.fcmToken`).
3. **Envoi** : à chaque doc `atomes/{id}/notifications/{n}`, la Function vérifie `pushOptIn`, **`getAuth().getUser(uid).phoneNumber`**
   (numéro vérifié = source de vérité) et la présence de jetons ; envoie un message **data** `{title, body, link, tag}`
   (`sendEachForMulticast`, `Urgency: high`, TTL 24 h), `link = APP_URL/<slug>?date=…&request=…`, et supprime les jetons invalides.
4. Le service worker n'utilise pas le SDK Firebase : il gère `push` (affiche) et `notificationclick` (focus/ouvre le lien).
- iPhone/iPad : push Web uniquement si l'app est **ajoutée à l'écran d'accueil** (iOS 16.4+) → PWA (`manifest.webmanifest`, icônes, metas Apple dans `index.html`).

---

## 9. Configuration et déploiement (résumé ; détails dans `docs/`)

- `.env.local` (copie de `.env.example`) : `VITE_FIREBASE_API_KEY`, `_AUTH_DOMAIN`, `_PROJECT_ID`, `_STORAGE_BUCKET`,
  `_MESSAGING_SENDER_ID`, `_APP_ID`, **`VITE_FIREBASE_VAPID_KEY`**, `VITE_FIREBASE_FUNCTIONS_REGION=europe-west6`, `VITE_USE_EMULATORS`.
  Sans config, l'app affiche un écran « Configuration Firebase manquante » (pas de crash).
- `functions/.env.<project-id>` : `APP_URL` (sans `/` final), `FUNCTIONS_REGION`.
- Console Firebase : Auth **E-mail/Mot de passe + Lien e-mail** activés, **Téléphone** activé (numéros de test, région SMS = Suisse),
  domaines autorisés, modèles en français, **nom public = At Home** ; Firestore `europe-west6` ; **Blaze** (Functions + SMS) ;
  Cloud Messaging API V1 + paire de clés Web Push.
- Commandes : `firebase deploy --only firestore:rules,firestore:indexes`, `firebase deploy --only functions`, `npm run deploy`.
- CI (`.github/workflows/ci.yml`) — secrets : `FIREBASE_SERVICE_ACCOUNT`, `FIREBASE_PROJECT_ID`, les 6 `VITE_FIREBASE_*`,
  `VITE_FIREBASE_VAPID_KEY`, `FUNCTIONS_ENV`.
- Le projet **n'est pas encore sous Git** (pas de `git init` effectué ; le client ne l'a pas demandé). Ne commit/push que sur demande.

---

## 10. Vérifications à exécuter après chaque changement

```bash
npm run typecheck            # tsc -b, doit afficher 0 erreur
npm test                     # Vitest : 42 tests / 7 fichiers passent actuellement
npm run build                # build de production (chunk Firestore ~750 kB, limite d'alerte fixée à 800 kB)
npm run lint                 # oxlint : 0 erreur, ~17 avertissements React Compiler acceptés (set-state-in-effect sur abonnements, Date en render…)
cd functions && npm run build
```

Tests existants : `vaudCalendar.test.ts` (Pâques, Jeûne fédéral, fériés 2026, vacances), `scheduleGenerator.test.ts`
(cycles, ponts, bords de période), `changeRequestMachine.test.ts`, `age.test.ts`, `stats.test.ts`, `strings.test.ts`,
`DayCell.test.tsx` (RTL).

**Jamais testé en conditions réelles** (aucun projet Firebase connecté jusqu'ici) : envoi d'e-mails de lien, code SMS,
push FCM, règles Firestore, Functions déployées, UI dans un navigateur. Le signaler honnêtement si l'utilisateur demande l'état.

---

## 11. Conventions de code

- TypeScript strict, aucun `any` ; lecture Firestore via `withId<T>()` / `listWithId<T>()` (cast assumé, validation à l'écriture par les règles).
- Services = seuls accès SDK ; hooks = état + services ; composants = hooks uniquement. Logique pure dans `utils/`/`config/` + tests Vitest.
- JSDoc **en français** sur les fonctions non triviales. Textes UI en français, écriture inclusive légère (« connecté·e »).
- Placeholders suisses : `+41 79 123 45 67`, `Rue de Bourg 12`, `1003 Lausanne`, `camille.rochat@bluewin.ch`, dates `JJ.MM.AAAA`.
  Téléphones normalisés en E.164 (`normalizeSwissPhone`, `formatSwissPhone`).
- Couleurs métier centralisées dans `config/theme.ts` (classes Tailwind complètes, pas de classes dynamiques concaténées).
- Composants modaux montés conditionnellement (`{open && <Modal…>}`) quand l'état initial dépend des props.
- Pages chargées en `lazy()` dans `App.tsx` (export nommé → `.then(m => ({ default: m.X }))`).
- Mettre à jour `CLAUDE.md`, le README et les guides `docs/` quand l'architecture ou la configuration change.

---

## 12. Historique des sessions

1. **Session 1 — création complète** : scaffold Vite, `CLAUDE.md`, types, calendrier vaudois (recherche web des dates officielles),
   générateur + ponts, machine à états, stats, services/hooks/contextes, UI complète (layout, calendrier 4 vues, modales,
   générateur, stats), pages, routing lazy, `firestore.rules`, index, Functions, guides, CI. À l'époque : e-mails via extension
   *Trigger Email* et SMS via extension *Twilio*.
2. **Session 2 — demande du client** : suppression des extensions et de Twilio. Invitations et connexion par **lien e-mail Firebase Auth** ;
   vérification du **mobile par Firebase Auth** ; notifications **push FCM** ; PWA + icônes (générées avec `sharp` depuis le logo) ;
   `fcmTokens` dans les règles ; Function `onInvitationCreated` supprimée ; `onNotificationCreated` réécrite pour FCM ;
   `smsOptIn` renommé `pushOptIn` ; `firebase.json` (SW sans cache) ; **guides `docs/` réécrits, beaucoup plus détaillés**.

---

## 13. Points ouverts / pistes de suite (non faits)

- Tests des règles Firestore (`@firebase/rules-unit-testing` + émulateur, nécessite Java 21+).
- Validation des vacances scolaires 2026-27 sur vd.ch et ajout de 2027-28+ dans `OFFICIAL_SCHOOL_HOLIDAYS`.
- Tests unitaires des services d'auth/messaging (mocks Firebase) et tests de composants supplémentaires.
- Notification de l'autre parent quand le second foyer a un `ownerUid` nul (aujourd'hui : pas de destinataire, donc aucune notification).
- Suppression d'un Atome / départ d'un membre / transfert de rôle (non implémentés ; `delete` interdit par les règles).
- Gestion multi-Atomes dans le header (aujourd'hui via « Changer d'Atome » → `/`).
- Export PDF/iCal du planning, historique des demandes clôturées dans l'UI (`subscribeClosedChangeRequests` existe mais n'est pas affiché).
- Réduction des avertissements lint React Compiler.
- Initialisation Git + premier déploiement réel, puis test de bout en bout (scénario dans `docs/FIREBASE_SETUP.md` §8).

---

## 14. Première action attendue de ta part

Confirme que tu as compris le projet en résumant en quelques lignes : la métaphore atomique, les 3 décisions verrouillées
(pas d'extension, Auth natif pour login/invitations, mobile vérifié + push FCM), la règle « aucune modification de garde sans
validation », puis demande à l'utilisateur sur quoi il souhaite avancer. Si tu as accès aux fichiers, relis d'abord `CLAUDE.md`
et vérifie que le code correspond à ce document avant de modifier quoi que ce soit.
