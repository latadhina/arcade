(() => {
  var canvas = document.getElementById("c");
  var ctx = canvas.getContext("2d");
  var W = canvas.width;
  var H = canvas.height;

  var READY = 0, PLAY = 1, OVER = 2;
  var state = READY;
  var score = 0, level = 1, best = 0, lives = 3;
  try { best = Number(localStorage.getItem("lata_breakout_best") || 0); } catch (e) {}

  var COLORS = ["#e35d5b", "#f08050", "#f0c040", "#5ac46a", "#5ad0e6", "#c07aef"];
  var brickW = 46, brickH = 16, gap = 4;
  var MARGIN = 14;
  var bricks = [];
  var paddle = { w: 72, h: 12, x: W / 2 - 36, y: H - 48 };
  var ball = { x: W / 2, y: H - 70, vx: 0, vy: 0, r: 7 };
  var pointerX = paddle.x;
  var ballSpeed = 5.2;
  var fx = [];
  var banner = null;

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

  function layout() {
    var rows = Math.min(8, 4 + level);
    var cols = Math.min(10, 7 + Math.floor((level - 1) / 2));
    // fill almost to the color frame — no side gutters for the ball to sneak behind
    var inner = W - MARGIN * 2 - 4;
    brickW = Math.floor((inner - (cols - 1) * gap) / cols);
    var offsetX = MARGIN + 2 + Math.floor((inner - (cols * brickW + (cols - 1) * gap)) / 2);
    var offsetY = 64;
    bricks = [];
    for (var r = 0; r < rows; r++) {
      for (var c = 0; c < cols; c++) {
        if (level >= 3 && (r + c) % (level >= 5 ? 5 : 7) === 0 && r > 0) continue;
        bricks.push({
          x: offsetX + c * (brickW + gap),
          y: offsetY + r * (brickH + gap),
          w: brickW,
          h: brickH,
          alive: true,
          hp: level >= 4 && r < 2 ? 2 : 1,
          color: COLORS[r % COLORS.length]
        });
      }
    }
    paddle.w = Math.max(48, 78 - level * 3);
    ballSpeed = 4.6 + level * 0.35;
  }

  function launch() {
    var angle = (-70 + Math.random() * 50) * Math.PI / 180;
    ball.vx = Math.cos(angle) * ballSpeed;
    ball.vy = -Math.abs(Math.sin(angle) * ballSpeed);
  }

  function resetBallOnPaddle() {
    ball.x = paddle.x + paddle.w / 2;
    ball.y = paddle.y - 16;
    ball.vx = 0;
    ball.vy = 0;
  }

  function start() {
    score = 0;
    level = 1;
    lives = 3;
    fx = [];
    banner = null;
    layout();
    paddle.x = W / 2 - paddle.w / 2;
    resetBallOnPaddle();
    launch();
    state = PLAY;
  }

  function end() {
    state = OVER;
    if (score > best) {
      best = score;
      try { localStorage.setItem("lata_breakout_best", String(best)); } catch (e) {}
    }
    if (window.LataPromo) window.LataPromo.onGameOver();
  }

  function nextLevel() {
    level++;
    score += 200 * (level - 1);
    layout();
    paddle.x = Math.max(8, Math.min(W - paddle.w - 8, paddle.x));
    resetBallOnPaddle();
    launch();
    celebrate("LEVEL " + level);
  }

  function update() {
    updateFx(1 / 60);
    if (state !== PLAY) return;

    paddle.x += (pointerX - paddle.x) * 0.4;
    paddle.x = Math.max(MARGIN, Math.min(W - paddle.w - MARGIN, paddle.x));

    ball.x += ball.vx;
    ball.y += ball.vy;

    var left = MARGIN + ball.r;
    var right = W - MARGIN - ball.r;
    var top = MARGIN + ball.r;
    if (ball.x < left || ball.x > right) {
      ball.vx *= -1;
      ball.x = Math.max(left, Math.min(right, ball.x));
    }
    if (ball.y < top) {
      ball.vy = Math.abs(ball.vy);
      ball.y = top;
    }

    if (
      ball.vy > 0 &&
      ball.y + ball.r >= paddle.y &&
      ball.y - ball.r <= paddle.y + paddle.h &&
      ball.x >= paddle.x &&
      ball.x <= paddle.x + paddle.w
    ) {
      var hit = (ball.x - (paddle.x + paddle.w / 2)) / (paddle.w / 2);
      var spd = Math.sqrt(ball.vx * ball.vx + ball.vy * ball.vy);
      spd = Math.min(ballSpeed + 1.5, Math.max(ballSpeed, spd));
      var ang = (-Math.PI / 2) + hit * 0.9;
      ball.vx = Math.cos(ang) * spd;
      ball.vy = Math.sin(ang) * spd;
      if (ball.vy > -2) ball.vy = -2;
      ball.y = paddle.y - ball.r;
    }

    for (var i = 0; i < bricks.length; i++) {
      var b = bricks[i];
      if (!b.alive) continue;
      if (
        ball.x + ball.r > b.x &&
        ball.x - ball.r < b.x + b.w &&
        ball.y + ball.r > b.y &&
        ball.y - ball.r < b.y + b.h
      ) {
        b.hp -= 1;
        if (b.hp <= 0) {
          b.alive = false;
          score += 10 * level;
        } else {
          b.color = "#ffffff";
          score += 5;
        }
        var overlapL = ball.x + ball.r - b.x;
        var overlapR = b.x + b.w - (ball.x - ball.r);
        var overlapT = ball.y + ball.r - b.y;
        var overlapB = b.y + b.h - (ball.y - ball.r);
        var minX = Math.min(overlapL, overlapR);
        var minY = Math.min(overlapT, overlapB);
        // push ball out so it can't tunnel along a column
        if (minX < minY) {
          ball.vx *= -1;
          if (overlapL < overlapR) ball.x = b.x - ball.r - 0.1;
          else ball.x = b.x + b.w + ball.r + 0.1;
        } else {
          ball.vy *= -1;
          if (overlapT < overlapB) ball.y = b.y - ball.r - 0.1;
          else ball.y = b.y + b.h + ball.r + 0.1;
        }
        break;
      }
    }

    var leftBricks = false;
    for (i = 0; i < bricks.length; i++) if (bricks[i].alive) { leftBricks = true; break; }
    if (!leftBricks) nextLevel();

    if (ball.y > H + 20) {
      lives -= 1;
      if (lives <= 0) end();
      else {
        resetBallOnPaddle();
        launch();
      }
    }
  }

  function draw() {
    ctx.fillStyle = "#0b1424";
    ctx.fillRect(0, 0, W, H);

    // bright color frame — playfield edges
    ctx.fillStyle = "#4fd0ff";
    ctx.fillRect(0, 0, W, MARGIN);
    ctx.fillRect(0, H - MARGIN, W, MARGIN);
    ctx.fillRect(0, 0, MARGIN, H);
    ctx.fillRect(W - MARGIN, 0, MARGIN, H);
    ctx.strokeStyle = "#2a9fc4";
    ctx.lineWidth = 2;
    ctx.strokeRect(MARGIN + 1, MARGIN + 1, W - MARGIN * 2 - 2, H - MARGIN * 2 - 2);

    if (state === PLAY || state === OVER) {
      ctx.fillStyle = "rgba(0,0,0,0.35)";
      ctx.fillRect(8, 8, 62, 18);
      ctx.fillStyle = "#fff";
      ctx.font = "bold 11px sans-serif";
      ctx.textAlign = "left";
      ctx.fillText("level " + level, 14, 21);
    }

    ctx.fillStyle = "#cfd3da";
    ctx.font = "600 13px monospace";
    ctx.textAlign = "left";
    ctx.fillText("SCORE " + score, 14, 42);
    ctx.textAlign = "right";
    ctx.fillText("LIVES " + lives + "  BEST " + best, W - 14, 42);

    for (var i = 0; i < bricks.length; i++) {
      var b = bricks[i];
      if (!b.alive) continue;
      ctx.fillStyle = b.color;
      ctx.fillRect(b.x, b.y, b.w, b.h);
      if (b.hp > 1) {
        ctx.strokeStyle = "#fff";
        ctx.strokeRect(b.x + 2, b.y + 2, b.w - 4, b.h - 4);
      }
    }

    ctx.fillStyle = "#f3efe4";
    ctx.fillRect(paddle.x, paddle.y, paddle.w, paddle.h);

    if (state === PLAY || state === READY) {
      ctx.beginPath();
      ctx.arc(ball.x, ball.y, ball.r, 0, Math.PI * 2);
      ctx.fillStyle = "#c8f135";
      ctx.fill();
    }

    ctx.textAlign = "center";
    if (state === READY) {
      ctx.fillStyle = "rgba(11,20,36,0.75)";
      ctx.fillRect(40, H * 0.42, W - 80, 100);
      ctx.fillStyle = "#f3efe4";
      ctx.font = "700 28px sans-serif";
      ctx.fillText("BREAKOUT", W / 2, H * 0.42 + 42);
      ctx.font = "14px sans-serif";
      ctx.fillText("Clear levels · multi-hit bricks later", W / 2, H * 0.42 + 72);
    } else if (state === OVER) {
      ctx.fillStyle = "rgba(11,20,36,0.82)";
      ctx.fillRect(40, H * 0.40, W - 80, 120);
      ctx.fillStyle = "#c8f135";
      ctx.font = "700 26px sans-serif";
      ctx.fillText("GAME OVER", W / 2, H * 0.40 + 42);
      ctx.fillStyle = "#f3efe4";
      ctx.font = "18px monospace";
      ctx.fillText("Level " + level + " · " + score, W / 2, H * 0.40 + 74);
      ctx.font = "13px sans-serif";
      ctx.fillText("Tap to retry", W / 2, H * 0.40 + 100);
    }

    drawFx();
  }

  function loop() {
    update();
    draw();
    requestAnimationFrame(loop);
  }

  function setPointer(clientX) {
    var rect = canvas.getBoundingClientRect();
    pointerX = (clientX - rect.left) * (W / rect.width) - paddle.w / 2;
  }

  canvas.addEventListener("pointermove", function (e) { setPointer(e.clientX); });
  canvas.addEventListener("pointerdown", function (e) {
    setPointer(e.clientX);
    if (state === READY || state === OVER) start();
  });
  window.addEventListener("keydown", function (e) {
    if (e.code === "Space" || e.code === "Enter") {
      e.preventDefault();
      if (state === READY || state === OVER) start();
    }
    if (e.code === "ArrowLeft") pointerX -= 28;
    if (e.code === "ArrowRight") pointerX += 28;
  });

  layout();
  resetBallOnPaddle();
  loop();
})();
