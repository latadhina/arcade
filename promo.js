/* Shared arcade promo — after every N finished games */
(function (global) {
  var KEY = "lata_arcade_games_finished";
  var EVERY = 5;
  var DURATION_MS = 3000;

  function products() {
    return global.LATA_PRODUCTS || [];
  }

  function getCount() {
    try { return Number(localStorage.getItem(KEY) || 0); } catch (e) { return 0; }
  }

  function setCount(n) {
    try { localStorage.setItem(KEY, String(n)); } catch (e) {}
  }

  function ensureStyles() {
    if (document.getElementById("lata-promo-css")) return;
    var s = document.createElement("style");
    s.id = "lata-promo-css";
    s.textContent = [
      "#lata-promo{position:fixed;inset:0;z-index:9999;display:flex;align-items:center;justify-content:center;",
      "background:rgba(10,12,16,.72);opacity:0;transition:opacity .2s;font-family:system-ui,sans-serif}",
      "#lata-promo.show{opacity:1}",
      "#lata-promo .card{width:min(360px,92vw);background:#f4f1ea;color:#1a1a1a;border:3px solid #111;",
      "padding:16px;box-shadow:8px 8px 0 #111}",
      "#lata-promo .row{display:flex;gap:12px;align-items:center;margin-bottom:10px}",
      "#lata-promo img.tile{width:72px;height:72px;object-fit:cover;border:2px solid #111;flex-shrink:0}",
      "#lata-promo .eyebrow{font-size:11px;letter-spacing:.08em;text-transform:uppercase;color:#666;margin-bottom:4px}",
      "#lata-promo h2{font-size:18px;margin:0 0 4px;line-height:1.2}",
      "#lata-promo p{font-size:13px;color:#333;margin:0;line-height:1.4}",
      "#lata-promo .actions{display:flex;gap:8px;flex-wrap:wrap;margin-top:12px}",
      "#lata-promo a.btn{display:inline-block;padding:8px 12px;background:#111;color:#f4f1ea;text-decoration:none;",
      "font-size:13px;font-weight:600}",
      "#lata-promo .timer{margin-top:10px;font-size:11px;color:#777}"
    ].join("");
    document.head.appendChild(s);
  }

  function pickProduct() {
    var list = products();
    if (!list.length) return null;
    return list[Math.floor(Math.random() * list.length)];
  }

  function showPromo(done) {
    var p = pickProduct();
    if (!p) { if (done) done(); return; }
    ensureStyles();
    var href = (global.lataStoreUrl ? global.lataStoreUrl(p) : p.storeWeb);
    var tileSrc = /\/games\//.test(location.pathname) ? "../../" + p.tile : p.tile;
    var el = document.createElement("div");
    el.id = "lata-promo";
    el.setAttribute("role", "dialog");
    el.innerHTML =
      '<div class="card">' +
        '<div class="eyebrow">Featured apps</div>' +
        '<div class="row">' +
          '<img class="tile" src="' + tileSrc + '" alt="' + p.name + '" />' +
          "<div><h2>" + p.name + "</h2><p>" + p.blurb + "</p></div>" +
        "</div>" +
        '<div class="actions">' +
          '<a class="btn" href="' + href + '" target="_blank" rel="noopener">' + p.cta + "</a>" +
        "</div>" +
        '<div class="timer">Closing in <span id="lata-promo-sec">3</span>s — tap to dismiss</div>' +
      "</div>";

    document.body.appendChild(el);
    requestAnimationFrame(function () { el.classList.add("show"); });

    var left = Math.ceil(DURATION_MS / 1000);
    var sec = el.querySelector("#lata-promo-sec");
    var iv = setInterval(function () {
      left -= 1;
      if (sec) sec.textContent = String(Math.max(0, left));
    }, 1000);

    var closed = false;
    function close() {
      if (closed) return;
      closed = true;
      clearInterval(iv);
      el.classList.remove("show");
      setTimeout(function () {
        if (el.parentNode) el.parentNode.removeChild(el);
        if (done) done();
      }, 200);
    }

    el.addEventListener("click", function (e) {
      if (e.target && e.target.closest && e.target.closest("a")) return;
      close();
    });
    setTimeout(close, DURATION_MS);
  }

  function onGameOver() {
    var n = getCount() + 1;
    setCount(n);
    if (n > 0 && n % EVERY === 0) {
      showPromo();
      return true;
    }
    return false;
  }

  global.LataPromo = { onGameOver: onGameOver, showPromo: showPromo };
})(window);
