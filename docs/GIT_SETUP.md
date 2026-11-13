# Configuration Git & CI/CD — At Home (pas à pas)

Ce guide met le projet sous Git, le publie sur GitHub (privé), organise le travail en branches et
automatise les vérifications et le déploiement Firebase avec GitHub Actions.

> ⏱️ Durée : environ 30 minutes. Prérequis : avoir terminé [FIREBASE_SETUP.md](FIREBASE_SETUP.md)
> au moins jusqu'à l'étape 7 (le déploiement automatique utilise le même projet).

---

## 1. Installer et configurer Git (une seule fois par poste)

### 1.1 Installation (Windows)

1. Téléchargez **Git for Windows** : <https://git-scm.com/download/win>.
2. Pendant l'installation, gardez les options par défaut, sauf :
   - **Default editor** : *Use Visual Studio Code as Git's default editor* ;
   - **Initial branch name** : *Override* → `main`.
3. Vérifiez dans un nouveau terminal :

   ```bash
   git --version
   ```

### 1.2 Identité et réglages

```bash
git config --global user.name  "Prénom Nom"
git config --global user.email "prenom.nom@exemple.ch"
git config --global init.defaultBranch main
git config --global core.autocrlf true      # Windows : fins de ligne CRLF ↔ LF automatiques
git config --global pull.rebase true        # historique linéaire lors des git pull
git config --global fetch.prune true        # nettoie les branches distantes supprimées
git config --list --global                  # contrôle
```

> L'adresse e-mail doit correspondre à celle de votre compte GitHub (ou à l'adresse
> `…@users.noreply.github.com` si vous la masquez).

### 1.3 Authentification GitHub

Deux méthodes, au choix :

**A. GitHub CLI (la plus simple)**

```bash
winget install --id GitHub.cli
gh auth login        # GitHub.com › HTTPS › « Login with a web browser »
```

**B. Clé SSH**

```bash
ssh-keygen -t ed25519 -C "prenom.nom@exemple.ch"     # Entrée pour l'emplacement par défaut, puis une phrase secrète
Get-Content $env:USERPROFILE\.ssh\id_ed25519.pub | Set-Clipboard   # PowerShell : copie la clé publique
```

GitHub → **Settings › SSH and GPG keys › New SSH key** → collez la clé. Test : `ssh -T git@github.com`.

---

## 2. Initialiser le dépôt local

```bash
cd D:\Takk\App\AtHome
git init
git status
```

### 2.1 Contrôler ce qui sera versionné

Le `.gitignore` exclut déjà : `node_modules/`, `dist/`, `.env.local`, `.env.*.local`,
`functions/lib/`, `functions/node_modules/`, `functions/.env*` (sauf `.env.example`), journaux Firebase.

```bash
git status --ignored
```

✅ `.env.local` et `functions/.env.<id-projet>` doivent apparaître dans **Ignored files**, jamais dans
« Untracked files ».

> ℹ️ `.firebaserc` (ID du projet) **peut** être versionné : il ne contient pas de secret.
> Les clés Web Firebase non plus, mais on les garde hors du dépôt par hygiène (secrets CI, étape 6).

### 2.2 Premier commit

```bash
git add .
git commit -m "chore: initialisation du projet At Home"
git log --oneline
```

---

## 3. Créer le dépôt distant (GitHub)

### Avec GitHub CLI

```bash
gh repo create at-home --private --source . --remote origin --push
```

### Ou via le site

1. <https://github.com/new> : nom `at-home`, visibilité **Private**, **sans** README, .gitignore ni licence.
2. Puis :

   ```bash
   git remote add origin https://github.com/<votre-compte>/at-home.git   # ou git@github.com:<compte>/at-home.git
   git push -u origin main
   ```

✅ **Vérification** : la page GitHub du dépôt affiche les fichiers et le README.

> GitLab ou Bitbucket fonctionnent de la même façon (seule l'URL `origin` change). Le workflow CI
> fourni est spécifique à GitHub Actions.

---

## 4. Stratégie de branches

| Branche | Rôle | Déploiement automatique |
|---|---|---|
| `main` | Production, toujours stable et déployable | ✅ Production (Hosting, règles, index, functions) |
| `feat/<sujet>` | Nouvelle fonctionnalité | Prévisualisation Hosting sur la Pull Request |
| `fix/<sujet>` | Correction de bug | Prévisualisation Hosting sur la Pull Request |
| `docs/<sujet>`, `chore/<sujet>` | Documentation, maintenance | Prévisualisation |

### Cycle de travail type

```bash
git switch main
git pull                                   # partir de la dernière version
git switch -c feat/export-pdf              # nouvelle branche

# … développement …
npm run typecheck && npm test && npm run build    # vérifier avant de committer

git add -A
git commit -m "feat(planning): export PDF du mois"
git push -u origin feat/export-pdf
gh pr create --fill                        # ou bouton « Compare & pull request » sur GitHub
```

Après revue et CI verte : **Squash and merge** sur GitHub, puis localement :

```bash
git switch main && git pull
git branch -d feat/export-pdf
```

### Protéger `main`

GitHub → **Settings › Branches › Add branch ruleset** (ou *Add rule*) pour `main` :

- ✅ *Require a pull request before merging* ;
- ✅ *Require status checks to pass* → sélectionnez le job **`verify`** (visible après un premier passage de la CI) ;
- ✅ *Block force pushes*.

---

## 5. Commits conventionnels

Format : `type(portée): description à l'impératif, en minuscules`

| Type | Usage | Exemple |
|---|---|---|
| `feat` | Nouvelle fonctionnalité | `feat(protons): verrouillage à 18 ans` |
| `fix` | Correction | `fix(calendar): pont du lundi de Pentecôte` |
| `docs` | Documentation | `docs(firebase): étape Cloud Messaging` |
| `refactor` | Restructuration sans changement fonctionnel | `refactor(schedule): extraire la machine à états` |
| `test` | Tests | `test(vaud): vacances scolaires 2027-2028` |
| `chore` | Maintenance, dépendances | `chore(deps): mise à jour de firebase` |
| `ci` | Intégration continue | `ci: déploiement des functions` |

Portées usuelles : `auth`, `invitations`, `calendar`, `schedule`, `protons`, `notifications`, `rules`, `functions`, `vaud`.

---

## 6. CI/CD avec GitHub Actions

Le workflow `.github/workflows/ci.yml` est fourni :

| Événement | Jobs |
|---|---|
| Pull Request | `verify` (types, tests, build app + functions) → `preview` (canal de prévisualisation Hosting, URL commentée sur la PR, expire après 7 jours) |
| Push sur `main` | `verify` → `deploy` (production : hosting, règles, index, functions) |

### 6.1 Créer le compte de service de déploiement

**Méthode recommandée** (dans le dossier du projet) :

```bash
firebase init hosting:github
```

Répondez :

1. dépôt GitHub : `<votre-compte>/at-home` ;
2. *Set up the workflow to run a build script before every deploy?* → **No** (notre workflow s'en charge) ;
3. *Set up automatic deployment… when a PR is merged?* → **No**.

La CLI crée un compte de service et l'enregistre dans GitHub sous le nom
`FIREBASE_SERVICE_ACCOUNT_<ID_PROJET>`. Elle peut aussi générer des fichiers
`.github/workflows/firebase-hosting-*.yml` : **supprimez-les** (notre `ci.yml` les remplace).

Renommez le secret : GitHub → **Settings › Secrets and variables › Actions** → recréez-le sous le nom
**`FIREBASE_SERVICE_ACCOUNT`** avec la même valeur (ou adaptez `ci.yml`).

### 6.2 Donner les droits nécessaires au compte de service

Le job `deploy` publie aussi les règles et les functions. Google Cloud Console →
**IAM et administration › IAM** → ligne `github-action-…@<id-projet>.iam.gserviceaccount.com` → ✏️ →
ajoutez les rôles :

- **Administrateur Firebase** (*Firebase Admin*)
- **Administrateur Cloud Functions** (*Cloud Functions Admin*)
- **Utilisateur du compte de service** (*Service Account User*)
- **Administrateur Artifact Registry** (*Artifact Registry Administrator*)
- **Développeur Cloud Run** (*Cloud Run Developer*)

### 6.3 Secrets GitHub à créer

GitHub → **Settings › Secrets and variables › Actions › New repository secret** :

| Secret | Valeur |
|---|---|
| `FIREBASE_SERVICE_ACCOUNT` | JSON du compte de service (étape 6.1) |
| `FIREBASE_PROJECT_ID` | ID du projet, ex. `at-home-3f2a1` |
| `VITE_FIREBASE_API_KEY` | valeur de `.env.local` |
| `VITE_FIREBASE_AUTH_DOMAIN` | valeur de `.env.local` |
| `VITE_FIREBASE_PROJECT_ID` | valeur de `.env.local` |
| `VITE_FIREBASE_STORAGE_BUCKET` | valeur de `.env.local` |
| `VITE_FIREBASE_MESSAGING_SENDER_ID` | valeur de `.env.local` |
| `VITE_FIREBASE_APP_ID` | valeur de `.env.local` |
| `VITE_FIREBASE_VAPID_KEY` | clé publique Web Push (FIREBASE_SETUP.md, étape 6.2) |
| `FUNCTIONS_ENV` | contenu complet de `functions/.env.<id-projet>` (lignes `APP_URL=…` et `FUNCTIONS_REGION=…`) |

Avec GitHub CLI, plus rapide :

```bash
gh secret set FIREBASE_PROJECT_ID --body "at-home-3f2a1"
gh secret set VITE_FIREBASE_VAPID_KEY --body "BEx…"
gh secret set FUNCTIONS_ENV < functions/.env.at-home-3f2a1
```

### 6.4 Premier passage

1. Créez une branche de test, modifiez une ligne du README, poussez et ouvrez une Pull Request.
2. Onglet **Actions** : `verify` puis `preview` passent au vert ; un commentaire avec l'URL de prévisualisation apparaît sur la PR.
3. Fusionnez : le job `deploy` publie en production.

> ⚠️ Pour que les liens d'invitation fonctionnent sur une **prévisualisation**
> (`at-home-3f2a1--pr12-xxxx.web.app`), ce domaine devrait être ajouté aux domaines autorisés
> d'Authentication. En pratique, testez les invitations sur la production ou en local.

---

## 7. Versions et publication

1. Mettez à jour `version` dans `package.json` (affichée dans le pied de page), ex. `0.2.0`.
2. Commit + tag :

   ```bash
   git commit -am "chore: version 0.2.0"
   git tag -a v0.2.0 -m "Notifications push et invitations par lien Firebase"
   git push && git push --tags
   ```

3. *(Facultatif)* `gh release create v0.2.0 --generate-notes`.

---

## 8. Commandes utiles

| Commande | Effet |
|---|---|
| `git status` | État des fichiers |
| `git log --oneline --graph --all` | Historique visuel |
| `git diff` / `git diff --staged` | Modifications non indexées / indexées |
| `git stash` · `git stash pop` | Mettre de côté puis récupérer des modifications |
| `git restore <fichier>` | Annuler les modifications locales d'un fichier |
| `git commit --amend` | Corriger le dernier commit (avant push uniquement) |
| `git switch -` | Revenir à la branche précédente |

---

## Dépannage

| Symptôme | Solution |
|---|---|
| `.env.local` apparaît dans `git status` | Vérifier `.gitignore` ; s'il a déjà été commité : `git rm --cached .env.local` puis commit. **Régénérez** les clés concernées si le dépôt est public |
| `Permission denied (publickey)` | Clé SSH non ajoutée à GitHub (étape 1.3) ou utiliser l'URL HTTPS |
| `rejected … (fetch first)` au push | `git pull` puis `git push` |
| CI : `verify` échoue au build | Lancer `npm run typecheck && npm test && npm run build` en local et corriger |
| CI : `deploy` échoue « permission denied » / « iam.serviceAccounts.ActAs » | Rôles manquants (étape 6.2) |
| CI : functions déployées sans `APP_URL` | Secret `FUNCTIONS_ENV` absent ou mal formé (étape 6.3) |
| Notifications absentes sur la version déployée | Secret `VITE_FIREBASE_VAPID_KEY` manquant : relancer le workflow après l'avoir ajouté |
