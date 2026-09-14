/* Tuvio HBI1414 — навигация, поиск по разделам, тема, видео, чек-листы. */

(function () {
  'use strict';

  var doc = document;
  var $ = function (sel, root) { return (root || doc).querySelector(sel); };
  var $$ = function (sel, root) { return Array.prototype.slice.call((root || doc).querySelectorAll(sel)); };

  /* ---------- Тема ---------- */

  var THEME_KEY = 'tuvio-theme';
  var themeBtn = $('#theme');

  function readStore(key) {
    try { return localStorage.getItem(key); } catch (e) { return null; }
  }
  function writeStore(key, val) {
    try { localStorage.setItem(key, val); } catch (e) { /* приватный режим — не беда */ }
  }

  function applyTheme(name) {
    doc.documentElement.setAttribute('data-theme', name);
    if (themeBtn) {
      themeBtn.innerHTML = name === 'dark'
        ? '☀️<span class="icon-btn__label">Дневная</span>'
        : '🌙<span class="icon-btn__label">Вечерняя</span>';
      themeBtn.setAttribute('aria-label', name === 'dark' ? 'Включить дневную тему' : 'Включить вечернюю тему');
    }
  }

  applyTheme(readStore(THEME_KEY) === 'dark' ? 'dark' : 'light');

  if (themeBtn) {
    themeBtn.addEventListener('click', function () {
      var next = doc.documentElement.getAttribute('data-theme') === 'light' ? 'dark' : 'light';
      applyTheme(next);
      writeStore(THEME_KEY, next);
    });
  }

  /* ---------- Боковое меню на мобильных ---------- */

  var sidebar = $('#sidebar');
  var burger = $('#burger');

  if (burger && sidebar) {
    burger.addEventListener('click', function () {
      sidebar.classList.toggle('is-open');
    });
    sidebar.addEventListener('click', function (e) {
      if (e.target.tagName === 'A' && window.innerWidth <= 900) sidebar.classList.remove('is-open');
    });
    doc.addEventListener('keydown', function (e) {
      if (e.key === 'Escape') sidebar.classList.remove('is-open');
    });
  }

  /* ---------- Подсветка активного раздела ---------- */

  var links = $$('.nav a');
  var sections = links
    .map(function (a) { return doc.getElementById(a.getAttribute('href').slice(1)); })
    .filter(Boolean);

  function markActive(id) {
    links.forEach(function (a) {
      a.classList.toggle('is-active', a.getAttribute('href') === '#' + id);
    });
  }

  if ('IntersectionObserver' in window && sections.length) {
    var visible = {};
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) { visible[en.target.id] = en.isIntersecting; });
      for (var i = 0; i < sections.length; i++) {
        if (visible[sections[i].id]) { markActive(sections[i].id); break; }
      }
    }, { rootMargin: '-80px 0px -65% 0px' });
    sections.forEach(function (s) { io.observe(s); });
  }

  /* ---------- Полоса прогресса и кнопка «наверх» ---------- */

  var bar = $('#progress');
  var toTop = $('#totop');

  function onScroll() {
    var h = doc.documentElement;
    var max = h.scrollHeight - h.clientHeight;
    var pct = max > 0 ? (h.scrollTop / max) * 100 : 0;
    if (bar) bar.style.width = pct + '%';
    if (toTop) toTop.classList.toggle('is-on', h.scrollTop > 700);
  }

  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();

  if (toTop) {
    toTop.addEventListener('click', function () {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    });
  }

  /* ---------- Поиск по оглавлению ---------- */

  var search = $('#search');
  var navEmpty = $('#nav-empty');

  if (search) {
    search.addEventListener('input', function () {
      var q = search.value.trim().toLowerCase();
      var found = 0;

      links.forEach(function (a) {
        var hay = (a.textContent + ' ' + (a.dataset.keys || '')).toLowerCase();
        var hit = !q || hay.indexOf(q) !== -1;
        a.hidden = !hit;
        if (hit) found++;
      });

      $$('.nav__group').forEach(function (g) {
        var next = g.nextElementSibling;
        var any = false;
        while (next && !next.classList.contains('nav__group')) {
          if (next.tagName === 'A' && !next.hidden) any = true;
          next = next.nextElementSibling;
        }
        g.hidden = !any;
      });

      if (navEmpty) navEmpty.hidden = found !== 0;
    });
  }

  /* ---------- Видео: превью вместо тяжёлого плеера ---------- */

  $$('.video__frame').forEach(function (btn) {
    btn.addEventListener('click', function () {
      var id = btn.dataset.yt;
      if (!id) return;
      var frame = doc.createElement('iframe');
      frame.src = 'https://www.youtube-nocookie.com/embed/' + id + '?autoplay=1&rel=0';
      frame.title = btn.dataset.title || 'Видео на YouTube';
      frame.allow = 'accelerometer; autoplay; encrypted-media; gyroscope; picture-in-picture';
      frame.allowFullscreen = true;
      btn.replaceWith(frame);
    });
  });

  /* ---------- Фильтр видео по темам ---------- */

  var chips = $$('.chip[data-filter]');
  var cards = $$('.video[data-tags]');

  chips.forEach(function (chip) {
    chip.addEventListener('click', function () {
      chips.forEach(function (c) { c.classList.toggle('is-on', c === chip); });
      var f = chip.dataset.filter;
      cards.forEach(function (card) {
        card.hidden = f !== 'all' && card.dataset.tags.indexOf(f) === -1;
      });
    });
  });

  /* ---------- Чек-листы помнят отметки ---------- */

  $$('.check input[type="checkbox"]').forEach(function (box, i) {
    var key = 'tuvio-check-' + (box.id || i);
    if (readStore(key) === '1') box.checked = true;
    box.addEventListener('change', function () {
      writeStore(key, box.checked ? '1' : '0');
    });
  });

  var resetBtn = $('#reset-checks');
  if (resetBtn) {
    resetBtn.addEventListener('click', function () {
      $$('.check input[type="checkbox"]').forEach(function (box, i) {
        box.checked = false;
        writeStore('tuvio-check-' + (box.id || i), '0');
      });
    });
  }

  /* ---------- Раскрыть всё в аккордеонах перед печатью ---------- */

  var expandBtn = $('#expand-all');
  if (expandBtn) {
    expandBtn.addEventListener('click', function () {
      var all = $$('details');
      var open = all.every(function (d) { return d.open; });
      all.forEach(function (d) { d.open = !open; });
      expandBtn.textContent = open ? 'Раскрыть все ответы' : 'Свернуть все ответы';
    });
  }

  window.addEventListener('beforeprint', function () {
    $$('details').forEach(function (d) { d.open = true; });
  });
})();
