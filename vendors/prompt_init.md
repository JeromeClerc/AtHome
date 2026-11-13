En tant que prompt engineer, aide moi à rédiger un prompt destiné à Google Antigravity IDE et le plugin Claude Code pour créer une application web, de type Saas, de zéro.

- Crée cette application dans le dossier courant : D:\Takk\App\AtHome 
- Le nom de cette application est : At Home
- L'application doit être créée en français
- L'application doit être responsive
- Utilise les technologies suivantes :
    - Framework: React.js
    - Language: TypeScript
    - Styling: Tailwind CSS
    - Database: Firebase
    
- Soit organisé, met les fichiers dans les dossiers appropriés
- Sois modulaire, crée des composants réutilisables
- Sois propre, utilise les meilleures pratiques de développement
- Sois moderne, utilise les dernières fonctionnalités de React.js et TypeScript
- Sois sécurisé, utilise les meilleures pratiques de sécurité
- Sois performant, optimise le code pour qu'il soit rapide
- Sois maintenable, crée un code facile à maintenir
- Sois testable, crée un code facile à tester
- Sois documenté, documente le code pour qu'il soit facile à comprendre

# Firebase
Firebase accueillera les fonctionnalités suivantes :
- Login utilisateur par e-mail + mot de passe.
- Invitation d'utilisateurs par e-mail avec une URL et token pour intégrer directement au bon atome.
- Base de données temps réel pour stocker les données.
- Envoi de notifications sur le téléphone des utilisateurs (par le numéro de téléphone)
- L'hébergement de l'application.

# Alternance
Cette application doit permettre à deux parents séparés/divorcés à gérer l'alternance de la garde de leurs enfants.
Demander des modifications ponctuelles, qui doivent être validées par l'autre parent.
Afficher le nombre de jours où les enfants sont chez l'un ou chez l'autre parent.
Afficher le nombre de jours fériés ou de vacances scolaires où les enfants sont chez l'un ou chez l'autre parent.

## Fonctionnalités

### Principes fondateurs
Un des parents initie le processus. Il arrive sur une page initiale qui lui permet 
- De se créer un compte
- De se connecter à son compte s'il en a déjà un.

Une fois que le parent initial à créé et validé son compte, il peut créer un "Atome" (jeu de mot entre "atome" la particule et l'anglais "at home" à la maison).

Les entités et rôles dans l'applications sont appelés et structurés comme les constituant d'un atome.
- Atome = l'entité générale. Elle peut être baptisée et servir d'identifiant pour générer un slug pour l'URL et que diverses personnes puissent utiliser ce Saas en toute indépendance.
  - Electron = le foyer 1 (du parent initiant)
  - Positron = le foyer 2 (de l'autre parent)
  - Protons = chaque proton est un des enfants.
  - Neutrons = N'importe quel intervenants neutre (avocat, médiateur, etc...). Ils ne peuvent que consulter le planning.

Une fois que le parent initiant à créé l'atome et l'électron (son foyer). Il peut :
- Créer le positron (l'autre foyer).
- Générer le planing initial en définissant l'alternance entre l'électron et le positron.
- Inviter l'autre parent (positron) grâce à son adresse email.
- Créer les protons
- Inviter neutrons de son choix.

Une fois que le positron à cliqué sur le lien d'invitation :
- Il saisi ses données et mot de passe pour terminer son compte
- Est redirigé sur la page de configuration de son foyer. 
- Il peut neutrons de son choix.

### Création de profils pour les enfants.
- Créer autant d'enfants que nécessaire.
- Définir leur nom, prénom, âge, sexe et en option, e-mail, numéro de mobile.
- Les données des enfants peuvent être modifiés par les deux parents jusqu'à leur majorité. Après, les données leur appartiennent.

### Génération du planning
- Générer un planning d'alternance (ex: semaine A / semaine B) pour chaque enfant de manière automatique pour une période donnée.
- Si un jours fériés succède ou précède directement un week-end, il est attribué au parent qui est en charge du week-end concerné.
- Le planning généré doit être consultable en ligne par les deux parents (desktop & smartphone).
- Il doit être possible de sélectionner un/des jours du planning est d'attribuer la sélection à un des parents. Même à soi même.
- Il doit être possible d'ajouter une note à un / des jours. Une texte libre.
- Aucune modification du planning ne peut être enregistrée immédiatement.
  - Une modification est sauvée temporairement et une notification est envoyée à l'autre parent qui doit approuver la modification.
  - La modification est marquée avec un statut : en attente de validation et identifiée visuellement (couleur, transparence, autre)
  - La modification n'est enregistrée et définitive que lorsque l'autre parent a approuvé la modification.
  - Si la modification peut être modifiée ou rejetée par l'autre parent.
  - Si elle est modifiée, l'autre parent est notifié et doit valider ou modifier et ainsi de suite.
  - Si elle est rejetée, le parent qui rejet doit justifier le rejet et l'autre parent est notifié et doit revoir sa proposition.
- Le planning doit être parfaitement lisible avec une distinction net entre.
  - Les jours de la semaine (lundi à vendredi).
  - Le week-end (samedi et dimanche).
  - Les jours fériers du canton de résidence (ici Vaud).
  - Les jours de vacances scolaires (canton de Vaud).
  - Les jours qui comporte une note et identifier qui a rédiger la note selon un code couleur (père, mère, enfants, autre).
  - Les jours de garde standard et ceux en attente de validation.

## UI / UX
- Le design doit être moderne, épuré et facile à utiliser.
- Le design doit être responsive et s'adapter à tous les écrans (desktop, tablette, smartphone).
- Le design doit être sobre et fonctionnel, prévoi un mode sombre.
- Localiser les placeholder en Suisse (adresse, numéro de téléphone, etc...)

### Mise en page générale
- Une entête avec un logo "At Home" que tu peux créer sur la gauche.
  - Le logo représente un mélange en l'illustration classique d'un atome.
  - Une maison stylisée.
  - Dans la maison, deux enfants stylisés.
- Un menu sur la droite pour accéder aux différentes pages.
- Un avatar de la personne connectée à gauche du menu principal.
- Un indicateur de notification à gauche de l'avatar de la personne connectée.
  - En cliquant sur l'icône des notifications, un menu affichant :
    - Les tranches de planing modifié à validé.
    - Les notes ajoutées par l'autre parent.
- Un petit footer avec des informations sur l'application.

### Page d'accueil
Un dashboard qui affiche :
- En petit, les stats des jours passés dans un foyer et dans l'autre.
- Principalement :
  - Le planning d'alternance.
    - Une navigation pour se déplacer de 
    - jour en jour (en avant et en arrière)
    - semaine en semaine (en avant et en arrière)
    - mois en mois (en avant et en arrière)
    - Année en année (en avant et en arrière)
    - De quoi afficher le planing par :
      - Semaine
      - Mois
      - Année

### Page de gestion des données personnelles
- Prévoi une page pour gérer ces données personnelles. Chaque utilisateurs connectés peut éditer ses propres données.
  - Nom
  - Prénom
  - Adresse email
  - Numéro de téléphone

### Page de gestion des enfants (protons)
- Prévoi une page de gestion des enfants (ajouter/supprimer/editer)
  - Nom
  - Prénom
  - Date de naissance
  - Genre

## Données
- Les données doivent être stockées dans Firebase.
- Les données doivent être synchronisées en temps réel.
- L'application est hébergée sur Firebase.

## Livraison
- Le projet complet, prêt à être build et deploy.
- Des markdown qui explique pas à pas comment configurer Firebase.
- Des markdown qui explique pas à pas comment configurer Git.