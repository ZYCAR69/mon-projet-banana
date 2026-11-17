// Construit le site de test dans tests/.site, avec les véhicules d'exemple de fixtures/crm.json.
const { execFileSync } = require("node:child_process");
const fs = require("node:fs");
const path = require("node:path");

function construire() {
  const racine = path.resolve(__dirname, "..");
  const sortie = path.join(__dirname, ".site");
  const galerie = "file://" + path.join(racine, "site", "assets", "galerie");
  const donnees = fs.readFileSync(path.join(__dirname, "fixtures", "crm.json"), "utf8").replaceAll("{GALERIE}", galerie);
  const fichier = path.join(__dirname, ".site-crm.json");
  fs.writeFileSync(fichier, donnees);
  fs.rmSync(sortie, { recursive: true, force: true });
  execFileSync("python3", ["build.py", sortie], {
    cwd: racine,
    stdio: "pipe",
    env: { ...process.env, SITE_DEMO_JSON: fichier, SITE_COURRIEL: "" },
  });
  fs.rmSync(fichier, { force: true });
}

module.exports = construire;
if (require.main === module) construire();
