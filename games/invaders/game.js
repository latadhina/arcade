(() => {
  var canvas = document.getElementById("c");
  var ctx = canvas.getContext("2d");
  var W = canvas.width;
  var H = canvas.height;

  var READY = 0, PLAY = 1, OVER = 2, WIN = 3;
  var state = READY;
  var score = 0;
  var best = 0;
  try { best = Number(localStorage.getItem("lata_invaders_best") || 0); } catch (e) {}

  var ship = { x: W / 2, y: H - 48, w: 28, h: 14 };
  var bullets = [];
  var enemies = [];
  var dir = 1;
  var stepTimer = 0;
  var stepEvery = 28;
  var shootCool = 0;
  var keys = { left: false, right: false, shoot: false };
  var pointerAim = null;

  function spawnWave() {
    enemies = [];
    var rows = 4, cols = 8;
    var startX = 46, startY = 70;
    for (var r = 0; r < rows; r++) {
      for (var c = 0; c < cols; c++) {
        enemies.push({
          x: startX + c * 42,
          y: startY + r * 34,
          w: 24,
          h: 16,
          alive: true
        });
      }
    }
    dir = 1;
    stepEvery = 28;
    stepTimer = 0;
  }

  function start() {
    score = 0;
    bullets = [];
    ship.x = W / 2;
    spawnWave();
    state = PLAY;
  }

  function end(win) {
    state = win ? WIN : OVER;
    if (score > best) {
      best = score;
      try { localStorage.setItem("lata_invaders_best", String(best)); } catch (e) {}
    }
    if (window.LataPromo) window.LataPromo.onGameOver();
  }

  function fire() {
    if (shootCool > 0) return;
    bullets.push({ x: ship.x, y: ship.y - 10, vy: -8, from: "p" });
    shootCool = 14;
  }

  function update() {
    if (state !== PLAY) return;

    if (pointerAim != null) {
      ship.x += (pointerAim - ship.x) * 0.3;
    } else {
      if (keys.left) ship.x -= 5;
      if (keys.right) ship.x += 5;
    }
    ship.x = Math.max(20, Math.min(W - 20, ship.x));
    if (keys.shoot) fire();
    if (shootCool > 0) shootCool -= 1;

    for (var i = bullets.length - 1; i >= 0; i--) {
      var b = bullets[i];
      b.y += b.vy;
      if (b.y < -10 || b.y > H + 10) bullets.splice(i, 1);
    }

    stepTimer += 1;
    if (stepTimer >= stepEvery) {
      stepTimer = 0;
      var hitEdge = false;
      for (var e = 0; e < enemies.length; e++) {
        if (!enemies[e].alive) continue;
        if ((dir > 0 && enemies[e].x + enemies[e].w > W - 18) ||
            (dir < 0 && enemies[e].x < 18)) {
          hitEdge = true;
          break;
        }
      }
      if (hitEdge) {
        dir *= -1;
        for (var d = 0; d < enemies.length; d++) {
          if (enemies[d].alive) enemies[d].y += 16;
        }
        stepEvery = Math.max(8, stepEvery - 1);
      } else {
        for (var m = 0; m < enemies.length; m++) {
          if (enemies[m].alive) enemies[m].x += dir * 12;
        }
      }
    }

    // collisions
    for (var bi = bullets.length - 1; bi >= 0; bi--) {
      var bullet = bullets[bi];
      if (bullet.from !== "p") continue;
      for (var ei = 0; ei < enemies.length; ei++) {
        var en = enemies[ei];
        if (!en.alive) continue;
        if (
          bullet.x > en.x && bullet.x < en.x + en.w &&
          bullet.y > en.y && bullet.y < en.y + en.h
        ) {
          en.alive = false;
          bullets.splice(bi, 1);
          score += 20;
          break;
        }
      }
    }

    var alive = 0;
    for (var a = 0; a < enemies.length; a++) {
      if (!enemies[a].alive) continue;
      alive += 1;
      if (enemies[a].y + enemies[a].h >= ship.y) {
        end(false);
        return;
      }
    }
    if (alive === 0) end(true);
  }

  function drawAlien(x, y, w, h) {
    ctx.fillStyle = "#c8f135";
    ctx.fillRect(x, y + 4, w, h - 6);
    ctx.fillRect(x + 4, y, w - 8, 4);
    ctx.fillRect(x - 2, y + 8, 4, 6);
    ctx.fillRect(x + w - 2, y + 8, 4, 6);
    ctx.fillStyle = "#0b1424";
    ctx.fillRect(x + 5, y + 7, 4, 4);
    ctx.fillRect(x + w - 9, y + 7, 4, 4);
  }

  function draw() {
    ctx.fillStyle = "#050810";
    ctx.fillRect(0, 0, W, H);

    // stars
    ctx.fillStyle = "rgba(255,255,255,0.35)";
    for (var s = 0; s < 40; s++) {
      ctx.fillRect((s * 97) % W, (s * 53) % H, 2, 2);
    }

    ctx.fillStyle = "#cfd3da";
    ctx.font = "600 14px monospace";
    ctx.textAlign = "left";
    ctx.fillText("SCORE  " + score, 16, 28);
    ctx.textAlign = "right";
    ctx.fillText("BEST  " + best, W - 16, 28);

    for (var i = 0; i < enemies.length; i++) {
      if (enemies[i].alive) drawAlien(enemies[i].x, enemies[i].y, enemies[i].w, enemies[i].h);
    }

    // ship
    ctx.fillStyle = "#5ad0e6";
    ctx.beginPath();
    ctx.moveTo(ship.x, ship.y - ship.h);
    ctx.lineTo(ship.x - ship.w / 2, ship.y);
    ctx.lineTo(ship.x + ship.w / 2, ship.y);
    ctx.closePath();
    ctx.fill();

    ctx.fillStyle = "#f3efe4";
    for (var b = 0; b < bullets.length; b++) {
      ctx.fillRect(bullets[b].x - 2, bullets[b].y - 8, 4, 10);
    }

    ctx.textAlign = "center";
    if (state === READY) {
      ctx.fillStyle = "rgba(5,8,16,0.78)";
      ctx.fillRect(36, H * 0.40, W - 72, 110);
      ctx.fillStyle = "#c8f135";
      ctx.font = "700 24px sans-serif";
      ctx.fillText("SPACE INVADERS", W / 2, H * 0.40 + 42);
      ctx.fillStyle = "#f3efe4";
      ctx.font = "14px sans-serif";
      ctx.fillText("Tap to start · move & shoot", W / 2, H * 0.40 + 74);
    } else if (state === OVER || state === WIN) {
      ctx.fillStyle = "rgba(5,8,16,0.84)";
      ctx.fillRect(36, H * 0.38, W - 72, 120);
      ctx.fillStyle = "#c8f135";
      ctx.font = "700 26px sans-serif";
      ctx.fillText(state === WIN ? "WAVE CLEAR" : "INVADED", W / 2, H * 0.38 + 42);
      ctx.fillStyle = "#f3efe4";
      ctx.font = "20px monospace";
      ctx.fillText(String(score), W / 2, H * 0.38 + 74);
      ctx.font = "13px sans-serif";
      ctx.fillText("Tap to retry", W / 2, H * 0.38 + 100);
    }
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
    if (state !== PLAY) start();
    else fire();
  });
  window.addEventListener("keydown", function (e) {
    if (e.code === "ArrowLeft" || e.code === "KeyA") keys.left = true;
    if (e.code === "ArrowRight" || e.code === "KeyD") keys.right = true;
    if (e.code === "Space") {
      e.preventDefault();
      keys.shoot = true;
      if (state !== PLAY) start();
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
