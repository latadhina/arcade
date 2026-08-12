(() => {
  var COLS = 10, ROWS = 20, SIZE = 24;
  var OX = 30, OY = 56;
  var W = 360, H = 560;

  var COLORS = {
    I: "#5ad0e6",
    O: "#f0d050",
    T: "#c07aef",
    S: "#6edc6e",
    Z: "#ef6b6b",
    J: "#6b8ef0",
    L: "#f0a040",
    G: "#2a3140"
  };

  // shapes as rotation states (4x4 matrices flattened conceptually)
  var SHAPES = {
    I: [
      [[0,1],[1,1],[2,1],[3,1]],
      [[2,0],[2,1],[2,2],[2,3]],
      [[0,2],[1,2],[2,2],[3,2]],
      [[1,0],[1,1],[1,2],[1,3]]
    ],
    O: [
      [[1,0],[2,0],[1,1],[2,1]],
      [[1,0],[2,0],[1,1],[2,1]],
      [[1,0],[2,0],[1,1],[2,1]],
      [[1,0],[2,0],[1,1],[2,1]]
    ],
    T: [
      [[0,1],[1,1],[2,1],[1,0]],
      [[1,0],[1,1],[1,2],[2,1]],
      [[0,1],[1,1],[2,1],[1,2]],
      [[1,0],[1,1],[1,2],[0,1]]
    ],
    S: [
      [[1,0],[2,0],[0,1],[1,1]],
      [[1,0],[1,1],[2,1],[2,2]],
      [[1,1],[2,1],[0,2],[1,2]],
      [[0,0],[0,1],[1,1],[1,2]]
    ],
    Z: [
      [[0,0],[1,0],[1,1],[2,1]],
      [[2,0],[1,1],[2,1],[1,2]],
      [[0,1],[1,1],[1,2],[2,2]],
      [[1,0],[0,1],[1,1],[0,2]]
    ],
    J: [
      [[0,0],[0,1],[1,1],[2,1]],
      [[1,0],[2,0],[1,1],[1,2]],
      [[0,1],[1,1],[2,1],[2,2]],
      [[1,0],[1,1],[0,2],[1,2]]
    ],
    L: [
      [[2,0],[0,1],[1,1],[2,1]],
      [[1,0],[1,1],[1,2],[2,2]],
      [[0,1],[1,1],[2,1],[0,2]],
      [[0,0],[1,0],[1,1],[1,2]]
    ]
  };
  var TYPES = ["I","O","T","S","Z","J","L"];

  var canvas = document.getElementById("c");
  canvas.width = W;
  canvas.height = H;
  var ctx = canvas.getContext("2d", { alpha: false });

  var READY = 0, PLAY = 1, DEAD = 2;
  var state = READY;
  var grid = [];
  var piece = null;
  var nextType = null;
  var bag = [];
  var score = 0, lines = 0, level = 1, best = 0;
  try { best = Number(localStorage.getItem("tetris_best") || 0); } catch (e) {}
  var dropMs = 800;
  var dropAcc = 0;
  var last = 0;
  var touchStart = null;
  var touchMoved = false;

  function emptyGrid() {
    var g = [];
    for (var r = 0; r < ROWS; r++) {
      g[r] = [];
      for (var c = 0; c < COLS; c++) g[r][c] = null;
    }
    return g;
  }

  function shuffleBag() {
    bag = TYPES.slice();
    for (var i = bag.length - 1; i > 0; i--) {
      var j = (Math.random() * (i + 1)) | 0;
      var t = bag[i]; bag[i] = bag[j]; bag[j] = t;
    }
  }

  function takeType() {
    if (!bag.length) shuffleBag();
    return bag.pop();
  }

  function spawn() {
    var type = nextType || takeType();
    nextType = takeType();
    piece = {
      type: type,
      rot: 0,
      x: 3,
      y: 0
    };
    if (collides(piece, 0, 0, 0)) {
      die();
    }
  }

  function cells(p, rotOff) {
    var rot = ((p.rot + (rotOff || 0)) % 4 + 4) % 4;
    var shape = SHAPES[p.type][rot];
    var out = [];
    for (var i = 0; i < shape.length; i++) {
      out.push({ x: p.x + shape[i][0], y: p.y + shape[i][1] });
    }
    return out;
  }

  function collides(p, dx, dy, dRot) {
    var cs = cells({ type: p.type, rot: p.rot, x: p.x + dx, y: p.y + dy }, dRot);
    for (var i = 0; i < cs.length; i++) {
      var c = cs[i];
      if (c.x < 0 || c.x >= COLS || c.y >= ROWS) return true;
      if (c.y >= 0 && grid[c.y][c.x]) return true;
    }
    return false;
  }

  function lockPiece() {
    var cs = cells(piece, 0);
    for (var i = 0; i < cs.length; i++) {
      var c = cs[i];
      if (c.y < 0) { die(); return; }
      grid[c.y][c.x] = piece.type;
    }
    clearLines();
    spawn();
  }

  function clearLines() {
    var cleared = 0;
    for (var r = ROWS - 1; r >= 0; r--) {
      var full = true;
      for (var c = 0; c < COLS; c++) {
        if (!grid[r][c]) { full = false; break; }
      }
      if (full) {
        grid.splice(r, 1);
        var row = [];
        for (var i = 0; i < COLS; i++) row.push(null);
        grid.unshift(row);
        cleared++;
        r++;
      }
    }
    if (cleared) {
      var pts = [0, 100, 300, 500, 800];
      score += pts[cleared] * level;
      lines += cleared;
      level = 1 + ((lines / 10) | 0);
      // gradual speed — not a hard jump
      dropMs = Math.max(120, 800 - (level - 1) * 55);
    }
  }

  function softDrop() {
    if (!piece || state !== PLAY) return;
    if (!collides(piece, 0, 1, 0)) {
      piece.y++;
      score += 1;
    } else {
      lockPiece();
    }
  }

  function hardDrop() {
    if (!piece || state !== PLAY) return;
    while (!collides(piece, 0, 1, 0)) {
      piece.y++;
      score += 2;
    }
    lockPiece();
  }

  function move(dx) {
    if (!piece || state !== PLAY) return;
    if (!collides(piece, dx, 0, 0)) piece.x += dx;
  }

  function rotate() {
    if (!piece || state !== PLAY) return;
    // wall kicks: try 0, -1, +1, -2, +2
    var kicks = [0, -1, 1, -2, 2];
    for (var i = 0; i < kicks.length; i++) {
      if (!collides(piece, kicks[i], 0, 1)) {
        piece.x += kicks[i];
        piece.rot = (piece.rot + 1) % 4;
        return;
      }
    }
  }

  function reset() {
    state = READY;
    grid = emptyGrid();
    piece = null;
    bag = [];
    nextType = null;
    score = 0;
    lines = 0;
    level = 1;
    dropMs = 800;
    dropAcc = 0;
  }

  function start() {
    if (state === DEAD) reset();
    state = PLAY;
    shuffleBag();
    nextType = takeType();
    spawn();
  }

  function die() {
    state = DEAD;
    if (score > best) {
      best = score;
      try { localStorage.setItem("tetris_best", String(best)); } catch (e) {}
    }
    if (window.LataPromo) window.LataPromo.onGameOver();
  }

  window.addEventListener("keydown", function (e) {
    if (state === READY && (e.code === "Space" || e.code === "Enter" || e.code.indexOf("Arrow") === 0)) {
      e.preventDefault();
      start();
      return;
    }
    if (state === DEAD && (e.code === "Space" || e.code === "Enter")) {
      e.preventDefault();
      reset();
      return;
    }
    if (state !== PLAY) return;
    if (e.code === "ArrowLeft" || e.code === "KeyA") { e.preventDefault(); move(-1); }
    else if (e.code === "ArrowRight" || e.code === "KeyD") { e.preventDefault(); move(1); }
    else if (e.code === "ArrowDown" || e.code === "KeyS") { e.preventDefault(); softDrop(); dropAcc = 0; }
    else if (e.code === "ArrowUp" || e.code === "KeyW" || e.code === "KeyX") { e.preventDefault(); rotate(); }
    else if (e.code === "Space") { e.preventDefault(); hardDrop(); dropAcc = 0; }
  });

  function ptrDown(e) {
    e.preventDefault();
    var x = e.clientX != null ? e.clientX : e.touches[0].clientX;
    var y = e.clientY != null ? e.clientY : e.touches[0].clientY;
    touchStart = { x: x, y: y, t: Date.now() };
    touchMoved = false;
    if (state === READY) start();
    else if (state === DEAD) reset();
  }

  function ptrMove(e) {
    if (!touchStart || state !== PLAY) return;
    var x = e.clientX != null ? e.clientX : (e.touches && e.touches[0] ? e.touches[0].clientX : touchStart.x);
    var y = e.clientY != null ? e.clientY : (e.touches && e.touches[0] ? e.touches[0].clientY : touchStart.y);
    var dx = x - touchStart.x;
    var dy = y - touchStart.y;
    if (Math.abs(dx) > 28) {
      move(dx > 0 ? 1 : -1);
      touchStart.x = x;
      touchMoved = true;
    }
    if (dy > 36) {
      softDrop();
      touchStart.y = y;
      touchMoved = true;
    }
  }

  function ptrUp(e) {
    if (!touchStart) return;
    var x = e.clientX != null ? e.clientX : (e.changedTouches && e.changedTouches[0] ? e.changedTouches[0].clientX : touchStart.x);
    var y = e.clientY != null ? e.clientY : (e.changedTouches && e.changedTouches[0] ? e.changedTouches[0].clientY : touchStart.y);
    var dx = x - touchStart.x;
    var dy = y - touchStart.y;
    var dt = Date.now() - touchStart.t;
    if (!touchMoved && dt < 250 && Math.abs(dx) < 12 && Math.abs(dy) < 12 && state === PLAY) {
      rotate();
    } else if (dy < -50 && state === PLAY) {
      hardDrop();
    }
    touchStart = null;
  }

  canvas.addEventListener("mousedown", ptrDown);
  canvas.addEventListener("mousemove", function (e) { if (e.buttons) ptrMove(e); });
  canvas.addEventListener("mouseup", ptrUp);
  canvas.addEventListener("touchstart", ptrDown, { passive: false });
  canvas.addEventListener("touchmove", function (e) { e.preventDefault(); ptrMove(e); }, { passive: false });
  canvas.addEventListener("touchend", ptrUp, { passive: false });

  function drawBlock(x, y, color) {
    var px = OX + x * SIZE;
    var py = OY + y * SIZE;
    ctx.fillStyle = color;
    ctx.fillRect(px + 1, py + 1, SIZE - 2, SIZE - 2);
    ctx.fillStyle = "rgba(255,255,255,0.18)";
    ctx.fillRect(px + 2, py + 2, SIZE - 6, 4);
    ctx.fillStyle = "rgba(0,0,0,0.22)";
    ctx.fillRect(px + 2, py + SIZE - 6, SIZE - 4, 3);
  }

  function drawGhost() {
    if (!piece || state !== PLAY) return;
    var gy = 0;
    while (!collides(piece, 0, gy + 1, 0)) gy++;
    if (!gy) return;
    var ghost = { type: piece.type, rot: piece.rot, x: piece.x, y: piece.y + gy };
    var cs = cells(ghost, 0);
    for (var i = 0; i < cs.length; i++) {
      if (cs[i].y < 0) continue;
      var px = OX + cs[i].x * SIZE;
      var py = OY + cs[i].y * SIZE;
      ctx.strokeStyle = "rgba(255,255,255,0.25)";
      ctx.strokeRect(px + 2, py + 2, SIZE - 4, SIZE - 4);
    }
  }

  function drawNext() {
    if (!nextType) return;
    var boxX = OX + COLS * SIZE + 16;
    var boxY = OY;
    ctx.fillStyle = "#1a2030";
    ctx.fillRect(boxX, boxY, 100, 100);
    ctx.strokeStyle = "#2a3140";
    ctx.strokeRect(boxX, boxY, 100, 100);
    ctx.fillStyle = "#9aa3b5";
    ctx.font = "12px sans-serif";
    ctx.textAlign = "left";
    ctx.fillText("NEXT", boxX + 10, boxY + 18);

    var shape = SHAPES[nextType][0];
    var minX = 99, minY = 99, maxX = 0, maxY = 0;
    for (var i = 0; i < shape.length; i++) {
      minX = Math.min(minX, shape[i][0]);
      minY = Math.min(minY, shape[i][1]);
      maxX = Math.max(maxX, shape[i][0]);
      maxY = Math.max(maxY, shape[i][1]);
    }
    var bw = (maxX - minX + 1) * 18;
    var bh = (maxY - minY + 1) * 18;
    var sx = boxX + (100 - bw) / 2;
    var sy = boxY + 30 + (60 - bh) / 2;
    for (i = 0; i < shape.length; i++) {
      ctx.fillStyle = COLORS[nextType];
      ctx.fillRect(
        sx + (shape[i][0] - minX) * 18,
        sy + (shape[i][1] - minY) * 18,
        16, 16
      );
    }

    ctx.fillStyle = "#9aa3b5";
    ctx.font = "12px sans-serif";
    ctx.fillText("SCORE", boxX + 10, boxY + 130);
    ctx.fillStyle = "#fff";
    ctx.font = "bold 18px sans-serif";
    ctx.fillText(String(score), boxX + 10, boxY + 152);

    ctx.fillStyle = "#9aa3b5";
    ctx.font = "12px sans-serif";
    ctx.fillText("LINES", boxX + 10, boxY + 180);
    ctx.fillStyle = "#fff";
    ctx.font = "bold 18px sans-serif";
    ctx.fillText(String(lines), boxX + 10, boxY + 202);

    ctx.fillStyle = "#9aa3b5";
    ctx.font = "12px sans-serif";
    ctx.fillText("LEVEL", boxX + 10, boxY + 230);
    ctx.fillStyle = "#fff";
    ctx.font = "bold 18px sans-serif";
    ctx.fillText(String(level), boxX + 10, boxY + 252);

    ctx.fillStyle = "#9aa3b5";
    ctx.font = "12px sans-serif";
    ctx.fillText("BEST", boxX + 10, boxY + 280);
    ctx.fillStyle = "#fff";
    ctx.font = "bold 18px sans-serif";
    ctx.fillText(String(best), boxX + 10, boxY + 302);
  }

  function draw() {
    ctx.fillStyle = "#0b0d12";
    ctx.fillRect(0, 0, W, H);

    // title
    ctx.fillStyle = "#e8ecf4";
    ctx.font = "bold 20px sans-serif";
    ctx.textAlign = "left";
    ctx.fillText("TETRIS", OX, 34);

    // board
    ctx.fillStyle = "#141824";
    ctx.fillRect(OX - 2, OY - 2, COLS * SIZE + 4, ROWS * SIZE + 4);
    for (var r = 0; r < ROWS; r++) {
      for (var c = 0; c < COLS; c++) {
        ctx.fillStyle = (r + c) % 2 ? "#121620" : "#151a26";
        ctx.fillRect(OX + c * SIZE, OY + r * SIZE, SIZE, SIZE);
        if (grid[r][c]) drawBlock(c, r, COLORS[grid[r][c]]);
      }
    }

    drawGhost();

    if (piece) {
      var cs = cells(piece, 0);
      for (var i = 0; i < cs.length; i++) {
        if (cs[i].y >= 0) drawBlock(cs[i].x, cs[i].y, COLORS[piece.type]);
      }
    }

    drawNext();

    ctx.textAlign = "center";
    if (state === READY) {
      ctx.fillStyle = "rgba(11,13,18,0.72)";
      ctx.fillRect(OX, OY + 140, COLS * SIZE, 120);
      ctx.fillStyle = "#fff";
      ctx.font = "bold 22px sans-serif";
      ctx.fillText("TETRIS", OX + COLS * SIZE / 2, OY + 190);
      ctx.font = "13px sans-serif";
      ctx.fillStyle = "#c5cddc";
      ctx.fillText("Tap or press Space", OX + COLS * SIZE / 2, OY + 220);
    } else if (state === DEAD) {
      ctx.fillStyle = "rgba(11,13,18,0.78)";
      ctx.fillRect(OX, OY + 140, COLS * SIZE, 130);
      ctx.fillStyle = "#fff";
      ctx.font = "bold 22px sans-serif";
      ctx.fillText("GAME OVER", OX + COLS * SIZE / 2, OY + 185);
      ctx.font = "16px sans-serif";
      ctx.fillText(String(score), OX + COLS * SIZE / 2, OY + 215);
      ctx.font = "13px sans-serif";
      ctx.fillStyle = "#c5cddc";
      ctx.fillText("Tap to retry", OX + COLS * SIZE / 2, OY + 242);
    }
  }

  function loop(now) {
    if (!last) last = now;
    var dt = now - last;
    if (dt > 50) dt = 50;
    last = now;

    if (state === PLAY) {
      dropAcc += dt;
      while (dropAcc >= dropMs) {
        dropAcc -= dropMs;
        if (!collides(piece, 0, 1, 0)) piece.y++;
        else lockPiece();
      }
    }

    draw();
    requestAnimationFrame(loop);
  }

  reset();
  requestAnimationFrame(loop);
})();
