/* ============================================================
   Site behaviour — no build step, no dependencies
   ============================================================ */
(function () {
  'use strict';

  var CATS = window.CATEGORIES || [];
  var WORKS = window.WORKS || [];

  function qs(sel, root) { return (root || document).querySelector(sel); }
  function qsa(sel, root) { return Array.prototype.slice.call((root || document).querySelectorAll(sel)); }
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"]/g, function (c) {
    return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c];
  }); }
  function pad(n) { return n < 10 ? '0' + n : '' + n; }
  function catName(key) {
    for (var i = 0; i < CATS.length; i++) if (CATS[i].key === key) return CATS[i].name;
    return key;
  }
  function countOf(key) {
    if (key === 'all') return WORKS.length;
    return WORKS.filter(function (w) { return w.cat === key; }).length;
  }
  function coverStyle(w) {
    return w.cover ? 'background-image:url(' + w.cover + ');background-size:cover;background-position:center;' : 'background:' + w.gradient + ';';
  }

  /* ---------------------------------------------------- reveal on scroll */
  function initReveal(root) {
    var nodes = qsa('.reveal', root);
    if (!('IntersectionObserver' in window)) {
      nodes.forEach(function (n) { n.classList.add('is-in'); });
      return;
    }
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (e.isIntersecting) { e.target.classList.add('is-in'); io.unobserve(e.target); }
      });
    }, { rootMargin: '0px 0px -8% 0px', threshold: 0.05 });
    nodes.forEach(function (n) { io.observe(n); });

    // safety net: never leave content invisible if the observer misbehaves
    setTimeout(function () {
      qsa('.reveal').forEach(function (n) { n.classList.add('is-in'); });
    }, 2200);
  }

  /* ---------------------------------------------------- nav active state */
  function initNav() {
    var here = (location.pathname.split('/').pop() || 'index.html').toLowerCase();
    var pageNav = document.body.getAttribute('data-nav');
    qsa('.nav__link').forEach(function (a) {
      var href = (a.getAttribute('href') || '').split('/').pop().split('#')[0].toLowerCase();
      var key = a.getAttribute('data-nav');
      if (href === here || (key && pageNav === key)) a.classList.add('is-active');
    });
  }

  /* ---------------------------------------------------- lightbox */
  function openLightbox(work) {
    var box = qs('#lightbox');
    if (!box) return;
    var stage = qs('.lightbox__stage', box);
    stage.innerHTML = work.video
      ? '<video src="' + esc(work.video) + '" controls autoplay playsinline></video>'
      : '<p class="lightbox__note">VIDEO NOT ATTACHED<br><br>在 assets/js/data.js 里给这支作品填 video 路径即可播放</p>';
    box.classList.add('is-open');
    document.body.style.overflow = 'hidden';
  }

  function closeLightbox() {
    var box = qs('#lightbox');
    if (!box) return;
    var v = qs('video', box);
    if (v) { v.pause(); }
    qs('.lightbox__stage', box).innerHTML = '';
    box.classList.remove('is-open');
    document.body.style.overflow = '';
  }

  function initLightbox() {
    var box = qs('#lightbox');
    if (!box) return;
    box.addEventListener('click', function (e) {
      if (e.target === box || e.target.closest('.lightbox__close')) closeLightbox();
    });
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape') closeLightbox();
    });
  }

  /* ---------------------------------------------------- home: filter + grid */
  function workCardHTML(w, i) {
    return '' +
      '<a class="work reveal" href="work.html?id=' + esc(w.id) + '" data-cat="' + esc(w.cat) + '">' +
        '<div class="work__media">' +
          '<div class="work__cover" style="' + coverStyle(w) + '"></div>' +
          '<span class="work__chip">' + esc(catName(w.cat)) + '</span>' +
          '<span class="work__stamp">VIDEO STILL  /  ' + esc(w.duration) + '</span>' +
          '<span class="work__play"></span>' +
        '</div>' +
        '<div class="work__meta">' +
          '<div class="work__left">' +
            '<span class="work__num">' + pad(i + 1) + '</span>' +
            '<div>' +
              '<h3 class="work__title">' + esc(w.title) + '</h3>' +
              '<div class="work__tools">' + esc(w.tools) + '</div>' +
            '</div>' +
          '</div>' +
          '<div class="work__right">' +
            '<div class="work__year">' + esc(w.year) + '</div>' +
            '<div class="work__cta">查看项目</div>' +
          '</div>' +
        '</div>' +
      '</a>';
  }

  function initWorks() {
    var gridEl = qs('#works-grid');
    if (!gridEl) return;

    var filterEl = qs('#filter');
    var limit = Number(gridEl.getAttribute('data-limit') || 0);

    function paint(active) {
      if (filterEl) {
        filterEl.innerHTML = CATS.map(function (c) {
          return '<button class="filter__item' + (c.key === active ? ' is-active' : '') + '" data-cat="' + esc(c.key) + '">' +
            '<span class="filter__name">' + esc(c.name) + '</span>' +
            '<span class="filter__count">' + pad(countOf(c.key)) + '</span>' +
          '</button>';
        }).join('');
      }

      var list = WORKS.filter(function (w) { return active === 'all' || w.cat === active; });
      if (limit) list = list.slice(0, limit);

      gridEl.innerHTML = list.length
        ? list.map(workCardHTML).join('')
        : '<p class="works__empty">这个分类还没有作品。</p>';

      initReveal(gridEl);
    }

    if (filterEl) {
      filterEl.addEventListener('click', function (e) {
        var btn = e.target.closest('.filter__item');
        if (btn) paint(btn.getAttribute('data-cat'));
      });
    }

    paint('all');
  }

  /* ---------------------------------------------------- detail page */
  function initDetail() {
    var root = qs('#detail');
    if (!root) return;

    var id = new URLSearchParams(location.search).get('id') || WORKS[0].id;
    var idx = -1;
    WORKS.forEach(function (w, i) { if (w.id === id) idx = i; });
    if (idx < 0) idx = 0;
    var w = WORKS[idx];

    document.title = w.title + ' — ZHANG JUN RUI';

    qs('#d-title').textContent = w.title;
    qs('#d-cat').textContent = catName(w.cat).toUpperCase();
    qs('#d-year').textContent = w.year;
    qs('#d-duration').textContent = w.duration;

    var player = qs('#d-player');
    player.innerHTML =
      '<div class="player__cover" style="' + coverStyle(w) + '"></div>' +
      '<span class="player__stamp">MAIN FILM  /  ' + esc(w.duration) + '  /  ' + esc(w.ratio) + '</span>' +
      '<span class="player__play"></span>';
    player.addEventListener('click', function () { openLightbox(w); });

    qs('#d-desc').textContent = w.desc;
    qs('#d-tools').textContent = w.tools;
    qs('#d-scope').textContent = catName(w.cat) + '短片 · ' + w.duration + ' · ' + w.ratio;

    qs('#d-stills').innerHTML = w.stills.map(function (t, i) {
      return '<div class="still" style="' + coverStyle(w) + ';filter:brightness(' + (i ? 0.8 : 0.95) + ')">' +
        '<span class="still__stamp">STILL  /  ' + esc(t) + '</span></div>';
    }).join('');

    var next = WORKS[(idx + 1) % WORKS.length];
    var nextLink = qs('#d-next');
    nextLink.setAttribute('href', 'work.html?id=' + next.id);
    qs('#d-next-title').textContent = next.title;
  }

  /* ---------------------------------------------------- dynamic counts */
  function applyCounts() {
    qsa('[data-count]').forEach(function (el) {
      var key = el.getAttribute('data-count');
      el.textContent = countOf(key);
    });
  }

  /* ---------------------------------------------------- boot */
  function applySite(site) {
    if (!site) return;
    qsa('[data-site]').forEach(function (el) {
      var k = el.getAttribute('data-site');
      if (!site[k]) return;
      if (k === 'email') { el.textContent = site[k]; el.setAttribute('href', 'mailto:' + site[k]); }
      else if (k === 'wechat') { el.textContent = '微信  ' + site[k]; }
      else if (k === 'xhs') { el.textContent = '小红书  ' + site[k]; }
      else if (k === 'status') { el.textContent = site[k]; }
    });
  }

  function boot() {
    initNav();
    initLightbox();
    initWorks();
    initDetail();
    applyCounts();
    applySite(window.SITE_INFO);
    initReveal(document);
  }

  var isLocal = /^(localhost|127\.0\.0\.1|\[::1\]|0\.0\.0\.0)$/.test(location.hostname);

  function fromApi() {
    // running via server.js → live data from the admin panel
    if (location.protocol === 'file:' || !isLocal) return Promise.resolve(null);
    return fetch('/api/works').then(function (r) { return r.ok ? r.json() : null; }).catch(function () { return null; });
  }
  function fromStatic() {
    // GitHub Pages / any static host → committed data.json
    if (location.protocol === 'file:') return Promise.resolve(null);
    return fetch('data.json').then(function (r) { return r.ok ? r.json() : null; }).catch(function () { return null; });
  }
  function adopt(d) {
    if (d && Array.isArray(d.works) && d.works.length) {
      window.WORKS = d.works;
      if (d.categories && d.categories.length) window.CATEGORIES = d.categories;
      window.SITE_INFO = d.site;
      return true;
    }
    return false;
  }

  var dataReady = fromApi()
    .then(function (d) { return adopt(d) ? null : fromStatic(); })
    .then(function (d) { adopt(d); })
    .catch(function () { /* fall back to the bundled data.js */ });

  document.addEventListener('DOMContentLoaded', function () {
    dataReady.then(boot);
  });
})();
