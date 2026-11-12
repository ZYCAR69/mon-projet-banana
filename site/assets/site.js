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
