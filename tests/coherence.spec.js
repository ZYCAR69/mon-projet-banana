// Cohérence du site construit : liens, images, référencement, textes, prix.
// Ces vérifications lisent les fichiers : elles ne tournent qu'une fois (projet « ordinateur »).
const { test, expect } = require("@playwright/test");
const fs = require("node:fs");
const path = require("node:path");

const SITE = path.join(__dirname, ".site");
const pages = () => fs.readdirSync(SITE).filter((f) => f.endsWith(".html")).sort();
const lire = (f) => fs.readFileSync(path.join(SITE, f), "utf8");
const sansCommentaires = (html) => html.replace(/<!--[\s\S]*?-->/g, "");
const NON_INDEXEES = ["merci.html", "404.html"];

test.beforeEach(({}, info) => test.skip(info.project.name !== "ordinateur", "vérifié une seule fois"));

test("toutes les pages attendues sont construites, avec les fiches véhicule", () => {
  const liste = pages();
  for (const p of ["index.html", "vehicules.html", "import.html", "recherche.html", "vendre.html", "galerie.html", "blog.html",
    "a-propos.html", "faq.html", "contact.html", "merci.html", "mentions-legales.html", "confidentialite.html", "404.html"]) {
    expect(liste, `page manquante : ${p}`).toContain(p);
  }
  expect(liste.filter((p) => p.startsWith("vehicule-")).length, "une fiche par véhicule d'exemple").toBe(2);
  expect(liste.filter((p) => p.startsWith("blog-")).length, "articles du blog").toBeGreaterThanOrEqual(12);
});

test("aucun lien interne cassé (pages et ancres)", () => {
  const ids = Object.fromEntries(pages().map((p) => [p, new Set([...lire(p).matchAll(/\sid="([^"]+)"/g)].map((m) => m[1]))]));
  const erreurs = [];
  for (const p of pages()) {
    for (const [, href] of lire(p).matchAll(/href="([^"]+)"/g)) {
      if (/^(https?:|tel:|mailto:|geo:)/.test(href) || href.startsWith("assets/")) continue;
      const [fichier, ancre] = href.split("#");
      const cible = fichier || p;
      if (!ids[cible]) erreurs.push(`${p} → ${href} (page absente)`);
      else if (ancre && !ids[cible].has(ancre)) erreurs.push(`${p} → ${href} (ancre absente)`);
    }
  }
  expect(erreurs).toEqual([]);
});

test("toutes les images, feuilles de style et scripts existent", () => {
  const erreurs = [];
  for (const p of pages()) {
    for (const [, src] of lire(p).matchAll(/(?:src|href)="(assets\/[^"#?]+)"/g)) {
      if (!fs.existsSync(path.join(SITE, src))) erreurs.push(`${p} → ${src}`);
    }
  }
  const css = fs.readFileSync(path.join(SITE, "assets", "style.css"), "utf8");
  for (const [, url] of css.matchAll(/url\("([^"]+)"\)/g)) {
    if (!url.startsWith("data:") && !fs.existsSync(path.join(SITE, "assets", url))) erreurs.push(`style.css → ${url}`);
  }
  expect(erreurs).toEqual([]);
});

test("chaque page a un titre unique, une description et un seul titre principal", () => {
  const titres = new Map();
  for (const p of pages()) {
    const html = lire(p);
    const titre = html.match(/<title>(.*?)<\/title>/)?.[1] ?? "";
    const description = html.match(/<meta name="description" content="(.*?)"/)?.[1] ?? "";
    expect(titre.length, `${p} : titre vide`).toBeGreaterThan(5);
    expect(description.length, `${p} : description trop courte`).toBeGreaterThan(30);
    expect(description.length, `${p} : description trop longue pour Google`).toBeLessThanOrEqual(200);
    expect(html.match(/<h1[\s>]/g)?.length ?? 0, `${p} : nombre de titres principaux`).toBe(1);
    expect(html, `${p} : lien canonique`).toMatch(/<link rel="canonical" href="https:\/\/www\.zycar\.fr\//);
    expect(titres.has(titre), `${p} : même titre que ${titres.get(titre)}`).toBe(false);
    titres.set(titre, p);
  }
});

test("aucun reste de gabarit ni valeur vide dans les textes", () => {
  const interdits = [/\{\{/, /\}\}/, /\bundefined\b/, /\bNaN\b/, /null €/, /\[object Object\]/, /lorem ipsum/i];
  for (const p of pages()) {
    const texte = sansCommentaires(lire(p)).replace(/<script[\s\S]*?<\/script>/g, "");
    for (const motif of interdits) expect(texte, `${p} contient ${motif}`).not.toMatch(motif);
  }
});

test("les tarifs sont les mêmes partout", () => {
  for (const p of pages()) {
    const html = lire(p);
    expect(html, `${p} : ancien tarif`).not.toMatch(/1[\s ]?139|1[\s ]?690/);
  }
  for (const p of ["import.html", "recherche.html"]) {
    const html = lire(p);
    expect(html, `${p} : formule Guide`).toMatch(/1[\s ]490 €/);
    expect(html, `${p} : formule Clé en main`).toMatch(/1[\s ]990 €/);
    expect(html, `${p} : badge`).toContain("La plus demandée");
  }
});

test("l'adresse e-mail n'est jamais écrite en dur dans le code source", () => {
  const sources = ["build.py", "annonces.py", ...fs.readdirSync(path.join(__dirname, "..", "src", "pages")).map((f) => path.join("src", "pages", f))];
  for (const f of sources) {
    const texte = fs.readFileSync(path.join(__dirname, "..", f), "utf8");
    expect(texte, `${f} contient une adresse e-mail`).not.toMatch(/[\w.+-]+@zycar\.fr/);
  }
});

test("pages de confirmation et d'erreur non indexées, plan du site complet", () => {
  for (const p of NON_INDEXEES) expect(lire(p), p).toContain('<meta name="robots" content="noindex">');
  const plan = fs.readFileSync(path.join(SITE, "sitemap.xml"), "utf8");
  for (const p of pages()) {
    const adresse = p === "index.html" ? "https://www.zycar.fr/<" : `https://www.zycar.fr/${p}<`;
    if (NON_INDEXEES.includes(p)) expect(plan, `${p} ne doit pas être dans le plan`).not.toContain(adresse);
    else expect(plan, `${p} absent du plan du site`).toContain(adresse);
  }
  expect(fs.readFileSync(path.join(SITE, "robots.txt"), "utf8")).toContain("Sitemap: https://www.zycar.fr/sitemap.xml");
});

test("les fiches véhicule ne publient aucune donnée interne", () => {
  for (const p of pages().filter((f) => f.startsWith("vehicule-"))) {
    const html = lire(p);
    expect(html, `${p} : données structurées`).toContain('"@type": "Car"');
    expect(html, `${p} : numéro de série`).not.toMatch(/\bvin\b|registration_number|purchase_price/i);
  }
});
