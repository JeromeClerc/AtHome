# RÔLE ET OBJECTIF
Tu es un Architecte Logiciel Senior et Développeur Full-Stack expert en React, TypeScript, Tailwind CSS et Firebase.
Ta mission est de concevoir, structurer et coder de zéro l'application web SaaS nommée **"At Home"** dans le répertoire courant : `D:\Takk\App\AtHome`.

L'application doit être entièrement rédigée en **français** (interface, messages d'erreur, placeholders localisés en Suisse, documentation), **responsive** (Mobile-First, Tablette, Desktop) et intégrer un **mode sombre** natif.

---

# 1. STACK TECHNIQUE & STANDARDS D'INGÉNIERIE
- **Répertoire cible :** `D:\Takk\App\AtHome` (initialise le projet directement ici avec Vite).
- **Frontend :** React 19+ (Functional Components, Hooks modernes), TypeScript strict (`strict: true`, aucun `any`).
- **Styling :** Tailwind CSS (avec thème sombre via classe `dark`, palette sobre et fonctionnelle).
- **Icônes :** `lucide-react`.
- **Dates :** `date-fns` (avec locale `fr`).
- **Backend & Infra (Firebase) :**
  - **Authentication :** Email / Mot de passe.
  - **Cloud Firestore :** Base de données temps réel (`onSnapshot`) structurée pour le multi-tenant (SaaS).
  - **Cloud Functions (Node.js/TypeScript) :** Pour l'envoi des e-mails d'invitation sécurisés et le déclenchement des notifications SMS (via intégration Twilio / extension Firebase *Trigger Email* & *Send Messages with Twilio*, avec architecture découplée et variables d'environnement `.env`).
  - **Firebase Hosting :** Configuration prête pour le déploiement (`firebase.json`, rewrites SPA).
- **Architecture & Qualité :**
  - Architecture modulaire par domaine (`src/features/...`) et composants UI réutilisables (`src/components/ui/...`).
  - Séparation stricte entre la logique métier (services/hooks) et la vue (composants React).
  - Code commenté (JSDoc sur les fonctions complexes et règles métier), typé, testable (configuration Vitest incluse avec tests unitaires sur le moteur de calcul du planning) et sécurisé (`firestore.rules` strictes).

---

# 2. MODÈLE MÉTIER & MÉTAPHORE ATOMIQUE (MULTI-TENANT SAAS)
L'application permet à deux parents séparés/divorcés de gérer la garde alternée de leurs enfants. Chaque cellule familiale constitue un tenant isolé appelé **Atome** (jeu de mots avec *At Home*).

### Hiérarchie des entités et rôles :
1. **Atome (`atoms`) :** L'espace de travail isolé de la famille. Possède un nom et un `slug` unique généré automatiquement pour les URLs (ex: `/atome/famille-dupont/planning`).
2. **Électron (`electron`) :** Foyer 1 (le parent créateur de l'Atome). Droits d'administration et de gestion du planning.
3. **Positron (`positron`) :** Foyer 2 (le second parent invité). Mêmes droits que l'Électron sur le planning et les enfants.
4. **Protons (`protons`) :** Les enfants rattachés à l'Atome.
   - Champs : Nom, prénom, date de naissance (calcul automatique de l'âge), genre, e-mail (optionnel), mobile (optionnel, format suisse `+41 79 ...`).
   - **Règle de majorité :** Tant que l'enfant a moins de 18 ans, les deux parents peuvent éditer ses données. Dès le jour de ses 18 ans révolus, ses données passent en lecture seule pour les parents (propriété de l'enfant).
5. **Neutrons (`neutrons`) :** Tiers neutres invités (avocat, médiateur, curateur, grand-parent). Accès strictement en **lecture seule** sur le planning et les statistiques (aucune création/modification/note possible).

---

# 3. PARCOURS UTILISATEUR & AUTHENTIFICATION
1. **Landing / Auth :** Connexion ou inscription (Email + Mot de passe) pour le parent initiateur.
2. **Onboarding Atome (Parent 1 / Électron) :**
   - Création de l'Atome (nom -> génération d'un slug unique vérifié en base) et configuration de son profil (Foyer Électron).
   - Création des Protons (enfants).
   - Configuration du Positron (Foyer 2) et envoi d'une invitation par e-mail contenant un lien unique avec token (`/invite?token=XYZ&atom=slug`).
   - Possibilité d'inviter des Neutrons par e-mail avec un lien d'invitation dédié au rôle `neutron`.
   - Génération du planning initial.
3. **Onboarding Invité (Parent 2 / Positron ou Neutron) :**
   - Clic sur le lien d'invitation -> validation du token -> création du compte/mot de passe -> rattachement automatique à l'Atome avec le bon rôle (`positron` ou `neutron`).
   - Si Positron : redirection vers la finalisation de son profil foyer et possibilité d'inviter ses propres Neutrons.

---

# 4. MOTEUR DE PLANNING & WORKFLOW DE VALIDATION (CŒUR MÉTIER)

### A. Génération automatique & Règles calendaires (Canton de Vaud, Suisse)
- Génération d'un planning d'alternance récurrent (ex: Semaine A / Semaine B, ou 2-2-3, ou personnalisé) par enfant sur une période donnée.
- **Base de données calendaire Suisse (Canton de Vaud) :** Intègre un utilitaire complet calculant et fournissant pour les années en cours et à venir :
  1. Les **jours fériés officiels du Canton de Vaud** (Nouvel An, 2 janvier, Vendredi Saint, Lundi de Pâques, Ascension, Lundi de Pentecôte, 1er août, Lundi du Jeûne fédéral, Noël).
  2. Les **vacances scolaires officielles du Canton de Vaud** (Relâches, Pâques, Été, Automne, Noël).
- **Règle d'extension des jours fériés :** Lors de la génération initiale, si un jour férié vaudois précède immédiatement un week-end (ex: Vendredi Saint) ou succède immédiatement à un week-end (ex: Lundi de Pâques, Lundi de Pentecôte, Lundi du Jeûne), il est automatiquement attribué au parent qui a la garde sur ce week-end.

### B. Workflow de modification et d'approbation (Machine à états)
**Règle absolue : Aucune modification de garde ne s'applique directement.**
1. **Proposition :** Un parent sélectionne un ou plusieurs jours sur le calendrier et demande une réattribution (à l'autre parent ou à lui-même).
2. **État `pending` (En attente) :** La modification est sauvegardée en statut `pending`. Visuellement, les jours concernés affichent un indicateur distinct (hachures, opacité réduite, bordure pointillée + badge) montrant la proposition. Une notification (in-app + déclencheur SMS/email) est envoyée à l'autre parent.
3. **Arbitrage par l'autre parent :**
   - **Approuver (`approved`) :** La garde est officiellement basculée et enregistrée.
   - **Contre-proposer / Modifier (`counter_proposed`) :** Le second parent ajuste les dates/attribution ; le statut repasse en attente vers le premier parent (ping-pong jusqu'à accord).
   - **Rejeter (`rejected`) :** Oblige le parent qui rejette à saisir un **motif écrit obligatoire**. Le demandeur est notifié du rejet et de sa justification.

### C. Notes contextuelles
- Possibilité d'ajouter une note texte libre sur n'importe quel jour.
- Identification visuelle immédiate de l'auteur de la note par un code couleur distinct selon le rôle : **Électron (Foyer 1)**, **Positron (Foyer 2)**, **Proton (Enfant)**, **Neutron/Autre**.

### D. Statistiques temps réel
- Calcul et affichage dynamique (filtrable par année, vacances scolaires, jours fériés) du **nombre de jours et pourcentage** passés chez l'Électron vs chez le Positron, ainsi que la répartition spécifique des **jours fériés** et des **vacances scolaires**.

---

# 5. SPÉCIFICATIONS UI / UX & NAVIGATION
- **Localisation Suisse :** Placeholders réalistes (`Rue de Bourg 12, 1003 Lausanne`, `+41 79 123 45 67`, etc.).
- **Logo SVG sur mesure ("At Home") :** Crée un composant `<Logo />` vectoriel élégant combinant les orbitales d'un atome, le contour stylisé d'une maison et deux silhouettes d'enfants stylisés à l'intérieur.
- **Header global :**
  - Gauche : Logo "At Home" + nom de l'Atome actif.
  - Droite (de gauche à droite) :
    1. Cloche de notifications avec compteur non-lu (ouvre un popover listant les demandes de modification de planning à valider et les nouvelles notes ajoutées par l'autre parent).
    2. Avatar / pastille de l'utilisateur connecté (avec badge Électron/Positron/Neutron) + toggle Mode Sombre/Clair.
    3. Menu de navigation principal (Planning, Enfants/Protons, Foyer & Invitations, Mon Profil).
- **Dashboard / Page d'accueil (Planning) :**
  - Bandeau supérieur compact : Statistiques de répartition (Jours totaux, Vacances scolaires, Jours fériés) Électron vs Positron.
  - Contrôles de navigation temporelle : Précédent / Suivant par **Jour**, **Semaine**, **Mois**, **Année**, plus bouton "Aujourd'hui".
  - Sélecteur de vue : **Vue Semaine**, **Vue Mois**, **Vue Année**.
  - Légende visuelle claire distinguant : Semaine (Lun-Ven), Week-end (Sam-Dim), Jour férié Vaud, Vacances scolaires Vaud, Garde Électron, Garde Positron, Modification en attente de validation, Présence d'une note (avec couleur de l'auteur).
- **Pages secondaires :**
  - **Gestion des Protons (`/enfants`) :** CRUD complet des enfants (Nom, Prénom, Date de naissance, Genre, Email, Mobile) avec verrouillage automatique à 18 ans.
  - **Gestion de l'Atome & Invitations (`/foyer`) :** Gestion des foyers Électron/Positron, invitation et liste des Neutrons, générateur de planning initial.
  - **Profil personnel (`/profil`) :** Édition de ses propres données (Nom, Prénom, Email, Numéro de téléphone mobile pour notifications SMS).
- **Footer :** Sobre, affichant le nom de l'application, la version et les mentions de confidentialité.

---

# 6. LIVRABLES ATTENDUS & STRUCTURE DU PROJET
Exécute la création complète du projet dans `D:\Takk\App\AtHome` selon cette arborescence :
```text
D:\Takk\App\AtHome\
├── docs/
│   ├── CONFIGURATION_FIREBASE.md   # Guide pas-à-pas complet (Console, Auth, Firestore, Rules, Functions, Twilio SMS, Hosting)
│   └── CONFIGURATION_GIT.md        # Guide pas-à-pas complet (Init, .gitignore, branches, commits conventionnels, GitHub/GitLab)
├── functions/                      # Firebase Cloud Functions (invitations email & notifications SMS)
├── src/
│   ├── components/
│   │   ├── layout/                 # Header, Footer, NotificationPopover, MainLayout
│   │   └── ui/                     # Boutons, Modales, Badges, Inputs, Cards réutilisables
│   ├── features/
│   │   ├── auth/                   # Login, Register, InviteAcceptPage, AuthContext
│   │   ├── atom/                   # Création Atome, gestion foyers Electron/Positron, Neutrons
│   │   ├── protons/                # CRUD enfants + règle majorité 18 ans
│   │   ├── calendar/               # Moteur planning, vues (Semaine/Mois/Année), modale modification/approbation, notes
│   │   ├── stats/                  # Calculateurs et bandeau statistiques (jours, fériés, vacances)
│   │   └── profile/                # Gestion des données personnelles
│   ├── lib/
│   │   ├── firebase.ts             # Initialisation SDK Firebase
│   │   └── vaudHolidays.ts         # Calendrier dynamique jours fériés & vacances scolaires Canton de Vaud
│   ├── types/                      # Interfaces TypeScript strictes (Atom, User, Proton, CustodyDay, ChangeRequest, Note)
│   └── utils/                      # Helpers dates, génération planning, validation
├── firestore.rules                 # Règles de sécurité Firestore (isolation par Atome, lecture seule Neutrons)
├── firestore.indexes.json
├── firebase.json
├── package.json
└── README.md