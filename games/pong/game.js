(() => {
  var canvas = document.getElementById("c");
  var ctx = canvas.getContext("2d");
  var W = canvas.width;
  var H = canvas.height;

  var READY = 0, PLAY = 1, OVER = 2;
  var state = READY;
  var scoreP = 0, scoreC = 0;
  var WIN = 7;

  var paddleH = 56;
  var paddleW = 10;
  var playerY = H / 2 - paddleH / 2;
  var cpuY = H / 2 - paddleH / 2;
  var ball = { x: W / 2, y: H / 2, vx: 0, vy: 0, r: 6 };
  var pointerY = playerY;
  var serveToPlayer = true;

  function resetBall() {
    ball.x = W / 2;
    ball.y = H / 2;
    var speed = 4.2;
    ball.vx = serveToPlayer ? -speed : speed;
    ball.vy = (Math.random() * 2 - 1) * 3.2;
  }

  function start() {
    if (state === OVER) {
      scoreP = 0;
      scoreC = 0;
    }
    state = PLAY;
    resetBall();
  }

  function gameOver() {
    state = OVER;
    if (window.LataPromo) window.LataPromo.onGameOver();
  }

  function update() {
    if (state !== PLAY) return;

    playerY += (pointerY - playerY) * 0.35;
    playerY = Math.max(0, Math.min(H - paddleH, playerY));

    var target = ball.y - paddleH / 2;
    cpuY += (target - cpuY) * 0.085;
    cpuY = Math.max(0, Math.min(H - paddleH, cpuY));

    ball.x += ball.vx;
    ball.y += ball.vy;

    if (ball.y < ball.r || ball.y > H - ball.r) {
      ball.vy *= -1;
      ball.y = Math.max(ball.r, Math.min(H - ball.r, ball.y));
    }

    // player paddle (left)
    if (
      ball.vx < 0 &&
      ball.x - ball.r <= 18 + paddleW &&
      ball.x + ball.r >= 18 &&
      ball.y >= playerY &&
      ball.y <= playerY + paddleH
    ) {
      ball.vx = Math.abs(ball.vx) * 1.04;
      ball.vy += ((ball.y - (playerY + paddleH / 2)) / (paddleH / 2)) * 2.4;
      ball.x = 18 + paddleW + ball.r;
    }

    // cpu paddle (right)
    if (
      ball.vx > 0 &&
      ball.x + ball.r >= W - 18 - paddleW &&
      ball.x - ball.r <= W - 18 &&
      ball.y >= cpuY &&
      ball.y <= cpuY + paddleH
    ) {
      ball.vx = -Math.abs(ball.vx) * 1.04;
      ball.vy += ((ball.y - (cpuY + paddleH / 2)) / (paddleH / 2)) * 2.4;
      ball.x = W - 18 - paddleW - ball.r;
    }

    if (ball.x < -20) {
      scoreC += 1;
      serveToPlayer = false;
      if (scoreC >= WIN) gameOver();
      else resetBall();
    } else if (ball.x > W + 20) {
      scoreP += 1;
      serveToPlayer = true;
      if (scoreP >= WIN) gameOver();
      else resetBall();
    }
  }

  function draw() {
    ctx.fillStyle = "#0e1014";
    ctx.fillRect(0, 0, W, H);

    ctx.strokeStyle = "rgba(200,241,53,0.25)";
    ctx.setLineDash([8, 10]);
    ctx.beginPath();
    ctx.moveTo(W / 2, 10);
    ctx.lineTo(W / 2, H - 10);
    ctx.stroke();
    ctx.setLineDash([]);

    ctx.fillStyle = "#f3efe4";
    ctx.fillRect(18, playerY, paddleW, paddleH);
    ctx.fillRect(W - 18 - paddleW, cpuY, paddleW, paddleH);

    if (state === PLAY) {
      ctx.beginPath();
      ctx.arc(ball.x, ball.y, ball.r, 0, Math.PI * 2);
      ctx.fillStyle = "#c8f135";
      ctx.fill();
    }

    ctx.fillStyle = "#cfd3da";
    ctx.font = "600 28px monospace";
    ctx.textAlign = "center";
    ctx.fillText(String(scoreP), W / 2 - 40, 36);
    ctx.fillText(String(scoreC), W / 2 + 40, 36);

    ctx.textAlign = "center";
    if (state === READY) {
      ctx.fillStyle = "rgba(14,16,20,0.72)";
      ctx.fillRect(W / 2 - 140, H / 2 - 46, 280, 92);
      ctx.fillStyle = "#f3efe4";
      ctx.font = "700 28px sans-serif";
      ctx.fillText("PONG", W / 2, H / 2 - 8);
      ctx.font = "14px sans-serif";
      ctx.fillText("Tap or press Space to serve", W / 2, H / 2 + 22);
    } else if (state === OVER) {
      ctx.fillStyle = "rgba(14,16,20,0.8)";
      ctx.fillRect(W / 2 - 140, H / 2 - 54, 280, 108);
      ctx.fillStyle = "#c8f135";
      ctx.font = "700 24px sans-serif";
      ctx.fillText(scoreP >= WIN ? "YOU WIN" : "CPU WINS", W / 2, H / 2 - 10);
      ctx.fillStyle = "#f3efe4";
      ctx.font = "14px sans-serif";
      ctx.fillText(scoreP + " – " + scoreC, W / 2, H / 2 + 18);
      ctx.fillText("Tap to rematch", W / 2, H / 2 + 40);
    }
  }

  function loop() {
    update();
    draw();
    requestAnimationFrame(loop);
  }

  function setPointer(clientY) {
    var rect = canvas.getBoundingClientRect();
    var scale = H / rect.height;
    pointerY = (clientY - rect.top) * scale - paddleH / 2;
  }

  canvas.addEventListener("pointermove", function (e) {
    setPointer(e.clientY);
  });
  canvas.addEventListener("pointerdown", function (e) {
    setPointer(e.clientY);
    if (state !== PLAY) start();
  });
  window.addEventListener("keydown", function (e) {
    if (e.code === "Space" || e.code === "Enter") {
      e.preventDefault();
      if (state !== PLAY) start();
    }
    if (e.code === "ArrowUp") pointerY -= 28;
    if (e.code === "ArrowDown") pointerY += 28;
  });

  loop();
})();
