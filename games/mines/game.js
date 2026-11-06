(function () {
  var width = 10;
  var mineTotal = 10;
  var cells = [];
  var started = false;
  var ended = false;
  var flagMode = false;
  var flags = 0;
  var seconds = 0;
  var board = document.getElementById("board");
  var mineCount = document.getElementById("mines-left");
  var timer = document.getElementById("timer");
  var status = document.getElementById("status");
  var modeButton = document.getElementById("mode");

  function neighbors(index) {
    var x = index % width;
    var y = Math.floor(index / width);
    var result = [];
    for (var dy = -1; dy <= 1; dy++) {
      for (var dx = -1; dx <= 1; dx++) {
        var nx = x + dx;
        var ny = y + dy;
        if ((dx || dy) && nx >= 0 && nx < width && ny >= 0 && ny < width) result.push(ny * width + nx);
      }
    }
    return result;
  }

  function placeMines(first) {
    var safe = [first].concat(neighbors(first));
    var available = [];
    for (var i = 0; i < cells.length; i++) if (safe.indexOf(i) === -1) available.push(i);
    for (var m = 0; m < mineTotal; m++) {
      var pick = Math.floor(Math.random() * available.length);
      cells[available.splice(pick, 1)[0]].mine = true;
    }
    cells.forEach(function (cell, i) {
      cell.near = neighbors(i).filter(function (n) { return cells[n].mine; }).length;
    });
    started = true;
  }

  function renderCell(index) {
    var cell = cells[index];
    var button = board.children[index];
    button.className = "cell";
    button.textContent = "";
    button.setAttribute("aria-label", "Row " + (Math.floor(index / width) + 1) + ", column " + (index % width + 1) + (cell.open ? ", open" : ", covered"));
    if (cell.flag) {
      button.classList.add("flag");
      button.textContent = "⚑";
      button.setAttribute("aria-label", "Flagged");
    } else if (cell.open) {
      button.classList.add("open");
      if (cell.mine) {
        button.classList.add("mine");
        button.textContent = "✹";
        button.setAttribute("aria-label", "Mine");
      } else if (cell.near) {
        button.textContent = String(cell.near);
        button.classList.add("n" + cell.near);
        button.setAttribute("aria-label", cell.near + " neighboring mines");
      } else {
        button.setAttribute("aria-label", "Empty");
      }
    }
  }

  function reveal(index) {
    var cell = cells[index];
    if (ended || cell.open || cell.flag) return;
    if (!started) placeMines(index);
    cell.open = true;
    renderCell(index);
    if (cell.mine) {
      ended = true;
      cells.forEach(function (other, i) {
        if (other.mine) { other.open = true; renderCell(i); }
      });
      status.textContent = "Boom! Start a new game and try again.";
      return;
    }
    if (cell.near === 0) neighbors(index).forEach(reveal);
    if (cells.filter(function (item) { return item.open; }).length === cells.length - mineTotal) {
      ended = true;
      status.textContent = "Field cleared! You found every safe square.";
    }
  }

  function toggleFlag(index) {
    var cell = cells[index];
    if (ended || cell.open) return;
    cell.flag = !cell.flag;
    flags += cell.flag ? 1 : -1;
    mineCount.textContent = String(mineTotal - flags);
    renderCell(index);
  }

  function newGame() {
    cells = Array.from({ length: width * width }, function () { return { mine: false, open: false, flag: false, near: 0 }; });
    started = false;
    ended = false;
    flags = 0;
    seconds = 0;
    mineCount.textContent = String(mineTotal);
    timer.textContent = "00:00";
    status.textContent = "Open a square to begin. Your first pick is safe.";
    board.textContent = "";
    cells.forEach(function (_, index) {
      var button = document.createElement("button");
      button.type = "button";
      button.className = "cell";
      button.setAttribute("role", "gridcell");
      button.setAttribute("aria-label", "Covered square");
      button.addEventListener("click", function () {
        if (flagMode) toggleFlag(index);
        else reveal(index);
      });
      button.addEventListener("contextmenu", function (event) {
        event.preventDefault();
        toggleFlag(index);
      });
      board.appendChild(button);
    });
  }

  modeButton.addEventListener("click", function () {
    flagMode = !flagMode;
    modeButton.setAttribute("aria-pressed", String(flagMode));
    modeButton.textContent = "🚩 Flag mode: " + (flagMode ? "on" : "off");
  });
  window.setInterval(function () {
    if (started && !ended) {
      seconds++;
      timer.textContent = String(Math.floor(seconds / 60)).padStart(2, "0") + ":" + String(seconds % 60).padStart(2, "0");
    }
  }, 1000);
  document.getElementById("restart").addEventListener("click", newGame);
  newGame();
})();
