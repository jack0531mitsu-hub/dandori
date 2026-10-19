// ダンドリ：オフライン用のキャッシュ（版 3ae95c3e）
const CACHE = 'dandori-3ae95c3e';
const CORE = ['./', './index.html', './manifest.webmanifest', './icon-192.png', './icon-512.png', './apple-touch-icon.png'];
self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(CORE)).then(() => self.skipWaiting()));
});
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k.startsWith('dandori-') && k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  // 画面本体：まずネットから最新を取り、つながらなければ保存しておいたものを出す
  if (req.mode === 'navigate') {
    const isApp = /\/(index\.html)?$/.test(url.pathname);
    e.respondWith(fetch(req).then(res => { const copy = res.clone(); caches.open(CACHE).then(c => c.put(isApp ? './index.html' : req, copy)); return res; })
      .catch(() => isApp ? caches.match('./index.html') : caches.match(req).then(r => r || caches.match('./index.html'))));
    return;
  }
  // 設定ファイル：書きかえたらすぐ反映されるように、ネットを先に見る
  if (url.origin === location.origin && url.pathname.endsWith('/config.js')) {
    e.respondWith(fetch(req).then(res => { const copy = res.clone(); caches.open(CACHE).then(c => c.put(req, copy)); return res; }).catch(() => caches.match(req)));
    return;
  }
  // 文字（Google Fonts）とアイコンなど：保存しておいたものをすぐ出し、裏で新しくする
  if (url.origin === location.origin || /fonts\.(googleapis|gstatic)\.com$/.test(url.hostname)) {
    e.respondWith(caches.open(CACHE).then(c => c.match(req).then(hit => {
      const net = fetch(req).then(res => { if (res && (res.ok || res.type === 'opaque')) c.put(req, res.clone()); return res; }).catch(() => hit);
      return hit || net;
    })));
  }
});
