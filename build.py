#!/usr/bin/env python3
"""Assemble le site ZYCAR : chaque fichier de src/pages reçoit l'en-tête, le menu et le pied de page communs.

    python3 build.py            -> écrit le site dans site/
    python3 build.py DOSSIER    -> écrit une copie d'aperçu (envoi des formulaires désactivé)
"""
import pathlib, re, shutil, sys

RACINE = pathlib.Path(__file__).parent
MENU = [("index.html#stock", "En stock"), ("index.html#import", "Import"), ("index.html#formules", "Formules"),
        ("a-propos.html", "À propos"), ("faq.html", "FAQ"), ("contact.html", "Contact")]

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
<body>

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
        <p>Véhicules d'occasion et import sur mandat depuis l'Allemagne.</p>
      </div>
      <div>
        <p class="pied__titre">Le site</p>
        <ul>
          <li><a href="index.html">Accueil</a></li>
          <li><a href="recherche.html">Recherche personnalisée</a></li>
          <li><a href="a-propos.html">À propos</a></li>
          <li><a href="faq.html">Questions fréquentes</a></li>
          <li><a href="contact.html">Contact</a></li>
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
          <li><a href="https://www.instagram.com/zycar.fr/" target="_blank" rel="noopener">Instagram</a></li>
          <li><a href="https://www.tiktok.com/@zycar.fr" target="_blank" rel="noopener">TikTok</a></li>
        </ul>
      </div>
    </div>
    <p class="pied__bas">© 2026 ZYCAR. Tous droits réservés.</p>
  </div>
</footer>

<script src="assets/site.js"></script>{extra}
</body>
</html>
"""

APERCU = """
<script>
document.querySelectorAll("form").forEach(function (f) {
  f.addEventListener("submit", function (e) {
    e.preventDefault();
    var m = f.querySelector(".formulaire__etat");
    if (!m) { m = document.createElement("p"); m.className = "formulaire__etat"; f.appendChild(m); }
    m.textContent = "Maquette : l'envoi n'est pas encore branché. Sur le site en ligne, cette demande arrivera sur contact@zycar.fr.";
  });
});
</script>"""


def construire(sortie, apercu=False):
    sortie.mkdir(parents=True, exist_ok=True)
    if sortie != RACINE / "site":
        shutil.copytree(RACINE / "site" / "assets", sortie / "assets", dirs_exist_ok=True)
    for page in sorted((RACINE / "src" / "pages").glob("*.html")):
        texte = page.read_text(encoding="utf-8")
        titre = re.search(r"<!-- titre: (.*?) -->", texte).group(1)
        description = re.search(r"<!-- description: (.*?) -->", texte).group(1)
        contenu = re.sub(r"<!-- (titre|description): .*? -->\n", "", texte)
        menu = "\n".join(
            '        <a href="{}"{}>{}</a>'.format(
                lien.replace("index.html", "") if page.name == "index.html" and "#" in lien else lien,
                ' aria-current="page"' if lien == page.name else "", nom)
            for lien, nom in MENU)
        html = GABARIT.format(titre=titre, description=description, menu=menu, contenu=contenu,
                              extra=APERCU if apercu else "")
        (sortie / page.name).write_text(html, encoding="utf-8")
        print("écrit", sortie / page.name)


if __name__ == "__main__":
    if len(sys.argv) > 1:
        construire(pathlib.Path(sys.argv[1]), apercu=True)
    else:
        construire(RACINE / "site")
