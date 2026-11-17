"""Pages « Nos véhicules en vente » générées à partir du CRM ZYCAR.

Le CRM fournit, pour chaque véhicule en vente ou réservé, sa fiche publique (caractéristiques, prix,
description, équipements, photos d'annonce, rapport d'état). Ce module télécharge les photos au bon
format, puis écrit la grille des véhicules et une page détaillée par véhicule.
"""
import html
import io
import json
import re
import shutil
import unicodedata
import urllib.request

LARGEUR, HAUTEUR = 1200, 900


def esc(valeur):
    return html.escape(str(valeur if valeur is not None else ""), quote=True)


def slug(texte):
    ascii_ = unicodedata.normalize("NFKD", str(texte)).encode("ascii", "ignore").decode().lower()
    return re.sub(r"[^a-z0-9]+", "-", ascii_).strip("-")[:60]


def nombre(n):
    return "{:,}".format(int(n)).replace(",", " ")


def libelle_stock(a):
    """Même libellé que la liste déroulante du formulaire de contact."""
    texte = " ".join(x for x in (a.get("marque"), a.get("modele"), a.get("version")) if x).strip()[:90]
    if a.get("annee"):
        texte += " ({})".format(a["annee"])
    if a.get("prix"):
        texte += " · {:,} €".format(int(a["prix"])).replace(",", " ")
    return texte


def page_de(a):
    ident = re.sub(r"[^A-Za-z0-9]", "", str(a.get("id", "")))
    return "vehicule-{}-{}.html".format(slug(a.get("titre") or a.get("modele") or "vehicule"), ident[-8:].lower())


def source_autorisee(adresse, demo):
    return adresse.startswith("https://") or (demo and adresse.startswith("file://"))


def telecharger(adresse, sortie, demo=False):
    """Photo d'annonce → WebP 1200 × 900. Renvoie True si la photo est prête."""
    if sortie.exists():
        return True
    if not source_autorisee(str(adresse), demo):
        return False
    try:
        from PIL import Image, ImageOps
        demande = urllib.request.Request(adresse, headers={"User-Agent": "zycar-site"})
        with urllib.request.urlopen(demande, timeout=25) as reponse:
            image = ImageOps.exif_transpose(Image.open(io.BytesIO(reponse.read(20_000_000)))).convert("RGB")
        ImageOps.fit(image, (LARGEUR, HAUTEUR), Image.LANCZOS).save(sortie, quality=82)
        return True
    except Exception as erreur:
        print("Photo d'annonce ignorée :", adresse, erreur)
        return False


def preparer(crm, dossier_assets, demo=False):
    """Télécharge les photos et renvoie les annonces prêtes à afficher (chemins locaux)."""
    cible = dossier_assets / "annonces"
    cible.mkdir(parents=True, exist_ok=True)
    pretes, gardes = [], set()
    for a in (crm or {}).get("annonces", []):
        ident = re.sub(r"[^A-Za-z0-9]", "", str(a.get("id", "")))[:40]
        if not ident:
            continue
        rep = cible / ident
        rep.mkdir(exist_ok=True)
        gardes.add(ident)
        photos = []
        for n, adresse in enumerate(a.get("photos", [])[:30]):
            nom = "{:02d}.webp".format(n)
            if telecharger(adresse, rep / nom, demo):
                photos.append("assets/annonces/{}/{}".format(ident, nom))
        defauts = []
        for k, d in enumerate(a.get("rapport", {}).get("defauts", [])):
            vues = []
            for n, adresse in enumerate(d.get("photos", [])[:4]):
                nom = "d{:02d}-{}.webp".format(k, n)
                if telecharger(adresse, rep / nom, demo):
                    vues.append("assets/annonces/{}/{}".format(ident, nom))
            defauts.append(dict(d, photos=vues))
        rapport = dict(a.get("rapport", {}), defauts=defauts)
        pretes.append(dict(a, photos=photos, rapport=rapport, page=page_de(a), stock=libelle_stock(a)))
    for ancien in cible.iterdir():
        if ancien.name not in gardes:
            shutil.rmtree(ancien, ignore_errors=True)
    return pretes


def resume(a):
    morceaux = [a.get("annee"), "{} km".format(nombre(a["km"])) if a.get("km") is not None else None, a.get("carburant"), a.get("boite")]
    return " · ".join(str(x) for x in morceaux if x)


def prix(a):
    return "{} €".format(nombre(a["prix"])) if a.get("prix") else "Prix sur demande"


# ---------- Grille de la page Acheter ----------

def grille(annonces):
    if not annonces:
        return ""
    cartes = []
    for a in annonces:
        image = ('<img src="{}" alt="{}" width="1200" height="900" loading="lazy">'.format(esc(a["photos"][0]), esc(a["titre"]))
                 if a["photos"] else '<span class="annonce-carte__vide" aria-hidden="true">ZYCAR</span>')
        badge = '<span class="annonce-badge">Réservé</span>' if a.get("statut") == "reserve" else ""
        cartes.append('''        <a class="carte annonce-carte r" href="{page}">
          <span class="annonce-carte__image">{image}{badge}</span>
          <span class="annonce-carte__corps">
            <h3>{titre}</h3>
            <span class="annonce-carte__resume">{resume}</span>
            <span class="annonce-carte__bas"><b class="annonce-carte__prix">{prix}</b><span class="annonce-carte__lien">Voir le détail <span class="fleche" aria-hidden="true">→</span></span></span>
          </span>
        </a>'''.format(page=esc(a["page"]), image=image, badge=badge, titre=esc(a["titre"]), resume=esc(resume(a)), prix=esc(prix(a))))
    return '''  <section class="section section--serree" id="en-vente">
    <div class="cadre">
      <div class="tete">
        <p class="pastille r">En vente</p>
        <h2 class="r" style="--d:.08s">Nos véhicules <span class="degrade">disponibles.</span></h2>
        <p class="chapeau r" style="--d:.16s">Photos, caractéristiques, équipements et rapport d'état : cliquez sur un véhicule pour tout voir.</p>
      </div>
      <div class="annonces">
{cartes}
      </div>
    </div>
  </section>
'''.format(cartes="\n".join(cartes))


# ---------- Page détaillée ----------

def caracteristiques(a):
    lignes = [
        ("Mise en circulation", "{}/{}".format(a["mise_en_circulation"][5:7], a["mise_en_circulation"][:4]) if a.get("mise_en_circulation") else a.get("annee")),
        ("Kilométrage", "{} km".format(nombre(a["km"])) if a.get("km") is not None else None),
        ("Énergie", a.get("carburant")),
        ("Boîte de vitesses", a.get("boite")),
        ("Puissance", "{} ch".format(a["puissance_ch"]) if a.get("puissance_ch") else None),
        ("Puissance fiscale", "{} CV".format(a["puissance_fiscale"]) if a.get("puissance_fiscale") else None),
        ("Cylindrée", "{} cm³".format(nombre(a["cylindree"])) if a.get("cylindree") else None),
        ("Carrosserie", a.get("carrosserie")),
        ("Couleur", a.get("couleur")),
        ("Portes", a.get("portes")),
        ("Places", a.get("places")),
        ("Norme Euro", a.get("norme_euro")),
        ("Émissions de CO2", "{} g/km".format(a["co2"]) if a.get("co2") is not None else None),
        ("Clés", a.get("cles")),
    ]
    return "\n".join('            <div><dt>{}</dt><dd>{}</dd></div>'.format(esc(t), esc(v)) for t, v in lignes if v not in (None, ""))


def bloc_galerie(a):
    if not a["photos"]:
        return '<div class="fiche-galerie fiche-galerie--vide"><span>Photos bientôt disponibles</span></div>'
    vignettes = "".join(
        '<button type="button" class="fiche-vignette{}" data-index="{}" aria-label="Photo {}"><img src="{}" alt="" width="1200" height="900" loading="lazy"></button>'.format(
            " actif" if n == 0 else "", n, n + 1, esc(p)) for n, p in enumerate(a["photos"]))
    return '''<div class="fiche-galerie" data-galerie-annonce>
          <div class="fiche-galerie__principale">
            <img src="{premiere}" alt="{titre}" width="1200" height="900" data-principale>
            <button type="button" class="fiche-galerie__fleche fiche-galerie__fleche--prec" data-prec aria-label="Photo précédente">‹</button>
            <button type="button" class="fiche-galerie__fleche fiche-galerie__fleche--suiv" data-suiv aria-label="Photo suivante">›</button>
            <button type="button" class="fiche-galerie__agrandir" data-agrandir aria-label="Agrandir">⤢</button>
            <span class="fiche-galerie__compteur" data-compteur>1 / {total}</span>
          </div>
          <div class="fiche-galerie__vignettes">{vignettes}</div>
        </div>'''.format(premiere=esc(a["photos"][0]), titre=esc(a["titre"]), total=len(a["photos"]), vignettes=vignettes)


def bloc_rapport(a):
    r = a.get("rapport") or {}
    defauts, conformes = r.get("defauts", []), r.get("conformes", [])
    if not defauts and not conformes and not r.get("remarque"):
        return ""
    date = ""
    if r.get("date"):
        j = r["date"][:10].split("-")
        date = " le {}/{}/{}".format(j[2], j[1], j[0]) if len(j) == 3 else ""
    puces = '<span class="rapport-puce rapport-puce--ok">{} point{} conforme{}</span>'.format(len(conformes), "s" if len(conformes) > 1 else "", "s" if len(conformes) > 1 else "")
    puces += ('<span class="rapport-puce rapport-puce--defaut">{} défaut{} signalé{}</span>'.format(len(defauts), "s" if len(defauts) > 1 else "", "s" if len(defauts) > 1 else "")
              if defauts else '<span class="rapport-puce rapport-puce--ok">Aucun défaut signalé</span>')
    cartes = []
    for n, d in enumerate(defauts, 1):
        vues = "".join('<button type="button" class="rapport-photo" data-zoom="{0}"><img src="{0}" alt="Défaut : {1}" width="1200" height="900" loading="lazy"></button>'.format(esc(p), esc(d.get("point"))) for p in d.get("photos", []))
        cartes.append('<article class="rapport-defaut"><h4>{}. {}</h4>{}{}</article>'.format(
            n, esc(d.get("point")), '<p>{}</p>'.format(esc(d["note"])) if d.get("note") else "", '<div class="rapport-photos">{}</div>'.format(vues) if vues else ""))
    ok = ""
    if conformes:
        ok = '<details class="rapport-ok"><summary>Voir les {} points contrôlés sans défaut</summary><ul>{}</ul></details>'.format(
            len(conformes), "".join("<li>{}</li>".format(esc(c)) for c in conformes))
    return '''      <section class="fiche-bloc r" id="rapport">
        <h2>Rapport d'état</h2>
        <p class="fiche-bloc__sous">Contrôle réalisé par ZYCAR{date}. Nous vous montrons tout, défauts compris.</p>
        <div class="rapport-puces">{puces}</div>
        {remarque}
        {defauts}
        {ok}
      </section>'''.format(date=esc(date), puces=puces, remarque='<p class="rapport-remarque">{}</p>'.format(esc(r["remarque"])) if r.get("remarque") else "",
                           defauts='<div class="rapport-defauts">{}</div>'.format("".join(cartes)) if cartes else "", ok=ok)


def bloc_equipements(a):
    eq = a.get("equipements") or []
    if not eq:
        return ""
    plie = len(eq) > 24
    liste = "".join("<li>{}</li>".format(esc(e)) for e in eq)
    if plie:
        contenu = '<ul class="fiche-equipements">{}</ul>'.format("".join("<li>{}</li>".format(esc(e)) for e in eq[:24]))
        contenu += '<details class="fiche-plus"><summary>Voir les {} équipements</summary><ul class="fiche-equipements">{}</ul></details>'.format(len(eq), "".join("<li>{}</li>".format(esc(e)) for e in eq[24:]))
    else:
        contenu = '<ul class="fiche-equipements">{}</ul>'.format(liste)
    return '      <section class="fiche-bloc r"><h2>Équipements et options</h2>{}</section>'.format(contenu)


def date_fr(iso):
    j = (iso or "")[:10].split("-")
    return "{}/{}/{}".format(j[2], j[1], j[0]) if len(j) == 3 else ""


def bloc_documents(a):
    """Pièces disponibles sur demande (carnet, factures, expertise, CT). Les fichiers ne sont jamais publiés."""
    docs = a.get("documents") or []
    if not docs:
        return ""
    cartes = "".join(
        '<li class="fiche-doc"><span class="fiche-doc__icone" aria-hidden="true"><svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="1.800" stroke-linecap="round" stroke-linejoin="round"><path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z"/><path d="M14 3v5h5M9 13h6M9 17h4"/></svg></span>'
        '<span><b>{}</b><small>{}</small></span></li>'.format(esc(d.get("piece")), esc("Disponible" + (" · " + date_fr(d["date"]) if d.get("date") else "")))
        for d in docs)
    pieces = ", ".join(d.get("piece", "").lower() for d in docs)
    return '''      <section class="fiche-bloc r" id="documents">
        <h2>Documents du véhicule</h2>
        <p class="fiche-bloc__sous">Ces pièces sont disponibles. Nous vous les envoyons sur simple demande, les informations personnelles des anciens propriétaires masquées.</p>
        <ul class="fiche-docs">{cartes}</ul>
        <p><a class="bouton bouton--verre" href="contact.html" data-vehicule="{stock}" data-documents="{pieces}">Recevoir ces documents <span class="fleche" aria-hidden="true">→</span></a></p>
      </section>'''.format(cartes=cartes, stock=esc(a["stock"]), pieces=esc(pieces))


def donnees_structurees(a, domaine):
    car = {
        "@context": "https://schema.org", "@type": "Car", "name": a["titre"], "brand": {"@type": "Brand", "name": a.get("marque")},
        "model": a.get("modele"), "vehicleConfiguration": a.get("version") or None,
        "mileageFromOdometer": {"@type": "QuantitativeValue", "value": a.get("km"), "unitCode": "KMT"} if a.get("km") is not None else None,
        "fuelType": a.get("carburant"), "vehicleTransmission": a.get("boite"), "color": a.get("couleur"),
        "productionDate": a.get("annee"), "image": [domaine + "/" + p for p in a["photos"][:5]],
        "offers": {"@type": "Offer", "price": a.get("prix"), "priceCurrency": "EUR",
                   "availability": "https://schema.org/LimitedAvailability" if a.get("statut") == "reserve" else "https://schema.org/InStock",
                   "seller": {"@type": "AutoDealer", "name": "ZYCAR"}} if a.get("prix") else None,
    }
    car = {k: v for k, v in car.items() if v not in (None, "", [])}
    return json.dumps(car, ensure_ascii=False).replace("</", "<\\/")


def page(a, domaine):
    """Contenu de la page détaillée, au format des pages de src/pages (en-têtes titre et description)."""
    titre_page = "{} – {} | ZYCAR".format(a["titre"], prix(a))
    description = "{} : {}. {}. Photos, équipements et rapport d'état. ZYCAR, près de Villefranche-sur-Saône.".format(a["titre"], resume(a), prix(a))
    reserve = a.get("statut") == "reserve"
    leboncoin = ('<a class="bouton bouton--verre" href="{}" target="_blank" rel="noopener">Voir l\'annonce Leboncoin</a>'.format(esc(a["leboncoin"])) if a.get("leboncoin") else "")
    historique = '      <section class="fiche-bloc r"><h2>Historique</h2><p class="fiche-texte">{}</p></section>'.format(esc(a["historique"])) if a.get("historique") else ""
    description_bloc = '      <section class="fiche-bloc r"><h2>Description</h2><p class="fiche-texte">{}</p></section>'.format(esc(a["description"])) if a.get("description") else ""
    corps = '''<!-- titre: {titre_page} -->
<!-- description: {description} -->

  <section class="fiche">
    <div class="cadre">
      <p class="article__fil r"><a href="vehicules.html#en-vente">← Tous nos véhicules en vente</a></p>
      <div class="fiche-haut">
        {galerie}
        <div class="fiche-infos r">
          {badge}
          <h1>{titre}</h1>
          <p class="fiche-resume">{resume}</p>
          <p class="fiche-prix">{prix}</p>
          <div class="fiche-actions">
            <a class="bouton" href="contact.html" data-vehicule="{stock}">{cta} <span class="fleche" aria-hidden="true">→</span></a>
            <a class="bouton bouton--verre" href="tel:+33783198821">Appeler le 07 83 19 88 21</a>
            {leboncoin}
          </div>
          <ul class="liste fiche-garanties">
            <li>Véhicule contrôlé, rapport d'état ci-dessous</li>{garantie_docs}
            <li>Immatriculé en France, démarches faites</li>
            <li>Essai sur rendez-vous à Saint-Georges-de-Reneins</li>
          </ul>
        </div>
      </div>

      <section class="fiche-bloc r">
        <h2>Caractéristiques</h2>
        <dl class="fiche-carac">
{carac}
        </dl>
      </section>
{description_bloc}
{historique}
{equipements}
{rapport}
{documents}

      <div class="carte appel r" style="margin-top:28px">
        <div>
          <h3>{titre}</h3>
          <p>{prix} · Essai sur rendez-vous. Reprise de votre véhicule possible.</p>
        </div>
        <div class="appel__actions">
          <a class="bouton" href="contact.html" data-vehicule="{stock}">{cta} <span class="fleche" aria-hidden="true">→</span></a>
          <a class="bouton bouton--verre" href="vendre.html#estimation">Faire estimer ma reprise</a>
        </div>
      </div>
    </div>
  </section>
  <script type="application/ld+json">{ld}</script>
'''.format(titre_page=esc(titre_page), description=esc(description), galerie=bloc_galerie(a),
           badge='<p class="annonce-badge annonce-badge--fiche">Réservé</p>' if reserve else "",
           titre=esc(a["titre"]), resume=esc(resume(a)), prix=esc(prix(a)), stock=esc(a["stock"]),
           cta="Être prévenu s'il se libère" if reserve else "Ce véhicule m'intéresse", leboncoin=leboncoin,
           carac=caracteristiques(a), description_bloc=description_bloc, historique=historique,
           equipements=bloc_equipements(a), rapport=bloc_rapport(a), documents=bloc_documents(a), ld=donnees_structurees(a, domaine),
           garantie_docs=('\n            <li>{} disponible{}</li>'.format(esc(", ".join(d["piece"] for d in a["documents"][:2])), "s" if len(a["documents"][:2]) > 1 else "")
                          if a.get("documents") else ""))
    return corps
