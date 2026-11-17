// Parcours de visiteurs, dans un vrai navigateur, sur ordinateur et sur téléphone.
const { test, expect } = require("@playwright/test");
const fs = require("node:fs");
const path = require("node:path");

const PAGES = fs.readdirSync(path.join(__dirname, ".site")).filter((f) => f.endsWith(".html")).sort();
const telephone = (info) => info.project.name === "telephone";

// Erreurs de script : toute page qui en produit fait échouer le test.
test.beforeEach(async ({ page }) => {
  page.erreurs = [];
  page.on("pageerror", (e) => page.erreurs.push(e.message));
  page.on("console", (m) => { if (m.type() === "error") page.erreurs.push(m.text()); });
});
test.afterEach(async ({ page }) => expect(page.erreurs, "erreurs de script").toEqual([]));

// ---------- Toutes les pages ----------

for (const fichier of PAGES) {
  test(`${fichier} s'affiche sans erreur ni débordement`, async ({ page }) => {
    const reponse = await page.goto(`/${fichier}`);
    expect(reponse.status()).toBe(200);
    await expect(page.locator("h1")).toHaveCount(1);
    await expect(page.locator(".entete")).toBeVisible();
    await expect(page.locator(".pied")).toBeAttached();
    const largeur = await page.evaluate(() => [document.documentElement.scrollWidth, window.innerWidth]);
    expect(largeur[0], "la page déborde sur le côté").toBeLessThanOrEqual(largeur[1]);
    // images chargées (les images différées sont forcées)
    await page.evaluate(() => document.querySelectorAll("img[loading=lazy]").forEach((i) => (i.loading = "eager")));
    await page.waitForLoadState("load");
    const cassees = await page.evaluate(() =>
      Promise.all([...document.images].map((i) => (i.complete ? i : new Promise((r) => { i.onload = i.onerror = () => r(i); }))))
        .then((liste) => liste.filter((i) => !i.naturalWidth).map((i) => i.getAttribute("src"))));
    expect(cassees, "images qui ne s'affichent pas").toEqual([]);
  });
}

// ---------- Navigation ----------

test("le menu mène à chaque rubrique, et chaque page s'ouvre en haut", async ({ page }, info) => {
  for (const [lien, titre] of [["vehicules.html", /prêts/], ["import.html", /Allemagne/], ["vendre.html", /Vendez/], ["galerie.html", /vendus/], ["blog.html", /conseils/i], ["contact.html", /projet/]]) {
    await page.goto("/index.html");
    await page.evaluate(() => window.scrollTo(0, 1500));
    if (telephone(info)) await page.click("#menu-btn");
    await page.click(`#nav a[href="${lien}"]`);
    await expect(page).toHaveURL(new RegExp(lien));
    await expect(page.locator("h1")).toContainText(titre);
    expect(await page.evaluate(() => window.scrollY), `${lien} ne s'ouvre pas en haut`).toBeLessThan(5);
  }
});

test("le bouton d'appel flottant n'existe que sur téléphone", async ({ page }, info) => {
  await page.goto("/index.html");
  const bouton = page.locator(".flottant--tel");
  if (telephone(info)) {
    await expect(bouton).toBeVisible();
    await expect(bouton).toHaveAttribute("href", "tel:+33783198821");
  } else await expect(bouton).toBeHidden();
});

test("l'itinéraire propose Waze et Google Maps avec la destination", async ({ page }) => {
  await page.goto("/contact.html");
  await page.locator(".coordonnees [data-itineraire]").click();
  const fenetre = page.locator("dialog.itineraire");
  await expect(fenetre).toBeVisible();
  await expect(fenetre.locator("a", { hasText: "Waze" })).toHaveAttribute("href", /waze\.com\/ul\?q=Saint-Georges-de-Reneins/);
  await expect(fenetre.locator("a", { hasText: "Google Maps" })).toHaveAttribute("href", /google\.com\/maps\/dir\/\?api=1&destination=ZYCAR/);
  await fenetre.locator("button", { hasText: "Fermer" }).click();
  await expect(fenetre).toBeHidden();
});

test("la galerie de l'accueil défile toute seule", async ({ page }) => {
  await page.goto("/index.html");
  const position = () => page.evaluate(() => {
    const c = document.querySelector(".galerie__col");
    const m = new DOMMatrix(getComputedStyle(c).transform);
    return Math.round(c.scrollLeft + m.e + m.f);
  });
  const avant = await position();
  await page.waitForTimeout(1500);
  expect(await position()).not.toBe(avant);
});

// ---------- Formulaire de contact ----------

test("contact : chaque sujet affiche les bons champs", async ({ page }) => {
  await page.goto("/contact.html");
  const visibles = () => page.evaluate(() => [...document.querySelectorAll("[data-si]")].filter((e) => !e.hidden).map((e) => e.dataset.si).join(","));
  expect(await visibles()).toBe("achat");
  await expect(page.locator("#c-vehicule option")).toHaveCount(4); // invite + 2 véhicules + « je ne sais pas »
  for (const cas of ["import", "vente", "autre"]) {
    await page.locator(`input[data-cas="${cas}"] + span`).click();
    expect(await visibles()).toBe(cas === "autre" ? "" : cas);
  }
});

test("contact : impossible d'envoyer sans les champs obligatoires, puis confirmation", async ({ page }) => {
  await page.goto("/contact.html");
  await page.locator('form[name="contact"] button[type="submit"]').click();
  await expect(page).toHaveURL(/contact\.html/);
  await page.fill("#c-nom", "Test Automatique");
  await page.fill("#c-tel", "0600000000");
  await page.fill("#c-email", "test@example.com");
  await page.fill("#c-message", "Message de test");
  await page.locator('form[name="contact"] button[type="submit"]').click();
  await expect(page).toHaveURL(/merci\.html/);
  await expect(page.locator("h1")).toContainText("bien reçu");
});

// ---------- Recherche (import) ----------

test("recherche : la liste des modèles suit la marque, « Autre » ouvre un champ libre", async ({ page }) => {
  await page.goto("/recherche.html");
  await expect(page.locator("#r-modele")).toBeDisabled();
  await page.selectOption("#r-marque", "BMW");
  await expect(page.locator("#r-modele option", { hasText: /^X5$/ })).toHaveCount(1);
  await expect(page.locator("#r-modele option", { hasText: /^Golf/ })).toHaveCount(0);
  await expect(page.locator("#r-precision")).toBeHidden();
  await page.selectOption("#r-modele", "Autre modèle");
  await expect(page.locator("#r-precision")).toBeVisible();
  await page.selectOption("#r-marque", "Autre marque");
  await expect(page.locator("#r-precision")).toBeVisible();
  await expect(page.locator("#r-modele")).toBeDisabled();
});

test("recherche : la carte d'Europe coche et décoche les pays", async ({ page }) => {
  await page.goto("/recherche.html");
  const coches = () => page.evaluate(() => [...document.querySelectorAll("input[name=pays]:checked")].map((e) => e.value).join(","));
  expect(await coches()).toBe("Peu importe");
  await page.locator('.europe .pays[data-pays="Allemagne"]').click();
  await page.locator('.europe .pays[data-pays="Italie"]').click();
  expect(await coches()).toBe("Allemagne,Italie");
  await expect(page.locator('.europe .pays[data-pays="Allemagne"]')).toHaveClass(/choisi/);
  await page.locator('.europe .pays[data-pays="Italie"]').click();
  await page.locator('.europe .pays[data-pays="Allemagne"]').click();
  expect(await coches(), "sans pays, « Peu importe » revient").toBe("Peu importe");
});

test("recherche : le budget et la puissance proposent des choix cohérents", async ({ page }) => {
  await page.goto("/recherche.html");
  await expect(page.locator("#r-budget")).toHaveAttribute("required", "");
  const puissances = await page.locator("#r-puissance option").allTextContents();
  expect(puissances[0]).toBe("Indifférent");
  const valeurs = puissances.slice(1).map((t) => parseInt(t, 10));
  expect(valeurs, "puissances croissantes").toEqual([...valeurs].sort((a, b) => a - b));
});

// ---------- Estimation (vente) ----------

test("estimation : pas d'étape suivante sans les champs, choix du dépôt-vente conservé", async ({ page }) => {
  await page.goto("/vendre.html");
  await page.locator('a[data-solution="Dépôt-vente"]').click();
  await expect(page.locator("input[name=solution]:checked")).toHaveValue("Dépôt-vente");
  const etape = () => page.evaluate(() => [...document.querySelectorAll(".etape-form")].findIndex((e) => e.classList.contains("visible")) + 1);
  await page.locator(".etape-form.visible [data-suiv]").click();
  expect(await etape(), "on ne doit pas avancer à vide").toBe(1);
  await page.selectOption("#e-marque-liste", "Porsche");
  await page.selectOption("#e-modele-liste", "Macan");
  await page.selectOption("#e-annee", "2021");
  await page.fill("#e-km", "60000");
  await page.selectOption("#e-energie", "Essence");
  await page.selectOption("#e-boite", "Automatique");
  await page.locator(".etape-form.visible [data-suiv]").click();
  expect(await etape()).toBe(2);
  await page.locator(".etape-form.visible [data-prec]").click();
  expect(await etape()).toBe(1);
  await expect(page.locator("#e-modele-liste")).toHaveValue("Macan");
});

// ---------- Véhicules en vente ----------

test("la page Acheter liste les véhicules en vente, réservés compris", async ({ page }) => {
  await page.goto("/vehicules.html");
  const cartes = page.locator(".annonce-carte");
  await expect(cartes).toHaveCount(2);
  await expect(cartes.first()).toContainText("52 990 €".replace(" ", " "));
  await expect(cartes.nth(1).locator(".annonce-badge")).toHaveText("Réservé");
});

test("fiche véhicule : photos, plein écran, caractéristiques, rapport et documents", async ({ page }) => {
  await page.goto("/vehicules.html");
  await page.locator(".annonce-carte").first().click();
  await expect(page.locator("h1")).toHaveText("Audi SQ7 4.0 V8 TDI");
  const compteur = page.locator("[data-compteur]");
  await expect(compteur).toHaveText("1 / 3");
  await page.locator("[data-suiv]").click();
  await expect(compteur).toHaveText("2 / 3");
  await page.locator("[data-prec]").click();
  await page.locator("[data-prec]").click();
  await expect(compteur, "la galerie boucle").toHaveText("3 / 3");
  await page.locator(".fiche-vignette").first().click();
  await expect(compteur).toHaveText("1 / 3");
  await page.locator("[data-agrandir]").click();
  await expect(page.locator("dialog.visionneuse")).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(page.locator(".fiche-carac")).toContainText("435 ch");
  await expect(page.locator("#rapport")).toContainText("1 défaut signalé");
  await expect(page.locator("#rapport .rapport-defaut")).toContainText("Jante avant gauche");
  await expect(page.locator("#documents .fiche-doc")).toHaveCount(2);
});

test("fiche véhicule : « Ce véhicule m'intéresse » préremplit le contact", async ({ page }) => {
  await page.goto("/vehicules.html");
  await page.locator(".annonce-carte").first().click();
  await page.locator(".fiche-actions a[data-vehicule]").click();
  await expect(page).toHaveURL(/contact\.html/);
  await expect(page.locator('input[data-cas="achat"]')).toBeChecked();
  await expect(page.locator("#c-vehicule")).toHaveValue(/Audi SQ7/);
  await expect(page.locator("#c-message")).toHaveValue(/je suis intéressé par : Audi SQ7/);
});

test("fiche véhicule : la demande de documents préremplit le message", async ({ page }) => {
  await page.goto("/vehicules.html");
  await page.locator(".annonce-carte").first().click();
  await page.locator("#documents a[data-documents]").click();
  await expect(page.locator("#c-message")).toHaveValue(/envoyer les documents du véhicule Audi SQ7.*carnet d'entretien, rapport d'expertise/);
});

test("fiche d'un véhicule réservé : bouton adapté", async ({ page }) => {
  await page.goto("/vehicules.html");
  await page.locator(".annonce-carte").nth(1).click();
  await expect(page.locator(".fiche-actions a").first()).toContainText("Être prévenu s'il se libère");
});

// ---------- FAQ ----------

test("FAQ : les réponses s'ouvrent et se ferment", async ({ page }) => {
  await page.goto("/faq.html");
  const question = page.locator(".faq details").first();
  await question.locator("summary").click();
  await expect(question).toHaveAttribute("open", "");
  await question.locator("summary").click();
  await expect(question).not.toHaveAttribute("open", "");
});
