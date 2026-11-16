#!/usr/bin/env python3
"""Assemble le site ZYCAR : chaque fichier de src/pages reçoit l'en-tête, le menu et le pied de page communs.

    python3 build.py            -> écrit le site dans site/
    python3 build.py DOSSIER    -> écrit une copie d'aperçu (envoi des formulaires désactivé)
"""
import datetime, json, pathlib, re, shutil, sys, unicodedata

RACINE = pathlib.Path(__file__).parent
DOMAINE = "https://www.zycar.fr"
DONNEES = {
    "@context": "https://schema.org", "@type": "AutoDealer", "name": "ZYCAR", "url": DOMAINE + "/",
    "logo": DOMAINE + "/assets/favicon-512.png", "image": DOMAINE + "/assets/partage.jpg",
    "telephone": "+33783198821",
    "description": "Vente de véhicules en stock, import sur mandat depuis l'Allemagne, rachat et dépôt-vente.",
    "address": {"@type": "PostalAddress", "addressLocality": "Saint-Georges-de-Reneins", "postalCode": "69830",
                "addressRegion": "Auvergne-Rhône-Alpes", "addressCountry": "FR"},
    "areaServed": ["Villefranche-sur-Saône", "Lyon", "Rhône", "France"],
    "sameAs": ["https://www.instagram.com/zycar.fr/", "https://www.tiktok.com/@zycar.fr",
               "https://www.leboncoin.fr/boutique/6770880/zycar.htm"],
}
HORS_INDEX = ("merci.html", "404.html")
MENU = [("vehicules.html", "Acheter"), ("import.html", "Importer"), ("vendre.html", "Vendre"), ("galerie.html", "Galerie"),
        ("blog.html", "Blog"), ("a-propos.html", "À propos"), ("contact.html", "Contact")]

GABARIT = """<!DOCTYPE html>
<html lang="fr">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<title>{titre}</title>
<meta name="claude:viewport-fit-sides" content="cover">
<meta name="description" content="{description}">
<link rel="canonical" href="{url}">
<link rel="icon" type="image/png" sizes="32x32" href="assets/favicon-32.png">
<link rel="apple-touch-icon" href="assets/favicon-180.png">
<meta name="theme-color" content="#04060a">
<meta property="og:type" content="website">
<meta property="og:site_name" content="ZYCAR">
<meta property="og:locale" content="fr_FR">
<meta property="og:title" content="{titre}">
<meta property="og:description" content="{description}">
<meta property="og:url" content="{url}">
<meta property="og:image" content="{partage}">
<meta property="og:image:width" content="1200">
<meta property="og:image:height" content="630">
<meta name="twitter:card" content="summary_large_image">
{robots}<script type="application/ld+json">{donnees}</script>
<link rel="stylesheet" href="assets/style.css">
</head>
<body{univers}>
<span id="haut" tabindex="-1" style="position:absolute;top:0;left:0;width:1px;height:1px;outline:0"></span>

<header class="entete">
  <div class="cadre">
    <div class="entete__barre">
      <a class="entete__logo" href="index.html" aria-label="ZYCAR, accueil">
        <img src="assets/logo-zycar.webp" alt="ZYCAR" width="720" height="232">
      </a>
      <nav class="nav" id="nav" aria-label="Navigation principale">
{menu}
      </nav>
      <a class="bouton entete__tel" href="tel:+33783198821">07 83 19 88 21</a>
      <button class="menu-btn" id="menu-btn" type="button" aria-label="Ouvrir le menu" aria-expanded="false" aria-controls="nav"><span></span></button>
    </div>
  </div>
</header>

<main id="accueil">
{contenu}</main>

<footer class="pied">
  <div class="cadre">
    <div class="pied__carte">
      <div class="pied__carte-texte">
        <h3>Nous trouver</h3>
        <p>Saint-Georges-de-Reneins (69), près de Villefranche-sur-Saône, au nord de Lyon.</p>
        <p>Accueil sur rendez-vous.</p>
        <div class="appel__actions">
          <a class="bouton" href="https://www.google.com/maps/search/?api=1&amp;query=ZYCAR+Saint-Georges-de-Reneins" target="_blank" rel="noopener" data-itineraire>Itinéraire <span class="fleche" aria-hidden="true">→</span></a>
          <a class="bouton bouton--verre" href="tel:+33783198821">Prendre rendez-vous</a>
        </div>
      </div>
      <div class="pied__carte-cadre" id="carte">
        <button class="bouton bouton--verre" type="button" id="carte-btn">Afficher la carte</button>
      </div>
    </div>
    <div class="pied__grille">
      <div>
        <img src="assets/logo-zycar.webp" alt="ZYCAR" width="720" height="232">
        <p>Achat, import et dépôt-vente de véhicules.</p>
        <a class="badge-google" href="https://share.google/V1jGb4gd2XNNTgvDA" target="_blank" rel="noopener" aria-label="Voir les avis ZYCAR sur Google"><svg viewBox="0 0 48 48" width="26" height="26" aria-hidden="true"><path fill="#EA4335" d="M24 9.500c3.540 0 6.710 1.220 9.210 3.600l6.850-6.850C35.900 2.380 30.470 0 24 0 14.620 0 6.510 5.380 2.560 13.220l7.980 6.190C12.430 13.720 17.740 9.500 24 9.500z"/><path fill="#4285F4" d="M46.980 24.550c0-1.570-.150-3.090-.380-4.550H24v9.020h12.940c-.580 2.960-2.260 5.480-4.780 7.180l7.730 6c4.510-4.180 7.090-10.360 7.090-17.650z"/><path fill="#FBBC05" d="M10.530 28.590c-.480-1.450-.760-2.990-.760-4.590s.270-3.140.760-4.590l-7.980-6.190C.920 16.460 0 20.120 0 24c0 3.880.920 7.540 2.560 10.780l7.970-6.190z"/><path fill="#34A853" d="M24 48c6.480 0 11.930-2.130 15.890-5.810l-7.730-6c-2.150 1.450-4.920 2.300-8.160 2.300-6.260 0-11.570-4.220-13.470-9.910l-7.980 6.190C6.510 42.620 14.620 48 24 48z"/></svg><span><b>Avis Google</b><!-- note-google --><small>Voir notre fiche</small></span></a>
      </div>
      <div>
        <p class="pied__titre">Acheter</p>
        <ul>
          <li><a href="https://www.leboncoin.fr/boutique/6770880/zycar.htm" target="_blank" rel="noopener">Stock sur Leboncoin</a></li>
          <li><a href="vehicules.html">Nos véhicules</a></li>
          <li><a href="galerie.html">Véhicules vendus</a></li>
        </ul>
        <p class="pied__titre" style="margin-top:18px">Importer</p>
        <ul>
          <li><a href="import.html">Import sur mandat</a></li>
          <li><a href="recherche.html">Recherche personnalisée</a></li>
        </ul>
      </div>
      <div>
        <p class="pied__titre">Vendre</p>
        <ul>
          <li><a href="vendre.html">Rachat et dépôt-vente</a></li>
          <li><a href="vendre.html#estimation">Estimation gratuite</a></li>
        </ul>
        <p class="pied__titre" style="margin-top:18px">ZYCAR</p>
        <ul>
          <li><a href="a-propos.html">À propos</a></li>
          <li><a href="blog.html">Blog</a></li>
          <li><a href="faq.html">Questions fréquentes</a></li>
        </ul>
      </div>
      <div>
        <p class="pied__titre">Contact</p>
        <ul>
          <li><a href="tel:+33783198821">07 83 19 88 21</a></li>
          <li><a href="mailto:contact@zycar.fr">contact@zycar.fr</a></li>
          <li><a href="https://www.google.com/maps/search/?api=1&amp;query=ZYCAR+Saint-Georges-de-Reneins" target="_blank" rel="noopener" data-itineraire>Saint-Georges-de-Reneins (69)</a></li>
        </ul>
      </div>
      <div>
        <p class="pied__titre">Nous suivre</p>
        <ul>
          <li><a href="https://www.leboncoin.fr/boutique/6770880/zycar.htm" target="_blank" rel="noopener">Leboncoin</a></li>
          <li><a href="https://share.google/V1jGb4gd2XNNTgvDA" target="_blank" rel="noopener">Avis Google</a></li>
          <li><a href="https://www.instagram.com/zycar.fr/" target="_blank" rel="noopener">Instagram</a></li>
          <li><a href="https://www.tiktok.com/@zycar.fr" target="_blank" rel="noopener">TikTok</a></li>
        </ul>
      </div>
    </div>
    <p class="pied__bas">© 2026 ZYCAR. Tous droits réservés. · <a href="mentions-legales.html">Mentions légales</a> · <a href="confidentialite.html">Confidentialité</a></p>
  </div>
</footer>

<div class="flottants">
  <a class="flottant flottant--tel" href="tel:+33783198821" aria-label="Appeler ZYCAR">
    <svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 4h4l2 5-2.500 1.500a11 11 0 0 0 5 5L15 13l5 2v4a2 2 0 0 1-2 2A16 16 0 0 1 3 6a2 2 0 0 1 2-2z"/></svg>
  </a>
</div>

<script src="assets/site.js"></script>{extra}
</body>
</html>
"""

APERCU = """
<script>
window.ZYCAR_APERCU = true;
document.querySelectorAll("form").forEach(function (f) {
  f.addEventListener("submit", function (e) {
    e.preventDefault();
    location.href = "merci.html";
  });
});
</script>"""


def galerie():
    """Lit le dossier galerie/ et prépare une photo 800 x 600 par véhicule vendu. Renvoie la liste (fichier, légende)."""
    source, cible = RACINE / "galerie", RACINE / "site" / "assets" / "galerie"
    cible.mkdir(parents=True, exist_ok=True)
    photos = sorted(p for p in source.iterdir() if p.suffix.lower() in (".jpg", ".jpeg", ".png", ".webp"))
    numerotees = [p for p in photos if re.match(r"\d+[ _.-]", p.name)]
    photos = numerotees + [p for p in photos if p not in numerotees]
    resultat, gardes = [], set()
    for photo in photos:
        legende = re.sub(r"^\d+[ _.-]+", "", photo.stem).replace("_", " ").strip()
        ascii_ = unicodedata.normalize("NFKD", photo.stem).encode("ascii", "ignore").decode().lower()
        nom = re.sub(r"[^a-z0-9]+", "-", ascii_).strip("-") + ".webp"
        sortie = cible / nom
        if not sortie.exists() or sortie.stat().st_mtime < photo.stat().st_mtime:
            try:
                from PIL import Image, ImageOps
                image = ImageOps.exif_transpose(Image.open(photo)).convert("RGB")
                ImageOps.fit(image, (800, 600), Image.LANCZOS).save(sortie, quality=84)
            except ImportError:  # sans Pillow, la photo est copiée telle quelle et recadrée par le navigateur
                nom = re.sub(r"\.webp$", photo.suffix.lower(), nom)
                shutil.copy(photo, cible / nom)
        gardes.add(nom)
        resultat.append((nom, legende))
    for ancien in cible.iterdir():
        if ancien.name not in gardes:
            ancien.unlink()
    return resultat


def champ_stock(ident):
    """Champ « véhicule concerné » : liste tirée de stock.txt, ou saisie libre si la liste est vide."""
    lignes = [l.strip() for l in (RACINE / "stock.txt").read_text(encoding="utf-8").splitlines()]
    stock = [l for l in lignes if l and not l.startswith("#")]
    if not stock:
        return ('<label for="{0}">Véhicule qui vous intéresse</label>\n            '
                '<input id="{0}" name="vehicule" type="text" placeholder="Ex. la BMW Série 1 vue sur Leboncoin">').format(ident)
    options = "".join("<option>{}</option>".format(v.replace("&", "&amp;").replace("<", "&lt;")) for v in stock)
    return ('<label for="{0}">Véhicule qui vous intéresse</label>\n            <select id="{0}" name="vehicule">'
            '<option value="">Choisir dans notre stock</option>{1}<option>Je ne sais pas encore</option></select>').format(ident, options)


def figures(photos):
    return "\n".join(
        '        <figure class="r"><img src="assets/galerie/{0}" alt="{1} vendue par ZYCAR" width="800" height="600" '
        'loading="lazy"><figcaption>{1}</figcaption></figure>'.format(nom, legende) for nom, legende in photos)


def construire(sortie, apercu=False):
    sortie.mkdir(parents=True, exist_ok=True)
    photos = galerie()
    if sortie != RACINE / "site":
        shutil.copytree(RACINE / "site" / "assets", sortie / "assets", dirs_exist_ok=True)
    for page in sorted((RACINE / "src" / "pages").glob("*.html")):
        texte = page.read_text(encoding="utf-8")
        titre = re.search(r"<!-- titre: (.*?) -->", texte).group(1)
        description = re.search(r"<!-- description: (.*?) -->", texte).group(1)
        univers = re.search(r"<!-- univers: (.*?) -->", texte)
        contenu = re.sub(r"<!-- (titre|description|univers): .*? -->\n", "", texte)
        contenu = contenu.replace("<!-- galerie -->", figures(photos))
        contenu = contenu.replace("<!-- europe -->", (RACINE / "src" / "europe.svg").read_text(encoding="utf-8"))
        contenu = re.sub(r"<!-- stock:([\w-]+) -->", lambda m: champ_stock(m.group(1)), contenu)
        contenu = re.sub(r"<!-- galerie:(\d+) -->", lambda m: figures(photos[:int(m.group(1))]), contenu)
        menu = "\n".join(
            '        <a href="{}"{}>{}</a>'.format(
                lien.replace("index.html", "") if page.name == "index.html" and "#" in lien else lien,
                ' aria-current="page"' if lien == page.name or (lien == "blog.html" and page.name.startswith("blog-")) else "", nom)
            for lien, nom in MENU)
        url = DOMAINE + "/" + ("" if page.name == "index.html" else page.name)
        html = GABARIT.format(url=url, partage=DOMAINE + "/assets/partage.jpg",
                              donnees=json.dumps(DONNEES, ensure_ascii=False),
                              robots='<meta name="robots" content="noindex">\n' if page.name in HORS_INDEX else "",
                              univers=' data-univers="%s"' % univers.group(1) if univers else "", titre=titre, description=description, menu=menu, contenu=contenu,
                              extra=APERCU if apercu else "")
        (sortie / page.name).write_text(html, encoding="utf-8")
        print("écrit", sortie / page.name)
    # plan du site et consignes pour les moteurs de recherche
    jour = datetime.date.today().isoformat()
    pages = [p.name for p in sorted((RACINE / "src" / "pages").glob("*.html")) if p.name not in HORS_INDEX]
    liens = "".join("  <url><loc>{}/{}</loc><lastmod>{}</lastmod></url>\n".format(DOMAINE, "" if n == "index.html" else n, jour) for n in pages)
    (sortie / "sitemap.xml").write_text('<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n' + liens + "</urlset>\n", encoding="utf-8")
    shutil.copy(RACINE / "src" / "robots.txt", sortie / "robots.txt")


if __name__ == "__main__":
    if len(sys.argv) > 1:
        construire(pathlib.Path(sys.argv[1]), apercu=True)
    else:
        construire(RACINE / "site")
