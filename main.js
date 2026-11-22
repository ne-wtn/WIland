/* WIland tester page: the download button (always the newest setup), the live island and the feature pictures. */
(() => {
  'use strict';

  /* ---------- download: find the newest WIland-Setup-x.y.z.exe ---------- */
  const API = 'https://api.github.com/repos/ne-wtn/WIland-Releases/releases/latest';
  const FALLBACK = 'https://github.com/ne-wtn/WIland-Releases/releases/latest';
  const CACHE = 'wiland.latest';
  const CACHE_MS = 10 * 60 * 1000;

  const links = [...document.querySelectorAll('.js-dl')];
  const meta = document.getElementById('dlMeta');
  const started = document.getElementById('dlStarted');

  const readCache = (key = CACHE) => {
    try {
      const c = JSON.parse(sessionStorage.getItem(key));
      return c && Date.now() - c.at < CACHE_MS ? c.rel : null;
    } catch { return null; }
  };
  const writeCache = (rel, key = CACHE) => { try { sessionStorage.setItem(key, JSON.stringify({ at: Date.now(), rel })); } catch {} };

  const pickRelease = json => {
    const exe = (json.assets || []).find(a => /^WIland-Setup-.+\.exe$/i.test(a.name));
    if (!exe) return null;
    return { url: exe.browser_download_url, name: exe.name, size: exe.size, version: String(json.tag_name || '').replace(/^v/, ''), date: json.published_at };
  };

  const show = rel => {
    if (!rel) { links.forEach(a => { a.href = FALLBACK; }); return; }
    links.forEach(a => { a.href = rel.url; a.dataset.direct = '1'; });
    const mb = Math.round(rel.size / 1048576);
    meta.textContent = ['Version ' + rel.version, mb + ' MB'].join(' · ');
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
  links.forEach(a => a.addEventListener('click', () => { if (a.dataset.direct) started.hidden = false; }));

  /* ---------- WIConnect: the newest WIConnect-x.y.z.apk ---------- */
  const WC_API = 'https://api.github.com/repos/ne-wtn/WIConnect-Releases/releases/latest';
  const WC_CACHE = 'wiconnect.latest';
  const wcLinks = [...document.querySelectorAll('.js-wc')];
  const wcMeta = document.getElementById('wcMeta');
  const wcHeroMeta = document.getElementById('wcHeroMeta');
  const showWc = rel => {
    if (!rel) return; // the links already point at the latest release page
    wcLinks.forEach(a => { a.href = rel.url; });
    const mb = Math.round(rel.size / 1048576);
    wcMeta.textContent = ['Version ' + rel.version, mb + ' MB', 'Android 10 or newer', 'Free'].join(' · ');
    wcHeroMeta.textContent = ['Version ' + rel.version, mb + ' MB'].join(' · ');
  };
  const wcCached = readCache(WC_CACHE);
  if (wcCached) showWc(wcCached);
  else {
    fetch(WC_API, { headers: { Accept: 'application/vnd.github+json' } })
      .then(r => (r.ok ? r.json() : Promise.reject(r.status)))
      .then(json => {
        const apk = (json.assets || []).find(a => /^WIConnect-.+\.apk$/i.test(a.name));
        if (!apk) return;
        const rel = { url: apk.browser_download_url, size: apk.size, version: String(json.tag_name || '').replace(/^v/, '') };
        writeCache(rel, WC_CACHE); showWc(rel);
      })
      .catch(() => {});
  }

  // not on a Windows PC: say so, and offer to copy the link
  const ua = navigator.userAgent;
  if (!(/Windows NT/.test(ua) && !/Windows Phone/.test(ua))) {
    document.getElementById('notPc').hidden = false;
    if (/Android/.test(ua)) document.getElementById('onAndroid').hidden = false;
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
  const V = window.WL_VIEWS;
  if (!V) return;
  const reduce = matchMedia('(prefers-reduced-motion: reduce)');
  const SHOULDER = 10;
  const shoulder = h => Math.min(SHOULDER, Math.max(0, (h - 10) * 0.5));
  const LIP = { w: 150, h: 7, r: 7 };
  const SVG = 'http://www.w3.org/2000/svg';

  // the outline: the pill with rounded bottom corners, fused to the top edge by concave shoulders
  const outline = (w, h, r, s, closed) => {
    const W = w + 2 * s;
    r = Math.max(0, Math.min(r, h, w / 2));
    const f = n => n.toFixed(2);
    const d = `M${f(W)} 0 A${f(s)} ${f(s)} 0 0 0 ${f(W - s)} ${f(s)} L${f(W - s)} ${f(h - r)} A${f(r)} ${f(r)} 0 0 1 ${f(W - s - r)} ${f(h)} ` +
      `L${f(s + r)} ${f(h)} A${f(r)} ${f(r)} 0 0 1 ${f(s)} ${f(h - r)} L${f(s)} ${f(s)} A${f(s)} ${f(s)} 0 0 0 0 0`;
    return closed ? d + ' Z' : d;
  };

  let uid = 0;
  /** One island: glass layers (shadow, blur, edge shine) and the app's own views on top. */
  const build = (host, names) => {
    const n = ++uid;
    host.innerHTML =
      `<div class="wl" data-theme="dark" data-glass="" data-level="full"><div class="part island">
        <svg class="gl-shadow"><path fill="#000"/></svg>
        <div class="gl-blur"></div>
        <svg class="gl-edge"><defs><linearGradient id="wlEdge${n}" x1="0" y1="1" x2="1" y2="0">
          <stop offset="0" stop-color="#fff" stop-opacity=".55"/><stop offset=".45" stop-color="#fff" stop-opacity=".14"/><stop offset="1" stop-color="#fff" stop-opacity=".3"/>
        </linearGradient></defs><path fill="none" stroke="url(#wlEdge${n})" stroke-width="1.1"/></svg>
        <div class="shape"></div></div></div>`;
    const part = host.querySelector('.part');
    const shape = part.querySelector('.shape');
    const views = {};
    names.forEach(name => {
      const t = document.createElement('template');
      t.innerHTML = V[name].html.join('');
      views[name] = [...t.content.children];
      views[name].forEach(el => shape.appendChild(el));
    });
    const blur = part.querySelector('.gl-blur'), edge = part.querySelector('.gl-edge'), shadow = part.querySelector('.gl-shadow');
    const edgeP = edge.querySelector('path'), shadowP = shadow.querySelector('path');
    const draw = (w, h, r) => {
      h = Math.max(0, h); r = Math.max(0, Math.min(r, h, w / 2));
      const s = shoulder(h), W = w + 2 * s, left = -w / 2 - s;
      const box = el => { el.style.left = left + 'px'; el.style.width = W + 'px'; el.style.height = h + 'px'; };
      box(blur);
      blur.style.clipPath = `path('${outline(w, h, r, s, true)}')`;
      [edge, shadow].forEach(el => { box(el); el.setAttribute('viewBox', `0 0 ${W} ${h}`); });
      edgeP.setAttribute('d', outline(w, h, r, s, false));
      shadowP.setAttribute('d', outline(w, h, r, s, true));
      shape.style.left = -w / 2 + 'px'; shape.style.width = w + 'px'; shape.style.height = h + 'px';
      shape.style.borderRadius = `0 0 ${r}px ${r}px`;
    };
    return { part, shape, views, draw };
  };

  // keep the clock pill and Today on the real date and time
  const pad = n => String(n).padStart(2, '0');
  const flipDigits = str => [...str].map(c => `<span class="fc${c === ':' ? ' colon' : ''}"><span class="fi">${c}</span></span>`).join('');
  const liveDates = root => {
    const d = new Date();
    const h12 = d.getHours() % 12 || 12, ap = d.getHours() < 12 ? 'AM' : 'PM';
    const hm = h12 + ':' + pad(d.getMinutes());
    root.querySelectorAll('.clk-d').forEach(el => { el.textContent = d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' }); });
    root.querySelectorAll('.clk-t').forEach(el => { if (el.dataset.hm !== hm) { el.dataset.hm = hm; el.innerHTML = flipDigits(hm); } });
    root.querySelectorAll('.clk-ap').forEach(el => { el.textContent = ap; });
    root.querySelectorAll('.td-clock').forEach(el => { el.textContent = hm + ' ' + ap; });
    root.querySelectorAll('.td-date').forEach(el => { el.textContent = d.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' }); });
    root.querySelectorAll('.td-week').forEach(el => {
      const key = d.toDateString();
      if (el.dataset.key === key) return;
      el.dataset.key = key;
      const mon = new Date(d); mon.setDate(d.getDate() - ((d.getDay() + 6) % 7));
      el.innerHTML = Array.from({ length: 7 }, (_, i) => {
        const x = new Date(mon); x.setDate(mon.getDate() + i);
        const today = x.toDateString() === key;
        return `<button class="td-d${today ? ' today' : ''}" type="button" tabindex="-1"><span class="wd">${x.toLocaleDateString('en-US', { weekday: 'short' })}</span><b>${x.getDate()}</b><i class="td-ev"></i></button>`;
      }).join('');
    });
  };

  /* the feature pictures: each page standing open, as a still */
  const fits = [];
  document.querySelectorAll('.feat-pic').forEach(pic => {
    const name = pic.dataset.view;
    if (!V[name]) return;
    const wrap = document.createElement('div');
    wrap.className = 'island-wrap';
    pic.appendChild(wrap);
    const isl = build(wrap, [name]);
    isl.views[name].forEach(el => { el.classList.add('on'); el.style.left = '0px'; });
    isl.draw(V[name].w, V[name].h, V[name].r);
    liveDates(wrap);
    fits.push(() => wrap.style.setProperty('--k', Math.min(1.25, (pic.clientWidth - 40) / V[name].w).toFixed(3)));
  });

  /* the live island in the hero */
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
  // the app's springs (core/island.js): growing has a subtle overshoot, shrinking settles
  const GROW = { k: 250, z: 0.7 }, SHRINK = { k: 340, z: 0.97 };
  const PAGES = ['player', 'timer', 'today', 'controls', 'shelf', 'clipboard'];
  const CYCLE = [['pill', 3200], ['player', 4200], ['timerPill', 3000], ['timer', 4200], ['pill', 2400], ['today', 3800], ['controls', 3800], ['shelf', 3800], ['clipboard', 3800]];

  const heroWrap = document.getElementById('islandWrap');
  const isl = build(heroWrap, ['pill', 'player', 'timerPill', 'timer', 'today', 'controls', 'shelf', 'clipboard']);
  const wl = heroWrap.querySelector('.wl');
  const sp = { w: new Spring(LIP.w, 250, .7), h: new Spring(LIP.h, 250, .7), r: new Spring(LIP.r, 250, .7) };
  let current = null, step = -1, cycleT = 0, hoverT = 0, open = false, raf = 0, last = 0;

  const size = name => (name ? V[name] : LIP);
  const go = name => {
    const t = size(name), c = size(current);
    const f = t.w * t.h >= c.w * c.h ? GROW : SHRINK;
    for (const key of ['w', 'h', 'r']) { if (reduce.matches) sp[key].snap(t[key]); else sp[key].to(t[key], f.k, f.z); }
    if (current) isl.views[current].forEach(el => el.classList.remove('on'));
    if (name) isl.views[name].forEach(el => el.classList.add('on'));
    wl.dataset.level = !name ? 'rest' : PAGES.includes(name) ? 'full' : 'mid';
    current = name;
    kick();
  };

  // every view rides the shape's spring, scaled by how wide the island is now against its own width
  const place = () => {
    const w = sp.w.x;
    for (const name in isl.views) {
      const els = isl.views[name], tw = V[name].w;
      const s = Math.min(1.3, Math.max(.5, w / tw));
      if (name === 'pill') {
        // the clock on the left, the song's bubble in the right end
        els[0].style.left = '0px'; els[0].style.scale = String(s);
        if (els[1]) { els[1].style.left = '0px'; els[1].style.translate = (w - 36) + 'px'; }
      } else {
        els.forEach(el => { el.style.left = (w - tw) / 2 + 'px'; el.style.scale = String(s); });
      }
    }
  };
  const frame = now => {
    const dt = last ? now - last : 16; last = now;
    let moving = false;
    for (const key in sp) moving = sp[key].step(dt) || moving;
    isl.draw(sp.w.x, sp.h.x, sp.r.x);
    place();
    raf = moving ? requestAnimationFrame(frame) : 0;
    if (!moving) last = 0;
  };
  const kick = () => { if (!raf) { last = 0; raf = requestAnimationFrame(frame); } };

  const next = () => {
    clearTimeout(cycleT);
    if (open || document.hidden || reduce.matches) return;
    step = (step + 1) % CYCLE.length;
    const [name, ms] = CYCLE[step];
    go(name);
    cycleT = setTimeout(next, ms);
  };
  const openIsland = () => {
    open = true; clearTimeout(cycleT);
    if (!PAGES.includes(current)) go(current === 'timerPill' ? 'timer' : 'player');
  };
  const closeIsland = () => {
    open = false; clearTimeout(cycleT);
    if (reduce.matches) { go('pill'); return; }
    go('pill');
    step = CYCLE.findIndex(([n]) => n === 'pill');
    cycleT = setTimeout(next, 1600);
  };
  const turn = dir => {
    const i = PAGES.indexOf(current);
    go(PAGES[(i + dir + PAGES.length) % PAGES.length]);
  };

  const part = isl.part;
  part.addEventListener('pointerenter', e => {
    if (e.pointerType !== 'mouse') return;
    clearTimeout(hoverT); hoverT = setTimeout(openIsland, 300);
  });
  part.addEventListener('pointerleave', e => {
    if (e.pointerType !== 'mouse') return;
    clearTimeout(hoverT);
    if (open) hoverT = setTimeout(closeIsland, 250);
  });
  // a click on the open island's left or right side turns the page (in the app it's a right-click)
  part.addEventListener('click', e => {
    if (!open) { openIsland(); return; }
    const r = part.querySelector('.shape').getBoundingClientRect();
    turn(e.clientX < r.left + r.width / 2 ? -1 : 1);
  });
  part.addEventListener('wheel', e => {
    if (!open) return;
    e.preventDefault();
    if (Math.abs(e.deltaX) + Math.abs(e.deltaY) < 4 || part.dataset.wheel) return;
    part.dataset.wheel = '1'; setTimeout(() => { delete part.dataset.wheel; }, 380);
    turn((Math.abs(e.deltaX) > Math.abs(e.deltaY) ? e.deltaX : e.deltaY) > 0 ? 1 : -1);
  }, { passive: false });
  document.addEventListener('pointerdown', e => { if (open && e.pointerType !== 'mouse' && !part.contains(e.target)) closeIsland(); });
  document.addEventListener('visibilitychange', () => { if (!document.hidden && !open) next(); });

  // phones: the island and the pictures scale to fit
  const fit = () => {
    heroWrap.style.setProperty('--k', Math.min(1, (innerWidth - 24) / 420).toFixed(3));
    fits.forEach(f => f());
  };
  addEventListener('resize', fit); fit();

  isl.draw(LIP.w, LIP.h, LIP.r);
  liveDates(heroWrap);
  setInterval(() => liveDates(document), 15000);
  if (reduce.matches) go('pill');
  else setTimeout(next, 700);
})();
