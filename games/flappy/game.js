(() => {
  var W = 320, H = 480, GROUND = 386;
  var GRAVITY = 1500 * (H / 720), FLAP = -430 * (H / 720);
  var BASE_SPEED = 145 * (W / 480);
  var BASE_GAP = 110;
  var PIPE_SPACING = 160, PIPE_W = 48;
  var BIRD_X = 90, BIRD_R = 10;

  var canvas = document.getElementById("c");
  canvas.width = W;
  canvas.height = H;
  var ctx = canvas.getContext("2d", { alpha: false });
  ctx.imageSmoothingEnabled = false;

  var READY = 0, PLAY = 1, DEAD = 2;
  var state = READY;
  var birdY = H * 0.42, birdVy = 0, birdRot = 0, bobT = 0;
  var pipes = [];
  var score = 0, level = 1, best = 0;
  try { best = Number(localStorage.getItem("tappy_best") || 0); } catch (e) {}
  var groundScroll = 0;
  var last = 0, acc = 0, STEP = 1 / 30;

  function levelFromScore(s) {
    return 1 + ((s / 5) | 0);
  }

  function pipeSpeed() {
    return BASE_SPEED * (1 + (level - 1) * 0.06);
  }

  function pipeGap() {
    return Math.max(82, BASE_GAP - (level - 1) * 4);
  }

  function reset() {
    state = READY;
    birdY = H * 0.42;
    birdVy = 0;
    birdRot = 0;
    bobT = 0;
    score = 0;
    level = 1;
    pipes = [];
    var x = W + 40;
    for (var i = 0; i < 3; i++) pipes.push(newPipe(x + i * PIPE_SPACING));
  }

  function newPipe(x) {
    var gap = pipeGap();
    var minY = 80 + gap * 0.35;
    var maxY = GROUND - 80 - gap * 0.35;
    return {
      x: x,
      gapY: minY + Math.random() * Math.max(8, maxY - minY),
      scored: false
    };
  }

  function flap() {
    if (state === DEAD) { reset(); return; }
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

  function update(dt) {
    var speed = pipeSpeed();
    var gap = pipeGap();

    if (state === READY) {
      bobT += dt;
      birdY = H * 0.42 + Math.sin(bobT * 3) * 6;
      groundScroll = (groundScroll + speed * dt) % 40;
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

    if (birdY > GROUND - BIRD_R) { birdY = GROUND - BIRD_R; die(); }
    if (birdY < BIRD_R) { birdY = BIRD_R; birdVy = 0; }

    var i, p;
    for (i = 0; i < pipes.length; i++) {
      p = pipes[i];
      p.x -= speed * dt;
      if (!p.scored && p.x < BIRD_X) {
        p.scored = true;
        score++;
        level = levelFromScore(score);
      }
    }
    if (pipes.length && pipes[0].x < -PIPE_W) {
      pipes.shift();
      pipes.push(newPipe(pipes[pipes.length - 1].x + PIPE_SPACING));
    }

    for (i = 0; i < pipes.length; i++) {
      p = pipes[i];
      if (Math.abs(p.x - BIRD_X) > PIPE_W / 2 + BIRD_R) continue;
      var gapTop = p.gapY - gap / 2;
      var gapBot = p.gapY + gap / 2;
      if (birdY - BIRD_R < gapTop || birdY + BIRD_R > gapBot) {
        die();
        return;
      }
    }

    groundScroll = (groundScroll + speed * dt) % 40;
  }

  function drawPipe(p) {
    var gap = pipeGap();
    var left = (p.x - PIPE_W / 2) | 0;
    var gapTop = (p.gapY - gap / 2) | 0;
    var gapBot = (p.gapY + gap / 2) | 0;
    ctx.fillStyle = "#3d9e45";
    ctx.fillRect(left, 0, PIPE_W, gapTop);
    ctx.fillRect(left, gapBot, PIPE_W, GROUND - gapBot);
    ctx.fillStyle = "#2f7d36";
    ctx.fillRect(left - 3, gapTop - 18, PIPE_W + 6, 18);
    ctx.fillRect(left - 3, gapBot, PIPE_W + 6, 18);
  }

  function strokeText(t, x, y) {
    ctx.strokeText(t, x, y);
    ctx.fillText(t, x, y);
  }

  function draw() {
    ctx.fillStyle = "#4ec0ca";
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
    ctx.arc(0, 0, 12, 0, Math.PI * 2);
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
    } else if (state === PLAY) {
      ctx.font = "bold 36px sans-serif";
      strokeText(String(score), W / 2, 52);
      ctx.font = "bold 14px sans-serif";
      strokeText("LEVEL " + level, W / 2, 74);
    } else {
      ctx.font = "bold 26px sans-serif";
      strokeText("GAME OVER", W / 2, 200);
      ctx.font = "14px sans-serif";
      strokeText("Score " + score + " · Level " + level + " · Best " + best, W / 2, 232);
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
