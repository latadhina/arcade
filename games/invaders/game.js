(() => {
  var canvas = document.getElementById("c");
  var ctx = canvas.getContext("2d");
  var W = canvas.width;
  var H = canvas.height;

  var READY = 0, PLAY = 1, OVER = 2;
  var state = READY;
  var score = 0, wave = 1, best = 0, lives = 3;
  try { best = Number(localStorage.getItem("lata_invaders_best") || 0); } catch (e) {}

  var ship = { x: W / 2, y: H - 48, w: 28, h: 14 };
  var bullets = [];
  var enemyShots = [];
  var enemies = [];
  var dir = 1;
  var stepTimer = 0;
  var stepEvery = 28;
  var shootCool = 0;
  var invuln = 0;
  var keys = { left: false, right: false, shoot: false };
  var pointerAim = null;
  var fx = [];
  var banner = null;

  function waveConfig(w) {
    return {
      rows: Math.min(6, 3 + Math.floor((w - 1) / 1)),
      cols: Math.min(10, 6 + Math.floor((w - 1) / 2)),
      step: Math.max(8, 30 - w * 2),
      shotChance: Math.min(0.035, 0.008 + w * 0.004),
      drop: 14 + Math.min(8, w)
    };
  }

  function celebrate(label) {
    banner = { text: label, t: 0, max: 0.85, x: W / 2, y: 36 };
    var colors = ["#f0c040", "#ff6b4a", "#c8f135", "#5ad0e6", "#fff", "#f080a0"];
    var i;
    for (i = 0; i < 28; i++) {
      var a = Math.random() * Math.PI * 2;
      var sp = 40 + Math.random() * 120;
      fx.push({
        x: W / 2, y: 40,
        vx: Math.cos(a) * sp, vy: Math.sin(a) * sp - 30,
        life: 0.55 + Math.random() * 0.35, max: 0.9,
        color: colors[(Math.random() * colors.length) | 0],
        size: 2 + Math.random() * 3
      });
    }
    for (i = 0; i < 12; i++) {
      var a2 = (i / 12) * Math.PI * 2;
      fx.push({
        x: W / 2, y: 40,
        vx: Math.cos(a2) * 90, vy: Math.sin(a2) * 90,
        life: 0.4, max: 0.4, color: "#fff", size: 2
      });
    }
  }

  function updateFx(dt) {
    if (banner) {
      banner.t += dt;
      if (banner.t >= banner.max) banner = null;
    }
    for (var i = fx.length - 1; i >= 0; i--) {
      var p = fx[i];
      p.life -= dt;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.vy += 180 * dt;
      if (p.life <= 0) fx.splice(i, 1);
    }
  }

  function drawFx() {
    var i;
    for (i = 0; i < fx.length; i++) {
      var p = fx[i];
      var a = Math.max(0, p.life / (p.max || 0.6));
      ctx.globalAlpha = a;
      ctx.fillStyle = p.color;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size * a, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
    if (banner) {
      var k = banner.t / banner.max;
      var scale = 1 + k * 1.8;
      var alpha = k < 0.25 ? k / 0.25 : Math.max(0, 1 - (k - 0.25) / 0.75);
      ctx.save();
      ctx.translate(banner.x, banner.y);
      ctx.scale(scale, scale);
      ctx.globalAlpha = alpha;
      ctx.fillStyle = "#fff";
      ctx.strokeStyle = "#000";
      ctx.lineWidth = 3;
      ctx.font = "bold 16px sans-serif";
      ctx.textAlign = "center";
      ctx.strokeText(banner.text, 0, 0);
      ctx.fillText(banner.text, 0, 0);
      ctx.restore();
      ctx.globalAlpha = 1;
    }
  }

  function spawnWave() {
    enemies = [];
    enemyShots = [];
    bullets = [];
    var cfg = waveConfig(wave);
    var startX = 30;
    var startY = 58;
    var gapX = Math.min(42, (W - 60) / cfg.cols);
    for (var r = 0; r < cfg.rows; r++) {
      for (var c = 0; c < cfg.cols; c++) {
        enemies.push({
          x: startX + c * gapX,
          y: startY + r * 32,
          w: 22,
          h: 15,
          alive: true,
          hp: wave >= 4 && r === 0 ? 2 : 1,
          kind: r === 0 ? "elite" : "norm"
        });
      }
    }
    dir = 1;
    stepEvery = cfg.step;
    stepTimer = 0;
  }

  function start() {
    score = 0;
    wave = 1;
    lives = 3;
    ship.x = W / 2;
    invuln = 0;
    fx = [];
    banner = null;
    spawnWave();
    state = PLAY;
  }

  function end() {
    state = OVER;
    if (score > best) {
      best = score;
      try { localStorage.setItem("lata_invaders_best", String(best)); } catch (e) {}
    }
    if (window.LataPromo) window.LataPromo.onGameOver();
  }

  function nextWave() {
    wave++;
    score += 100 * (wave - 1);
    spawnWave();
    invuln = 90;
    celebrate("WAVE " + wave);
  }

  function fire() {
    if (shootCool > 0 || state !== PLAY) return;
    bullets.push({ x: ship.x, y: ship.y - 10, vy: -8.5 });
    shootCool = Math.max(8, 14 - Math.floor(wave / 2));
  }

  function update() {
    updateFx(1 / 60);
    if (state !== PLAY) return;
    if (invuln > 0) invuln -= 1;

    if (pointerAim != null) ship.x += (pointerAim - ship.x) * 0.3;
    else {
      if (keys.left) ship.x -= 5;
      if (keys.right) ship.x += 5;
    }
    ship.x = Math.max(20, Math.min(W - 20, ship.x));
    if (keys.shoot) fire();
    if (shootCool > 0) shootCool -= 1;

    var i, b, e;
    for (i = bullets.length - 1; i >= 0; i--) {
      bullets[i].y += bullets[i].vy;
      if (bullets[i].y < -12) bullets.splice(i, 1);
    }
    for (i = enemyShots.length - 1; i >= 0; i--) {
      enemyShots[i].y += enemyShots[i].vy;
      if (enemyShots[i].y > H + 12) enemyShots.splice(i, 1);
    }

    var cfg = waveConfig(wave);
    stepTimer += 1;
    if (stepTimer >= stepEvery) {
      stepTimer = 0;
      var hitEdge = false;
      for (e = 0; e < enemies.length; e++) {
        if (!enemies[e].alive) continue;
        if ((dir > 0 && enemies[e].x + enemies[e].w > W - 14) ||
            (dir < 0 && enemies[e].x < 14)) { hitEdge = true; break; }
      }
      if (hitEdge) {
        dir *= -1;
        for (e = 0; e < enemies.length; e++) if (enemies[e].alive) enemies[e].y += cfg.drop;
        stepEvery = Math.max(6, stepEvery - 1);
      } else {
        for (e = 0; e < enemies.length; e++) if (enemies[e].alive) enemies[e].x += dir * (10 + wave);
      }
      var shooters = [];
      for (e = 0; e < enemies.length; e++) if (enemies[e].alive) shooters.push(enemies[e]);
      if (shooters.length && Math.random() < cfg.shotChance * shooters.length) {
        var s = shooters[(Math.random() * shooters.length) | 0];
        enemyShots.push({ x: s.x + s.w / 2, y: s.y + s.h, vy: 3.2 + wave * 0.25 });
      }
    }

    for (i = bullets.length - 1; i >= 0; i--) {
      b = bullets[i];
      for (e = 0; e < enemies.length; e++) {
        var en = enemies[e];
        if (!en.alive) continue;
        if (b.x > en.x && b.x < en.x + en.w && b.y > en.y && b.y < en.y + en.h) {
          en.hp -= 1;
          bullets.splice(i, 1);
          if (en.hp <= 0) {
            en.alive = false;
            score += en.kind === "elite" ? 40 : 20;
          }
          break;
        }
      }
    }

    for (i = enemyShots.length - 1; i >= 0; i--) {
      b = enemyShots[i];
      if (invuln > 0) continue;
      if (Math.abs(b.x - ship.x) < ship.w * 0.45 && b.y > ship.y - ship.h && b.y < ship.y + 4) {
        enemyShots.splice(i, 1);
        lives -= 1;
        if (lives <= 0) { end(); return; }
        invuln = 60;
      }
    }

    var alive = 0;
    for (e = 0; e < enemies.length; e++) {
      if (!enemies[e].alive) continue;
      alive++;
      if (enemies[e].y + enemies[e].h >= ship.y - 4) { end(); return; }
    }
    if (alive === 0) nextWave();
  }

  function drawAlien(en) {
    ctx.fillStyle = en.kind === "elite" ? "#f0a040" : "#c8f135";
    ctx.fillRect(en.x, en.y + 4, en.w, en.h - 6);
    ctx.fillRect(en.x + 4, en.y, en.w - 8, 4);
    ctx.fillStyle = "#0b1424";
    ctx.fillRect(en.x + 5, en.y + 7, 4, 4);
    ctx.fillRect(en.x + en.w - 9, en.y + 7, 4, 4);
  }

  function draw() {
    ctx.fillStyle = "#050810";
    ctx.fillRect(0, 0, W, H);
    ctx.fillStyle = "rgba(255,255,255,0.35)";
    for (var s = 0; s < 40; s++) ctx.fillRect((s * 97) % W, (s * 53) % H, 2, 2);

    if (state === PLAY || state === OVER) {
      ctx.fillStyle = "rgba(0,0,0,0.35)";
      ctx.fillRect(8, 8, 58, 18);
      ctx.fillStyle = "#fff";
      ctx.font = "bold 11px sans-serif";
      ctx.textAlign = "left";
      ctx.fillText("wave " + wave, 14, 21);
    }

    ctx.fillStyle = "#cfd3da";
    ctx.font = "600 13px monospace";
    ctx.textAlign = "left";
    ctx.fillText("SCORE " + score, 14, 42);
    ctx.textAlign = "right";
    ctx.fillText("LIVES " + lives + "  BEST " + best, W - 14, 42);

    for (var i = 0; i < enemies.length; i++) if (enemies[i].alive) drawAlien(enemies[i]);

    if (invuln <= 0 || (invuln % 6 < 3)) {
      ctx.fillStyle = "#5ad0e6";
      ctx.beginPath();
      ctx.moveTo(ship.x, ship.y - ship.h);
      ctx.lineTo(ship.x - ship.w / 2, ship.y);
      ctx.lineTo(ship.x + ship.w / 2, ship.y);
      ctx.closePath();
      ctx.fill();
    }

    ctx.fillStyle = "#f3efe4";
    for (i = 0; i < bullets.length; i++) ctx.fillRect(bullets[i].x - 2, bullets[i].y - 8, 4, 10);
    ctx.fillStyle = "#ef6b6b";
    for (i = 0; i < enemyShots.length; i++) ctx.fillRect(enemyShots[i].x - 2, enemyShots[i].y, 4, 10);

    ctx.textAlign = "center";
    if (state === READY) {
      ctx.fillStyle = "rgba(5,8,16,0.78)";
      ctx.fillRect(36, H * 0.40, W - 72, 110);
      ctx.fillStyle = "#c8f135";
      ctx.font = "700 24px sans-serif";
      ctx.fillText("SPACE INVADERS", W / 2, H * 0.40 + 42);
      ctx.fillStyle = "#f3efe4";
      ctx.font = "14px sans-serif";
      ctx.fillText("Clear waves · dodge enemy fire", W / 2, H * 0.40 + 74);
    } else if (state === OVER) {
      ctx.fillStyle = "rgba(5,8,16,0.84)";
      ctx.fillRect(36, H * 0.38, W - 72, 120);
      ctx.fillStyle = "#c8f135";
      ctx.font = "700 26px sans-serif";
      ctx.fillText("INVADED", W / 2, H * 0.38 + 42);
      ctx.fillStyle = "#f3efe4";
      ctx.font = "18px monospace";
      ctx.fillText("Wave " + wave + " · " + score, W / 2, H * 0.38 + 74);
      ctx.font = "13px sans-serif";
      ctx.fillText("Tap to retry", W / 2, H * 0.38 + 100);
    }

    drawFx();
  }

  function loop() {
    update();
    draw();
    requestAnimationFrame(loop);
  }

  canvas.addEventListener("pointermove", function (e) {
    var rect = canvas.getBoundingClientRect();
    pointerAim = (e.clientX - rect.left) * (W / rect.width);
  });
  canvas.addEventListener("pointerdown", function (e) {
    var rect = canvas.getBoundingClientRect();
    pointerAim = (e.clientX - rect.left) * (W / rect.width);
    if (state === READY || state === OVER) start();
    else if (state === PLAY) fire();
  });
  window.addEventListener("keydown", function (e) {
    if (e.code === "ArrowLeft" || e.code === "KeyA") keys.left = true;
    if (e.code === "ArrowRight" || e.code === "KeyD") keys.right = true;
    if (e.code === "Space") {
      e.preventDefault();
      keys.shoot = true;
      if (state === READY || state === OVER) start();
      else fire();
    }
  });
  window.addEventListener("keyup", function (e) {
    if (e.code === "ArrowLeft" || e.code === "KeyA") keys.left = false;
    if (e.code === "ArrowRight" || e.code === "KeyD") keys.right = false;
    if (e.code === "Space") keys.shoot = false;
  });

  spawnWave();
  loop();
})();
