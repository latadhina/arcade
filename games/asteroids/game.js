(() => {
  var canvas = document.getElementById("c");
  var ctx = canvas.getContext("2d");
  var W = canvas.width;
  var H = canvas.height;

  var READY = 0, PLAY = 1, OVER = 2, BETWEEN = 3;
  var state = READY;
  var score = 0, wave = 1, best = 0, lives = 3;
  try { best = Number(localStorage.getItem("lata_asteroids_best") || 0); } catch (e) {}

  var ship = { x: W / 2, y: H / 2, a: -Math.PI / 2, vx: 0, vy: 0 };
  var bullets = [];
  var rocks = [];
  var keys = { left: false, right: false, thrust: false, fire: false };
  var cool = 0;
  var betweenTimer = 0;
  var invuln = 0;

  function wrap(o, r) {
    if (o.x < -r) o.x = W + r;
    if (o.x > W + r) o.x = -r;
    if (o.y < -r) o.y = H + r;
    if (o.y > H + r) o.y = -r;
  }

  function makeRock(x, y, r, speed) {
    var a = Math.random() * Math.PI * 2;
    var verts = [];
    var n = 7 + Math.floor(Math.random() * 4);
    for (var i = 0; i < n; i++) {
      var t = (i / n) * Math.PI * 2;
      var rr = r * (0.7 + Math.random() * 0.4);
      verts.push({ x: Math.cos(t) * rr, y: Math.sin(t) * rr });
    }
    return {
      x: x, y: y, r: r,
      vx: Math.cos(a) * speed,
      vy: Math.sin(a) * speed,
      rot: 0,
      spin: (Math.random() - 0.5) * 0.05,
      verts: verts
    };
  }

  function spawnField() {
    rocks = [];
    var count = Math.min(10, 3 + wave);
    var speedBase = 0.9 + wave * 0.18;
    for (var i = 0; i < count; i++) {
      var ang = (i / count) * Math.PI * 2 + Math.random() * 0.3;
      rocks.push(makeRock(
        W / 2 + Math.cos(ang) * (150 + Math.random() * 40),
        H / 2 + Math.sin(ang) * (150 + Math.random() * 40),
        28 + Math.min(12, wave),
        speedBase + Math.random() * 0.9
      ));
    }
  }

  function start() {
    score = 0;
    wave = 1;
    lives = 3;
    bullets = [];
    ship = { x: W / 2, y: H / 2, a: -Math.PI / 2, vx: 0, vy: 0 };
    invuln = 90;
    spawnField();
    state = PLAY;
  }

  function die() {
    if (invuln > 0) return;
    lives -= 1;
    if (lives <= 0) {
      state = OVER;
      if (score > best) {
        best = score;
        try { localStorage.setItem("lata_asteroids_best", String(best)); } catch (e) {}
      }
      if (window.LataPromo) window.LataPromo.onGameOver();
      return;
    }
    ship = { x: W / 2, y: H / 2, a: -Math.PI / 2, vx: 0, vy: 0 };
    invuln = 120;
  }

  function fire() {
    if (cool > 0) return;
    bullets.push({
      x: ship.x + Math.cos(ship.a) * 14,
      y: ship.y + Math.sin(ship.a) * 14,
      vx: Math.cos(ship.a) * 8 + ship.vx,
      vy: Math.sin(ship.a) * 8 + ship.vy,
      life: 42
    });
    cool = Math.max(6, 11 - Math.floor(wave / 3));
  }

  function splitRock(rock, index) {
    rocks.splice(index, 1);
    if (rock.r > 18) {
      rocks.push(makeRock(rock.x, rock.y, rock.r * 0.55, 1.6 + wave * 0.1 + Math.random()));
      rocks.push(makeRock(rock.x, rock.y, rock.r * 0.55, 1.6 + wave * 0.1 + Math.random()));
      score += 20;
    } else if (rock.r > 10) {
      rocks.push(makeRock(rock.x, rock.y, rock.r * 0.5, 2.2 + wave * 0.1 + Math.random()));
      rocks.push(makeRock(rock.x, rock.y, rock.r * 0.5, 2.2 + wave * 0.1 + Math.random()));
      score += 40;
    } else {
      score += 80;
    }
    if (rocks.length === 0) {
      score += 150 * wave;
      wave++;
      betweenTimer = 1.5;
      state = BETWEEN;
    }
  }

  function update() {
    if (state === BETWEEN) {
      betweenTimer -= 1 / 60;
      if (betweenTimer <= 0) {
        ship = { x: W / 2, y: H / 2, a: -Math.PI / 2, vx: 0, vy: 0 };
        bullets = [];
        invuln = 90;
        spawnField();
        state = PLAY;
      }
      return;
    }
    if (state !== PLAY) return;
    if (invuln > 0) invuln -= 1;

    if (keys.left) ship.a -= 0.08;
    if (keys.right) ship.a += 0.08;
    if (keys.thrust) {
      ship.vx += Math.cos(ship.a) * 0.18;
      ship.vy += Math.sin(ship.a) * 0.18;
    }
    if (keys.fire) fire();
    if (cool > 0) cool -= 1;

    ship.vx *= 0.99;
    ship.vy *= 0.99;
    ship.x += ship.vx;
    ship.y += ship.vy;
    wrap(ship, 12);

    for (var i = bullets.length - 1; i >= 0; i--) {
      var b = bullets[i];
      b.x += b.vx;
      b.y += b.vy;
      b.life -= 1;
      wrap(b, 2);
      if (b.life <= 0) bullets.splice(i, 1);
    }

    for (var r = rocks.length - 1; r >= 0; r--) {
      var rock = rocks[r];
      rock.x += rock.vx;
      rock.y += rock.vy;
      rock.rot += rock.spin;
      wrap(rock, rock.r);

      var dx = ship.x - rock.x;
      var dy = ship.y - rock.y;
      if (invuln <= 0 && dx * dx + dy * dy < (rock.r + 8) * (rock.r + 8)) {
        die();
        return;
      }

      for (var bi = bullets.length - 1; bi >= 0; bi--) {
        var bullet = bullets[bi];
        var bx = bullet.x - rock.x;
        var by = bullet.y - rock.y;
        if (bx * bx + by * by < rock.r * rock.r) {
          bullets.splice(bi, 1);
          splitRock(rock, r);
          break;
        }
      }
    }
  }

  function drawRock(rock) {
    ctx.save();
    ctx.translate(rock.x, rock.y);
    ctx.rotate(rock.rot);
    ctx.beginPath();
    for (var i = 0; i < rock.verts.length; i++) {
      var v = rock.verts[i];
      if (i === 0) ctx.moveTo(v.x, v.y);
      else ctx.lineTo(v.x, v.y);
    }
    ctx.closePath();
    ctx.strokeStyle = "#cfd3da";
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.restore();
  }

  function draw() {
    ctx.fillStyle = "#05070c";
    ctx.fillRect(0, 0, W, H);
    ctx.fillStyle = "rgba(255,255,255,0.28)";
    for (var s = 0; s < 50; s++) ctx.fillRect((s * 73) % W, (s * 41) % H, 2, 2);

    ctx.fillStyle = "#cfd3da";
    ctx.font = "600 13px monospace";
    ctx.textAlign = "left";
    ctx.fillText("SCORE " + score, 14, 24);
    ctx.textAlign = "center";
    ctx.fillText("WAVE " + wave, W / 2, 24);
    ctx.textAlign = "right";
    ctx.fillText("LIVES " + lives + "  BEST " + best, W - 14, 24);

    for (var i = 0; i < rocks.length; i++) drawRock(rocks[i]);

    if (invuln <= 0 || (invuln % 6 < 3)) {
      ctx.save();
      ctx.translate(ship.x, ship.y);
      ctx.rotate(ship.a);
      ctx.beginPath();
      ctx.moveTo(14, 0);
      ctx.lineTo(-10, 9);
      ctx.lineTo(-6, 0);
      ctx.lineTo(-10, -9);
      ctx.closePath();
      ctx.strokeStyle = "#c8f135";
      ctx.lineWidth = 2;
      ctx.stroke();
      if (keys.thrust && state === PLAY) {
        ctx.beginPath();
        ctx.moveTo(-10, 0);
        ctx.lineTo(-18, 4);
        ctx.lineTo(-14, 0);
        ctx.lineTo(-18, -4);
        ctx.closePath();
        ctx.strokeStyle = "#f08050";
        ctx.stroke();
      }
      ctx.restore();
    }

    ctx.fillStyle = "#f3efe4";
    for (var b = 0; b < bullets.length; b++) {
      ctx.beginPath();
      ctx.arc(bullets[b].x, bullets[b].y, 2.5, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.textAlign = "center";
    if (state === READY) {
      ctx.fillStyle = "rgba(5,7,12,0.78)";
      ctx.fillRect(60, H * 0.38, W - 120, 110);
      ctx.fillStyle = "#c8f135";
      ctx.font = "700 28px sans-serif";
      ctx.fillText("ASTEROIDS", W / 2, H * 0.38 + 42);
      ctx.fillStyle = "#f3efe4";
      ctx.font = "14px sans-serif";
      ctx.fillText("Clear waves of rocks", W / 2, H * 0.38 + 74);
    } else if (state === BETWEEN) {
      ctx.fillStyle = "rgba(5,7,12,0.75)";
      ctx.fillRect(60, H * 0.38, W - 120, 100);
      ctx.fillStyle = "#c8f135";
      ctx.font = "700 26px sans-serif";
      ctx.fillText("WAVE " + wave, W / 2, H * 0.38 + 48);
      ctx.fillStyle = "#f3efe4";
      ctx.font = "14px sans-serif";
      ctx.fillText("More and faster rocks", W / 2, H * 0.38 + 78);
    } else if (state === OVER) {
      ctx.fillStyle = "rgba(5,7,12,0.84)";
      ctx.fillRect(60, H * 0.36, W - 120, 120);
      ctx.fillStyle = "#c8f135";
      ctx.font = "700 26px sans-serif";
      ctx.fillText("GAME OVER", W / 2, H * 0.36 + 42);
      ctx.fillStyle = "#f3efe4";
      ctx.font = "18px monospace";
      ctx.fillText("Wave " + wave + " · " + score, W / 2, H * 0.36 + 74);
      ctx.font = "13px sans-serif";
      ctx.fillText("Tap to retry", W / 2, H * 0.36 + 100);
    }
  }

  function loop() {
    update();
    draw();
    requestAnimationFrame(loop);
  }

  function bindHold(id, key) {
    var el = document.getElementById(id);
    if (!el) return;
    function down(e) {
      e.preventDefault();
      keys[key] = true;
      if (state === READY || state === OVER) start();
    }
    function up(e) {
      e.preventDefault();
      keys[key] = false;
    }
    el.addEventListener("pointerdown", down);
    el.addEventListener("pointerup", up);
    el.addEventListener("pointerleave", up);
    el.addEventListener("pointercancel", up);
  }

  bindHold("btn-left", "left");
  bindHold("btn-right", "right");
  bindHold("btn-thrust", "thrust");

  canvas.addEventListener("pointerdown", function () {
    if (state === READY || state === OVER) start();
    else if (state === PLAY) fire();
  });
  window.addEventListener("keydown", function (e) {
    if (e.code === "ArrowLeft" || e.code === "KeyA") keys.left = true;
    if (e.code === "ArrowRight" || e.code === "KeyD") keys.right = true;
    if (e.code === "ArrowUp" || e.code === "KeyW") keys.thrust = true;
    if (e.code === "Space") {
      e.preventDefault();
      keys.fire = true;
      if (state === READY || state === OVER) start();
      else fire();
    }
  });
  window.addEventListener("keyup", function (e) {
    if (e.code === "ArrowLeft" || e.code === "KeyA") keys.left = false;
    if (e.code === "ArrowRight" || e.code === "KeyD") keys.right = false;
    if (e.code === "ArrowUp" || e.code === "KeyW") keys.thrust = false;
    if (e.code === "Space") keys.fire = false;
  });

  spawnField();
  loop();
})();
