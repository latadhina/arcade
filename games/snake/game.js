(() => {
  var W = 390, H = 560;
  var COLS = 20;
  var ROWS = 24;
  var CELL = 14;
  var OX = 45;
  var OY = 96;
  var PAD = 3;

  var BG = "#c5d6a0";
  var LCD = "#1a2612";
  var LCD_MID = "#2c3d1c";
  var GHOST = "rgba(26,38,18,0.12)";
  var BEZEL = "#111114";
  var FACE = "#d8d4c8";
  var FACE_DARK = "#b8b4a8";
  var ACCENT = "#3d4a2e";

  var canvas = document.getElementById("c");
  canvas.width = W;
  canvas.height = H;
  var ctx = canvas.getContext("2d", { alpha: false });

  var READY = 0, PLAY = 1, DEAD = 2;
  var state = READY;
  var snake = [];
  var dir = { x: 1, y: 0 };
  var pending = { x: 1, y: 0 };
  var food = { x: 0, y: 0 };
  var score = 0;
  var best = 0;
  try { best = Number(localStorage.getItem("snake_best_v2") || 0); } catch (e) {}
  var tick = 0;
  var stepTime = 0.24;
  var last = 0;
  var touchStart = null;
  var pulse = 0;

  function reset() {
    state = READY;
    var cx = (COLS / 2) | 0;
    var cy = (ROWS / 2) | 0;
    snake = [
      { x: cx, y: cy },
      { x: cx - 1, y: cy },
      { x: cx - 2, y: cy }
    ];
    dir = { x: 1, y: 0 };
    pending = { x: 1, y: 0 };
    score = 0;
    tick = 0;
    stepTime = 0.24;
    placeFood();
  }

  function onSnake(x, y) {
    for (var i = 0; i < snake.length; i++) {
      if (snake[i].x === x && snake[i].y === y) return true;
    }
    return false;
  }

  function placeFood() {
    var free = [];
    var x, y;
    for (x = 0; x < COLS; x++) {
      for (y = 0; y < ROWS; y++) {
        if (!onSnake(x, y)) free.push({ x: x, y: y });
      }
    }
    food = free.length ? free[(Math.random() * free.length) | 0] : { x: -1, y: -1 };
  }

  function setDir(x, y) {
    if (x === 0 && y === 0) return;
    if (x + dir.x === 0 && y + dir.y === 0) return;
    pending = { x: x, y: y };
    if (state === READY) state = PLAY;
  }

  function die() {
    state = DEAD;
    if (score > best) {
      best = score;
      try { localStorage.setItem("snake_best_v2", String(best)); } catch (e) {}
    }
    if (window.LataPromo) window.LataPromo.onGameOver();
  }

  function step() {
    dir = pending;
    var head = snake[0];
    var next = { x: head.x + dir.x, y: head.y + dir.y };

    if (next.x < 0 || next.x >= COLS || next.y < 0 || next.y >= ROWS) {
      die();
      return;
    }

    var growing = next.x === food.x && next.y === food.y;
    var i;
    for (i = 0; i < snake.length; i++) {
      if (next.x === snake[i].x && next.y === snake[i].y) {
        if (i === snake.length - 1 && !growing) continue;
        die();
        return;
      }
    }

    snake.unshift(next);
    if (growing) {
      score++;
      // Gradual speed-up: tiny step, soft floor — never a sudden jump
      stepTime = Math.max(0.11, 0.24 - score * 0.0012);
      placeFood();
    } else {
      snake.pop();
    }
  }

  function sign(n) {
    return n < 0 ? -1 : n > 0 ? 1 : 0;
  }

  window.addEventListener("keydown", function (e) {
    var map = {
      ArrowUp: [0, -1], KeyW: [0, -1],
      ArrowDown: [0, 1], KeyS: [0, 1],
      ArrowLeft: [-1, 0], KeyA: [-1, 0],
      ArrowRight: [1, 0], KeyD: [1, 0]
    };
    if (map[e.code]) {
      e.preventDefault();
      setDir(map[e.code][0], map[e.code][1]);
    }
    if (e.code === "Space" || e.code === "Enter") {
      e.preventDefault();
      if (state === DEAD) reset();
      else if (state === READY) state = PLAY;
    }
  });

  function swipe(dx, dy) {
    if (Math.abs(dx) > Math.abs(dy)) setDir(sign(dx), 0);
    else setDir(0, sign(dy));
  }

  function ptrDown(e) {
    e.preventDefault();
    var x = e.clientX != null ? e.clientX : (e.touches && e.touches[0] ? e.touches[0].clientX : 0);
    var y = e.clientY != null ? e.clientY : (e.touches && e.touches[0] ? e.touches[0].clientY : 0);
    touchStart = { x: x, y: y };
    if (state === DEAD) reset();
    else if (state === READY) state = PLAY;
  }

  function ptrMove(e) {
    if (!touchStart) return;
    var x = e.clientX != null ? e.clientX : (e.touches && e.touches[0] ? e.touches[0].clientX : touchStart.x);
    var y = e.clientY != null ? e.clientY : (e.touches && e.touches[0] ? e.touches[0].clientY : touchStart.y);
    var dx = x - touchStart.x;
    var dy = y - touchStart.y;
    if (Math.sqrt(dx * dx + dy * dy) > 28) {
      swipe(dx, dy);
      touchStart = { x: x, y: y };
    }
  }

  function ptrUp(e) {
    if (!touchStart) return;
    var x = e.clientX != null ? e.clientX : (e.changedTouches && e.changedTouches[0] ? e.changedTouches[0].clientX : touchStart.x);
    var y = e.clientY != null ? e.clientY : (e.changedTouches && e.changedTouches[0] ? e.changedTouches[0].clientY : touchStart.y);
    var dx = x - touchStart.x;
    var dy = y - touchStart.y;
    if (Math.sqrt(dx * dx + dy * dy) > 16) swipe(dx, dy);
    touchStart = null;
  }

  canvas.addEventListener("mousedown", ptrDown);
  canvas.addEventListener("mousemove", function (e) {
    if (e.buttons) ptrMove(e);
  });
  canvas.addEventListener("mouseup", ptrUp);
  canvas.addEventListener("touchstart", ptrDown, { passive: false });
  canvas.addEventListener("touchmove", function (e) { e.preventDefault(); ptrMove(e); }, { passive: false });
  canvas.addEventListener("touchend", ptrUp, { passive: false });

  function cellCenter(c) {
    return {
      x: OX + PAD + c.x * CELL + CELL / 2,
      y: OY + PAD + c.y * CELL + CELL / 2
    };
  }

  function roundRect(x, y, w, h, r) {
    var rr = Math.min(r, w / 2, h / 2);
    ctx.beginPath();
    ctx.moveTo(x + rr, y);
    ctx.arcTo(x + w, y, x + w, y + h, rr);
    ctx.arcTo(x + w, y + h, x, y + h, rr);
    ctx.arcTo(x, y + h, x, y, rr);
    ctx.arcTo(x, y, x + w, y, rr);
    ctx.closePath();
  }

  function drawSnake() {
    if (!snake.length) return;
    var r = CELL * 0.38;
    var i, p;

    ctx.lineJoin = "round";
    ctx.lineCap = "round";
    ctx.strokeStyle = LCD;
    ctx.lineWidth = CELL * 0.72;
    ctx.beginPath();
    for (i = 0; i < snake.length; i++) {
      p = cellCenter(snake[i]);
      if (i === 0) ctx.moveTo(p.x, p.y);
      else ctx.lineTo(p.x, p.y);
    }
    ctx.stroke();

    ctx.strokeStyle = LCD_MID;
    ctx.lineWidth = CELL * 0.38;
    ctx.beginPath();
    for (i = 0; i < snake.length; i++) {
      p = cellCenter(snake[i]);
      if (i === 0) ctx.moveTo(p.x, p.y);
      else ctx.lineTo(p.x, p.y);
    }
    ctx.stroke();

    var h = cellCenter(snake[0]);
    ctx.fillStyle = LCD;
    ctx.beginPath();
    ctx.arc(h.x, h.y, r + 1, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = BG;
    var ex = dir.x !== 0 ? dir.x * 3.2 : 0;
    var ey = dir.y !== 0 ? dir.y * 3.2 : -1;
    var ox = dir.x === 0 ? 3.2 : 0;
    var oy = dir.y === 0 ? 3.2 : 0;
    ctx.beginPath();
    ctx.arc(h.x + ex - oy, h.y + ey - ox, 1.7, 0, Math.PI * 2);
    ctx.arc(h.x + ex + oy, h.y + ey + ox, 1.7, 0, Math.PI * 2);
    ctx.fill();
  }

  function drawFood() {
    if (food.x < 0) return;
    var p = cellCenter(food);
    var s = 0.9 + Math.sin(pulse * 3) * 0.06;
    var rad = CELL * 0.34 * s;
    // Single target only (no mini bubble / leaf)
    ctx.fillStyle = LCD;
    ctx.beginPath();
    ctx.arc(p.x, p.y, rad, 0, Math.PI * 2);
    ctx.fill();
    // tiny highlight so it reads as food, not a second orb
    ctx.fillStyle = "rgba(197,214,160,0.45)";
    ctx.beginPath();
    ctx.arc(p.x - 2, p.y - 2, rad * 0.28, 0, Math.PI * 2);
    ctx.fill();
  }

  function draw() {
    pulse += 0.016;

    ctx.fillStyle = FACE;
    ctx.fillRect(0, 0, W, H);
    ctx.fillStyle = FACE_DARK;
    ctx.fillRect(0, 0, 14, H);
    ctx.fillRect(W - 14, 0, 14, H);

    ctx.fillStyle = ACCENT;
    ctx.font = "600 11px sans-serif";
    ctx.textAlign = "center";
    ctx.fillText("latadhina", W / 2, 22);

    roundRect(22, 32, W - 44, H - 110, 18);
    ctx.fillStyle = BEZEL;
    ctx.fill();

    var lcdX = 30, lcdY = 40, lcdW = W - 60, lcdH = H - 126;
    roundRect(lcdX, lcdY, lcdW, lcdH, 12);
    ctx.fillStyle = BG;
    ctx.fill();

    var fieldX = OX - 4;
    var fieldY = OY - 4;
    var fieldW = COLS * CELL + PAD * 2 + 8;
    var fieldH = ROWS * CELL + PAD * 2 + 8;
    ctx.strokeStyle = "rgba(26,38,18,0.35)";
    ctx.lineWidth = 2;
    roundRect(fieldX, fieldY, fieldW, fieldH, 6);
    ctx.stroke();

    var x, y, p;
    for (x = 0; x < COLS; x++) {
      for (y = 0; y < ROWS; y++) {
        p = cellCenter({ x: x, y: y });
        ctx.fillStyle = GHOST;
        ctx.fillRect(p.x - 1, p.y - 1, 2, 2);
      }
    }

    ctx.fillStyle = LCD;
    ctx.font = "600 13px monospace";
    ctx.textAlign = "left";
    ctx.fillText("SCORE  " + score, 42, 68);
    ctx.textAlign = "right";
    ctx.fillText("BEST  " + best, W - 42, 68);

    ctx.strokeStyle = "rgba(26,38,18,0.25)";
    ctx.beginPath();
    ctx.moveTo(42, 78);
    ctx.lineTo(W - 42, 78);
    ctx.stroke();

    drawFood();
    drawSnake();

    ctx.textAlign = "center";
    if (state === READY) {
      ctx.fillStyle = "rgba(197,214,160,0.72)";
      roundRect(lcdX + 20, lcdY + lcdH * 0.32, lcdW - 40, 110, 10);
      ctx.fill();
      ctx.fillStyle = LCD;
      ctx.font = "700 34px sans-serif";
      ctx.fillText("SNAKE", W / 2, lcdY + lcdH * 0.32 + 48);
      ctx.font = "14px sans-serif";
      ctx.fillText("Swipe or use arrow keys", W / 2, lcdY + lcdH * 0.32 + 78);
    } else if (state === DEAD) {
      ctx.fillStyle = "rgba(197,214,160,0.8)";
      roundRect(lcdX + 20, lcdY + lcdH * 0.30, lcdW - 40, 120, 10);
      ctx.fill();
      ctx.fillStyle = LCD;
      ctx.font = "700 28px sans-serif";
      ctx.fillText("GAME OVER", W / 2, lcdY + lcdH * 0.30 + 42);
      ctx.font = "22px monospace";
      ctx.fillText(String(score), W / 2, lcdY + lcdH * 0.30 + 74);
      ctx.font = "13px sans-serif";
      ctx.fillText("Tap to retry", W / 2, lcdY + lcdH * 0.30 + 100);
    }

    ctx.fillStyle = FACE_DARK;
    for (var i = 0; i < 5; i++) {
      ctx.beginPath();
      ctx.arc(W / 2 - 16 + i * 8, H - 48, 2, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.beginPath();
    ctx.arc(W / 2, H - 28, 10, 0, Math.PI * 2);
    ctx.fillStyle = FACE_DARK;
    ctx.fill();
    ctx.strokeStyle = ACCENT;
    ctx.lineWidth = 2;
    ctx.stroke();
  }

  function loop(now) {
    if (!last) last = now;
    var dt = (now - last) / 1000;
    if (dt > 0.05) dt = 0.05;
    last = now;
    if (state === PLAY) {
      tick += dt;
      while (tick >= stepTime) {
        tick -= stepTime;
        step();
      }
    }
    draw();
    requestAnimationFrame(loop);
  }

  reset();
  requestAnimationFrame(loop);
})();
