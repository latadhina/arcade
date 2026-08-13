(() => {
  var canvas = document.getElementById("c");
  var ctx = canvas.getContext("2d");
  var W = canvas.width;
  var H = canvas.height;

  var READY = 0, PLAY = 1, OVER = 2;
  var state = READY;
  var scoreP = 0, scoreC = 0;
  var round = 1;
  var winsP = 0, winsC = 0;
  var POINTS = 5;
  var ROUNDS_TO_WIN = 3;

  var paddleH = 56;
  var paddleW = 10;
  var playerY = H / 2 - paddleH / 2;
  var cpuY = H / 2 - paddleH / 2;
  var ball = { x: W / 2, y: H / 2, vx: 0, vy: 0, r: 6 };
  var pointerY = playerY;
  var serveToPlayer = true;
  var ballSpeed = 4.2;
  var cpuSkill = 0.08;
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

  function applyRound() {
    ballSpeed = 4.0 + round * 0.45;
    cpuSkill = Math.min(0.22, 0.07 + round * 0.03);
    paddleH = Math.max(40, 60 - round * 3);
  }

  function resetBall() {
    ball.x = W / 2;
    ball.y = H / 2;
    ball.vx = serveToPlayer ? -ballSpeed : ballSpeed;
    ball.vy = (Math.random() * 2 - 1) * (ballSpeed * 0.7);
  }

  function start() {
    if (state === OVER) {
      winsP = 0;
      winsC = 0;
      round = 1;
    }
    scoreP = 0;
    scoreC = 0;
    fx = [];
    banner = null;
    applyRound();
    state = PLAY;
    resetBall();
  }

  function endMatch() {
    state = OVER;
    if (window.LataPromo) window.LataPromo.onGameOver();
  }

  function endRound(playerWon) {
    if (playerWon) winsP++;
    else winsC++;
    if (winsP >= ROUNDS_TO_WIN || winsC >= ROUNDS_TO_WIN) {
      endMatch();
      return;
    }
    round++;
    scoreP = 0;
    scoreC = 0;
    applyRound();
    resetBall();
    celebrate("ROUND " + round);
  }

  function update() {
    updateFx(1 / 60);
    if (state !== PLAY) return;

    playerY += (pointerY - playerY) * 0.35;
    playerY = Math.max(6, Math.min(H - paddleH - 6, playerY));

    var target = ball.y - paddleH / 2;
    target += (Math.random() - 0.5) * (26 - round * 3);
    cpuY += (target - cpuY) * cpuSkill;
    cpuY = Math.max(6, Math.min(H - paddleH - 6, cpuY));

    ball.x += ball.vx;
    ball.y += ball.vy;

    if (ball.y < ball.r + 6 || ball.y > H - ball.r - 6) {
      ball.vy *= -1;
      ball.y = Math.max(ball.r + 6, Math.min(H - ball.r - 6, ball.y));
    }

    if (
      ball.vx < 0 &&
      ball.x - ball.r <= 18 + paddleW &&
      ball.x + ball.r >= 18 &&
      ball.y >= playerY &&
      ball.y <= playerY + paddleH
    ) {
      ball.vx = Math.abs(ball.vx) * 1.03;
      ball.vy += ((ball.y - (playerY + paddleH / 2)) / (paddleH / 2)) * 2.4;
      ball.x = 18 + paddleW + ball.r;
    }

    if (
      ball.vx > 0 &&
      ball.x + ball.r >= W - 18 - paddleW &&
      ball.x - ball.r <= W - 18 &&
      ball.y >= cpuY &&
      ball.y <= cpuY + paddleH
    ) {
      ball.vx = -Math.abs(ball.vx) * 1.03;
      ball.vy += ((ball.y - (cpuY + paddleH / 2)) / (paddleH / 2)) * 2.4;
      ball.x = W - 18 - paddleW - ball.r;
    }

    if (ball.x < -20) {
      scoreC += 1;
      serveToPlayer = false;
      if (scoreC >= POINTS) endRound(false);
      else resetBall();
    } else if (ball.x > W + 20) {
      scoreP += 1;
      serveToPlayer = true;
      if (scoreP >= POINTS) endRound(true);
      else resetBall();
    }
  }

  function draw() {
    ctx.fillStyle = "#0e1014";
    ctx.fillRect(0, 0, W, H);

    // bright color frame — bounce edges
    var m = 4;
    ctx.fillStyle = "#4fd0ff";
    ctx.fillRect(0, 0, W, m);
    ctx.fillRect(0, H - m, W, m);
    ctx.fillRect(0, 0, m, H);
    ctx.fillRect(W - m, 0, m, H);
    ctx.strokeStyle = "#2a9fc4";
    ctx.lineWidth = 2;
    ctx.strokeRect(m + 1, m + 1, W - (m + 1) * 2, H - (m + 1) * 2);

    ctx.strokeStyle = "rgba(200,241,53,0.25)";
    ctx.setLineDash([8, 10]);
    ctx.beginPath();
    ctx.moveTo(W / 2, 12);
    ctx.lineTo(W / 2, H - 12);
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

    if (state === PLAY || state === OVER) {
      ctx.fillStyle = "rgba(0,0,0,0.35)";
      ctx.fillRect(8, 8, 62, 18);
      ctx.fillStyle = "#fff";
      ctx.font = "bold 11px sans-serif";
      ctx.textAlign = "left";
      ctx.fillText("round " + round, 14, 21);
    }

    ctx.fillStyle = "#cfd3da";
    ctx.font = "600 28px monospace";
    ctx.textAlign = "center";
    ctx.fillText(String(scoreP), W / 2 - 40, 48);
    ctx.fillText(String(scoreC), W / 2 + 40, 48);
    ctx.font = "12px monospace";
    ctx.fillText("MATCH " + winsP + "-" + winsC, W / 2, 68);

    if (state === READY) {
      ctx.fillStyle = "rgba(14,16,20,0.72)";
      ctx.fillRect(W / 2 - 150, H / 2 - 50, 300, 100);
      ctx.fillStyle = "#f3efe4";
      ctx.font = "700 28px sans-serif";
      ctx.fillText("PONG", W / 2, H / 2 - 8);
      ctx.font = "14px sans-serif";
      ctx.fillText("First to 5 · best of 5 rounds", W / 2, H / 2 + 22);
    } else if (state === OVER) {
      ctx.fillStyle = "rgba(14,16,20,0.8)";
      ctx.fillRect(W / 2 - 150, H / 2 - 54, 300, 110);
      ctx.fillStyle = "#c8f135";
      ctx.font = "700 24px sans-serif";
      ctx.fillText(winsP > winsC ? "YOU WIN MATCH" : "CPU WINS MATCH", W / 2, H / 2 - 10);
      ctx.fillStyle = "#f3efe4";
      ctx.font = "14px sans-serif";
      ctx.fillText(winsP + " – " + winsC + " rounds", W / 2, H / 2 + 18);
      ctx.fillText("Tap to rematch", W / 2, H / 2 + 40);
    }

    drawFx();
  }

  function loop() {
    update();
    draw();
    requestAnimationFrame(loop);
  }

  function setPointer(clientY) {
    var rect = canvas.getBoundingClientRect();
    pointerY = (clientY - rect.top) * (H / rect.height) - paddleH / 2;
  }

  canvas.addEventListener("pointermove", function (e) { setPointer(e.clientY); });
  canvas.addEventListener("pointerdown", function (e) {
    setPointer(e.clientY);
    if (state === READY || state === OVER) start();
  });
  window.addEventListener("keydown", function (e) {
    if (e.code === "Space" || e.code === "Enter") {
      e.preventDefault();
      if (state === READY || state === OVER) start();
    }
    if (e.code === "ArrowUp") pointerY -= 28;
    if (e.code === "ArrowDown") pointerY += 28;
  });

  loop();
})();
