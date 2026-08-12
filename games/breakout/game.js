(() => {
  var canvas = document.getElementById("c");
  var ctx = canvas.getContext("2d");
  var W = canvas.width;
  var H = canvas.height;

  var READY = 0, PLAY = 1, OVER = 2, WIN = 3;
  var state = READY;
  var score = 0;
  var best = 0;
  try { best = Number(localStorage.getItem("lata_breakout_best") || 0); } catch (e) {}

  var COLORS = ["#e35d5b", "#f08050", "#f0c040", "#5ac46a", "#5ad0e6", "#c07aef"];
  var ROWS = 6, COLS = 8;
  var brickW = 46, brickH = 16, gap = 4;
  var offsetX = (W - (COLS * brickW + (COLS - 1) * gap)) / 2;
  var offsetY = 70;
  var bricks = [];

  var paddle = { w: 72, h: 12, x: W / 2 - 36, y: H - 48 };
  var ball = { x: W / 2, y: H - 70, vx: 0, vy: 0, r: 7 };
  var pointerX = paddle.x;

  function buildBricks() {
    bricks = [];
    for (var r = 0; r < ROWS; r++) {
      for (var c = 0; c < COLS; c++) {
        bricks.push({
          x: offsetX + c * (brickW + gap),
          y: offsetY + r * (brickH + gap),
          w: brickW,
          h: brickH,
          alive: true,
          color: COLORS[r % COLORS.length]
        });
      }
    }
  }

  function launch() {
    var angle = (-60 + Math.random() * 40) * Math.PI / 180;
    var speed = 5.2;
    ball.vx = Math.cos(angle) * speed;
    ball.vy = Math.sin(angle) * speed;
  }

  function start() {
    if (state === OVER || state === WIN || state === READY) {
      score = 0;
      buildBricks();
      paddle.x = W / 2 - paddle.w / 2;
      ball.x = W / 2;
      ball.y = paddle.y - 16;
      launch();
      state = PLAY;
    }
  }

  function end(win) {
    state = win ? WIN : OVER;
    if (score > best) {
      best = score;
      try { localStorage.setItem("lata_breakout_best", String(best)); } catch (e) {}
    }
    if (window.LataPromo) window.LataPromo.onGameOver();
  }

  function update() {
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
      ball.vx = hit * 5.5;
      ball.vy = -Math.abs(ball.vy);
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
        b.alive = false;
        score += 10;
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

    var left = bricks.some(function (b) { return b.alive; });
    if (!left) end(true);
    if (ball.y > H + 20) end(false);
  }

  function draw() {
    ctx.fillStyle = "#0b1424";
    ctx.fillRect(0, 0, W, H);

    ctx.fillStyle = "#cfd3da";
    ctx.font = "600 14px monospace";
    ctx.textAlign = "left";
    ctx.fillText("SCORE  " + score, 16, 28);
    ctx.textAlign = "right";
    ctx.fillText("BEST  " + best, W - 16, 28);

    for (var i = 0; i < bricks.length; i++) {
      var b = bricks[i];
      if (!b.alive) continue;
      ctx.fillStyle = b.color;
      ctx.fillRect(b.x, b.y, b.w, b.h);
      ctx.strokeStyle = "rgba(0,0,0,0.35)";
      ctx.strokeRect(b.x, b.y, b.w, b.h);
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
      ctx.fillText("Tap to launch", W / 2, H * 0.42 + 72);
    } else if (state === OVER || state === WIN) {
      ctx.fillStyle = "rgba(11,20,36,0.82)";
      ctx.fillRect(40, H * 0.40, W - 80, 120);
      ctx.fillStyle = "#c8f135";
      ctx.font = "700 26px sans-serif";
      ctx.fillText(state === WIN ? "CLEAR!" : "GAME OVER", W / 2, H * 0.40 + 42);
      ctx.fillStyle = "#f3efe4";
      ctx.font = "20px monospace";
      ctx.fillText(String(score), W / 2, H * 0.40 + 74);
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
    var scale = W / rect.width;
    pointerX = (clientX - rect.left) * scale - paddle.w / 2;
  }

  canvas.addEventListener("pointermove", function (e) { setPointer(e.clientX); });
  canvas.addEventListener("pointerdown", function (e) {
    setPointer(e.clientX);
    if (state !== PLAY) start();
  });
  window.addEventListener("keydown", function (e) {
    if (e.code === "Space" || e.code === "Enter") {
      e.preventDefault();
      if (state !== PLAY) start();
    }
    if (e.code === "ArrowLeft") pointerX -= 28;
    if (e.code === "ArrowRight") pointerX += 28;
  });

  buildBricks();
  ball.x = W / 2;
  ball.y = paddle.y - 16;
  loop();
})();
