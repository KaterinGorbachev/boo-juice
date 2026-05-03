(function () {

  var input = document.getElementById('caloriasSearch');
  var prevBtn = document.getElementById('searchPrev');
  var nextBtn = document.getElementById('searchNext');
  var countEl = document.getElementById('searchCount');

  var matches = [];
  var current = -1;

  function clearHighlights() {
    document.querySelectorAll('.calorias table tr.highlight-match').forEach(function (r) {
      r.classList.remove('highlight-match');
    });
  }

  function updateNav() {
    var total = matches.length;
    countEl.textContent = total ? (current + 1) + ' / ' + total : (input.value ? '0 resultados' : '');
    prevBtn.disabled = total === 0 || current <= 0;
    nextBtn.disabled = total === 0 || current >= total - 1;
  }

  function scrollToCurrent() {
    if (matches[current]) {
      matches[current].scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  }

  function search(query) {
    clearHighlights();
    matches = [];
    current = -1;

    if (!query.trim()) {
      updateNav();
      return;
    }

    var q = query.trim().toLowerCase();
    document.querySelectorAll('.calorias table tbody tr').forEach(function (tr) {
      var firstTd = tr.querySelector('td:first-child');
      if (firstTd && firstTd.querySelector('strong') === null) {
        if (firstTd.textContent.toLowerCase().includes(q)) {
          matches.push(tr);
        }
      }
    });

    if (matches.length > 0) {
      current = 0;
      matches[current].classList.add('highlight-match');
      scrollToCurrent();
    }
    updateNav();
  }

  input.addEventListener('input', function () {
    search(this.value);
  });

  input.addEventListener('keydown', function (e) {
    if (e.key === 'Enter') {
      e.preventDefault();
      if (matches.length === 0) return;
      matches[current] && matches[current].classList.remove('highlight-match');
      current = e.shiftKey
        ? (current - 1 + matches.length) % matches.length
        : (current + 1) % matches.length;
      matches[current].classList.add('highlight-match');
      scrollToCurrent();
      updateNav();
    }
  });

  nextBtn.addEventListener('click', function () {
    if (current >= matches.length - 1) return;
    matches[current] && matches[current].classList.remove('highlight-match');
    current++;
    matches[current].classList.add('highlight-match');
    scrollToCurrent();
    updateNav();
  });

  prevBtn.addEventListener('click', function () {
    if (current <= 0) return;
    matches[current] && matches[current].classList.remove('highlight-match');
    current--;
    matches[current].classList.add('highlight-match');
    scrollToCurrent();
    updateNav();
  });
})();
