/* WIland tester page: the download button (always the newest setup) and the live island. */
(() => {
  'use strict';

  /* ---------- download: find the newest WIland-Setup-x.y.z.exe ---------- */
  const API = 'https://api.github.com/repos/ne-wtn/WIland-Releases/releases/latest';
  const FALLBACK = 'https://github.com/ne-wtn/WIland-Releases/releases/latest';
  const CACHE = 'wiland.latest';
  const CACHE_MS = 10 * 60 * 1000;

  const dl = document.getElementById('dl');
  const meta = document.getElementById('dlMeta');
  const started = document.getElementById('dlStarted');

  const readCache = () => {
    try {
      const c = JSON.parse(sessionStorage.getItem(CACHE));
      return c && Date.now() - c.at < CACHE_MS ? c.rel : null;
    } catch { return null; }
  };
  const writeCache = rel => { try { sessionStorage.setItem(CACHE, JSON.stringify({ at: Date.now(), rel })); } catch {} };

  const pickRelease = json => {
    const exe = (json.assets || []).find(a => /^WIland-Setup-.+\.exe$/i.test(a.name));
    if (!exe) return null;
    return {
      url: exe.browser_download_url, name: exe.name, size: exe.size,
      version: String(json.tag_name || '').replace(/^v/, ''), date: json.published_at,
    };
  };

  const show = rel => {
    if (!rel) { dl.href = FALLBACK; meta.textContent = 'Opens the download page'; return; }
    dl.href = rel.url;
    dl.dataset.direct = '1';
    const mb = Math.round(rel.size / 1048576);
    const date = rel.date ? new Date(rel.date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) : '';
    meta.textContent = ['Version ' + rel.version, mb + ' MB', date].filter(Boolean).join('  ·  ');
    document.querySelectorAll('.fname').forEach(el => { el.textContent = rel.name; });
  };

  const cached = readCache();
  if (cached) show(cached);
  else {
    fetch(API, { headers: { Accept: 'application/vnd.github+json' } })
      .then(r => (r.ok ? r.json() : Promise.reject(r.status)))
      .then(json => { const rel = pickRelease(json); if (rel) writeCache(rel); show(rel); })
      .catch(() => show(null));
  }

  dl.addEventListener('click', () => { if (dl.dataset.direct) started.hidden = false; });

  // not on a Windows PC: say so, and offer to copy the link
  const ua = navigator.userAgent;
  const onWindows = /Windows NT/.test(ua) && !/Windows Phone/.test(ua);
  if (!onWindows) {
    document.getElementById('notPc').hidden = false;
    const copy = document.getElementById('copyLink');
    copy.addEventListener('click', async () => {
      const link = location.href.split('#')[0];
      try { await navigator.clipboard.writeText(link); copy.textContent = 'Copied'; }
      catch {
        const t = document.createElement('input');
        t.value = link; document.body.appendChild(t); t.select();
        try { document.execCommand('copy'); copy.textContent = 'Copied'; } catch { copy.textContent = link; }
        t.remove();
      }
    });
  }

  /* ---------- the island ---------- */
  // the app's own spring (core/spring.js) and sizes (features' size())
  class Spring {
    constructor(x, k, z) { this.x = x; this.v = 0; this.target = x; this.k = k; this.z = z; }
    to(t, k, z) { this.target = t; this.k = k; this.z = z; }
    snap(x) { this.x = this.target = x; this.v = 0; }
    get moving() { return this.x !== this.target || this.v !== 0; }
    step(dt) {
      if (!this.moving) return false;
      const s = Math.min(dt, 64) / 1000, n = Math.max(1, Math.ceil(s / 0.004)), h = s / n;
      const c = 2 * Math.sqrt(this.k) * this.z;
      for (let i = 0; i < n; i++) { this.v += (this.k * (this.target - this.x) - c * this.v) * h; this.x += this.v * h; }
      if (Math.abs(this.target - this.x) < 0.02 && Math.abs(this.v) < 0.5) { this.x = this.target; this.v = 0; return false; }
      return true;
    }
  }
  const GROW = { k: 250, z: 0.7 }, SHRINK = { k: 340, z: 0.97 };
  const SIZES = {
    lip: { w: 150, h: 7, r: 7 },
    time: { w: 250, h: 36, r: 18 },
    media: { w: 290, h: 36, r: 18 },
    mediaPage: { w: 420, h: 170, r: 30 },
    timer: { w: 270, h: 36, r: 18 },
    shelf: { w: 330, h: 72, r: 28 },
  };
  const CYCLE = [['time', 3200], ['media', 2600], ['mediaPage', 4400], ['timer', 3200], ['shelf', 3000]];
  const SHOULDER = 10;
  const shoulder = h => Math.min(SHOULDER, Math.max(0, (h - 10) * 0.5));

  const wrap = document.getElementById('islandWrap');
  const island = document.getElementById('island');
  const shape = island.querySelector('.shape');
  const shl = island.querySelector('.shl'), shr = island.querySelector('.shr');
  const views = {};
  island.querySelectorAll('.view').forEach(v => {
    const s = SIZES[v.dataset.view];
    v.style.width = s.w + 'px'; v.style.height = s.h + 'px';
    views[v.dataset.view] = v;
  });

  const reduce = matchMedia('(prefers-reduced-motion: reduce)');
  const sp = { w: new Spring(150, 250, .7), h: new Spring(7, 250, .7), r: new Spring(7, 250, .7) };
  let current = 'lip', step = -1, cycleT = 0, hovering = false, raf = 0, last = 0;

  const go = name => {
    const t = SIZES[name], c = SIZES[current];
    const f = t.w * t.h >= c.w * c.h ? GROW : SHRINK;
    for (const key of ['w', 'h', 'r']) {
      if (reduce.matches) sp[key].snap(t[key]); else sp[key].to(t[key], f.k, f.z);
    }
    if (views[current]) views[current].classList.remove('on');
    if (views[name]) views[name].classList.add('on');
    current = name;
    kick();
  };

  const draw = () => {
    const w = sp.w.x, h = Math.max(0, sp.h.x), r = Math.max(0, Math.min(sp.r.x, h, w / 2));
    shape.style.width = w + 'px'; shape.style.height = h + 'px'; shape.style.left = -w / 2 + 'px';
    shape.style.borderRadius = `0 0 ${r}px ${r}px`;
    const k = shoulder(h) / SHOULDER;
    shl.style.left = (-w / 2 - SHOULDER) + 'px'; shr.style.left = (w / 2) + 'px';
    shl.style.transform = shr.style.transform = `scale(${k})`;
    // every view rides the shape's spring, scaled by how wide the island is now against its own width
    for (const name in views) {
      const v = views[name], tw = SIZES[name].w;
      const s = Math.min(1.3, Math.max(.5, w / tw));
      v.style.left = (w - tw) / 2 + 'px';
      v.style.transform = `scale(${s})`;
    }
  };

  const frame = now => {
    const dt = last ? now - last : 16; last = now;
    let moving = false;
    for (const key in sp) moving = sp[key].step(dt) || moving;
    draw();
    raf = moving ? requestAnimationFrame(frame) : 0;
    if (!moving) last = 0;
  };
  const kick = () => { if (!raf) { last = 0; raf = requestAnimationFrame(frame); } };

  const next = () => {
    clearTimeout(cycleT);
    if (hovering || document.hidden || reduce.matches) return;
    step = (step + 1) % CYCLE.length;
    const [name, ms] = CYCLE[step];
    go(name);
    cycleT = setTimeout(next, ms);
  };

  // hover or tap opens the player page; leaving goes back to the round
  const open = () => { hovering = true; clearTimeout(cycleT); go('mediaPage'); };
  const close = () => {
    hovering = false; clearTimeout(cycleT);
    if (reduce.matches) { go('time'); return; }
    cycleT = setTimeout(next, 500);
  };
  island.addEventListener('pointerenter', e => { if (e.pointerType === 'mouse') open(); });
  island.addEventListener('pointerleave', e => { if (e.pointerType === 'mouse') close(); });
  island.addEventListener('click', () => {
    if (matchMedia('(hover: hover)').matches) return;
    if (hovering) close(); else open();
  });
  document.addEventListener('visibilitychange', () => { if (!document.hidden && !hovering) next(); });

  // phones: the whole island scales down to fit the screen
  const fit = () => wrap.style.setProperty('--k', Math.min(1, (innerWidth - 24) / SIZES.mediaPage.w).toFixed(3));
  addEventListener('resize', fit); fit();

  draw();
  if (reduce.matches) go('time');
  else setTimeout(next, 700);

  /* ---------- the live bits inside the views ---------- */
  const elDate = document.getElementById('vDate'), elTime = document.getElementById('vTime');
  const elTimer = document.getElementById('vTimer'), elAt = document.getElementById('mpAt'), elFill = document.getElementById('mpFill');
  const mmss = s => Math.floor(s / 60) + ':' + String(Math.floor(s % 60)).padStart(2, '0');
  let timerLeft = 24 * 60 + 13, songAt = 72;
  const SONG = 228;
  const tick = () => {
    const d = new Date();
    elDate.textContent = d.toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric' });
    elTime.textContent = d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
    if (!reduce.matches) {
      timerLeft = timerLeft > 0 ? timerLeft - 1 : 25 * 60;
      songAt = (songAt + 1) % SONG;
    }
    const m = Math.floor(timerLeft / 60);
    elTimer.textContent = String(m).padStart(2, '0') + ':' + String(timerLeft % 60).padStart(2, '0');
    elAt.textContent = mmss(songAt);
    elFill.style.width = (songAt / SONG * 100).toFixed(1) + '%';
  };
  tick(); setInterval(tick, 1000);
})();
