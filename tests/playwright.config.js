// Testeur automatique du site zycar.fr.
// Avant les tests, le site est construit dans tests/.site avec des véhicules d'exemple
// (tests/fixtures/crm.json), puis servi localement comme sur l'hébergeur.
const { defineConfig, devices } = require("@playwright/test");

const PORT = 4321;

module.exports = defineConfig({
  testDir: ".",
  testMatch: "*.spec.js",
  timeout: 30_000,
  fullyParallel: true,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? [["list"], ["html", { open: "never" }]] : "list",
  use: {
    baseURL: `http://127.0.0.1:${PORT}`,
    trace: "off",
    // navigateur déjà installé sur la machine, si on en indique un
    launchOptions: process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : {},
  },
  projects: [
    { name: "ordinateur", use: { ...devices["Desktop Chrome"], viewport: { width: 1280, height: 900 } } },
    { name: "telephone", use: { ...devices["Pixel 7"] } },
  ],
  webServer: {
    // le site de test est construit juste avant d'être servi
    command: `node construire.js && python3 -m http.server ${PORT} --bind 127.0.0.1 --directory .site`,
    url: `http://127.0.0.1:${PORT}/index.html`,
    reuseExistingServer: false,
    timeout: 180_000,
  },
});
