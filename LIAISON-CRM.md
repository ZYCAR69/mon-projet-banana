# Liaison entre le site zycar.fr et le CRM ZYCAR

Le site et le CRM échangent dans les deux sens :

1. **Demandes du site → CRM** : chaque formulaire envoyé (contact, recherche, estimation) crée ou complète une fiche client (origine « site internet »), note la demande dans l'historique et ajoute une tâche « Rappeler » pour le lendemain.
2. **Stock du CRM → site** : les véhicules au statut « en vente » remplissent la liste déroulante des formulaires, avec leur prix affiché.
3. **Véhicules vendus → galerie** : les véhicules vendus dont l'annonce a été publiée s'ajoutent à la galerie, après les photos du dossier `galerie/`.

Quand un véhicule change de statut dans le CRM (en vente, réservé, vendu, livré), le CRM relance la construction du site, qui se met à jour en une à deux minutes.

## Mise en service (le jour de la mise en ligne)

Trois secrets à créer, chacun une longue suite de caractères aléatoires. Ils ne doivent jamais être écrits dans le code, ni envoyés par e-mail ou dans une conversation.

| Secret | Où le coller |
| --- | --- |
| Secret de signature des demandes | Netlify (notification de formulaire) **et** CRM : `SITE_WEBHOOK_SECRET` |
| Jeton de lecture du stock | Netlify (variable `CRM_EXPORT_TOKEN`) **et** CRM : `SITE_EXPORT_TOKEN` |
| Adresse de reconstruction du site | CRM : `NETLIFY_BUILD_HOOK` (fournie par Netlify) |

### Dans Netlify

1. **Variables du site** (Site configuration → Environment variables) :
   - `CRM_URL` : l'adresse du CRM, par exemple `https://zycar-crm.base44.app`
   - `CRM_EXPORT_TOKEN` : le jeton de lecture du stock
2. **Notification des formulaires** (Forms → Form notifications → Outgoing webhook), pour chaque formulaire (`demande`, `contact`, `recherche`, `estimation`) :
   - adresse : `https://<adresse du CRM>/api/site/demande`
   - « JWS secret token » : le secret de signature des demandes
3. **Adresse de reconstruction** (Build & deploy → Build hooks → Add build hook) : copier l'adresse obtenue.

### Dans le CRM (Base44)

Dans les secrets de l'application, créer `SITE_WEBHOOK_SECRET`, `SITE_EXPORT_TOKEN` et `NETLIFY_BUILD_HOOK` avec les valeurs ci-dessus, puis publier le CRM.

### Vérifier

- Envoyer une demande de test depuis le site : une fiche « Contact site » doit apparaître dans le CRM avec une tâche « Rappeler ».
- Passer un véhicule en « En vente » dans le CRM : après une à deux minutes, il doit apparaître dans la liste du formulaire de contact.

## Sans la liaison

Tant que `CRM_URL` et `CRM_EXPORT_TOKEN` ne sont pas renseignés, ou si le CRM ne répond pas, le site utilise `stock.txt` et le dossier `galerie/`. Les demandes continuent d'arriver par e-mail.
