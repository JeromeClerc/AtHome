# At Home

**La garde alternée, sereinement, entre deux foyers.**
SaaS en français, localisé pour la Suisse (Canton de Vaud), qui aide deux parents séparés à planifier
l'alternance de leurs enfants, à demander des modifications soumises à validation, à annoter les jours
et à suivre la répartition (jours, jours fériés, vacances scolaires).

## Fonctionnalités

- **Atome** : espace privé d'une famille, accessible par son adresse `/<slug>`.
  - **Électron** (foyer 1, créateur) et **Positron** (foyer 2, invité) : parents.
  - **Protons** : les enfants (fiche modifiable par les parents jusqu'aux 18 ans).
  - **Neutrons** : tiers neutres (avocat, médiateur…) en lecture seule.
- **Invitations par e-mail envoyées par Firebase Authentication** (lien de connexion contenant le jeton
  d'invitation et l'Atome : `/invite/<jeton>?a=<atome>`), validité 14 jours, sans extension ni service tiers.
- **Connexion** e-mail + mot de passe ou **lien de connexion par e-mail** (sans mot de passe).
- **Générateur de planning** : semaine A/B, 2-2-3, 2-2-5-5, un week-end sur deux, cycle personnalisé ;
  règle des ponts fériés vaudois (Vendredi saint, lundis de Pâques/Pentecôte/Jeûne… suivent le week-end).
- **Calendrier** jour / semaine / mois / année, navigation par jour, semaine, mois et année ;
  distinction visuelle semaine / week-end / fériés vaudois / vacances scolaires vaudoises / notes / attentes.
- **Demandes de modification** : rien n'est appliqué sans l'accord de l'autre parent
  (approuver, contre-proposer en ping-pong, rejeter avec motif obligatoire).
- **Notes** par jour, colorées selon l'auteur (Électron, Positron, enfant, neutre).
- **Notifications** in-app (cloche) et **push sur le téléphone** (Firebase Cloud Messaging) après
  vérification du mobile par SMS (Firebase Authentication). Application installable (PWA).
- **Statistiques** temps réel par année et par enfant.
- Responsive (mobile → desktop), **mode sombre**, synchronisation temps réel, fonctionnement hors ligne (cache Firestore).

## Stack

Vite · React 19 · TypeScript strict · Tailwind CSS 4 · react-router · date-fns · lucide-react ·
Firebase (Auth, Firestore, Cloud Functions, Cloud Messaging, Hosting) · Vitest + Testing Library.

## Démarrage rapide

```bash
npm install
copy .env.example .env.local   # puis renseignez la configuration Firebase
npm run dev                    # http://localhost:5173
```

| Commande | Action |
|---|---|
| `npm run dev` | Serveur de développement |
| `npm run typecheck` | Vérification TypeScript |
| `npm test` | Tests unitaires et de composants |
| `npm run lint` | Analyse statique (oxlint) |
| `npm run build` | Build de production (`dist/`) |
| `npm run deploy` | Build + `firebase deploy` |

## Documentation

- [docs/FIREBASE_SETUP.md](docs/FIREBASE_SETUP.md) : configuration complète de Firebase (Auth, Firestore, règles, Cloud Messaging, functions, hébergement).
- [docs/GIT_SETUP.md](docs/GIT_SETUP.md) : Git, branches, commits conventionnels, CI/CD GitHub Actions.
- [CLAUDE.md](CLAUDE.md) : architecture, modèle de données et règles métier.

## Arborescence

```text
docs/                 Guides Firebase et Git
functions/            Cloud Functions (acceptation d'invitation, notifications push)
public/               Service worker des notifications, manifeste PWA, icônes
src/
  assets/             Logo SVG
  components/ui/      Boutons, champs, modales, badges, avatar, menus
  components/layout/  En-tête, cloche de notifications, pied de page, gabarits
  components/calendar/ Vues, cellule jour, légende, modales, générateur, statistiques
  config/             Firebase, calendrier vaudois, thème
  context/            Auth, Atome, Thème
  hooks/              useAuth, useAtome, useSchedule, useNotifications, useStats, useTheme
  pages/              Auth, Invitation, Création/Foyer, Tableau de bord, Enfants, Profil
  services/           Accès Firebase (auth, atome, invitations, enfants, planning, notifications)
  types/              Interfaces TypeScript
  utils/              Dates, générateur d'alternance, machine à états, statistiques, âge
firestore.rules       Règles de sécurité
firebase.json         Hosting, règles, functions, émulateurs
```

## Calendrier vaudois

Les jours fériés sont calculés automatiquement. Les **vacances scolaires** officielles sont saisies pour
2025-2026 et 2026-2027 dans `src/config/vaudCalendar.ts` (source : vd.ch) ; les années suivantes
utilisent une estimation signalée « (estimation) » dans l'interface. Mettez la table à jour chaque année.
