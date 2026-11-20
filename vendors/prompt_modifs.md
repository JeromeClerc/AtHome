# Modifications

## Répartition des jours par année
- Je ne comprends pas les calculs :
  - Jours-enfants-totaux
    - 732 jours, alors qu'une année ne compte que 365/366 jours ?
    - N'aditionne pas les jours pour chaque enfant. Tiens compte d'une moyenne de tous les enfants de l'atome.
    - Affiche le calcul uniquement sur le nombre de jours de l'année 365/366 jours pour les années bissextile.
  - Vacances scolaires
    - Il n'y a pas 216 jours de vacances scolaire.
    - N'aditionne pas les jours pour chaque enfant. Tiens compte d'une moyenne de tous les enfants de l'atome.
    - Affiche le calcul uniquement sur le total du nombre de jours de vacances scolaire dans l'année.
  - Jours fériérs
    - Il n'y a pas 18 jours fériérs.
    - N'aditionne pas les jours pour chaque enfant. Tiens compte d'une moyenne de tous les enfants de l'atome.
    - Affiche le calcul uniquement sur le total du nombre de jours fériérs dans l'année.
  - Week-ends
    - Il n'y a pas 212 jours de week-end.
    - N'aditionne pas les jours pour chaque enfant. Tiens compte d'une moyenne de tous les enfants de l'atome.
    - Affiche le calcul uniquement sur le total du nombre de jours de week-end dans l'année.
  - Fêtes majeures
    - Noël
      - Tiens compte du 24 et 25 décembre.
        - Si les deux jours sont attribués au même foyer, affiche le foyer en question.
        - Si un des jour est attribué à un foyer et l'autre jour attribué à l'autre foyer, affiche les deux
    - Nouvel An
      - Tiens compte du 31.12 et 01.01
    
## Générateur de planning
Revoyons ensemble les méthodes de calcul automatique du planning pour le mode de répartition par défaut 50/50 (semaine A/semaine B).

Le principe de base est le suivant :
- Le domicile légale des filles et celui du parent positron (Mont-la-Ville)
- Pour entamer ma semaine de garde, je récupère les filles à la sortie de l'école le lundi, les gardent pour la semaine et le week-end et je les dépose à l'école le lundi matin suivant.

- La loi Suisse accepte l'alternance une semaine sur deux, mais il faut tenir des éléments suivants :
  - Chaque parents doit pouvoir profiter de 50% des jours de vacances scolaires.
  - Chaque parents doit pouvoir profiter de 50% des jours fériés.
  - Une alternance une année sur deux pour les fêtes de Pâques, Noël et Nouvel An.

- Pour déterminer quels jours sont attribués à quel parent, nous allons faire le calcul en plusieurs temps :
  - Le parent électron (créateur de l'atome) sélectionne la date de départ du calcul (sa 1ère semaine de garde).

  ### Phase 1 - Répartition de base.
  - De cette date, le générateur calcul l'alternance une semaine sur deux sans tenir compte des vacances scolaire, jours fériés ou fêtes majeurs.
  
  ### Phase 2 - Répartition des vacances scolaires.
  - Si la période de vacances scolaire est de 1 jours à 1 semaine :
    - Ne pas modifier. On suis la répartition de la phase 1 et ça tombe comme ça tombe, à chaque parent de s'en accomoder.
  - Si la période de vacances scolaire est de 1 semaine à 2 semaines :
    - Ne pas modifier. Normalement, l'alternance de base une semaine sur deux règles automatiquement le cas.
  - Si la période de vacances scolaire est supérieure à 2 semaines (vacances d'été) :
    - Sans modifier la répartition de la phase 1, complète les semaines pour créer un minimum de blocs pour éviter les déplacements intempestifs. 
  
  ### Phase 3 - Jours fériés.
  - Jeudi de l'Ascension + pont du vendredi :
    - Attribuer ce fériés au parent en charge cette semaine là.
  - Lundi de Pentecôte :
    - Attribuer ce fériés au parent qui était en charge le week-end directement précédent.
  - Le 1er août :
    - Attribuer ce fériés au parent en charge cette semaine là.
  - Lundi du Jeûne Fédéral :
    - Attribuer ce fériés au parent qui était en charge le week-end directement précédent.
  
  ### Phase 4 - Fêtes majeures.
  - Fériés et week-end de Pâques :
    - Intervertis les semaines de vacances scolaire, si nécessaire, pour que le parent 1 soit en charge les fériés et week-end de Pâques les années paires et que le parent 2 soit en charge les années impaires, par exemple.
    - Si l'alternance de la Phase 1 correspond à cette répartition, ne modifie rien.
  - Noël & Nouvel An :
    - Gère les vacances scolaire de la période couvrant Noël et Nouvel An en deux blocs égaux de sorte à ce que :
      - le parent 1 soit en charge le 24 et 25 décembre les années paires et le parent 2 soit en charge le 31.12 et 01.01 les années paires.
      - le parent 2 soit en charge le 24 et 25 décembre les années impaires et le parent 1 soit en charge le 31.12 et 01.01 les années impaires.

- De manière générale, génère des blocs de prise en charge les plus grands possibles. Dans le sens que chaque changement de foyers, s'il ne s'effectue pas lors des périodes où les filles sont à l'école, nécessite des trajets et des points de rencontre, qui potentiellement peuvent créer des disputes logistique entre parents.
- Ne cherche pas à atteindre un 50% de part et d'autre parfait pour chaque année. Si une année un parent est en charge de 51% et l'autre 49%, il y a fort à parier qu'une autre année vera un score 49%/51% ce qui équilibre le tout au fil des ans.
- Une fois le nouveau planning généré, il est toujours possible de demander des modifications ponctuelles avec le flux déjà en place : Demande parent A -> Validation / Refus parent B etc...

### Directive a respecter strictement
Comme mis en place, précédemment, lors de la regénération du planning, il est impératif de :
- Ne pas perdre les modifications ponctuelles qui sont en cours et pas encore validées.
- Ne pas modifier les modifications ponctuelles qui ont déjà été validées.

## Documentation
Précédemment, nous avons ajouté une page "Aide" qui explique le fonctionnement de l'application. Complète cette documentation en expliquant la méthode de génération du planning. Que tout le monde puisse comprendre comment les jours sont répartis, afin d'éviter les conflits entre parents qui pourraient reprocher à l'autre d'avoir établi un planning à sa seule convenance. 

## Livraison
- L'application prête pour npm run build et déploiement sur Firebase.