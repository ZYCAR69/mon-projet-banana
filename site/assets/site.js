(function () {
  var racine = document.documentElement;
  var calme = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  /* Une nouvelle page s'ouvre toujours en haut (sauf lien vers une section précise).
     Le repère #haut sert aussi quand le site est affiché dans un cadre dont c'est la page hôte qui défile. */
  var haut = document.getElementById("haut");
  var enHaut = function () {
    window.scrollTo(0, 0);
    document.documentElement.scrollTop = 0;
    document.body.scrollTop = 0;
    if (haut) {
      try { haut.focus({ preventScroll: false }); } catch (e) {}
      haut.scrollIntoView({ block: "start", inline: "nearest", behavior: "instant" });
    }
  };
  if (!location.hash) {
    try { history.scrollRestoration = "manual"; } catch (e) {}
    enHaut();
    window.addEventListener("DOMContentLoaded", enHaut);
    window.addEventListener("load", enHaut);
    window.addEventListener("pageshow", enHaut);
  }
  /* On remonte aussi au moment du clic sur un lien vers une autre page */
  document.addEventListener("click", function (e) {
    var lien = e.target.closest && e.target.closest("a[href]");
    if (!lien || lien.target === "_blank") return;
    var href = lien.getAttribute("href");
    if (/^(#|tel:|mailto:|https?:)/.test(href) || href.indexOf("#") !== -1) return;
    enHaut();
  }, true);

  /* Menu mobile */
  var btn = document.getElementById("menu-btn"), nav = document.getElementById("nav");
  btn.addEventListener("click", function () {
    var ouvert = nav.classList.toggle("ouvert");
    btn.setAttribute("aria-expanded", ouvert);
  });
  nav.addEventListener("click", function (e) {
    if (e.target.tagName === "A") { nav.classList.remove("ouvert"); btn.setAttribute("aria-expanded", "false"); }
  });

  /* Boutons qui présélectionnent rachat ou dépôt-vente dans le formulaire d'estimation */
  document.querySelectorAll("[data-solution]").forEach(function (lien) {
    lien.addEventListener("click", function () {
      var radio = document.querySelector('input[name="solution"][value="' + lien.dataset.solution + '"]');
      if (radio) radio.checked = true;
    });
  });

  /* Formulaire d'estimation en trois étapes */
  var formE = document.getElementById("form-estimation");
  if (formE) {
    var etapesF = formE.querySelectorAll(".etape-form"), points = formE.querySelectorAll(".progression li"), courante = 0;
    var montrer = function (i) {
      courante = i;
      etapesF.forEach(function (e, k) { e.classList.toggle("visible", k === i); });
      points.forEach(function (pt, k) { pt.classList.toggle("actif", k <= i); });
    };
    var valide = function () {
      var champs = etapesF[courante].querySelectorAll("input, select, textarea");
      for (var k = 0; k < champs.length; k++) { if (!champs[k].reportValidity()) return false; }
      return true;
    };
    formE.classList.add("pas-a-pas");
    montrer(0);
    formE.addEventListener("click", function (e) {
      var b = e.target.closest("[data-suiv], [data-prec]");
      if (!b) return;
      if (b.hasAttribute("data-suiv")) { if (valide()) montrer(courante + 1); }
      else montrer(courante - 1);
      formE.scrollIntoView({ block: "nearest" });
    });
  }

  /* Galerie de l'accueil : elle défile seule et se déplace à la main.
     Sur ordinateur (colonnes), on la fait glisser à la souris.
     Sur téléphone (rangées), c'est le défilement natif du navigateur, donc aussi fluide que le reste du téléphone. */
  var galerie = document.querySelector(".galerie");
  if (galerie && window.requestAnimationFrame) {
    var enLigne = window.matchMedia("(max-width: 940px)");
    var pistes = [].map.call(galerie.querySelectorAll(".galerie__col"), function (el, i) {
      /* le contenu est fourni en double : on ajoute une troisième série pour boucler sans à-coup */
      var enfants = [].slice.call(el.children), serie = enfants.slice(0, enfants.length / 2);
      serie.forEach(function (img) { el.appendChild(img.cloneNode(true)); });
      return { el: el, sens: i % 2 ? -1 : 1, pos: 0, v: 0, serie: 1, tenu: false, dernier: 0, quand: 0, attendu: -1, libre: 0, mode: "" };
    });
    var mesurer = function () {
      pistes.forEach(function (p) {
        p.serie = Math.max(1, (enLigne.matches ? p.el.scrollWidth : p.el.scrollHeight) / 3);
      });
    };
    galerie.classList.add("galerie--libre");
    mesurer();
    window.addEventListener("resize", mesurer);
    window.addEventListener("load", mesurer);
    pistes.forEach(function (p) {
      /* souris, en colonnes */
      p.el.addEventListener("pointerdown", function (e) {
        if (enLigne.matches || e.pointerType !== "mouse" || e.button !== 0) return;
        p.tenu = true; p.dernier = e.clientY; p.quand = performance.now(); p.v = 0;
        try { p.el.setPointerCapture(e.pointerId); } catch (err) {}
        galerie.classList.add("galerie--saisie");
      });
      p.el.addEventListener("pointermove", function (e) {
        if (!p.tenu || enLigne.matches) return;
        var t = performance.now(), d = p.dernier - e.clientY, dt = Math.max(1, t - p.quand);
        p.pos += d; p.v = 0.7 * p.v + 0.3 * (d / dt); p.dernier = e.clientY; p.quand = t;
      });
      var lacher = function () {
        if (!p.tenu) return;
        p.tenu = false;
        if (performance.now() - p.quand > 120) p.v = 0;
        galerie.classList.remove("galerie--saisie");
      };
      p.el.addEventListener("pointerup", lacher);
      p.el.addEventListener("pointercancel", lacher);
      p.el.addEventListener("dragstart", function (e) { e.preventDefault(); });
      /* doigt, en rangées : on se contente de savoir quand le doigt est posé */
      p.el.addEventListener("touchstart", function () { p.doigt = true; }, { passive: true });
      var lever = function () { p.doigt = false; p.libre = performance.now(); };
      p.el.addEventListener("touchend", lever, { passive: true });
      p.el.addEventListener("touchcancel", lever, { passive: true });
    });
    var avant = performance.now();
    (function tourner(t) {
      var dt = Math.min(64, t - avant); avant = t;
      var ligne = enLigne.matches;
      pistes.forEach(function (p) {
        var croisiere = calme ? 0 : p.sens * p.serie / 64000;
        if (ligne) {
          if (p.mode !== "ligne") { p.mode = "ligne"; p.el.style.transform = "none"; p.pos = p.serie; p.el.scrollLeft = p.pos; p.attendu = p.el.scrollLeft; }
          var reel = p.el.scrollLeft;
          if (p.doigt || Math.abs(reel - p.attendu) > 1.5) { p.libre = t; p.pos = reel; p.attendu = reel; return; }
          if (t - p.libre < 700) { p.pos = reel; p.attendu = reel; return; }   /* on laisse finir l'élan du doigt */
          p.pos += croisiere * dt;
          if (p.pos >= p.serie * 1.5) p.pos -= p.serie;
          if (p.pos < p.serie * 0.5) p.pos += p.serie;
          p.el.scrollLeft = p.pos;
          p.attendu = p.el.scrollLeft;
        } else {
          if (p.mode !== "colonne") { p.mode = "colonne"; p.el.scrollLeft = 0; p.pos = 0; p.v = 0; }
          if (!p.tenu) { p.v += (croisiere - p.v) * Math.min(1, dt * 0.003); p.pos += p.v * dt; }
          p.pos = ((p.pos % p.serie) + p.serie) % p.serie;
          p.el.style.transform = "translate3d(0," + (-p.pos) + "px,0)";
        }
      });
      requestAnimationFrame(tourner);
    })(avant);
  }

  /* Adresse : choix de l'application de guidage (Waze, Google Maps, Plans…) */
  var LIEU_GOOGLE = "ZYCAR Saint-Georges-de-Reneins", LIEU = "Saint-Georges-de-Reneins 69830";
  var fenetre = null;
  var ouvrirItineraire = function () {
    if (!fenetre) {
      var pomme = /iP(hone|ad|od)|Mac/.test(navigator.platform || "");
      var tactile = "ontouchstart" in window;
      var q = encodeURIComponent(LIEU), choix = [
        ["Waze", "https://waze.com/ul?q=" + q + "&navigate=yes"],
        ["Google Maps", "https://www.google.com/maps/dir/?api=1&destination=" + encodeURIComponent(LIEU_GOOGLE)]
      ];
      if (pomme) choix.push(["Plans (Apple)", "https://maps.apple.com/?daddr=" + q]);
      if (!pomme && tactile) choix.push(["Autre application GPS", "geo:0,0?q=" + q]);
      fenetre = document.createElement("dialog");
      fenetre.className = "itineraire";
      fenetre.innerHTML = "<h3>Venir chez ZYCAR</h3><p>Saint-Georges-de-Reneins (69). Choisissez votre application :</p><div class=\"itineraire__choix\">" +
        choix.map(function (c) { return "<a href=\"" + c[1] + "\" target=\"_blank\" rel=\"noopener\">" + c[0] + "</a>"; }).join("") +
        "</div><button type=\"button\">Fermer</button>";
      document.body.appendChild(fenetre);
      fenetre.addEventListener("click", function (e) {
        if (e.target === fenetre || e.target.tagName === "BUTTON" || e.target.tagName === "A") fenetre.close();
      });
    }
    fenetre.showModal();
  };
  document.addEventListener("click", function (e) {
    var lien = e.target.closest && e.target.closest("[data-itineraire]");
    if (!lien || !window.HTMLDialogElement) return;
    e.preventDefault();
    ouvrirItineraire();
  });

  /* Carte du pied de page : chargée seulement à la demande */
  var carteBtn = document.getElementById("carte-btn");
  if (carteBtn) carteBtn.addEventListener("click", function () {
    var cadre = document.getElementById("carte");
    if (window.ZYCAR_APERCU) { cadre.innerHTML = "<p>La carte Google Maps s'affichera ici sur le site en ligne.<br>Elle ne peut pas être chargée dans cet aperçu.</p>"; return; }
    cadre.innerHTML = "<iframe title=\"Carte : ZYCAR à Saint-Georges-de-Reneins\" loading=\"lazy\" referrerpolicy=\"no-referrer-when-downgrade\" src=\"https://www.google.com/maps?q=" + encodeURIComponent(LIEU_GOOGLE) + "&z=12&output=embed\"></iframe>";
  });

  /* Formulaires de contact : les champs s'adaptent au sujet choisi */
  document.querySelectorAll("form").forEach(function (f) {
    var blocs = f.querySelectorAll("[data-si]");
    if (!blocs.length) return;
    var adapter = function () {
      var choisi = f.querySelector("input[data-cas]:checked"), cas = choisi ? choisi.getAttribute("data-cas") : "";
      blocs.forEach(function (b) {
        var visible = b.getAttribute("data-si") === cas;
        b.hidden = !visible;
        b.querySelectorAll("input, select, textarea").forEach(function (c) { c.disabled = !visible; });
      });
    };
    f.addEventListener("change", function (e) { if (e.target.hasAttribute("data-cas")) adapter(); });
    adapter();
  });

  /* Recherche : choix des pays sur la carte d'Europe */
  var europe = document.querySelector(".europe");
  if (europe) {
    var zone = europe.closest("fieldset"), partout = zone.querySelector("input[data-partout]");
    var cases = [].slice.call(zone.querySelectorAll("input[name='pays']:not([data-partout])"));
    var peindre = function () {
      europe.querySelectorAll(".pays").forEach(function (p) {
        var c = zone.querySelector("input[value='" + p.getAttribute("data-pays") + "']");
        var on = !!(c && c.checked);
        p.classList.toggle("choisi", on);
        p.setAttribute("aria-checked", on);
      });
      europe.classList.toggle("europe--partout", partout.checked);
    };
    zone.addEventListener("change", function (e) {
      if (e.target === partout) { if (partout.checked) cases.forEach(function (c) { c.checked = false; }); }
      else if (e.target.checked) partout.checked = false;
      if (!cases.some(function (c) { return c.checked; })) partout.checked = true;
      peindre();
    });
    var basculer = function (p) {
      var c = zone.querySelector("input[value='" + p.getAttribute("data-pays") + "']");
      if (!c) return;
      c.checked = !c.checked;
      c.dispatchEvent(new Event("change", { bubbles: true }));
    };
    europe.addEventListener("click", function (e) { var p = e.target.closest(".pays"); if (p) basculer(p); });
    europe.addEventListener("keydown", function (e) {
      var p = e.target.closest(".pays");
      if (p && (e.key === " " || e.key === "Enter")) { e.preventDefault(); basculer(p); }
    });
    peindre();
  }

  /* Estimation : la liste des modèles dépend de la marque */
  var MODELES = {
    "Abarth": ["500", "595", "695", "124 Spider"],
    "Alpina": ["B3", "B4", "B5", "B6", "B7", "B8", "D3", "D4", "D5", "XB7", "XD3", "XD4"],
    "Alfa Romeo": ["Giulia", "Giulietta", "MiTo", "Stelvio", "Tonale", "4C"],
    "Alpine": ["A110", "A290"],
    "Aston Martin": ["DB11", "DB12", "DBS", "DBX", "Vantage", "Rapide"],
    "Audi": ["A1", "A3", "A4", "A5", "A6", "A7", "A8", "Q2", "Q3", "Q4 e-tron", "Q5", "Q7", "Q8", "e-tron", "TT", "R8", "S3", "RS3", "S4", "RS4", "S5", "RS5", "RS6", "RS7", "SQ5", "SQ7", "RS Q3", "RS Q8"],
    "Bentley": ["Bentayga", "Continental GT", "Flying Spur"],
    "BMW": ["Série 1", "Série 2", "Série 3", "Série 4", "Série 5", "Série 6", "Série 7", "Série 8", "X1", "X2", "X3", "X4", "X5", "X6", "X7", "Z4", "i3", "i4", "iX", "iX3", "M2", "M3", "M4", "M5", "M8", "X3 M", "X5 M"],
    "Citroën": ["C1", "C3", "C3 Aircross", "C4", "C4 Picasso", "C5 Aircross", "C5 X", "Berlingo", "ë-C4"],
    "Cupra": ["Ateca", "Born", "Formentor", "Leon", "Tavascan", "Terramar"],
    "Dacia": ["Duster", "Jogger", "Logan", "Sandero", "Spring", "Bigster"],
    "DS": ["DS 3", "DS 4", "DS 7", "DS 9"],
    "Ferrari": ["296", "488", "812", "F8", "Portofino", "Roma", "SF90", "Purosangue", "California"],
    "Fiat": ["500", "500X", "Panda", "Tipo", "Ducato"],
    "Ford": ["Fiesta", "Focus", "Puma", "Kuga", "Mustang", "Mustang Mach-E", "Ranger", "Transit"],
    "Honda": ["Civic", "Civic Type R", "CR-V", "HR-V", "Jazz"],
    "Hyundai": ["i10", "i20", "i20 N", "i30", "i30 N", "Kona", "Tucson", "Santa Fe", "Ioniq 5", "Ioniq 6"],
    "Jaguar": ["E-Pace", "F-Pace", "F-Type", "I-Pace", "XE", "XF"],
    "Jeep": ["Avenger", "Compass", "Renegade", "Wrangler", "Grand Cherokee"],
    "Kia": ["Picanto", "Rio", "Ceed", "ProCeed", "Stonic", "Niro", "Sportage", "Sorento", "EV6", "EV9", "Stinger"],
    "Lamborghini": ["Huracán", "Urus", "Aventador", "Revuelto"],
    "Land Rover": ["Defender", "Discovery", "Discovery Sport", "Range Rover", "Range Rover Evoque", "Range Rover Sport", "Range Rover Velar"],
    "Lexus": ["CT", "IS", "NX", "RX", "UX", "LC"],
    "Maserati": ["Ghibli", "Grecale", "Levante", "Quattroporte", "GranTurismo"],
    "Mazda": ["2", "3", "CX-3", "CX-30", "CX-5", "CX-60", "MX-5"],
    "McLaren": ["540C", "570S", "600LT", "720S", "750S", "Artura", "GT"],
    "Mercedes-Benz": ["Classe A", "Classe B", "Classe C", "Classe E", "Classe S", "CLA", "CLS", "GLA", "GLB", "GLC", "GLE", "GLS", "Classe G", "Classe V", "EQA", "EQB", "EQC", "EQE", "EQS", "AMG GT", "A 35 AMG", "A 45 AMG", "C 43 AMG", "C 63 AMG", "E 63 AMG"],
    "Mini": ["Mini 3 portes", "Mini 5 portes", "Cabrio", "Clubman", "Countryman", "John Cooper Works"],
    "Nissan": ["Micra", "Juke", "Qashqai", "X-Trail", "Leaf", "Ariya", "GT-R"],
    "Opel": ["Corsa", "Astra", "Mokka", "Crossland", "Grandland", "Insignia"],
    "Peugeot": ["108", "208", "308", "408", "508", "2008", "3008", "5008", "Rifter", "RCZ"],
    "Porsche": ["911", "718 Boxster", "718 Cayman", "Cayenne", "Macan", "Panamera", "Taycan"],
    "Renault": ["Twingo", "Clio", "Captur", "Mégane", "Mégane RS", "Arkana", "Austral", "Scénic", "Kadjar", "Espace", "Zoé", "Trafic"],
    "Seat": ["Ibiza", "Leon", "Arona", "Ateca", "Tarraco"],
    "Škoda": ["Fabia", "Scala", "Octavia", "Superb", "Kamiq", "Karoq", "Kodiaq", "Enyaq"],
    "Smart": ["Fortwo", "Forfour", "#1", "#3"],
    "Suzuki": ["Swift", "Ignis", "Vitara", "S-Cross", "Jimny"],
    "Tesla": ["Model 3", "Model S", "Model X", "Model Y"],
    "Toyota": ["Aygo", "Yaris", "Yaris Cross", "Corolla", "C-HR", "RAV4", "GR Yaris", "Supra", "Land Cruiser"],
    "Volkswagen": ["Polo", "Golf", "Golf GTI", "Golf R", "T-Cross", "T-Roc", "Tiguan", "Touareg", "Passat", "Arteon", "Touran", "ID.3", "ID.4", "ID.5", "Up", "Scirocco", "Transporter"],
    "Volvo": ["V40", "V60", "V90", "S60", "S90", "XC40", "XC60", "XC90", "EX30", "C40"]
  };
  var marques = Object.keys(MODELES).sort(function (a, b) { return a.localeCompare(b, "fr"); });
  document.querySelectorAll("select[data-modeles]").forEach(function (modele) {
    var marque = document.getElementById(modele.getAttribute("data-modeles"));
    var libre = document.getElementById(modele.getAttribute("data-precision"));
    if (!marque) return;
    marques.forEach(function (m) { marque.add(new Option(m, m)); });
    marque.add(new Option("Autre marque", "Autre marque"));
    var preciser = function () {
      var besoin = marque.value === "Autre marque" || modele.value === "Autre modèle";
      if (!libre) return;
      libre.closest(".champ").hidden = !besoin;
      libre.required = besoin;
      libre.disabled = !besoin;
    };
    var remplir = function () {
      var liste = MODELES[marque.value] || [];
      modele.length = 0;
      modele.add(new Option(liste.length ? "Choisir" : (marque.value ? "Précisez ci-dessous" : "Choisissez d'abord la marque"), ""));
      liste.forEach(function (m) { modele.add(new Option(m, m)); });
      if (liste.length) modele.add(new Option("Autre modèle", "Autre modèle"));
      modele.disabled = !liste.length;
      modele.required = !!liste.length;
      preciser();
    };
    marque.addEventListener("change", remplir);
    modele.addEventListener("change", preciser);
    remplir();
  });

  /* Fiche véhicule : galerie de photos, glissé au doigt, plein écran */
  var visionneuse = null, vListe = [], vIndex = 0;
  var ouvrirVisionneuse = function (liste, index) {
    if (!window.HTMLDialogElement) return;
    if (!visionneuse) {
      visionneuse = document.createElement("dialog");
      visionneuse.className = "visionneuse";
      visionneuse.innerHTML = "<img alt=\"\"><div class=\"visionneuse__barre\"><button type=\"button\" data-v=\"-1\" aria-label=\"Précédente\">‹</button><span></span><button type=\"button\" data-v=\"1\" aria-label=\"Suivante\">›</button><button type=\"button\" data-v=\"0\" aria-label=\"Fermer\">✕</button></div>";
      document.body.appendChild(visionneuse);
      visionneuse.addEventListener("click", function (e) {
        var b = e.target.closest("button");
        if (e.target === visionneuse || (b && b.getAttribute("data-v") === "0")) { visionneuse.close(); return; }
        if (b) montrerV(vIndex + Number(b.getAttribute("data-v")));
      });
      visionneuse.addEventListener("keydown", function (e) {
        if (e.key === "ArrowLeft") montrerV(vIndex - 1);
        if (e.key === "ArrowRight") montrerV(vIndex + 1);
      });
      var x0 = null;
      visionneuse.addEventListener("pointerdown", function (e) { x0 = e.clientX; });
      visionneuse.addEventListener("pointerup", function (e) { if (x0 !== null && Math.abs(e.clientX - x0) > 50) montrerV(vIndex + (e.clientX < x0 ? 1 : -1)); x0 = null; });
    }
    vListe = liste;
    montrerV(index);
    visionneuse.showModal();
  };
  var montrerV = function (i) {
    vIndex = (i + vListe.length) % vListe.length;
    visionneuse.querySelector("img").src = vListe[vIndex];
    visionneuse.querySelector("span").textContent = (vIndex + 1) + " / " + vListe.length;
    var plusieurs = vListe.length > 1;
    visionneuse.querySelectorAll("[data-v='1'], [data-v='-1']").forEach(function (b) { b.hidden = !plusieurs; });
  };

  document.querySelectorAll("[data-galerie-annonce]").forEach(function (g) {
    var principale = g.querySelector("[data-principale]"), compteur = g.querySelector("[data-compteur]");
    var vignettes = [].slice.call(g.querySelectorAll(".fiche-vignette"));
    var liste = vignettes.map(function (v) { return v.querySelector("img").getAttribute("src"); }), courant = 0;
    var montrer = function (i) {
      courant = (i + liste.length) % liste.length;
      principale.src = liste[courant];
      compteur.textContent = (courant + 1) + " / " + liste.length;
      vignettes.forEach(function (v, k) { v.classList.toggle("actif", k === courant); });
      vignettes[courant].scrollIntoView({ block: "nearest", inline: "nearest", behavior: "smooth" });
    };
    vignettes.forEach(function (v, k) { v.addEventListener("click", function () { montrer(k); }); });
    g.querySelector("[data-prec]").addEventListener("click", function () { montrer(courant - 1); });
    g.querySelector("[data-suiv]").addEventListener("click", function () { montrer(courant + 1); });
    g.querySelector("[data-agrandir]").addEventListener("click", function () { ouvrirVisionneuse(liste, courant); });
    if (liste.length < 2) g.querySelectorAll("[data-prec], [data-suiv]").forEach(function (b) { b.hidden = true; });
    var zone = g.querySelector(".fiche-galerie__principale"), x0 = null, y0 = null;
    zone.addEventListener("pointerdown", function (e) { x0 = e.clientX; y0 = e.clientY; });
    zone.addEventListener("pointerup", function (e) {
      if (x0 === null) return;
      var dx = e.clientX - x0, dy = e.clientY - y0;
      if (Math.abs(dx) > 40 && Math.abs(dx) > Math.abs(dy)) montrer(courant + (dx < 0 ? 1 : -1));
      else if (Math.abs(dx) < 6 && Math.abs(dy) < 6 && !e.target.closest("button")) ouvrirVisionneuse(liste, courant);
      x0 = null;
    });
  });
  document.querySelectorAll("[data-zoom]").forEach(function (b) {
    b.addEventListener("click", function () { ouvrirVisionneuse([b.getAttribute("data-zoom")], 0); });
  });

  /* « Ce véhicule m'intéresse » : le formulaire de contact s'ouvre avec le véhicule déjà choisi */
  document.querySelectorAll("a[data-vehicule]").forEach(function (a) {
    a.addEventListener("click", function () {
      try { sessionStorage.setItem("zycar-vehicule", a.getAttribute("data-vehicule")); } catch (e) {}
    });
  });
  (function () {
    var voulu = null;
    try { voulu = new URLSearchParams(location.search).get("vehicule"); } catch (e) {}
    if (!voulu) { try { voulu = sessionStorage.getItem("zycar-vehicule"); sessionStorage.removeItem("zycar-vehicule"); } catch (e) {} }
    if (!voulu) return;
    var formulaire = document.querySelector("form[name='contact'], form[name='demande']");
    if (!formulaire) return;
    var achat = formulaire.querySelector("input[data-cas='achat']");
    if (achat) { achat.checked = true; achat.dispatchEvent(new Event("change", { bubbles: true })); }
    var liste = formulaire.querySelector("select[name='vehicule']"), trouve = false;
    if (liste) [].forEach.call(liste.options, function (o) { if (o.text === voulu) { liste.value = o.value || o.text; trouve = true; } });
    else { var champ = formulaire.querySelector("input[name='vehicule']"); if (champ) { champ.value = voulu; trouve = true; } }
    var message = formulaire.querySelector("textarea[name='message']");
    if (message && !message.value) message.value = "Bonjour, je suis intéressé par : " + voulu + (trouve ? "." : " (véhicule réservé, merci de me prévenir s'il se libère).");
  })();

  /* Halo qui suit la souris sur les cartes */
  document.querySelectorAll(".carte").forEach(function (c) {
    c.addEventListener("pointermove", function (e) {
      var b = c.getBoundingClientRect();
      c.style.setProperty("--mx", (e.clientX - b.left) + "px");
      c.style.setProperty("--my", (e.clientY - b.top) + "px");
    });
  });

  if (calme || !("IntersectionObserver" in window)) return;
  racine.classList.add("anim");

  /* Apparition au défilement et compteurs */
  function compter(el) {
    var but = +el.dataset.compte, debut = performance.now(), duree = 1400;
    (function pas(t) {
      var p = Math.min(1, (t - debut) / duree), v = Math.round(but * (1 - Math.pow(1 - p, 3)));
      el.textContent = v.toLocaleString("fr-FR").replace(/ /g, " ");
      if (p < 1) requestAnimationFrame(pas);
    })(debut);
  }
  var obs = new IntersectionObserver(function (entrees) {
    entrees.forEach(function (e) {
      if (!e.isIntersecting) return;
      e.target.classList.add("vu");
      e.target.querySelectorAll("[data-compte]").forEach(compter);
      obs.unobserve(e.target);
    });
  }, { threshold: 0.12, rootMargin: "0px 0px -6% 0px" });
  document.querySelectorAll(".r").forEach(function (el) { obs.observe(el); });

  /* Fil des étapes qui se remplit */
  var etapes = document.getElementById("fil-etapes"), enAttente = false;
  function avancer() {
    enAttente = false;
    var b = etapes.getBoundingClientRect(), h = window.innerHeight;
    var p = (h * 0.7 - b.top) / b.height;
    etapes.style.setProperty("--avance", Math.max(0, Math.min(1, p)).toFixed(3));
  }
  if (etapes) {
    window.addEventListener("scroll", function () { if (!enAttente) { enAttente = true; requestAnimationFrame(avancer); } }, { passive: true });
    avancer();
  }
})();
