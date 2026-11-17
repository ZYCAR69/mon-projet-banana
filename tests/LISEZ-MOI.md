# Testeur automatique du site

Le testeur construit le site avec deux véhicules d'exemple (`fixtures/crm.json`), puis le parcourt comme un visiteur, sur ordinateur et sur téléphone.

## Ce qu'il vérifie

**Cohérence (fichiers)**
- toutes les pages sont construites, fiches véhicule et articles compris ;
- aucun lien interne cassé, aucune image, police ou feuille de style manquante ;
- chaque page a un titre unique, une description et un seul titre principal ;
- aucun reste de gabarit (`{{…}}`, « undefined », « NaN »…) ;
- les tarifs sont les mêmes partout (1 490 € et 1 990 €), aucun ancien tarif ;
- l'adresse e-mail n'est jamais écrite en dur dans le code ;
- plan du site complet, pages de confirmation et d'erreur non indexées ;
- les fiches véhicule ne publient aucune donnée interne.

**Parcours (navigateur)**
- chaque page s'affiche sans erreur de script, sans débordement sur le côté, avec toutes ses images ;
- le menu mène à chaque rubrique, qui s'ouvre en haut de page ;
- bouton d'appel sur téléphone seulement, fenêtre d'itinéraire (Waze, Google Maps) ;
- galerie de l'accueil qui défile ;
- formulaire de contact : champs selon le sujet, champs obligatoires, page de confirmation ;
- recherche : modèles selon la marque, champ libre « Autre », carte d'Europe, budget et puissance ;
- estimation : étapes bloquées tant que les champs manquent, choix rachat ou dépôt-vente conservé ;
- véhicules en vente : grille, badge « Réservé », fiche (photos, plein écran, caractéristiques, rapport, documents) ;
- « Ce véhicule m'intéresse » et « Recevoir ces documents » préremplissent le contact ;
- FAQ qui s'ouvre et se ferme.

## Quand il tourne

À chaque modification envoyée sur GitHub, et chaque lundi matin. Le résultat est dans l'onglet **Actions** du dépôt ; en cas d'échec, GitHub envoie un e-mail et joint un rapport détaillé.

## Le lancer à la main

```bash
cd tests
npm install
npx playwright install chromium
npx playwright test
```
