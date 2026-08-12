(() => {
  var canvas = document.getElementById("c");
  var ctx = canvas.getContext("2d");
  var W = canvas.width;
  var H = canvas.height;

  var READY = 0, PLAY = 1, OVER = 2, BETWEEN = 3;
  var state = READY;
  var score = 0, level = 1, best = 0, lives = 3;
  try { best = Number(localStorage.getItem("lata_breakout_best") || 0); } catch (e) {}

  var COLORS = ["#e35d5b", "#f08050", "#f0c040", "#5ac46a", "#5ad0e6", "#c07aef"];
  var brickW = 46, brickH = 16, gap = 4;
  var bricks = [];
  var paddle = { w: 72, h: 12, x: W / 2 - 36, y: H - 48 };
  var ball = { x: W / 2, y: H - 70, vx: 0, vy: 0, r: 7 };
  var pointerX = paddle.x;
  var betweenTimer = 0;
  var ballSpeed = 5.2;

  function layout() {
    var rows = Math.min(8, 4 + level);
    var cols = Math.min(10, 7 + Math.floor((level - 1) / 2));
    brickW = Math.floor((W - 40 - (cols - 1) * gap) / cols);
    var offsetX = (W - (cols * brickW + (cols - 1) * gap)) / 2;
    var offsetY = 64;
    bricks = [];
    for (var r = 0; r < rows; r++) {
      for (var c = 0; c < cols; c++) {
        // later levels: skip some for patterns / denser top
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
    betweenTimer = 1.4;
    state = BETWEEN;
  }

  function update() {
    if (state === BETWEEN) {
      betweenTimer -= 1 / 60;
      if (betweenTimer <= 0) {
        layout();
        paddle.x = W / 2 - paddle.w / 2;
        resetBallOnPaddle();
        launch();
        state = PLAY;
      }
      return;
    }
    if (state !== PLAY) return;

    paddle.x += (pointerX - paddle.x) * 0.4;
    paddle.x = Math.max(8, Math.min(W - paddle.w - 8, paddle.x));

    ball.x += ball.vx;
    ball.y += ball.vy;

    if (ball.x < ball.r || ball.x > W - ball.r) {
      ball.vx *= -1;
      ball.x = Math.max(ball.r, Math.min(W - ball.r, ball.x));
    }
    if (ball.y < ball.r) {
      ball.vy = Math.abs(ball.vy);
      ball.y = ball.r;
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
        if (minX < minY) ball.vx *= -1;
        else ball.vy *= -1;
        break;
      }
    }

    var left = false;
    for (i = 0; i < bricks.length; i++) if (bricks[i].alive) { left = true; break; }
    if (!left) nextLevel();

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

    ctx.fillStyle = "#cfd3da";
    ctx.font = "600 13px monospace";
    ctx.textAlign = "left";
    ctx.fillText("SCORE " + score, 14, 24);
    ctx.textAlign = "center";
    ctx.fillText("LEVEL " + level, W / 2, 24);
    ctx.textAlign = "right";
    ctx.fillText("LIVES " + lives + "  BEST " + best, W - 14, 24);

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
    } else if (state === BETWEEN) {
      ctx.fillStyle = "rgba(11,20,36,0.8)";
      ctx.fillRect(40, H * 0.40, W - 80, 100);
      ctx.fillStyle = "#c8f135";
      ctx.font = "700 26px sans-serif";
      ctx.fillText("LEVEL " + level, W / 2, H * 0.40 + 48);
      ctx.fillStyle = "#f3efe4";
      ctx.font = "14px sans-serif";
      ctx.fillText("Faster ball · tougher layout", W / 2, H * 0.40 + 78);
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
