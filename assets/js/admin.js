/* ============================================================
   Admin SPA — hash routed, talks to server.js
   ============================================================ */
(function () {
  'use strict';

  var app = document.getElementById('app');
  var state = {
    works: [],
    categories: [],
    site: {},
    loaded: false,
    draft: null
  };

  /* ---------------------------------------------------- utils */
  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"]/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c];
    });
  }
  function pad(n) { return n < 10 ? '0' + n : '' + n; }
  function qs(s, r) { return (r || document).querySelector(s); }
  function qsa(s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); }
  function uid() { return 'w-' + Date.now().toString(36); }

  /* count-up for numeric stat values */
  function animateCounts(scope) {
    if (!scope || (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches)) return;
    qsa('.val', scope).forEach(function (el) {
      var target = parseInt(String(el.textContent || '').replace(/[^\d]/g, ''), 10);
      if (isNaN(target) || target <= 0) return;
      var dur = 700, start = null;
      function step(ts) {
        if (start === null) start = ts;
        var p = Math.min(1, (ts - start) / dur);
        var e = 1 - Math.pow(1 - p, 3);
        el.textContent = Math.round(target * e);
        if (p < 1) requestAnimationFrame(step);
        else el.textContent = target;
      }
      requestAnimationFrame(step);
    });
  }

  function toast(msg, ok) {
    var t = qs('#toast');
    t.textContent = msg;
    t.classList.add('is-on');
    clearTimeout(t._timer);
    t._timer = setTimeout(function () { t.classList.remove('is-on'); }, 2600);
  }

  function api(method, url, body, isRaw) {
    var opt = { method: method, headers: {} };
    if (body !== undefined) opt.body = isRaw ? body : JSON.stringify(body);
    return fetch(url, opt).then(function (r) {
      return r.json().catch(function () { return {}; }).then(function (j) {
        if (!r.ok) throw new Error(j.message || ('HTTP ' + r.status));
        return j;
      });
    });
  }

  function saveAll() {
    return api('PUT', '/api/works', {
      works: state.works,
      categories: state.categories,
      site: state.site
    });
  }

  function coverCSS(w) {
    return w && w.cover
      ? 'background-image:url("' + esc(w.cover) + '")'
      : 'background:' + (w ? w.gradient : 'linear-gradient(135deg,#1A2B30,#0C0D10)');
  }

  /* ---------------------------------------------------- upload */
  function bindDrop(el, onPicked, accept) {
    var input = document.createElement('input');
    input.type = 'file';
    input.accept = accept || 'image/*,video/*';
    el.appendChild(input);
    el.addEventListener('click', function (e) {
      if (e.target.tagName === 'INPUT') return;
      input.click();
    });
    input.addEventListener('change', function () {
      if (input.files && input.files[0]) onPicked(input.files[0]);
    });
    el.addEventListener('dragover', function (e) { e.preventDefault(); el.style.borderColor = 'rgba(124,143,184,.6)'; });
    el.addEventListener('dragleave', function () { el.style.borderColor = ''; });
    el.addEventListener('drop', function (e) {
      e.preventDefault();
      el.style.borderColor = '';
      if (e.dataTransfer.files && e.dataTransfer.files[0]) onPicked(e.dataTransfer.files[0]);
    });
  }

  function uploadFile(file) {
    toast('上传中：' + file.name);
    return fetch('/api/upload?name=' + encodeURIComponent(file.name), { method: 'POST', body: file })
      .then(function (r) { return r.json(); })
      .then(function (j) {
        if (!j.ok) throw new Error(j.message || '上传失败');
        toast('上传完成');
        return j.url;
      })
      .catch(function (e) { toast('上传失败：' + e.message, true); return null; });
  }

  /* ---------------------------------------------------- list view */
  function countOf(key) {
    if (key === 'all') return state.works.length;
    return state.works.filter(function (w) { return w.cat === key; }).length;
  }

  function renderList() {
    var cats = [{ key: 'all', name: '全部' }].concat(state.categories);
    var stats = cats.slice(0, 5).map(function (c, i) {
      return '<div class="stat' + (i ? ' dim' : '') + '">' +
        '<div class="lbl">' + esc(c.name) + '</div>' +
        '<div class="val">' + pad(countOf(c.key)) + '</div></div>';
    }).join('');

    var rows = state.works.map(function (w, i) {
      return '<tr>' +
        '<td style="width:104px"><div class="thumb" style="' + coverCSS(w) + '"></div></td>' +
        '<td><div class="t">' + esc(w.title) + '</div></td>' +
        '<td style="width:130px"><div class="c">' + esc((catName(w.cat))) + '</div></td>' +
        '<td style="width:90px"><div class="d">' + esc(w.duration) + '</div></td>' +
        '<td style="width:120px"><div class="ops">' +
          '<a href="#/edit/' + esc(w.id) + '">编辑</a>' +
          '<a href="#" class="danger" data-del="' + esc(w.id) + '">删除</a>' +
        '</div></td></tr>';
    }).join('');

    app.innerHTML =
      '<div class="page-top">' +
        '<div><h1>作品管理</h1><div class="sub">' + state.works.length + ' PROJECTS  /  ' + state.categories.length + ' CATEGORIES</div></div>' +
        '<div class="btn-row"><a class="btn btn--primary" href="#/edit/new">新建作品</a></div>' +
      '</div>' +
      '<div class="rule"></div>' +
      '<div class="stats">' + stats + '</div>' +
      '<div class="toolbar">' +
        '<div class="toolbar__left">' +
          '<input class="input search" id="q" placeholder="搜索作品">' +
          '<select class="select" id="fc"><option value="all">全部分类</option>' +
            state.categories.map(function (c) { return '<option value="' + esc(c.key) + '">' + esc(c.name) + '</option>'; }).join('') +
          '</select>' +
        '</div>' +
        '<div class="count">共 ' + state.works.length + ' 条</div>' +
      '</div>' +
      '<table class="tbl"><thead><tr>' +
        '<th style="width:104px">COVER</th><th>标题 / TITLE</th><th style="width:130px">分类</th><th style="width:90px">时长</th><th style="width:120px">操作</th>' +
      '</tr></thead><tbody id="rows">' + rows + '</tbody></table>';

    var filterRows = function () {
      var q = qs('#q').value.trim();
      var fc = qs('#fc').value;
      var list = state.works.filter(function (w) {
        var okCat = fc === 'all' || w.cat === fc;
        var okQ = !q || (w.title + w.tools).indexOf(q) > -1;
        return okCat && okQ;
      });
      qs('#rows').innerHTML = list.length ? list.map(function (w) {
        return '<tr>' +
          '<td style="width:104px"><div class="thumb" style="' + coverCSS(w) + '"></div></td>' +
          '<td><div class="t">' + esc(w.title) + '</div></td>' +
          '<td style="width:130px"><div class="c">' + esc(catName(w.cat)) + '</div></td>' +
          '<td style="width:90px"><div class="d">' + esc(w.duration) + '</div></td>' +
          '<td style="width:120px"><div class="ops">' +
            '<a href="#/edit/' + esc(w.id) + '">编辑</a>' +
            '<a href="#" class="danger" data-del="' + esc(w.id) + '">删除</a>' +
          '</div></td></tr>';
      }).join('') : '<tr><td colspan="5"><div class="empty">没有匹配的作品。</div></td></tr>';
    };

    qs('#q').addEventListener('input', filterRows);
    qs('#fc').addEventListener('change', filterRows);

    app.addEventListener('click', function onDel(e) {
      var a = e.target.closest('[data-del]');
      if (!a) return;
      e.preventDefault();
      var id = a.getAttribute('data-del');
      if (!confirm('删除这支作品？本地 data.json 会同步更新。')) return;
      state.works = state.works.filter(function (w) { return w.id !== id; });
      saveAll().then(function () { toast('已删除'); renderList(); })
        .catch(function (err) { toast('删除失败：' + err.message, true); });
    }, { once: false });
  }

  function catName(key) {
    for (var i = 0; i < state.categories.length; i++) {
      if (state.categories[i].key === key) return state.categories[i].name;
    }
    return key || '';
  }

  /* ---------------------------------------------------- edit view */
  function blankWork() {
    return {
      id: uid(), cat: (state.categories[1] || state.categories[0] || {}).key || '',
      title: '', tools: '', duration: '00:30', ratio: '16:9',
      year: String(new Date().getFullYear()),
      desc: '', gradient: 'linear-gradient(135deg,#1A2B30 0%,#0C0D10 100%)',
      cover: '', video: '', stills: []
    };
  }

  function renderEdit(id) {
    var isNew = (id === 'new');
    var w = isNew ? blankWork() : (state.works.filter(function (x) { return x.id === id; })[0] || blankWork());
    if (!isNew) state.draft = JSON.parse(JSON.stringify(w));
    else state.draft = w;

    var idx = state.works.indexOf(w) + 1;

    app.innerHTML =
      '<div class="page-top">' +
        '<div><h1>' + (isNew ? '新建作品' : '编辑作品') + '</h1><div class="sub">' + (isNew ? 'NEW' : 'EDIT  /  ' + esc(w.id)) + '</div></div>' +
        '<div class="btn-row">' +
          (isNew ? '' : '<button class="btn btn--text" id="b-del">删除</button>') +
          '<a class="btn btn--ghost" href="#/works">取消</a>' +
          '<button class="btn btn--primary" id="b-save">保存</button>' +
        '</div>' +
      '</div>' +
      '<div class="rule"></div>' +
      '<div class="edit-grid">' +
        '<div>' +
          field('标题 / TITLE', '<input class="input" id="f-title" value="' + esc(w.title) + '" placeholder="作品名">') +
          field('分类 / CATEGORY', '<select class="select" id="f-cat" style="width:100%">' +
            state.categories.map(function (c) {
              return '<option value="' + esc(c.key) + '"' + (c.key === w.cat ? ' selected' : '') + '>' + esc(c.name) + '</option>';
            }).join('') + '</select>') +
          '<div class="field-row">' +
            field('时长 / DURATION', '<input class="input" id="f-duration" value="' + esc(w.duration) + '">') +
            field('比例 / RATIO', '<input class="input" id="f-ratio" value="' + esc(w.ratio) + '">') +
          '</div>' +
          field('工具 / TOOLS', '<input class="input" id="f-tools" value="' + esc(w.tools) + '" placeholder="Premiere / 剪映 / 卡点">') +
          field('创作说明 / DESCRIPTION', '<textarea class="input" id="f-desc" placeholder="你在这支片子里做了什么判断？">' + esc(w.desc) + '</textarea>') +
          field('封面 / COVER', '<div class="drop" id="d-cover">' +
            (w.cover ? '<img src="' + esc(w.cover) + '">' : '') +
            '<span class="tip">拖入图片，或点击上传</span></div>' +
            '<input class="input" id="f-cover" value="' + esc(w.cover) + '" placeholder="或直接填图片路径 / URL" style="margin-top:10px">') +
          field('视频 / VIDEO', '<div class="drop" id="d-video">' +
            '<span class="tip">拖入 mp4，或点击上传</span></div>' +
            '<input class="input" id="f-video" value="' + esc(w.video) + '" placeholder="或直接填 mp4 路径 / URL" style="margin-top:10px">') +
        '</div>' +
        '<div class="preview">' +
          '<span class="lbl">PREVIEW</span>' +
          '<div class="preview__card">' +
            '<div class="preview__media" id="p-media" style="' + coverCSS(w) + '">' +
              '<span class="stamp" id="p-stamp">VIDEO STILL  /  ' + esc(w.duration) + '</span></div>' +
            '<div class="preview__meta">' +
              '<div class="t" id="p-title">' + esc(w.title || '未命名作品') + '</div>' +
              '<div class="s" id="p-sub">' + esc(catName(w.cat)) + '  /  ' + esc(w.tools) + '</div>' +
            '</div>' +
          '</div>' +
          '<div class="preview__hint">前台作品卡与详情页会使用这里的内容。</div>' +
        '</div>' +
      '</div>';

    /* live preview */
    function refresh() {
      var d = state.draft;
      qs('#p-media').setAttribute('style', coverCSS(d));
      qs('#p-stamp').textContent = 'VIDEO STILL  /  ' + (d.duration || '00:00');
      qs('#p-title').textContent = d.title || '未命名作品';
      qs('#p-sub').textContent = catName(d.cat) + '  /  ' + (d.tools || '');
    }
    ['f-title', 'f-duration', 'f-tools', 'f-cover', 'f-video'].forEach(function (fid) {
      qs('#' + fid).addEventListener('input', function (e) {
        var map = { 'f-title': 'title', 'f-duration': 'duration', 'f-tools': 'tools', 'f-cover': 'cover', 'f-video': 'video' };
        state.draft[map[fid]] = e.target.value;
        refresh();
      });
    });
    qs('#f-cat').addEventListener('change', function (e) { state.draft.cat = e.target.value; refresh(); });
    qs('#f-desc').addEventListener('input', function (e) { state.draft.desc = e.target.value; });

    /* uploads */
    bindDrop(qs('#d-cover'), function (f) {
      uploadFile(f).then(function (url) {
        if (!url) return;
        if (/\.mp4|\.webm|\.mov$/i.test(url)) { state.draft.video = url; qs('#f-video').value = url; }
        else { state.draft.cover = url; qs('#f-cover').value = url; }
        qs('#d-cover').innerHTML = '<img src="' + esc(url) + '"><span class="tip">拖入图片，或点击上传</span>';
        qs('#d-cover').classList.add('has-file');
        refresh();
      });
    }, 'image/*');
    bindDrop(qs('#d-video'), function (f) {
      uploadFile(f).then(function (url) {
        if (!url) return;
        state.draft.video = url;
        qs('#f-video').value = url;
        toast('视频已上传，记得点保存');
      });
    }, 'video/*');

    /* save */
    qs('#b-save').addEventListener('click', function () {
      var d = state.draft;
      if (!d.title) return toast('先填个标题', true);
      d.cover = qs('#f-cover').value;
      d.video = qs('#f-video').value;
      d.desc = qs('#f-desc').value;
      if (isNew) state.works.unshift(d);
      else {
        var at = -1;
        state.works.forEach(function (x, i) { if (x.id === d.id) at = i; });
        if (at > -1) state.works[at] = d; else state.works.unshift(d);
      }
      saveAll().then(function () {
        toast('已保存');
        location.hash = '#/works';
      }).catch(function (e) { toast('保存失败：' + e.message, true); });
    });

    if (qs('#b-del')) {
      qs('#b-del').addEventListener('click', function () {
        if (!confirm('删除这支作品？')) return;
        state.works = state.works.filter(function (x) { return x.id !== w.id; });
        saveAll().then(function () { toast('已删除'); location.hash = '#/works'; })
          .catch(function (e) { toast('删除失败：' + e.message, true); });
      });
    }
  }

  function field(lbl, control) {
    return '<div class="field"><span class="lbl">' + esc(lbl) + '</span>' + control + '</div>';
  }

  /* ---------------------------------------------------- settings view */
  function renderSettings() {
    var s = state.site || {};
    app.innerHTML =
      '<div class="page-top">' +
        '<div><h1>站点设置</h1><div class="sub">SETTINGS  /  SITE</div></div>' +
        '<div class="btn-row"><button class="btn btn--primary" id="s-save">保存</button></div>' +
      '</div>' +
      '<div class="rule"></div>' +

      '<div class="sec"><span class="lbl">01 — IDENTITY</span>' +
        '<div class="field-grid">' +
          field('署名 / NAME', '<input class="input" id="s-name" value="' + esc(s.name || '') + '">') +
          field('城市 / CITY', '<input class="input" id="s-city" value="' + esc(s.city || '') + '">') +
          field('状态 / STATUS', '<input class="input" id="s-status" value="' + esc(s.status || '') + '">') +
        '</div></div>' +

      '<div class="sec"><span class="lbl">02 — CONTACT</span>' +
        '<div class="field-grid">' +
          field('邮箱 / EMAIL', '<input class="input" id="s-email" value="' + esc(s.email || '') + '">') +
          field('微信 / WECHAT', '<input class="input" id="s-wechat" value="' + esc(s.wechat || '') + '">') +
        '</div></div>' +

      '<div class="sec"><span class="lbl">03 — CATEGORIES</span>' +
        '<div class="chips" id="chips"></div>' +
        '<div class="hint">分类 key 是前台筛选用的标识（feed / mashup / vlog / talk），改了名字前台会跟着变。</div></div>' +

      '<div class="sec"><span class="lbl">04 — CLOUD BACKUP</span>' +
        '<div class="field-grid">' +
          field('Gitee 用户名 / OWNER', '<input class="input" id="c-owner" value="' + esc(cfgCache.owner || '') + '" placeholder="your-gitee-name">') +
          field('仓库名 / REPO', '<input class="input" id="c-repo" value="' + esc(cfgCache.repo || '') + '" placeholder="portfolio-data">') +
          field('令牌 / TOKEN', '<input class="input" id="c-token" type="password" value="" placeholder="' + (cfgCache.hasToken ? '已保存，留空则不修改' : 'gitee private token') + '">') +
        '</div>' +
        '<div class="btn-row" style="margin-top:8px">' +
          '<button class="btn btn--ghost" id="c-save">保存云端配置</button>' +
          '<button class="btn btn--ghost" id="c-backup">备份到云端</button>' +
          '<button class="btn btn--ghost" id="c-restore">从云端恢复</button>' +
        '</div>' +
        '<div class="notice" id="c-notice"></div>' +
        '<div class="hint">本地数据始终存在 data.json（这就是主备份）。云端用 Gitee 仓库再存一份：新建一个<b>私有</b>仓库，在 Gitee → 设置 → 私人令牌里生成一个带 projects 权限的 token 填进来即可。</div></div>' +

      '<div class="sec"><span class="lbl">05 — DATA</span>' +
        '<div class="btn-row">' +
          '<button class="btn btn--ghost" id="d-export">导出 JSON</button>' +
          '<button class="btn btn--ghost" id="d-import">导入 JSON</button>' +
        '</div>' +
        '<div class="hint">导出的文件就是 data.json 的内容，也可以直接粘到 assets/js/data.js 里给纯静态模式用。</div></div>';

    renderChips();

    qs('#s-save').addEventListener('click', function () {
      state.site = {
        name: qs('#s-name').value, city: qs('#s-city').value, status: qs('#s-status').value,
        email: qs('#s-email').value, wechat: qs('#s-wechat').value
      };
      saveAll().then(function () { toast('站点设置已保存'); })
        .catch(function (e) { toast('保存失败：' + e.message, true); });
    });

    /* chips */
    function renderChips() {
      qs('#chips').innerHTML = state.categories.map(function (c, i) {
        return '<span class="chip">' + esc(c.name) + ' <span style="color:var(--text-4);font-family:var(--font-mono);font-size:11px">' + esc(c.key) + '</span>' +
          '<button data-cat="' + i + '" title="删除分类">&times;</button></span>';
      }).join('') + '<span class="chip chip--add" id="chip-add">+ 新增分类</span>';

      qsa('#chips [data-cat]').forEach(function (b) {
        b.addEventListener('click', function () {
          var i = Number(b.getAttribute('data-cat'));
          if (state.categories.length <= 1) return toast('至少要留一个分类', true);
          if (!confirm('删除分类「' + state.categories[i].name + '」？')) return;
          state.categories.splice(i, 1);
          saveAll().then(renderChips);
        });
      });
      qs('#chip-add').addEventListener('click', function () {
        var name = prompt('分类中文名（如：访谈）');
        if (!name) return;
        var key = prompt('分类 key（英文小写，如：interview）');
        if (!key) return;
        state.categories.push({ key: key.trim(), name: name.trim() });
        saveAll().then(function () { toast('分类已新增'); renderChips(); });
      });
    }

    /* cloud */
    function notice(msg, cls) {
      var n = qs('#c-notice');
      n.textContent = msg;
      n.className = 'notice is-on ' + (cls || '');
    }
    qs('#c-save').addEventListener('click', function () {
      var cloud = { owner: qs('#c-owner').value.trim(), repo: qs('#c-repo').value.trim(), path: 'portfolio-data.json', branch: 'master' };
      var tk = qs('#c-token').value.trim();
      if (tk) cloud.token = tk;
      api('PUT', '/api/config', { cloud: cloud }).then(function () {
        cfgCache.owner = cloud.owner; cfgCache.repo = cloud.repo; cfgCache.hasToken = !!cloud.token;
        notice('云端配置已保存（token 只存在服务器本地的 admin-config.json）', 'ok');
      }).catch(function (e) { notice('保存失败：' + e.message, 'err'); });
    });
    qs('#c-backup').addEventListener('click', function () {
      notice('备份中…', '');
      api('POST', '/api/backup', {}).then(function (r) { notice(r.message, r.ok ? 'ok' : 'err'); })
        .catch(function (e) { notice('备份失败：' + e.message, 'err'); });
    });
    qs('#c-restore').addEventListener('click', function () {
      if (!confirm('从云端恢复会覆盖本地 data.json，继续？')) return;
      notice('恢复中…', '');
      api('POST', '/api/restore', {}).then(function (r) {
        notice(r.message, r.ok ? 'ok' : 'err');
        if (r.ok) return load().then(function () { toast('已恢复'); });
      }).catch(function (e) { notice('恢复失败：' + e.message, 'err'); });
    });

    /* data */
    qs('#d-export').addEventListener('click', function () {
      var blob = new Blob([JSON.stringify({ works: state.works, categories: state.categories, site: state.site }, null, 2)], { type: 'application/json' });
      var a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = 'portfolio-data.json';
      a.click();
      URL.revokeObjectURL(a.href);
    });
    qs('#d-import').addEventListener('click', function () {
      var input = document.createElement('input');
      input.type = 'file'; input.accept = '.json';
      input.addEventListener('change', function () {
        if (!input.files || !input.files[0]) return;
        var fr = new FileReader();
        fr.onload = function () {
          try {
            var j = JSON.parse(fr.result);
            if (!Array.isArray(j.works)) throw new Error('缺少 works 数组');
            state.works = j.works;
            state.categories = j.categories || state.categories;
            state.site = j.site || state.site;
            saveAll().then(function () { toast('导入成功'); route(); });
          } catch (e) { toast('导入失败：' + e.message, true); }
        };
        fr.readAsText(input.files[0]);
      });
      input.click();
    });
  }

  /* ---------------------------------------------------- stats view */
  function fmtTime(iso) {
    try {
      var d = new Date(iso);
      var p = function (n) { return (n < 10 ? '0' : '') + n; };
      return d.getFullYear() + '-' + p(d.getMonth() + 1) + '-' + p(d.getDate()) + ' ' + p(d.getHours()) + ':' + p(d.getMinutes());
    } catch (e) { return iso || ''; }
  }
  function fmtDur(s) {
    s = Math.round(Number(s) || 0);
    var m = Math.floor(s / 60), sec = s % 60;
    return (m > 0 ? m + ' 分 ' : '') + sec + ' 秒';
  }
  function stat(lbl, val, dim) {
    return '<div class="stat' + (dim ? ' dim' : '') + '"><div class="lbl">' + lbl + '</div><div class="val">' + val + '</div></div>';
  }
  function workTitle(id) {
    var w = state.works.filter(function (x) { return x.id === id; })[0];
    return w ? w.title : (catName(id) || id);
  }

  function renderStats() {
    api('GET', '/api/visits').then(function (data) {
      var recs = (data && data.visits) || [];
      var pages = recs.filter(function (r) { return r.type === 'page'; });
      var watches = recs.filter(function (r) { return r.type === 'watch'; });
      var visitors = {};
      recs.forEach(function (r) { if (r.vid) visitors[r.vid] = 1; });
      var lastTs = recs.length ? recs[recs.length - 1].ts : null;

      var byWork = {};
      watches.forEach(function (r) {
        var id = r.workId || 'unknown';
        byWork[id] = byWork[id] || { count: 0, secs: 0 };
        byWork[id].count += 1;
        byWork[id].secs += (Number(r.seconds) || 0);
      });
      var workRows = Object.keys(byWork).map(function (id) {
        var agg = byWork[id];
        return '<tr>' +
          '<td><div class="t">' + esc(workTitle(id)) + '</div></td>' +
          '<td style="width:120px"><div class="d">' + agg.count + '</div></td>' +
          '<td style="width:160px"><div class="d">' + fmtDur(agg.secs) + '</div></td>' +
          '<td style="width:160px"><div class="d">' + fmtDur(agg.secs / agg.count) + '</div></td>' +
        '</tr>';
      }).join('');

      var recent = recs.slice().reverse().slice(0, 12).map(function (r) {
        var label = r.type === 'page'
          ? ('访问页面 · ' + (r.page || ''))
          : ('观看视频 · ' + workTitle(r.workId));
        return '<tr>' +
          '<td style="width:200px"><div class="d">' + fmtTime(r.ts) + '</div></td>' +
          '<td><div class="t">' + esc(label) + '</div></td>' +
          '<td style="width:140px"><div class="d">' + (r.type === 'watch' ? fmtDur(r.seconds) : '—') + '</div></td>' +
          '<td style="width:160px"><div class="d">' + esc((r.vid || '匿名访客').slice(0, 14)) + '</div></td>' +
        '</tr>';
      }).join('');

      app.innerHTML =
        '<div class="page-top">' +
          '<div><h1>访问统计</h1><div class="sub">VISITS  /  ' + recs.length + ' RECORDS</div></div>' +
          '<div class="btn-row"><button class="btn btn--ghost" id="st-refresh">刷新</button></div>' +
        '</div>' +
        '<div class="rule"></div>' +
        '<div class="stats">' +
          stat('总记录数', recs.length) +
          stat('页面访问', pages.length) +
          stat('视频观看', watches.length, true) +
          stat('独立访客', Object.keys(visitors).length, true) +
        '</div>' +
        '<div class="notice is-on" style="margin-top:32px">最近访问：' + (lastTs ? fmtTime(lastTs) : '暂无数据') + '</div>' +
        '<div class="rule" style="margin-top:48px"></div>' +
        '<div class="head__label" style="margin-top:32px">各视频观看时长</div>' +
        (workRows
          ? '<table class="tbl"><thead><tr><th>视频</th><th style="width:120px">观看次数</th><th style="width:160px">总时长</th><th style="width:160px">平均时长</th></tr></thead><tbody>' + workRows + '</tbody></table>'
          : '<div class="empty" style="padding:40px 0">还没有视频观看记录。</div>') +
        '<div class="rule" style="margin-top:48px"></div>' +
        '<div class="head__label" style="margin-top:32px">最近记录</div>' +
        (recent
          ? '<table class="tbl"><thead><tr><th style="width:200px">时间</th><th>行为</th><th style="width:140px">时长</th><th style="width:160px">访客</th></tr></thead><tbody>' + recent + '</tbody></table>'
          : '<div class="empty" style="padding:40px 0">暂无记录。</div>');

      animateCounts(qs('.stats'));

      var rf = qs('#st-refresh');
      if (rf) rf.addEventListener('click', renderStats);
    }).catch(function (e) {
      app.innerHTML = '<div class="notice is-on err">读取统计失败：' + esc(e.message) + '</div>';
    });
  }

  /* ---------------------------------------------------- router */
  var cfgCache = { owner: '', repo: '', hasToken: false };

  function route() {
    var h = location.hash.replace(/^#\/?/, '') || 'works';
    var parts = h.split('/');
    qsa('.side__link').forEach(function (a) {
      a.classList.toggle('is-active', a.getAttribute('data-route') === (parts[0] === 'edit' ? 'edit' : parts[0]));
    });
    if (parts[0] === 'works') renderList();
    else if (parts[0] === 'edit') renderEdit(parts[1] || 'new');
    else if (parts[0] === 'settings') renderSettings();
    else if (parts[0] === 'stats') renderStats();
    else renderList();
    window.scrollTo(0, 0);
  }

  function load() {
    return api('GET', '/api/works').then(function (d) {
      state.works = d.works || [];
      state.categories = d.categories || [];
      state.site = d.site || {};
      state.loaded = true;
      return api('GET', '/api/config').then(function (c) {
        cfgCache.owner = (c.cloud && c.cloud.owner) || '';
        cfgCache.repo = (c.cloud && c.cloud.repo) || '';
        cfgCache.hasToken = !!(c.cloud && c.cloud.token);
      }).catch(function () {});
    });
  }

  document.addEventListener('DOMContentLoaded', function () {
    load().then(function () {
      window.addEventListener('hashchange', route);
      route();
    }).catch(function (e) {
      app.innerHTML = '<div class="notice is-on err" style="margin-top:60px">' +
        '连不上本地服务（' + esc(e.message) + '）。<br><br>' +
        '在 portfolio 目录下运行：<br><br>' +
        '<code style="font-family:var(--font-mono);color:var(--text)">node server.js</code><br><br>' +
        '然后刷新本页。</div>';
    });
  });
})();
