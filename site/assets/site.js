(function () {
  var racine = document.documentElement;
  var calme = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  /* Menu mobile */
  var btn = document.getElementById("menu-btn"), nav = document.getElementById("nav");
  btn.addEventListener("click", function () {
    var ouvert = nav.classList.toggle("ouvert");
    btn.setAttribute("aria-expanded", ouvert);
  });
  nav.addEventListener("click", function (e) {
    if (e.target.tagName === "A") { nav.classList.remove("ouvert"); btn.setAttribute("aria-expanded", "false"); }
  });

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
