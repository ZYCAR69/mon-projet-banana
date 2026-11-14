#!/usr/bin/env python3
"""Assemble le site ZYCAR : chaque fichier de src/pages reçoit l'en-tête, le menu et le pied de page communs.

    python3 build.py            -> écrit le site dans site/
    python3 build.py DOSSIER    -> écrit une copie d'aperçu (envoi des formulaires désactivé)
"""
import pathlib, re, shutil, sys, unicodedata

RACINE = pathlib.Path(__file__).parent
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
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600&family=Outfit:wght@500;600;700&display=swap">
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
    <div class="pied__grille">
      <div>
        <img src="assets/logo-zycar.webp" alt="ZYCAR" width="720" height="232">
        <p>Achat, import et dépôt-vente de véhicules.</p>
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
          <li>Saint-Georges-de-Reneins (69)</li>
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
        contenu = re.sub(r"<!-- galerie:(\d+) -->", lambda m: figures(photos[:int(m.group(1))]), contenu)
        menu = "\n".join(
            '        <a href="{}"{}>{}</a>'.format(
                lien.replace("index.html", "") if page.name == "index.html" and "#" in lien else lien,
                ' aria-current="page"' if lien == page.name or (lien == "blog.html" and page.name.startswith("blog-")) else "", nom)
            for lien, nom in MENU)
        html = GABARIT.format(univers=' data-univers="%s"' % univers.group(1) if univers else "", titre=titre, description=description, menu=menu, contenu=contenu,
                              extra=APERCU if apercu else "")
        (sortie / page.name).write_text(html, encoding="utf-8")
        print("écrit", sortie / page.name)


if __name__ == "__main__":
    if len(sys.argv) > 1:
        construire(pathlib.Path(sys.argv[1]), apercu=True)
    else:
        construire(RACINE / "site")
