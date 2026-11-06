(function () {
  var search = document.getElementById("game-search");
  var cards = Array.prototype.slice.call(document.querySelectorAll(".game"));
  var filters = Array.prototype.slice.call(document.querySelectorAll(".filter"));
  var count = document.getElementById("game-count");
  var empty = document.getElementById("empty-state");
  var activeFilter = "all";

  function update() {
    var query = search.value.trim().toLowerCase();
    var visible = 0;

    cards.forEach(function (card) {
      var matchesText = card.textContent.toLowerCase().indexOf(query) !== -1;
      var matchesFilter = activeFilter === "all" || card.dataset.category.split(" ").indexOf(activeFilter) !== -1;
      var show = matchesText && matchesFilter;
      card.parentElement.hidden = !show;
      if (show) visible += 1;
    });

    count.textContent = visible + (visible === 1 ? " game" : " games");
    empty.hidden = visible !== 0;
  }

  search.addEventListener("input", update);
  filters.forEach(function (button) {
    button.addEventListener("click", function () {
      activeFilter = button.dataset.filter;
      filters.forEach(function (item) {
        var selected = item === button;
        item.classList.toggle("is-active", selected);
        item.setAttribute("aria-pressed", String(selected));
      });
      update();
    });
  });

  document.addEventListener("keydown", function (event) {
    if (event.key === "/" && document.activeElement !== search && !event.metaKey && !event.ctrlKey && !event.altKey) {
      event.preventDefault();
      search.focus();
    }
    if (event.key === "Escape" && document.activeElement === search) {
      search.value = "";
      update();
      search.blur();
    }
  });
})();
