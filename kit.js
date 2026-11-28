/* Kit: the shared parts of LEXICON, Clade and Meridian.
   One file, configured per site with Kit.init({...}). Nothing here is game-specific.
   - streaks & stats per game, with a stats modal
   - how-to-play modals (and a first-visit intro)
   - light/dark theme switch
   - countdown to the next daily puzzle
   - confetti, toast
   - footer with About / Privacy / Terms / Contact and links to the sister sites
   - installable app (manifest + service worker)
   - Google AdSense, never shown to players who bought the site's unlock
*/
(function () {
  const Kit = window.Kit = {};
  let C = {};
  const $ = s => document.querySelector(s);
  const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  Kit.esc = esc;

  /* ---------- storage ---------- */
  const mem = {};
  const ls = { get(k) { try { return localStorage.getItem(k); } catch (e) { return mem[k] ?? null; } },
               set(k, v) { try { localStorage.setItem(k, v); } catch (e) { mem[k] = String(v); } } };
  const key = k => (C.prefix || 'kit') + ':' + k;
  Kit.load = (k, d) => { try { const v = ls.get(key(k)); return v == null ? d : JSON.parse(v); } catch (e) { return d; } };
  Kit.save = (k, v) => ls.set(key(k), JSON.stringify(v));

  /* ---------- days ---------- */
  // Local calendar day number (same idea as LEXICON's dayNumber()).
  Kit.dayNumber = (d = new Date()) => Math.floor(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()) / 864e5);
  Kit.msToMidnight = () => { const n = new Date(); return new Date(n.getFullYear(), n.getMonth(), n.getDate() + 1) - n; };
  Kit.fmtCountdown = ms => { const s = Math.max(0, ms / 1000 | 0); return `${s / 3600 | 0}h ${String((s % 3600) / 60 | 0).padStart(2, '0')}m`; };
  setInterval(() => document.querySelectorAll('.kit-cd').forEach(e => e.textContent = Kit.fmtCountdown(Kit.msToMidnight())), 20000);

  /* ---------- stats & streaks ---------- */
  // record() is safe to call more than once for the same day: only the first call counts.
  Kit.stats = {
    get: id => Kit.load('stats:' + id, { played: 0, wins: 0, streak: 0, best: 0, last: null, dist: {}, pts: null }),
    record(id, won, bucket, points) {
      const s = this.get(id), day = Kit.dayNumber();
      if (s.last === day) return s;
      s.played++; if (won) s.wins++;
      s.streak = won ? (s.last === day - 1 ? s.streak + 1 : 1) : 0;
      s.best = Math.max(s.best, s.streak); s.last = day;
      if (bucket != null) s.dist[bucket] = (s.dist[bucket] || 0) + 1;
      if (points != null) s.pts = (s.pts || 0) + points;
      Kit.save('stats:' + id, s);
      // site-wide daily streak: play any game today
      const all = Kit.load('daily', { last: null, streak: 0, best: 0 });
      if (all.last !== day) { all.streak = all.last === day - 1 ? all.streak + 1 : 1; all.best = Math.max(all.best, all.streak); all.last = day; Kit.save('daily', all); }
      return s;
    },
    siteStreak() { const a = Kit.load('daily', { last: null, streak: 0, best: 0 }); const d = Kit.dayNumber(); return a.last === d || a.last === d - 1 ? a.streak : 0; },
    row(id) {
      const s = this.get(id), avg = s.pts != null ? Math.round(s.pts / Math.max(1, s.played)).toLocaleString('en-US') : null;
      const cells = [['Played', s.played], avg != null ? ['Average', avg] : ['Win %', s.played ? Math.round(100 * s.wins / s.played) : 0], ['Streak', s.streak], ['Best', s.best]];
      return `<div class="kit-srow">${cells.map(([k, v]) => `<div><b>${v}</b><span>${k}</span></div>`).join('')}</div>`;
    },
    open(id, title) {
      const s = this.get(id);
      const keys = Object.keys(s.dist).sort((a, b) => a === 'x' ? 1 : b === 'x' ? -1 : (parseFloat(a) - parseFloat(b)));
      const mx = Math.max(1, ...Object.values(s.dist));
      const dist = keys.length ? `<h4 class="kit-h4">Guess distribution</h4>${keys.map(k => `<div class="kit-drow"><span>${k === 'x' ? '✗' : esc(k)}</span><i style="width:${8 + 92 * s.dist[k] / mx}%">${s.dist[k]}</i></div>`).join('')}` : `<p class="kit-muted">Play today's puzzle to start your stats.</p>`;
      Kit.modal(title + ' stats', this.row(id) + dist + `<p class="kit-muted kit-center">Next puzzle in <b class="kit-cd">${Kit.fmtCountdown(Kit.msToMidnight())}</b></p>`);
    },
  };

  /* ---------- modal & toast ---------- */
  Kit.modal = (title, html) => {
    const wrap = document.createElement('div'); wrap.className = 'kit-modal';
    wrap.innerHTML = `<div class="kit-box" role="dialog" aria-modal="true" aria-label="${esc(title)}"><h3>${esc(title)}</h3><div class="kit-body">${html}</div><div class="kit-foot"><button class="kit-btn">Close</button></div></div>`;
    const close = () => { wrap.remove(); document.removeEventListener('keydown', onKey); };
    const onKey = e => { if (e.key === 'Escape') close(); };
    wrap.addEventListener('click', e => { if (e.target === wrap || e.target.closest('.kit-foot .kit-btn')) close(); });
    document.addEventListener('keydown', onKey);
    document.body.appendChild(wrap); wrap.querySelector('.kit-btn').focus();
    return wrap;
  };
  Kit.howTo = (id, title, html, firstVisitOnly) => {
    if (firstVisitOnly) { if (Kit.load('seen:' + id, false)) return; Kit.save('seen:' + id, true); }
    Kit.modal('How to play ' + title, `<div class="kit-rules">${html}</div>`);
  };
  Kit.toast = msg => { let t = $('#kit-toast'); if (!t) { t = document.createElement('div'); t.id = 'kit-toast'; t.setAttribute('role', 'status'); document.body.appendChild(t); } t.textContent = msg; t.classList.add('on'); clearTimeout(Kit._tt); Kit._tt = setTimeout(() => t.classList.remove('on'), 2000); };
  Kit.copy = async text => { try { await navigator.clipboard.writeText(text); Kit.toast('Copied to clipboard'); return true; } catch (e) { return false; } };

  /* ---------- confetti ---------- */
  Kit.confetti = () => {
    if (matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const cv = document.createElement('canvas'); cv.className = 'kit-confetti'; document.body.appendChild(cv);
    const ctx = cv.getContext('2d'), W = cv.width = innerWidth, H = cv.height = innerHeight;
    const cols = C.confetti || ['#e8b04a', '#3d9a5f', '#6b4fa0', '#c2454a', '#2a7f8a'];
    const ps = Array.from({ length: 120 }, () => ({ x: W / 2 + (Math.random() - .5) * W * .3, y: H * .35, vx: (Math.random() - .5) * 12, vy: -Math.random() * 12 - 4, r: Math.random() * 6 + 3, c: cols[Math.random() * cols.length | 0], a: Math.random() * 6 }));
    let f = 0; (function step() { ctx.clearRect(0, 0, W, H); for (const p of ps) { p.vy += .35; p.x += p.vx; p.y += p.vy; p.a += .2; ctx.fillStyle = p.c; ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(p.a); ctx.fillRect(-p.r / 2, -p.r / 4, p.r, p.r / 2); ctx.restore(); } if (++f < 110) requestAnimationFrame(step); else cv.remove(); })();
  };

  /* ---------- theme ---------- */
  Kit.theme = {
    get: () => Kit.load('theme', null) || (matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'),
    apply(t) { document.documentElement.dataset.theme = t; document.documentElement.classList.toggle('dark', t === 'dark'); },
    toggle() { const t = this.get() === 'dark' ? 'light' : 'dark'; Kit.save('theme', t); this.apply(t); return t; },
    button(cls = '') { return `<button class="kit-theme ${cls}" onclick="Kit.theme.toggle()" aria-label="Switch light or dark mode">◐</button>`; },
  };

  /* ---------- unlock (shared with LEXICON's backend design) ---------- */
  Kit.unlocked = () => !!(C.unlock && Kit.load('unlocked', false) === true);

  /* ---------- ads ---------- */
  function initAds() {
    const A = C.ads; if (!A || !A.client || Kit.unlocked()) return;
    if (!document.querySelector('script[src*="adsbygoogle.js"]')) {
      const s = document.createElement('script'); s.async = true; s.crossOrigin = 'anonymous';
      s.src = 'https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=' + encodeURIComponent(A.client);
      document.head.appendChild(s);
    }
    if (A.bottomSlot) {
      const bar = document.createElement('div'); bar.className = 'kit-adbar';
      bar.innerHTML = `<ins class="adsbygoogle" style="display:inline-block;width:100%;max-width:728px;height:50px" data-ad-client="${esc(A.client)}" data-ad-slot="${esc(A.bottomSlot)}"></ins>`;
      document.body.appendChild(bar); document.body.style.paddingBottom = '68px';
      try { (window.adsbygoogle = window.adsbygoogle || []).push({}); } catch (e) {}
    }
  }

  /* ---------- add to home screen (same flow as LEXICON) ----------
     Android / desktop Chrome & Edge: the browser's own install prompt.
     iPhone / iPad (no prompt allowed): step-by-step instructions. */
  let installEvt = null;
  addEventListener('beforeinstallprompt', e => { e.preventDefault(); installEvt = e; });
  addEventListener('appinstalled', () => { installEvt = null; Kit.save('installed', true); Kit.toast(C.name + ' is on your home screen'); document.querySelectorAll('.kit-home').forEach(b => b.remove()); });
  const isStandalone = () => { try { return matchMedia('(display-mode: standalone)').matches || navigator.standalone === true; } catch (e) { return false; } };
  const isIOS = () => /iphone|ipad|ipod/i.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  const isAndroid = () => /android/i.test(navigator.userAgent);
  const inPreview = () => /claudeusercontent|claude\.ai/.test(location.hostname);
  Kit.canInstall = () => !isStandalone() && !Kit.load('installed', false) && !inPreview();
  const SHARE_ICON = `<svg aria-hidden="true" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:-3px"><path d="M12 3v12M8 7l4-4 4 4M5 12v7a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-7"/></svg>`;
  const PLUS_ICON = `<svg aria-hidden="true" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" style="vertical-align:-3px"><rect x="3" y="3" width="18" height="18" rx="4"/><path d="M12 8v8M8 12h8"/></svg>`;
  Kit.homeIcon = (s = 15) => `<svg aria-hidden="true" width="${s}" height="${s}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:-2px"><rect x="6" y="2" width="12" height="20" rx="2.5"/><path d="M12 8v6M9 11h6"/></svg>`;
  Kit.install = async () => {
    if (installEvt) {
      const p = installEvt; installEvt = null;
      try { p.prompt(); const r = await p.userChoice; if (r && r.outcome === 'accepted') Kit.save('installed', true); } catch (e) {}
      return;
    }
    const step = (n, html) => `<li><b>${n}</b><span>${html}</span></li>`;
    let steps;
    if (isIOS()) {
      const safari = /safari/i.test(navigator.userAgent) && !/crios|fxios|edgios/i.test(navigator.userAgent);
      steps = step(1, `Tap the <b>Share</b> button ${SHARE_ICON} ${safari ? 'at the bottom of Safari (or next to the address bar)' : 'next to the address bar'}.`)
        + step(2, `Scroll down and tap <b>Add to Home Screen</b> ${PLUS_ICON}.`)
        + step(3, `Tap <b>Add</b>. ${esc(C.name)} appears on your home screen like an app.`);
    } else if (isAndroid()) {
      steps = step(1, `Open your browser's menu <b>⋮</b> (top or bottom right).`)
        + step(2, `Tap <b>Add to Home screen</b> or <b>Install app</b>.`)
        + step(3, `Tap <b>Add</b> or <b>Install</b>.`);
    } else {
      steps = step(1, `In Chrome or Edge, click the install icon at the right end of the address bar, or open the menu <b>⋮</b> and choose <b>Install ${esc(C.name)}</b>.`)
        + step(2, `In Safari on a Mac, choose <b>File → Add to Dock</b>.`);
    }
    Kit.modal('Add ' + C.name + ' to your home screen', `<p class="kit-muted" style="margin-top:0">It opens full screen like an app, so today's puzzles are always one tap away.</p><ol class="kit-steps">${steps}</ol>`);
  };
  // A small link for the home page (hidden once installed).
  Kit.installLink = () => Kit.canInstall() ? `<button class="kit-home linklike" onclick="Kit.install()">${Kit.homeIcon()} Add to home screen</button>` : '';
  // After a daily puzzle: a gentle reminder, at most once every 3 days.
  Kit.installNudge = box => {
    if (!box || !Kit.canInstall() || box.querySelector('.kit-nudge')) return;
    const last = +Kit.load('install_nudge', 0) || 0;
    if (Date.now() - last < 3 * 864e5) return;
    Kit.save('install_nudge', Date.now());
    box.insertAdjacentHTML('beforeend', `<p class="kit-nudge"><button class="linklike" onclick="Kit.install()">${Kit.homeIcon(13)} Add ${esc(C.name)} to your home screen</button> so tomorrow's puzzles are one tap away.</p>`);
  };

  /* ---------- footer with sister sites ---------- */
  Kit.footer = () => {
    const sis = (C.sisters || []).filter(s => s.url && s.name !== C.name);
    return `<footer class="kit-footer">
      ${sis.length ? `<div class="kit-sis-h">More daily games from us</div><div class="kit-sis">${sis.map(s => `<a class="kit-sis-card" href="${esc(s.url)}" style="--sis:${esc(s.color || '#888')}"><span class="kit-sis-ic">${esc(s.icon || '★')}</span><span><b>${esc(s.name)}</b><small>${esc(s.tag || '')}</small></span></a>`).join('')}</div>` : ''}
      <nav class="kit-links"><a href="/guides/">Guides</a><a href="about.html">About</a><a href="privacy.html">Privacy</a><a href="terms.html">Terms</a>${C.email ? `<a href="mailto:${esc(C.email)}">Contact</a>` : ''}${Kit.canInstall() ? `<button class="kit-install linklike" onclick="Kit.install()">Add to home screen</button>` : ''}</nav>
      ${C.email ? `<p class="kit-muted">Questions or ideas: ${esc(C.email)}</p>` : ''}
      <p class="kit-muted">© ${new Date().getFullYear()} ${esc(C.name)}</p></footer>`;
  };

  /* ---------- share ---------- */
  Kit.url = () => C.url || (location.origin && location.origin !== 'null' ? location.origin : '');

  /* ---------- init ---------- */
  Kit.init = cfg => {
    C = Kit.config = cfg;
    if (cfg.themeToggle) Kit.theme.apply(Kit.theme.get());
    if (cfg.pwa && 'serviceWorker' in navigator && (location.protocol === 'https:' || location.hostname === 'localhost') && !/claudeusercontent|claude\.ai/.test(location.hostname)) {
      addEventListener('load', () => navigator.serviceWorker.register('sw.js').catch(() => {}));
    }
    initAds();
  };
})();
