# Configuration Firebase — At Home (pas à pas)

Ce guide connecte l'application à **votre** projet Firebase, de la création du projet jusqu'au
déploiement en production. Chaque étape indique **où cliquer**, **quoi saisir** et **comment vérifier**.

> ⏱️ Durée : environ 1 heure la première fois.
> 💳 Le forfait **Blaze** (paiement à l'usage) est requis pour les Cloud Functions et l'envoi des SMS de
> vérification. Pour une famille, la consommation reste très faible ; une alerte budgétaire est configurée
> à l'étape 5.

---

## Vue d'ensemble : ce que l'application utilise

At Home n'utilise **aucune extension Firebase** et **aucun service tiers** (ni Twilio, ni SendGrid…).
Tout repose sur les produits natifs de Firebase :

| Besoin | Produit Firebase | Détail |
|---|---|---|
| Inscription / connexion | **Authentication** › E-mail/Mot de passe | Inscription, e-mail de vérification, mot de passe oublié |
| Connexion sans mot de passe | **Authentication** › Lien e-mail | « Recevoir un lien de connexion » |
| **Invitation** d'un membre | **Authentication** › Lien e-mail | Firebase envoie l'e-mail ; le lien contient le **jeton d'invitation** et l'**Atome** |
| Vérification du mobile | **Authentication** › Téléphone | Code SMS envoyé par Firebase |
| Notifications sur le téléphone | **Cloud Messaging (FCM)** | Notifications push sur le mobile vérifié |
| Données temps réel | **Cloud Firestore** | Règles de sécurité strictes par Atome |
| Logique serveur | **Cloud Functions** | `acceptInvitation`, `onNotificationCreated` |
| Hébergement | **Hosting** | Application + service worker des notifications |

### Parcours d'une invitation

```text
Parent (Électron)                  Firebase                          Invité·e (Positron / Neutron / Proton)
─────────────────                  ────────                          ──────────────────────────────────────
« Envoyer l'invitation »
  1. crée atomes/{id}/invitations/{jeton}  (Firestore)
  2. sendSignInLinkToEmail(e-mail, url = /invite/{jeton}?a={atomeId})
                                   ─► Auth envoie l'e-mail « Se connecter à At Home »
                                                                     3. clique sur le lien
                                                                     4. arrive sur /invite/{jeton}?a=…  → connecté
                                                                        automatiquement (compte créé, e-mail vérifié)
                                                                     5. saisit prénom, nom, mot de passe
                                                                     6. « Rejoindre l'Atome »
                                   ◄─ Cloud Function acceptInvitation : vérifie jeton + e-mail,
                                      ajoute le membre avec son rôle, marque l'invitation « acceptée »
```

### Parcours d'une notification

```text
Action (demande de modification, note…) ─► document atomes/{id}/notifications/{n}  (cloche in-app, temps réel)
                                         └► Cloud Function onNotificationCreated
                                              si mobile vérifié (Auth) + notifications activées
                                              ─► Cloud Messaging ─► notification sur le téléphone
```

> ℹ️ **Pourquoi pas de SMS de notification ?** Firebase n'envoie des SMS que pour la **vérification**
> d'un numéro (codes à usage unique). Il ne permet pas d'envoyer des SMS au contenu libre. La solution
> native est donc : numéro **vérifié par SMS** via Authentication, puis **notifications push** sur ce
> téléphone via Cloud Messaging.

---

## 0. Prérequis

| Outil | Version | Installation | Vérification |
|---|---|---|---|
| Node.js | 22 LTS | <https://nodejs.org> | `node -v` |
| npm | 10+ | inclus avec Node.js | `npm -v` |
| Firebase CLI | 14+ | `npm install -g firebase-tools` | `firebase --version` |
| Java (facultatif, émulateurs) | 21+ | <https://adoptium.net> | `java -version` |
| Un compte Google | — | — | — |

Connectez la CLI à votre compte Google :

```bash
firebase login
```

Une fenêtre de navigateur s'ouvre : autorisez l'accès. Vérifiez avec `firebase projects:list`.

Installez les dépendances du projet (une seule fois) :

```bash
cd D:\Takk\App\AtHome
npm install
cd functions
npm install
cd ..
```

---

## 1. Créer le projet Firebase

1. Ouvrez la [console Firebase](https://console.firebase.google.com) → **Créer un projet** (ou « Ajouter un projet »).
2. **Nom du projet** : `At Home` (l'**ID du projet** proposé, ex. `at-home-3f2a1`, apparaît sous le nom ; notez-le).
3. **Google Analytics** : facultatif. Désactivez-le si vous n'en avez pas l'usage → **Créer le projet**.
4. Une fois le projet créé : ⚙️ **Paramètres du projet** › onglet **Général** :
   - **Nom public** (*Public-facing name*) : `At Home`.
     ⚠️ Important : c'est ce nom qui apparaît dans les e-mails d'invitation et de connexion (« Se connecter à At Home »).
   - **Adresse e-mail d'assistance** : choisissez votre adresse.

Liez le dossier local au projet :

```bash
firebase use --add
```

Sélectionnez le projet, puis saisissez l'alias `default`. Le fichier `.firebaserc` est créé.

✅ **Vérification** : `firebase use` affiche `Active Project: default (at-home-3f2a1)`.

---

## 2. Enregistrer l'application Web et créer `.env.local`

1. ⚙️ **Paramètres du projet** › **Général** › section **Vos applications** › icône **Web `</>`**.
2. **Surnom de l'application** : `At Home Web`. Ne cochez **pas** « Configurer Firebase Hosting » (fait à l'étape 9).
3. Cliquez sur **Enregistrer l'application**. Un objet `firebaseConfig` s'affiche : gardez la page ouverte.
4. Créez le fichier d'environnement local :

   ```powershell
   Copy-Item .env.example .env.local
   ```

5. Reportez les valeurs dans `.env.local` :

   ```ini
   VITE_FIREBASE_API_KEY=AIza...                         # apiKey
   VITE_FIREBASE_AUTH_DOMAIN=at-home-3f2a1.firebaseapp.com   # authDomain
   VITE_FIREBASE_PROJECT_ID=at-home-3f2a1                # projectId
   VITE_FIREBASE_STORAGE_BUCKET=at-home-3f2a1.firebasestorage.app
   VITE_FIREBASE_MESSAGING_SENDER_ID=123456789012        # messagingSenderId
   VITE_FIREBASE_APP_ID=1:123456789012:web:abc123        # appId
   VITE_FIREBASE_VAPID_KEY=                              # rempli à l'étape 6
   VITE_FIREBASE_FUNCTIONS_REGION=europe-west6
   VITE_USE_EMULATORS=false
   ```

> ℹ️ Ces clés Web ne sont pas secrètes : elles identifient le projet. La sécurité repose sur
> l'authentification et les règles Firestore. `.env.local` est tout de même exclu de Git.

✅ **Vérification** : `npm run dev` puis <http://localhost:5173> affiche la page de connexion
(et non plus l'écran « Configuration Firebase manquante »).

---

## 3. Authentication

Console → **Créer** (*Build*) › **Authentication** → **Commencer**.

### 3.1 E-mail / mot de passe + lien e-mail (connexion **et** invitations)

1. Onglet **Méthode de connexion** (*Sign-in method*) → **Ajouter un fournisseur** → **E-mail/Mot de passe**.
2. Activez **les deux** interrupteurs :
   - **E-mail/Mot de passe** : inscription et connexion classiques ;
   - **Lien e-mail (connexion sans mot de passe)** : **indispensable** pour les invitations et la connexion par lien.
3. **Enregistrer**.

### 3.2 Téléphone (vérification du mobile pour les notifications)

1. **Méthode de connexion** → **Ajouter un fournisseur** → **Téléphone** → **Activer** → **Enregistrer**.
2. **Numéros de test** (recommandé pour le développement, aucun SMS réel n'est envoyé ni facturé) :
   dans la carte du fournisseur Téléphone, section **Numéros de téléphone pour les tests** :
   - Numéro : `+41 79 000 00 01` · Code : `123456`
   - Numéro : `+41 79 000 00 02` · Code : `654321`
3. Onglet **Paramètres** (*Settings*) › **Règles relatives aux régions SMS** (*SMS region policy*) :
   - choisissez **Autoriser** (*Allow*) et sélectionnez **Suisse (CH)** ;
   - ajoutez au besoin les pays voisins (France, Italie, Allemagne, Autriche, Liechtenstein).

   Cela bloque l'envoi de SMS vers d'autres pays (protection contre la fraude aux SMS).

> 💳 Les SMS de vérification sont facturés à l'unité selon le pays (voir la page *Tarifs* de Firebase
> Authentication). Un utilisateur ne vérifie son numéro qu'une fois, ou s'il en change.

### 3.3 Domaines autorisés

Onglet **Paramètres** › **Domaines autorisés** (*Authorized domains*). Doivent y figurer :

| Domaine | Pourquoi |
|---|---|
| `localhost` | Développement (présent par défaut) |
| `at-home-3f2a1.firebaseapp.com` | Domaine Auth (présent par défaut) |
| `at-home-3f2a1.web.app` | Hosting (présent par défaut) |
| `athome.votre-domaine.ch` | **À ajouter** si vous utilisez un domaine personnalisé |

⚠️ Les liens d'invitation et de connexion redirigent vers l'URL de l'application. Si le domaine n'est
pas autorisé, l'envoi échoue avec « Le domaine de retour du lien n'est pas autorisé ».

### 3.4 Modèles d'e-mails (en français)

Onglet **Modèles** (*Templates*) :

1. En bas de page, **Langue du modèle** (*Template language*) → **Français**.
   L'application force aussi le français (`auth.languageCode = 'fr'`).
2. Pour chaque modèle (✏️) : **Nom de l'expéditeur** = `At Home`, et **Répondre à** = votre adresse.
   - **Validation de l'adresse e-mail** : envoyé après une inscription par mot de passe.
   - **Réinitialisation du mot de passe**.
   - **Modification de l'adresse e-mail**.
3. L'e-mail de **lien de connexion** (utilisé pour les **invitations**) reprend le **nom public** du
   projet (étape 1) et le nom de l'expéditeur ; son contenu n'est pas modifiable. L'invité·e y lit
   « Se connecter à At Home » ; la page d'invitation affiche ensuite le nom de l'Atome, son rôle et l'invitant.
4. *(Facultatif)* **Paramètres SMTP** (*SMTP settings*) dans l'onglet Modèles : pour envoyer les e-mails
   depuis votre propre domaine (ex. `noreply@votre-domaine.ch` via Infomaniak). Fonction intégrée à
   Authentication, pas une extension.

> 💡 Pensez à prévenir les invités que l'e-mail peut arriver dans les **indésirables**, surtout avec
> l'expéditeur par défaut `noreply@at-home-3f2a1.firebaseapp.com`. Le SMTP personnalisé améliore la délivrabilité.

### 3.5 Sécurité du compte

Onglet **Paramètres** › **Gestion des comptes utilisateur** :

- **Protection contre l'énumération des adresses e-mail** : activée (recommandé, compatible avec l'app).
- **Création de compte** : laissez « Autoriser l'inscription » activé (les invités créent leur compte via le lien).

✅ **Vérification** : sur <http://localhost:5173>, créez un compte → l'e-mail de validation arrive en
français. Testez aussi **« Recevoir un lien de connexion par e-mail »**.

---

## 4. Cloud Firestore

### 4.1 Créer la base

1. Console → **Créer** › **Firestore Database** → **Créer une base de données**.
2. **Édition Standard**, ID de base `(default)`.
3. **Emplacement** : **`europe-west6` (Zurich)**. Les données restent en Suisse. ⚠️ Ce choix est **définitif**.
4. **Mode production** (tout est fermé ; nos règles sont déployées juste après) → **Créer**.

### 4.2 Déployer les règles et les index

```bash
firebase deploy --only firestore:rules,firestore:indexes
```

La CLI **compile les règles** avant de les publier : en cas d'erreur, elle indique la ligne fautive et
n'écrase rien.

Contenu déployé :

- `firestore.rules` :
  - isolation stricte par Atome (seuls les membres lisent ses données) ;
  - ajout de membres réservé à la Cloud Function `acceptInvitation` ;
  - Neutrons en lecture seule ;
  - aucune modification de garde sans demande approuvée par l'autre parent ;
  - fiche d'un enfant verrouillée pour les parents à ses 18 ans ;
  - jetons de notification (`users/{uid}/fcmTokens`) accessibles à leur seul propriétaire.
- `firestore.indexes.json` : index composites (notifications par destinataire, historique des demandes,
  recherche d'un Atome par slug).

✅ **Vérification** : console → Firestore › **Règles** affiche la date de publication ; onglet
**Index** : les 3 index passent de « Création… » à « Activé » en quelques minutes.

---

## 5. Passer au forfait Blaze et fixer un budget

1. ⚙️ **Paramètres du projet** › **Utilisation et facturation** › **Détails et paramètres** → **Modifier le forfait** → **Blaze**.
2. Associez (ou créez) un compte de facturation Google Cloud.
3. **Alerte budgétaire** : <https://console.cloud.google.com/billing> › **Budgets et alertes** →
   **Créer un budget** : montant `CHF 5`, alertes à 50 %, 90 %, 100 %.

> Les alertes préviennent par e-mail mais ne coupent pas le service.

---

## 6. Cloud Messaging (notifications push sur le téléphone)

### 6.1 Vérifier l'API

⚙️ **Paramètres du projet** › onglet **Cloud Messaging** :
**API Firebase Cloud Messaging (V1)** doit être **Activée**. Si ce n'est pas le cas : menu ⋮ → **Gérer
l'API dans Google Cloud Console** → **Activer**.

### 6.2 Générer la clé Web Push (VAPID)

1. Même onglet, section **Configuration Web** › **Certificats Web Push** → **Générer une paire de clés**.
2. Copiez la **clé publique** (longue chaîne commençant souvent par `B…`).
3. Collez-la dans `.env.local` :

   ```ini
   VITE_FIREBASE_VAPID_KEY=BExxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
   ```

4. Redémarrez `npm run dev`.

### 6.3 Ce qui est déjà en place dans le projet

| Fichier | Rôle |
|---|---|
| `public/firebase-messaging-sw.js` | Service worker : affiche la notification et ouvre la bonne page au toucher |
| `public/manifest.webmanifest` + icônes | Rend l'application **installable** (obligatoire sur iPhone) |
| `src/services/messaging.service.ts` | Autorisation, jeton d'appareil, enregistrement dans Firestore |
| `functions/src/index.ts` › `onNotificationCreated` | Envoi des notifications via Cloud Messaging |

### 6.4 Conditions pour recevoir une notification

1. Le destinataire a **vérifié son mobile** (Profil › Mobile & notifications › code SMS) ;
2. il a **activé les notifications sur au moins un appareil** ;
3. la case **« Recevoir les notifications sur tous mes appareils »** est cochée (elle l'est automatiquement à l'activation).

### 6.5 Particularités par téléphone

| Appareil | Procédure |
|---|---|
| **Android** (Chrome, Edge, Firefox, Samsung Internet) | Ouvrir l'app → Profil → « Activer les notifications sur cet appareil » → **Autoriser** |
| **iPhone / iPad** (iOS 16.4 ou plus récent) | 1. Ouvrir l'app dans **Safari** · 2. **Partager** › **Sur l'écran d'accueil** · 3. Ouvrir **At Home depuis l'icône** · 4. Profil → Activer → **Autoriser** |
| Ordinateur (Chrome, Edge, Firefox, Safari macOS) | Fonctionne aussi (pratique pour tester) |

> Sur iPhone, le push Web n'est disponible **que** dans l'application ajoutée à l'écran d'accueil. L'app
> l'explique d'elle-même si ce n'est pas le cas.

---

## 7. Cloud Functions

### 7.1 Configuration

```powershell
cd functions
Copy-Item .env.example .env.at-home-3f2a1    # remplacez par VOTRE ID de projet
```

Éditez `functions/.env.<id-projet>` :

```ini
APP_URL=https://at-home-3f2a1.web.app     # URL publique de l'app, sans « / » final
FUNCTIONS_REGION=europe-west6
```

`APP_URL` sert à construire le lien ouvert au toucher d'une notification.

### 7.2 Déploiement

```bash
npm run build          # compile functions/src → functions/lib
cd ..
firebase deploy --only functions
```

Au **premier** déploiement, Firebase active automatiquement les API nécessaires (Cloud Build, Artifact
Registry, Eventarc, Cloud Run…). Si le déploiement échoue pour cette raison, patientez 2 minutes et relancez.
Si la CLI demande une politique de nettoyage des images de conteneur, acceptez la valeur proposée (1 jour).

| Fonction | Type | Rôle |
|---|---|---|
| `acceptInvitation` | Appelable (HTTPS) | Valide le jeton (statut, expiration 14 jours), vérifie que l'e-mail connecté est bien celui invité, ajoute le membre avec son rôle, lie l'enfant (rôle Proton), prévient l'invitant |
| `onNotificationCreated` | Déclencheur Firestore | Envoie la notification push aux appareils du destinataire (mobile vérifié + notifications activées) et nettoie les jetons expirés |

✅ **Vérification** : console → **Functions** liste les 2 fonctions en `europe-west6`. Les journaux
sont visibles avec `firebase functions:log`.

---

## 8. Tester l'ensemble en local

```bash
npm run dev
```

1. **Inscription** : créez un compte (adresse A) → validez l'e-mail reçu → **Créer l'Atome**.
2. **Enfants** : ajoutez un enfant.
3. **Foyer & invitations** : invitez l'adresse B en rôle **Positron**. Vérifiez la réception de l'e-mail
   « Se connecter à At Home » (pensez aux indésirables).
4. Ouvrez le lien de l'e-mail dans une **fenêtre de navigation privée** :
   - vous êtes connecté·e automatiquement avec l'adresse B ;
   - saisissez prénom, nom, mot de passe → **Rejoindre l'Atome** → page de configuration du foyer.
5. **Profil** (compte B) › **Mobile & notifications** :
   - saisissez un **numéro de test** (`+41 79 000 00 01`) → **Recevoir le code SMS** → `123456` → **Vérifier** ;
   - **Activer les notifications sur cet appareil** → **Autoriser** dans le navigateur.
6. Avec le compte A : sélectionnez des jours → **Attribuer…** → envoyer.
   ➜ Le compte B voit la demande dans la cloche **et** reçoit une notification push.

> En développement local, le push fonctionne sur `http://localhost` (contexte sécurisé). Les Functions
> doivent être **déployées** (étape 7), à moins d'utiliser les émulateurs.

---

## 9. Firebase Hosting (mise en ligne)

### 9.1 Premier déploiement

```bash
npm run build                    # génère dist/ (vérification TypeScript incluse)
firebase deploy --only hosting
```

L'URL s'affiche à la fin : `https://at-home-3f2a1.web.app`.

`firebase.json` est déjà configuré :

- dossier publié `dist`, toutes les routes réécrites vers `index.html` (application monopage) ;
- cache long pour `/assets/**` (fichiers versionnés) ;
- `index.html` et `firebase-messaging-sw.js` **jamais mis en cache** (mises à jour immédiates) ;
- en-têtes de sécurité (`X-Frame-Options`, `nosniff`, `Referrer-Policy`, `Permissions-Policy`).

### 9.2 Domaine personnalisé (facultatif)

1. Console → **Hosting** → **Ajouter un domaine personnalisé** → ex. `athome.votre-domaine.ch`.
2. Ajoutez chez votre registraire (Infomaniak, Hostpoint…) les enregistrements DNS indiqués (TXT puis A).
3. Attendez la génération du certificat SSL (jusqu'à 24 h).
4. Mettez à jour :
   - **Authentication › Domaines autorisés** : ajoutez le domaine (étape 3.3) ;
   - `functions/.env.<id-projet>` : `APP_URL=https://athome.votre-domaine.ch`, puis `firebase deploy --only functions`.

### 9.3 Tout déployer d'un coup (mises à jour suivantes)

```bash
npm run deploy        # = npm run build && firebase deploy (hosting + règles + index + functions)
```

---

## 10. Émulateurs locaux (facultatif, nécessite Java 21+)

```bash
cd functions && npm run build && cd ..
firebase emulators:start
```

Dans `.env.local` : `VITE_USE_EMULATORS=true`, puis `npm run dev`. Interface : <http://127.0.0.1:4000>.

- **Liens e-mail** (invitations, connexion) et **codes SMS** : aucun envoi réel, ils s'affichent dans
  l'onglet **Authentication** de l'interface des émulateurs et dans le terminal. Copiez le lien dans le navigateur.
- **Cloud Messaging** n'est pas émulé : la fonction `onNotificationCreated` s'exécute, mais l'envoi push
  réel nécessite le projet en ligne.

Remettez `VITE_USE_EMULATORS=false` pour travailler sur le projet réel.

---

## 11. Check-list finale

- [ ] Nom public du projet = « At Home »
- [ ] Authentication : E-mail/Mot de passe **et** Lien e-mail activés
- [ ] Authentication : Téléphone activé, région SMS « Suisse » autorisée
- [ ] Modèles d'e-mails en français, nom d'expéditeur « At Home »
- [ ] Domaines autorisés à jour (domaine personnalisé éventuel)
- [ ] Firestore en `europe-west6`, règles et index déployés
- [ ] Forfait Blaze + alerte budgétaire
- [ ] Clé VAPID dans `.env.local` (et dans les secrets GitHub, voir GIT_SETUP.md)
- [ ] `functions/.env.<id-projet>` avec `APP_URL`, functions déployées
- [ ] Application déployée sur Hosting
- [ ] Test de bout en bout (étape 8) réussi en production

---

## Dépannage

| Symptôme | Cause probable | Solution |
|---|---|---|
| Écran « Configuration Firebase manquante » | `.env.local` absent ou incomplet | Étape 2, puis redémarrer `npm run dev` |
| « Cette méthode de connexion n'est pas activée » à l'envoi d'une invitation | Lien e-mail désactivé | Étape 3.1 : activer **Lien e-mail (connexion sans mot de passe)** |
| « Le domaine de retour du lien n'est pas autorisé » | Domaine absent des domaines autorisés | Étape 3.3 |
| L'invité·e ne reçoit pas l'e-mail | Courrier indésirable, faute de frappe | Vérifier les indésirables ; bouton **Renvoyer** dans Foyer & invitations ; SMTP personnalisé (3.4) |
| « Ce lien a déjà été utilisé ou a expiré » | Le lien de connexion est à usage unique et de durée limitée | Sur la page d'invitation : **M'envoyer un nouveau lien de connexion** (l'invitation reste valable 14 jours) |
| « Cette invitation est destinée à … » | Connecté·e avec un autre compte | Bouton **Continuer avec …** ou **Changer de compte** |
| « Invitation introuvable » au moment de rejoindre | Functions non déployées ou région différente | Étape 7 ; `VITE_FIREBASE_FUNCTIONS_REGION` = région des functions |
| `permission-denied` partout | Règles non déployées | `firebase deploy --only firestore:rules` |
| « The query requires an index » | Index en cours de création | Attendre ou `firebase deploy --only firestore:indexes` |
| Code SMS jamais reçu | Région SMS non autorisée, quota, numéro invalide | Étape 3.2 (région CH) ; tester avec un numéro de test |
| « Vérification anti-robot échouée » | reCAPTCHA bloqué (bloqueur de publicité, domaine non autorisé) | Désactiver le bloqueur pour le site ; domaine autorisé (3.3) |
| « Ce numéro est déjà associé à un autre compte » | Le numéro est lié à un autre utilisateur | Utiliser un autre numéro ou le retirer de l'autre compte (console › Authentication › Utilisateurs) |
| Bouton notifications absent / message « clé VAPID manquante » | `VITE_FIREBASE_VAPID_KEY` vide | Étape 6.2 puis rebuild |
| iPhone : « ajoutez l'application à l'écran d'accueil » | Push Web iOS réservé aux apps installées | Étape 6.5 |
| Notifications activées mais rien ne s'affiche | Mobile non vérifié, case décochée, autorisation retirée dans le navigateur | Profil › Mobile & notifications ; `firebase functions:log` (ligne « Notification push envoyée ») |
