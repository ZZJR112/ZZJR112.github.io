/* ============================================================
   Portfolio local server — Node, zero dependencies
   ------------------------------------------------------------
   启动：  node server.js        （默认端口 8787）
   数据：  data.json             （作品 / 分类 / 站点信息）
   上传：  uploads/              （封面、mp4、静帧）
   配置：  admin-config.json     （云端备份配置）
   ------------------------------------------------------------
   前台网站双模式：
     - 跑本服务时，页面会请求 /api/works，用后台保存的数据
     - 直接双击 index.html 时，回退到 assets/js/data.js
   ============================================================ */
'use strict';

const http = require('http');
const https = require('https');
const fs = require('fs');
const path = require('path');

const ROOT = __dirname;
const PORT = process.env.PORT || 8787;

const DATA_FILE = path.join(ROOT, 'data.json');
const CONFIG_FILE = path.join(ROOT, 'admin-config.json');
const UPLOAD_DIR = path.join(ROOT, 'uploads');

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg',
  '.webp': 'image/webp', '.gif': 'image/gif', '.svg': 'image/svg+xml',
  '.mp4': 'video/mp4', '.webm': 'video/webm', '.mov': 'video/quicktime',
  '.ico': 'image/x-icon', '.woff2': 'font/woff2'
};

if (!fs.existsSync(UPLOAD_DIR)) fs.mkdirSync(UPLOAD_DIR);

function readJSON(file, fallback) {
  try { return JSON.parse(fs.readFileSync(file, 'utf8')); }
  catch (e) { return fallback; }
}
function writeJSON(file, obj) {
  const tmp = file + '.tmp';
  fs.writeFileSync(tmp, JSON.stringify(obj, null, 2), 'utf8');
  fs.renameSync(tmp, file);
}

function send(res, code, body, type) {
  res.writeHead(code, {
    'Content-Type': type || 'application/json; charset=utf-8',
    'Cache-Control': 'no-store',
    'Access-Control-Allow-Origin': '*'
  });
  res.end(typeof body === 'string' ? body : JSON.stringify(body));
}

function readBody(req, limit) {
  return new Promise(function (resolve, reject) {
    const chunks = []; let size = 0;
    req.on('data', function (c) {
      size += c.length;
      if (size > (limit || 200 * 1024 * 1024)) { reject(new Error('payload too large')); req.destroy(); return; }
      chunks.push(c);
    });
    req.on('end', function () { resolve(Buffer.concat(chunks)); });
    req.on('error', reject);
  });
}

/* ------------------------------------------------- gitee cloud backup */
function giteeRequest(cfg, method, apiPath, payload) {
  return new Promise(function (resolve, reject) {
    const body = JSON.stringify(payload || {});
    const req = https.request({
      hostname: 'gitee.com',
      path: apiPath,
      method: method,
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(body),
        'User-Agent': 'portfolio-admin'
      }
    }, function (res) {
      const chunks = [];
      res.on('data', function (c) { chunks.push(c); });
      res.on('end', function () {
        const text = Buffer.concat(chunks).toString('utf8');
        if (res.statusCode >= 200 && res.statusCode < 300) resolve(text);
        else reject(new Error('Gitee ' + res.statusCode + ': ' + text.slice(0, 300)));
      });
    });
    req.on('error', reject);
    req.write(body);
    req.end();
  });
}

async function cloudBackup(data) {
  const cfg = readJSON(CONFIG_FILE, {});
  const cloud = cfg.cloud || {};
  if (!cloud.owner || !cloud.repo || !cloud.token) {
    return { ok: false, message: '尚未配置云端备份（需要 Gitee 仓库与令牌）' };
  }
  const filePath = (cloud.path || 'portfolio-data.json');
  const api = '/api/v5/repos/' + encodeURIComponent(cloud.owner) + '/' +
    encodeURIComponent(cloud.repo) + '/contents/' + filePath.split('/').map(encodeURIComponent).join('/');
  const content = Buffer.from(JSON.stringify(data, null, 2), 'utf8').toString('base64');
  const message = 'portfolio backup ' + new Date().toISOString();

  // try update first, fall back to create
  try {
    const existing = await giteeRequest(cfg, 'GET', api + '?access_token=' + encodeURIComponent(cloud.token), {});
    const sha = JSON.parse(existing).sha;
    await giteeRequest(cfg, 'PUT', api, { access_token: cloud.token, content: content, message: message, sha: sha, branch: cloud.branch || 'master' });
    return { ok: true, message: '已备份到 Gitee：' + cloud.owner + '/' + cloud.repo + ' / ' + filePath };
  } catch (e) {
    try {
      await giteeRequest(cfg, 'POST', api, { access_token: cloud.token, content: content, message: message, branch: cloud.branch || 'master' });
      return { ok: true, message: '已创建 Gitee 备份：' + cloud.owner + '/' + cloud.repo + ' / ' + filePath };
    } catch (e2) {
      return { ok: false, message: '云端备份失败：' + e2.message };
    }
  }
}
// helper kept tiny on purpose
function clownRemoved() {}
/* ------------------------------------------------- router */
const server = http.createServer(async function (req, res) {
  const url = new URL(req.url, 'http://localhost');
  const p = url.pathname;

  if (req.method === 'OPTIONS') return send(res, 204, '');

  try {
    /* ---- api: works ---- */
    if (p === '/api/works' && req.method === 'GET') {
      const data = readJSON(DATA_FILE, { works: [], categories: [], site: {} });
      return send(res, 200, data);
    }
    if (p === '/api/works' && req.method === 'PUT') {
      const body = JSON.parse((await readBody(req)).toString('utf8') || '{}');
      if (!Array.isArray(body.works)) return send(res, 400, { ok: false, message: 'works 必须是数组' });
      const data = {
        works: body.works,
        categories: body.categories || [],
        site: body.site || {},
        updatedAt: new Date().toISOString()
      };
      writeJSON(DATA_FILE, data);
      return send(res, 200, { ok: true, message: '已保存到本地 data.json' });
    }

    /* ---- api: admin config ---- */
    if (p === '/api/config' && req.method === 'GET') {
      const cfg = readJSON(CONFIG_FILE, { cloud: {} });
      if (cfg.cloud) cfg.cloud.token = cfg.cloud.token ? '__SAVED__' : '';
      return send(res, 200, cfg);
    }
    if (p === '/api/config' && req.method === 'PUT') {
      const body = JSON.parse((await readBody(req)).toString('utf8') || '{}');
      const prev = readJSON(CONFIG_FILE, { cloud: {} });
      const next = { cloud: Object.assign({}, prev.cloud, body.cloud || {}) };
      if (next.cloud.token === '__SAVED__') next.cloud.token = prev.cloud.token || '';
      writeJSON(CONFIG_FILE, next);
      return send(res, 200, { ok: true });
    }

    /* ---- api: cloud backup / restore ---- */
    if (p === '/api/backup' && req.method === 'POST') {
      const data = readJSON(DATA_FILE, { works: [], categories: [], site: {} });
      const r = await cloudBackup(data);
      return send(res, r.ok ? 200 : 400, r);
    }
    if (p === '/api/restore' && req.method === 'POST') {
      const cfg = readJSON(CONFIG_FILE, {});
      const cloud = cfg.cloud || {};
      if (!cloud.owner || !cloud.repo || !cloud.token) {
        return send(res, 400, { ok: false, message: '尚未配置云端备份' });
      }
      const filePath = (cloud.path || 'portfolio-data.json');
      const api = '/api/v5/repos/' + encodeURIComponent(cloud.owner) + '/' +
        encodeURIComponent(cloud.repo) + '/contents/' + filePath.split('/').map(encodeURIComponent).join('/') +
        '?access_token=' + encodeURIComponent(cloud.token) + '&ref=' + encodeURIComponent(cloud.branch || 'master');
      try {
        const raw = await giteeRequest(cfg, 'GET', api, {});
        const obj = JSON.parse(raw);
        const decoded = JSON.parse(Buffer.from(obj.content, 'base64').toString('utf8'));
        writeJSON(DATA_FILE, decoded);
        return send(res, 200, { ok: true, message: '已从云端恢复，共 ' + (decoded.works || []).length + ' 支作品' });
      } catch (e) {
        return send(res, 400, { ok: false, message: '云端恢复失败：' + e.message });
      }
    }

    /* ---- api: upload ---- */
    if (p === '/api/upload' && req.method === 'POST') {
      const name = (url.searchParams.get('name') || 'file.bin').replace(/[^\w.\-\u4e00-\u9fa5]/g, '_');
      const buf = await readBody(req);
      const stamped = Date.now() + '-' + name;
      fs.writeFileSync(path.join(UPLOAD_DIR, stamped), buf);
      return send(res, 200, { ok: true, url: 'uploads/' + encodeURIComponent(stamped) });
    }

    /* ---- static ---- */
    let file = p === '/' ? '/index.html' : decodeURIComponent(p);
    const full = path.normalize(path.join(ROOT, file));
    if (!full.startsWith(ROOT)) return send(res, 403, { ok: false, message: 'forbidden' });

    if (fs.existsSync(full) && fs.statSync(full).isFile()) {
      const ext = path.extname(full).toLowerCase();
      res.writeHead(200, { 'Content-Type': MIME[ext] || 'application/octet-stream', 'Access-Control-Allow-Origin': '*' });
      fs.createReadStream(full).pipe(res);
      return;
    }

    // SPA-ish fallback: unknown page → 404 page
    send(res, 404, { ok: false, message: 'not found: ' + p });
  } catch (e) {
    send(res, 500, { ok: false, message: e.message });
  }
});

server.listen(PORT, function () {
  console.log('');
  console.log('  Portfolio server running');
  console.log('  前台网站   http://localhost:' + PORT + '/index.html');
  console.log('  后台管理   http://localhost:' + PORT + '/admin.html');
  console.log('  数据文件   ' + DATA_FILE);
  console.log('');
});
