(() => {
  var W = 320, H = 480, GROUND = 386;
  var GRAVITY = 1500 * (H / 720), FLAP = -430 * (H / 720);
  var BASE_SPEED = 145 * (W / 480);
  var BASE_GAP = 118;
  var PIPE_SPACING = 160;
  var PIPE_W = 48;
  var PIPE_LIP = 6; // visual cap overhang — must match hitbox
  var BIRD_X = 90;
  var BIRD_R = 12; // must match drawn circle radius

  var canvas = document.getElementById("c");
  canvas.width = W;
  canvas.height = H;
  var ctx = canvas.getContext("2d", { alpha: false });
  ctx.imageSmoothingEnabled = false;

  var READY = 0, PLAY = 1, DEAD = 2, ROUND = 3;
  var state = READY;
  var birdY = H * 0.42, birdVy = 0, birdRot = 0, bobT = 0;
  var pipes = [];
  var score = 0, round = 1, best = 0;
  try { best = Number(localStorage.getItem("tappy_best") || 0); } catch (e) {}
  var groundScroll = 0;
  var last = 0, acc = 0, STEP = 1 / 30;
  var roundTimer = 0;
  var pipeSpeed = BASE_SPEED;
  var pipeGap = BASE_GAP;

  function applyRound() {
    round = 1 + ((score / 5) | 0);
    pipeSpeed = BASE_SPEED * (1 + (round - 1) * 0.08);
    pipeGap = Math.max(78, BASE_GAP - (round - 1) * 6);
  }

  function reset() {
    state = READY;
    birdY = H * 0.42;
    birdVy = 0;
    birdRot = 0;
    bobT = 0;
    score = 0;
    round = 1;
    applyRound();
    pipes = [];
    var x = W + 40;
    for (var i = 0; i < 3; i++) pipes.push(newPipe(x + i * PIPE_SPACING));
  }

  function newPipe(x) {
    var margin = 70 + pipeGap * 0.5;
    var minY = margin;
    var maxY = GROUND - margin;
    return {
      x: x,
      gapY: minY + Math.random() * Math.max(10, maxY - minY),
      scored: false,
      moving: round >= 3 && Math.random() < 0.45,
      moveDir: Math.random() < 0.5 ? 1 : -1,
      moveAmp: 18 + round * 2
    };
  }

  function flap() {
    if (state === DEAD) { reset(); return; }
    if (state === ROUND) return;
    if (state === READY) state = PLAY;
    if (state === PLAY) birdVy = FLAP;
  }

  function die() {
    if (state === DEAD) return;
    state = DEAD;
    if (score > best) {
      best = score;
      try { localStorage.setItem("tappy_best", String(best)); } catch (e) {}
    }
    if (window.LataPromo) window.LataPromo.onGameOver();
  }

  function onTap(e) {
    if (e && e.preventDefault) e.preventDefault();
    flap();
  }
  canvas.addEventListener("mousedown", onTap);
  canvas.addEventListener("touchstart", onTap, { passive: false });
  window.addEventListener("keydown", function (e) {
    if (e.code === "Space" || e.code === "ArrowUp" || e.code === "KeyW") {
      e.preventDefault();
      flap();
    }
    if (e.code === "Enter" && state === DEAD) reset();
  });

  // Circle vs AABB — matches drawn bird + drawn pipe (with lips)
  function hitsPipe(p) {
    var left = p.x - PIPE_W / 2 - PIPE_LIP;
    var right = p.x + PIPE_W / 2 + PIPE_LIP;
    var gapTop = p.gapY - pipeGap / 2;
    var gapBot = p.gapY + pipeGap / 2;
    // top body
    if (circleRect(BIRD_X, birdY, BIRD_R, left, 0, right - left, gapTop)) return true;
    // bottom body
    if (circleRect(BIRD_X, birdY, BIRD_R, left, gapBot, right - left, GROUND - gapBot)) return true;
    return false;
  }

  function circleRect(cx, cy, r, rx, ry, rw, rh) {
    var closestX = Math.max(rx, Math.min(cx, rx + rw));
    var closestY = Math.max(ry, Math.min(cy, ry + rh));
    var dx = cx - closestX;
    var dy = cy - closestY;
    return dx * dx + dy * dy <= r * r;
  }

  function update(dt) {
    if (state === READY) {
      bobT += dt;
      birdY = H * 0.42 + Math.sin(bobT * 3) * 6;
      groundScroll = (groundScroll + pipeSpeed * dt) % 40;
      return;
    }
    if (state === ROUND) {
      roundTimer -= dt;
      if (roundTimer <= 0) state = PLAY;
      return;
    }
    if (state === DEAD) {
      birdVy += GRAVITY * dt;
      birdY += birdVy * dt;
      if (birdY > GROUND - BIRD_R) birdY = GROUND - BIRD_R;
      birdRot = Math.min(birdRot + 3 * dt, 1.5);
      return;
    }

    birdVy += GRAVITY * dt;
    birdY += birdVy * dt;
    var target = Math.max(-0.5, Math.min(1.4, birdVy / 400));
    birdRot += (target - birdRot) * 0.2;

    if (birdY > GROUND - BIRD_R) { birdY = GROUND - BIRD_R; die(); return; }
    if (birdY < BIRD_R) { birdY = BIRD_R; birdVy = 0; }

    var i, p, prevRound = round;
    for (i = 0; i < pipes.length; i++) {
      p = pipes[i];
      p.x -= pipeSpeed * dt;
      if (p.moving) {
        p.gapY += p.moveDir * (22 + round * 2) * dt;
        var lo = 70 + pipeGap * 0.5;
        var hi = GROUND - lo;
        if (p.gapY < lo) { p.gapY = lo; p.moveDir = 1; }
        if (p.gapY > hi) { p.gapY = hi; p.moveDir = -1; }
      }
      if (!p.scored && p.x + PIPE_W / 2 < BIRD_X) {
        p.scored = true;
        score++;
        applyRound();
        if (round > prevRound) {
          state = ROUND;
          roundTimer = 1.2;
          prevRound = round;
        }
      }
    }
    if (pipes.length && pipes[0].x < -(PIPE_W + PIPE_LIP)) {
      pipes.shift();
      pipes.push(newPipe(pipes[pipes.length - 1].x + PIPE_SPACING));
    }

    for (i = 0; i < pipes.length; i++) {
      if (hitsPipe(pipes[i])) { die(); return; }
    }

    groundScroll = (groundScroll + pipeSpeed * dt) % 40;
  }

  function drawPipe(p) {
    var left = (p.x - PIPE_W / 2) | 0;
    var gapTop = (p.gapY - pipeGap / 2) | 0;
    var gapBot = (p.gapY + pipeGap / 2) | 0;
    ctx.fillStyle = round >= 4 ? "#2a7a55" : "#3d9e45";
    ctx.fillRect(left, 0, PIPE_W, gapTop);
    ctx.fillRect(left, gapBot, PIPE_W, GROUND - gapBot);
    ctx.fillStyle = round >= 4 ? "#1f5c40" : "#2f7d36";
    ctx.fillRect(left - PIPE_LIP, gapTop - 18, PIPE_W + PIPE_LIP * 2, 18);
    ctx.fillRect(left - PIPE_LIP, gapBot, PIPE_W + PIPE_LIP * 2, 18);
  }

  function strokeText(t, x, y) {
    ctx.strokeText(t, x, y);
    ctx.fillText(t, x, y);
  }

  function draw() {
    // sky shifts by round
    ctx.fillStyle = round >= 5 ? "#2a3a58" : round >= 3 ? "#5a9bb0" : "#4ec0ca";
    ctx.fillRect(0, 0, W, GROUND);

    var i;
    for (i = 0; i < pipes.length; i++) drawPipe(pipes[i]);

    ctx.fillStyle = "#ded895";
    ctx.fillRect(0, GROUND, W, H - GROUND);
    ctx.fillStyle = "#73bf2e";
    ctx.fillRect(0, GROUND, W, 12);
    ctx.fillStyle = "#5aa01f";
    for (var gx = -((groundScroll) | 0); gx < W; gx += 32) ctx.fillRect(gx, GROUND, 16, 12);

    ctx.save();
    ctx.translate(BIRD_X, birdY);
    ctx.rotate(birdRot);
    ctx.fillStyle = "#f0c040";
    ctx.beginPath();
    ctx.arc(0, 0, BIRD_R, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#e09020";
    ctx.beginPath();
    ctx.arc(9, 2, 4, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#222";
    ctx.beginPath();
    ctx.arc(3, -3, 2, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    ctx.fillStyle = "#fff";
    ctx.strokeStyle = "#000";
    ctx.lineWidth = 3;
    ctx.textAlign = "center";

    if (state === READY) {
      ctx.font = "bold 28px sans-serif";
      strokeText("TAPPY BIRD", W / 2, 200);
      ctx.font = "14px sans-serif";
      strokeText("Tap / Space to flap", W / 2, 232);
    } else if (state === PLAY || state === ROUND) {
      ctx.font = "bold 36px sans-serif";
      strokeText(String(score), W / 2, 56);
      ctx.font = "bold 14px sans-serif";
      strokeText("ROUND " + round, W / 2, 82);
      if (state === ROUND) {
        ctx.font = "bold 28px sans-serif";
        strokeText("ROUND " + round, W / 2, H * 0.42);
        ctx.font = "14px sans-serif";
        strokeText("Harder pipes ahead", W / 2, H * 0.42 + 28);
      }
    } else {
      ctx.font = "bold 26px sans-serif";
      strokeText("GAME OVER", W / 2, 200);
      ctx.font = "14px sans-serif";
      strokeText("Score " + score + " · Round " + round + " · Best " + best, W / 2, 232);
      strokeText("Tap / Space to retry", W / 2, 258);
    }
  }

  function loop(now) {
    if (!last) last = now;
    var frame = (now - last) / 1000;
    if (frame > 0.1) frame = 0.1;
    last = now;
    acc += frame;
    var steps = 0;
    while (acc >= STEP && steps < 2) {
      update(STEP);
      acc -= STEP;
      steps++;
    }
    draw();
    requestAnimationFrame(loop);
  }

  reset();
  requestAnimationFrame(loop);
})();
