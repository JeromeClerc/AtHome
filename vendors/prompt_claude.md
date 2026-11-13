# RÔLE ET OBJECTIF
Tu es un Senior Lead Frontend Architect et Full-Stack Developer expert en React, TypeScript, Tailwind CSS et Firebase. 
Ton objectif est de concevoir et développer de zéro l'application SaaS **"At Home"** directement dans le répertoire courant : `D:\Takk\App\AtHome`.

Avant d'écrire la moindre ligne de code applicatif :
1. Analyse l'intégralité de ces spécifications.
2. Crée un fichier `CLAUDE.md` à la racine du projet résumant l'architecture, le modèle de données, les règles métier et les conventions de code pour garder ce contexte en permanence.
3. Procède au développement **Phase par Phase** (voir section Plan d'Exécution) en validant que chaque brique compile sans aucune erreur TypeScript.

---

# 1. STACK TECHNIQUE & STANDARDS D'INGÉNIERIE
- **Répertoire racine** : `D:\Takk\App\AtHome`
- **Build Tool & Framework** : Vite + React 18+ (TypeScript strict mode activé, zéro type `any`).
- **Styling** : Tailwind CSS (avec support natif du Dark Mode via la classe `dark`), `lucide-react` pour les icônes, `clsx` et `tailwind-merge`.
- **Gestion des dates** : `date-fns` (avec la locale `fr-CH` / `fr`).
- **Routing** : `react-router-dom` v6+ avec routes protégées par rôle et par slug d'Atome (`/:atomeSlug/...`).
- **Backend & Base de données** : Firebase (Authentication, Firestore ou Realtime Database avec listeners temps réel `onSnapshot`/`onValue`, Cloud Functions pour les invitations/notifications, Firebase Hosting).
- **Tests** : Vitest + React Testing Library (au moins pour la logique critique du générateur de planning et des jours fériés).
- **Langue & Localisation** : Interface 100% en français, localisée pour la **Suisse (Canton de Vaud)**.
  - Placeholders suisses : Téléphone `+41 79 123 45 67`, NPA `1000 Lausanne` / `1400 Yverdon-les-Bains`, format de date `JJ.MM.AAAA`.
- **Principes de code** : Architecture modulaire (Feature-sliced ou Domain-driven), composants atomiques réutilisables, Custom Hooks pour isoler la logique Firebase et métier, JSDoc en français sur les fonctions complexes.

---

# 2. ARCHITECTURE DES DOSSIERS ATTENDUE
Organise le projet selon cette structure stricte :
```text
D:\Takk\App\AtHome\
├── docs/
│   ├── FIREBASE_SETUP.md       # Guide pas-à-pas configuration Firebase (Auth, DB, Rules, SMS, Hosting)
│   └── GIT_SETUP.md            # Guide pas-à-pas configuration Git, branches et CI/CD
├── public/
├── src/
│   ├── assets/                 # Logo SVG "At Home" (Atome + Maison + 2 enfants)
│   ├── components/
│   │   ├── ui/                 # Boutons, Inputs, Modales, Badges, Avatar, Dropdowns
│   │   ├── layout/             # Header, Sidebar/Menu, NotificationBell, Footer, MainLayout
│   │   └── calendar/           # Vues Jour/Semaine/Mois/Année, Cellule Jour, Légende, Modale Modification
│   ├── config/
│   │   ├── firebase.ts         # Initialisation Firebase
│   │   └── vaudCalendar.ts     # Jours fériés Canton de Vaud & Vacances scolaires vaudoises
│   ├── context/                # AuthContext, AtomeContext, ThemeContext (Dark/Light)
│   ├── hooks/                  # useAuth, useAtome, useSchedule, useNotifications, useStats
│   ├── pages/
│   │   ├── AuthPage.tsx        # Login / Inscription /Onboarding initial
│   │   ├── InviteAcceptPage.tsx# Page d'atterrissage par token d'invitation (/invite/:token)
│   │   ├── SetupAtomePage.tsx  # Création de l'Atome, Electron, Positron, Protons, Neutrons
│   │   ├── DashboardPage.tsx   # Stats + Planning interactif principal
│   │   ├── ProtonsPage.tsx     # Gestion des enfants (CRUD + règle de majorité 18 ans)
│   │   └── ProfilePage.tsx     # Gestion des données personnelles & Foyer
│   ├── services/               # Appels Firebase (auth.service, atome.service, schedule.service, notification.service)
│   ├── types/                  # Interfaces TypeScript complètes (atome.types.ts, schedule.types.ts, user.types.ts)
│   └── utils/                  # Algorithme d'alternance, calcul des ponts fériés, calcul d'âge/majorité
├── firestore.rules             # Règles de sécurité strictes basées sur les rôles de l'Atome
├── firebase.json               # Configuration Firebase Hosting & Rules
└── package.json