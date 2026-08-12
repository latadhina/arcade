(function () {
  var products = window.LATA_PRODUCTS || [];
  var slidesEl = document.getElementById("ad-slides");
  var dotsEl = document.getElementById("ad-dots");
  var ctaEl = document.getElementById("ad-cta");
  if (!slidesEl || !products.length) return;

  var i = 0;
  var timer = null;
  var INTERVAL = 4200;

  products.forEach(function (p, idx) {
    var slide = document.createElement("article");
    slide.className = "ad-slide" + (idx === 0 ? " is-active" : "");
    slide.dataset.index = String(idx);
    slide.innerHTML =
      '<div class="ad-shot-wrap">' +
        '<img class="ad-shot" src="' + p.shot + '" alt="' + p.name + ' screenshot" loading="lazy" />' +
        '<img class="ad-tile" src="' + p.tile + '" alt="" aria-hidden="true" />' +
      "</div>" +
      '<div class="ad-meta">' +
        '<img class="ad-logo" src="' + (p.logo || p.tile) + '" alt="" />' +
        "<div>" +
          "<h3>" + p.name + "</h3>" +
          "<p>" + p.blurb + "</p>" +
        "</div>" +
      "</div>";
    slidesEl.appendChild(slide);

    var dot = document.createElement("button");
    dot.type = "button";
    dot.className = "ad-dot" + (idx === 0 ? " is-active" : "");
    dot.setAttribute("aria-label", p.name);
    dot.addEventListener("click", function () { go(idx, true); });
    dotsEl.appendChild(dot);
  });

  function go(n, user) {
    var slides = slidesEl.querySelectorAll(".ad-slide");
    var dots = dotsEl.querySelectorAll(".ad-dot");
    i = (n + products.length) % products.length;
    for (var s = 0; s < slides.length; s++) {
      slides[s].classList.toggle("is-active", s === i);
      dots[s].classList.toggle("is-active", s === i);
    }
    var p = products[i];
    ctaEl.textContent = p.cta;
    ctaEl.href = window.lataStoreUrl(p);
    if (user) restart();
  }

  function next() { go(i + 1, false); }

  function restart() {
    clearInterval(timer);
    timer = setInterval(next, INTERVAL);
  }

  // pause on hover/focus for readability
  var screen = document.querySelector(".ad-screen");
  if (screen) {
    screen.addEventListener("mouseenter", function () { clearInterval(timer); });
    screen.addEventListener("mouseleave", restart);
  }

  go(0, false);
  restart();
})();
