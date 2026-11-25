/* Clade extras: leaderboard & leagues, "beat me" challenges, gifts, field badges, specimen cabinet,
   year in the field, today's field notes, share-as-image, sound effects and progress reset.
   Same features and server design as Meridian and LEXICON; results, gifts and purchases are kept per site.
   Hooks: the game page fires 'clade:guess' and 'clade:result' events. */
(function () {
  const SRV = CLADE.PREMIUM.server + '/clade';
  const L = (k, d) => { const v = load('clade:' + k); return v == null ? d : v; };
  const SV = (k, v) => save('clade:' + k, v);
  const puzzleNo = () => DAY + 1;               // "Daily #N" shown to players
  const srvDay = () => Kit.dayNumber();         // day number the server checks (today ± 1)
  const siteUrl = () => Kit.url() || location.href.split('?')[0].split('#')[0];
  const games = () => Object.entries(GAMES).map(([id, g]) => ({ id, ...g }));
  const isPractice = () => /-(practice|challenge)$/.test(location.hash);
  const closeAll = () => document.querySelectorAll('.kit-modal').forEach(e => e.remove());
  const modal = (title, html) => { const w = Kit.modal(title, html); hydrateSilhouettes(w); return w; };

  async function api(action, body = {}) {
    try {
      const r = await fetch(SRV, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ action, player_id: CLADE.playerId(), ...body }) });
      return await r.json();
    } catch (e) { return null; }
  }

  /* ---------------- Sound ---------------- */
  let ctx = null;
  const muted = () => L('mute', false);
  function tone(freq, t0, dur, type = 'sine', vol = .12) {
    const o = ctx.createOscillator(), g = ctx.createGain();
    o.type = type; o.frequency.setValueAtTime(freq, ctx.currentTime + t0);
    g.gain.setValueAtTime(0.0001, ctx.currentTime + t0);
    g.gain.exponentialRampToValueAtTime(vol, ctx.currentTime + t0 + .015);
    g.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + t0 + dur);
    o.connect(g).connect(ctx.destination); o.start(ctx.currentTime + t0); o.stop(ctx.currentTime + t0 + dur + .05);
  }
  function sfx(kind) {
    if (muted()) return;
    try { ctx = ctx || new (window.AudioContext || window.webkitAudioContext)(); if (ctx.state === 'suspended') ctx.resume(); } catch (e) { return; }
    if (kind === 'right') { tone(660, 0, .12, 'triangle'); tone(990, .09, .18, 'triangle'); }
    else if (kind === 'wrong') { tone(240, 0, .14, 'sine', .07); tone(200, .07, .18, 'sine', .05); }
    else if (kind === 'win') { [523, 659, 784, 1047].forEach((f, i) => tone(f, i * .1, .28, 'triangle')); }
    else if (kind === 'lose') { [392, 330, 262].forEach((f, i) => tone(f, i * .14, .3, 'sine', .08)); }
    else if (kind === 'badge') { tone(784, 0, .1, 'triangle', .08); tone(1175, .08, .22, 'triangle', .07); tone(1568, .18, .2, 'sine', .04); }
    else if (kind === 'tick') { tone(880, 0, .06, 'sine', .05); }
  }
  window.CladeSfx = sfx;
  function muteBtn() {
    const b = document.createElement('button'); b.className = 'back mbtn'; b.setAttribute('aria-label', 'Sound on or off');
    const set = () => { b.textContent = muted() ? '🔇' : '🔊'; b.title = muted() ? 'Sound is off' : 'Sound is on'; };
    b.onclick = () => { SV('mute', !muted()); set(); if (!muted()) sfx('tick'); };
    set(); return b;
  }

  /* ---------------- Daily log, leaderboard submissions, cabinet ---------------- */
  const mistakesOf = d => (GAMES[d.game] && GAMES[d.game].kind === 'lives') ? Math.min(6, d.n - 1) : d.game === 'kinship' ? (d.won ? Math.min(29, d.n - 1 + (d.hints || 0)) : 30) : (d.won ? Math.max(0, d.n - 1) : 6);
  const logToday = () => (L('log', {})[puzzleNo()] || {});
  async function flush() {
    const q = L('lbq', []); if (!q.length) return;
    const today = srvDay(), keep = q.filter(r => r.day >= today - 1);
    const res = keep.length ? await api('submit', { results: keep }) : { ok: true };
    SV('lbq', res && res.ok ? [] : keep);
  }
  addEventListener('clade:guess', e => { if (!e.detail.right) sfx('wrong'); });
  addEventListener('clade:result', e => {
    const d = e.detail;
    // the result panel re-renders on reload, so only count each finished puzzle once
    if (typeof S !== "undefined" && S && S._counted) { decorateResult(d); return; }
    if (typeof S !== "undefined" && S) S._counted = true;
    if (d.won && d.target) { const C = L('cabinet', {}); C[d.target] = (C[d.target] || 0) + 1; SV('cabinet', C); }
    if (d.mode === 'daily') {
      const Lg = L('log', {}), day = puzzleNo();
      if (!(Lg[day] && Lg[day][d.game])) {
        const m = mistakesOf(d);
        Lg[day] = Lg[day] || {}; Lg[day][d.game] = { w: d.won, m, n: d.n }; SV('log', Lg);
        const q = L('lbq', []); q.push({ day: srvDay(), game: d.game, won: d.won, mistakes: m }); SV('lbq', q);
        flush();
        sfx(d.won ? 'win' : 'lose');
        if (document.documentElement.dataset.theme === 'dark') award('night');
        if (d.won && d.n === 1) award('bull');
      }
    } else {
      sfx(d.won ? 'win' : 'lose');
      if (d.won && d.level === 'hard') award('hard');
    }
    setTimeout(checkBadges, 60);
    decorateResult(d);
  });

  /* ---------------- Field badges ---------------- */
  const BADGES = [
    ['first', 'First Specimen', 'Finish any daily puzzle'],
    ['tour', 'Naturalist', 'Play every game at least once'],
    ['full', 'Full Survey', 'Finish every daily in one day'],
    ['s3', 'Field Trip', 'Reach a 3-day streak in any game'],
    ['s7', 'A Week in the Wild', 'Reach a 7-day streak in any game'],
    ['s30', 'Lifelong Naturalist', 'Reach a 30-day streak in any game'],
    ['bull', 'Eagle Eye', 'Solve a daily on the very first guess'],
    ['c25', 'Curator', 'Pin 25 species in your cabinet'],
    ['c100', 'Museum Keeper', 'Pin 100 species in your cabinet'],
    ['c500', 'Ark Builder', 'Pin 500 species in your cabinet'],
    ['mam', 'Mammalogist', 'Solve 10 different mammals'],
    ['bird', 'Ornithologist', 'Solve 10 different birds'],
    ['herp', 'Herpetologist', 'Solve 10 reptiles or amphibians'],
    ['inv', 'Bug Hunter', 'Solve 10 animals without a backbone'],
    ['night', 'Night Safari', 'Finish a daily in dark mode'],
    ['hard', 'Apex Predator', 'Solve a Hard puzzle in Unlimited'],
    ['crew', 'Herd Instinct', 'Create or join a friend league'],
    ['gift', 'Pollinator', 'Give Clade Unlimited as a gift'],
  ];
  const HUES = ['#2f6b4f', '#6b4fa0', '#c2454a', '#2a7f8a', '#a7782a', '#5a7d2f'];
  function award(id) {
    const B = L('badges', {}); if (B[id]) return;
    B[id] = puzzleNo(); SV('badges', B);
    const b = BADGES.find(x => x[0] === id); if (!b) return;
    setTimeout(() => { sfx('badge'); Kit.toast('Badge earned: ' + b[1]); }, 900);
  }
  function checkBadges() {
    const Lg = L('log', {}), today = Lg[puzzleNo()] || {}, G = games();
    if (Object.keys(Lg).length) award('first');
    if (G.length && G.every(g => Kit.stats.get(g.id).played > 0)) award('tour');
    if (G.length && G.every(g => today[g.id])) award('full');
    const best = Math.max(0, ...G.map(g => Kit.stats.get(g.id).best || 0));
    if (best >= 3) award('s3'); if (best >= 7) award('s7'); if (best >= 30) award('s30');
    const ids = Object.keys(L('cabinet', {})).filter(id => byId[id]);
    if (ids.length >= 25) award('c25'); if (ids.length >= 100) award('c100'); if (ids.length >= 500) award('c500');
    const grp = id => (byId[id].g || '').toLowerCase();
    const count = re => ids.filter(id => re.test(grp(id))).length;
    if (count(/mammal/) >= 10) award('mam'); if (count(/bird/) >= 10) award('bird');
    if (count(/reptile|amphibian|crocodil|turtle/) >= 10) award('herp');
    if (count(/insect|arachnid|crustacean|mollusc|snail|cephalopod|cnidarian|worm|echinoderm|myriapod|arthropod/) >= 10) award('inv');
  }
  function badgeSvg(name, on, i) {
    const col = on ? HUES[i % HUES.length] : 'var(--muted)';
    const label = name.toUpperCase().slice(0, 18);
    return `<svg viewBox="0 0 100 100" class="badge ${on ? 'on' : 'off'}" style="color:${col};transform:rotate(${on ? ((i * 37) % 13) - 6 : 0}deg)" aria-hidden="true">
      <circle cx="50" cy="50" r="46" fill="${on ? 'color-mix(in srgb,currentColor 10%,transparent)' : 'none'}" stroke="currentColor" stroke-width="3" ${on ? '' : 'stroke-dasharray="4 4"'}/>
      <circle cx="50" cy="50" r="37" fill="none" stroke="currentColor" stroke-width="1.2"/>
      <path id="bp${i}" d="M50 50 m-31 0 a31 31 0 1 1 62 0" fill="none"/>
      <text font-size="9" font-family="Inter,sans-serif" font-weight="700" fill="currentColor" letter-spacing="1.2"><textPath href="#bp${i}" startOffset="50%" text-anchor="middle">${esc(label)}</textPath></text>
      ${on ? `<path d="M50 74c0-14 0-20 0-24M50 56c-7-1-12-6-13-14 8 0 12 5 13 14zM50 52c6-2 10-7 11-14-7 1-11 6-11 14z" fill="currentColor" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round"/>` : `<text x="50" y="66" text-anchor="middle" font-size="24" font-family="Fraunces,serif" fill="currentColor">?</text>`}
      <text x="50" y="88" text-anchor="middle" font-size="7" font-family="Inter,sans-serif" letter-spacing="1.5" fill="currentColor">CLADE</text></svg>`;
  }
  function showBadges() {
    checkBadges();
    const B = L('badges', {}), n = BADGES.filter(b => B[b[0]]).length;
    modal('Field badges', `<div class="badgebook"><p class="kit-muted">${n} of ${BADGES.length} badges earned. Your field journal fills as you play.</p><div class="badgegrid">${BADGES.map(([id, name, desc], i) => {
      const on = !!B[id];
      return `<div class="badgecell ${on ? 'on' : ''}">${badgeSvg(name, on, i)}<b>${esc(name)}</b><small>${on ? 'Daily #' + B[id] : esc(desc)}</small></div>`;
    }).join('')}</div></div>`);
  }

  /* ---------------- Specimen cabinet ---------------- */
  function showCabinet() {
    const C = L('cabinet', {}), ids = Object.keys(C).filter(id => byId[id]).sort((a, b) => byId[a].n.localeCompare(byId[b].n));
    const groups = {}; ids.forEach(id => { const g = byId[id].g || 'Animal'; groups[g] = (groups[g] || 0) + 1; });
    const top = Object.entries(groups).sort((a, b) => b[1] - a[1]).slice(0, 4);
    const cells = ids.map(id => { const a = byId[id]; return `<div class="spec" title="${esc(a.n)}${a.sci ? ' · ' + esc(a.sci) : ''}"><div class="specimg">${a.img ? `<img data-sil="${a.id}" alt="">` : (a.e || '🐾')}</div><span>${esc(a.n)}</span>${C[id] > 1 ? `<i>×${C[id]}</i>` : ''}</div>`; }).join('');
    modal('Specimen cabinet', `<div class="cabinet">
      <div class="kit-srow" style="grid-template-columns:repeat(${1 + top.length},1fr)"><div><b>${ids.length}</b><span>of ${A.length.toLocaleString('en-US')} species</span></div>${top.map(([g, c]) => `<div><b>${c}</b><span>${esc(g)}</span></div>`).join('')}</div>
      ${ids.length ? `<div class="specgrid">${cells}</div>` : `<p class="kit-muted">Every animal you solve, daily or in practice, gets pinned here. Solve one to start your collection.</p>`}
    </div>`);
  }

  /* ---------------- Today's field notes (all games) ---------------- */
  const resultLabel = (g, r) => !r ? null : g.kind === 'lives' ? (r.w ? (r.n > 1 ? `${r.n - 1} miss${r.n > 2 ? 'es' : ''}` : 'perfect') : 'out of lives') : g.max === Infinity ? (r.w ? `${r.n} guess${r.n === 1 ? '' : 'es'}` : 'gave up') : (r.w ? `${r.n}/${g.max}` : `X/${g.max}`);
  const resultGlyph = (g, r) => !r ? '⬜' : !r.w ? '🟥' : g.kind === 'lives' ? (r.n === 1 ? '🟩' : '🟨') : (g.max === Infinity ? (r.n <= 6 ? '🟩' : '🟨') : (r.n <= 2 ? '🟩' : '🟨'));
  function editionText() {
    const T = logToday(), G = games(), done = G.filter(g => T[g.id]).length;
    return `🌿 Clade · Daily #${puzzleNo()} · ${done}/${G.length}\n` + G.map(g => `${resultGlyph(g, T[g.id])} ${g.title}${T[g.id] ? ' ' + resultLabel(g, T[g.id]) : ''}`).join('\n') + `\n${siteUrl()}`;
  }
  const editionRows = () => { const T = logToday(); return games().map(g => [g.title, resultLabel(g, T[g.id]) || '—', resultGlyph(g, T[g.id])]); };
  function editionCard() {
    const T = logToday(), G = games(), done = G.filter(g => T[g.id]).length;
    if (!done) return '';
    return `<section class="edition panel"><div class="edhead"><b>Today’s field notes · ${done} of ${G.length}</b><span class="hand">${done === G.length ? 'full survey — see you tomorrow' : 'keep going to fill the page'}</span></div>
      <div class="edcells">${G.map(g => { const r = T[g.id]; return `<a class="edcell ${r ? (r.w ? 'ok' : 'bad') : 'todo'}" href="#${g.id}" title="${esc(g.title)}" style="--c:${g.color}"><i>${ICONS[g.id] || ''}</i><span>${r ? resultLabel(g, r) : '—'}</span></a>`; }).join('')}</div>
      <div class="btns" style="margin-top:10px"><button class="ghost" data-x="edtext">Share text</button><button class="ghost" data-x="edimg">Share image</button></div></section>`;
  }

  /* ---------------- Share as image (field-journal page) ---------------- */
  async function shareImage({ kicker, title, rows = [], big = null, file = 'clade.png', text = '' }) {
    const W = 1080, H = Math.max(1080, 480 + rows.length * 84 + (big ? 200 : 0));
    const c = document.createElement('canvas'); c.width = W; c.height = H; const g = c.getContext('2d');
    try { await document.fonts.ready; } catch (e) {}
    const dark = document.documentElement.dataset.theme === 'dark';
    const bg = dark ? '#121814' : '#f3eee0', ink = dark ? '#e7eee8' : '#22302a', mute = dark ? '#97a59b' : '#6b736d', green = dark ? '#5fb58a' : '#2f6b4f';
    g.fillStyle = bg; g.fillRect(0, 0, W, H);
    g.strokeStyle = ink; g.globalAlpha = .06; g.lineWidth = 2;
    for (let y = 120; y < H; y += 44) { g.beginPath(); g.moveTo(0, y); g.lineTo(W, y); g.stroke(); }
    g.globalAlpha = .18; g.strokeStyle = '#c2454a'; g.beginPath(); g.moveTo(80, 0); g.lineTo(80, H); g.stroke();
    // a small branching tree in the corner
    g.globalAlpha = .16; g.strokeStyle = green; g.lineCap = 'round';
    (function br(x, y, a, l, w, d) { const x2 = x + Math.cos(a) * l, y2 = y - Math.sin(a) * l; g.lineWidth = w; g.beginPath(); g.moveTo(x, y); g.lineTo(x2, y2); g.stroke(); if (d < 6) { br(x2, y2, a + .45, l * .74, w * .7, d + 1); br(x2, y2, a - .4, l * .74, w * .7, d + 1); } })(W - 180, 420, Math.PI / 2, 90, 12, 0);
    g.globalAlpha = 1;
    g.fillStyle = green; g.font = '700 34px Fraunces, Georgia, serif'; g.fillText('🌿 Clade', 120, 130);
    g.fillStyle = mute; g.font = '40px Caveat, cursive'; g.fillText(kicker || '', 120, 186);
    g.fillStyle = ink; g.font = '800 88px Fraunces, Georgia, serif'; g.fillText(title || '', 120, 300);
    let y = 400;
    if (big) { g.fillStyle = green; g.font = '800 140px Fraunces, Georgia, serif'; g.fillText(big, 120, y + 110); y += 210; }
    for (const [k, v, glyph] of rows) {
      if (glyph) { g.font = '42px system-ui, "Apple Color Emoji", "Segoe UI Emoji", sans-serif'; g.fillStyle = ink; g.fillText(glyph, 120, y); }
      g.font = '600 44px Inter, system-ui, sans-serif'; g.fillStyle = ink; g.fillText(k, glyph ? 190 : 120, y);
      g.fillStyle = mute; g.textAlign = 'right'; g.fillText(String(v), W - 100, y); g.textAlign = 'left';
      y += 84;
    }
    g.fillStyle = mute; g.font = '34px Caveat, cursive'; g.fillText((siteUrl() || 'clade').replace(/^https?:\/\//, '').replace(/\/$/, '') || 'Clade', 120, H - 80);
    const blob = await new Promise(r => c.toBlob(r, 'image/png'));
    if (!blob) return Kit.toast('Could not make the image');
    const f = new File([blob], file, { type: 'image/png' });
    try { if (navigator.canShare && navigator.canShare({ files: [f] })) { await navigator.share({ files: [f], text }); return; } } catch (e) { if (e && e.name === 'AbortError') return; }
    const url = URL.createObjectURL(blob);
    const w = modal('Your image', `<div class="shareimg"><img src="${url}" alt="Your result as an image"><div class="btns"><a class="ghost" href="${url}" download="${esc(file)}">Download image</a>${text ? '<button class="ghost" data-x="copytext">Copy text</button>' : ''}</div></div>`);
    const ct = w.querySelector('[data-x=copytext]'); if (ct) ct.onclick = () => Kit.copy(text);
  }

  /* ---------------- "Beat me" challenges ---------------- */
  const enc = o => btoa(unescape(encodeURIComponent(JSON.stringify(o)))).replace(/=+$/, '').replace(/\+/g, '-').replace(/\//g, '_');
  const dec = s => { try { return JSON.parse(decodeURIComponent(escape(atob(s.replace(/-/g, '+').replace(/_/g, '/'))))); } catch (e) { return null; } };
  const better = (a, b) => (a.w !== b.w) ? (a.w ? 1 : -1) : (b.m - a.m);
  const describe = (r, g) => (g && g.kind === 'lives') ? (r.w ? (r.n === 1 ? 'with no mistakes' : `with ${r.n - 1} mistake${r.n > 2 ? 's' : ''}`) : 'and ran out of lives') : r.w ? `in ${r.n} guess${r.n === 1 ? '' : 'es'}` : 'and missed';
  async function challenge(gid) {
    const r = logToday()[gid]; if (!r) return;
    const url = siteUrl() + '?beat=' + enc({ g: gid, d: puzzleNo(), w: r.w, m: r.m, n: r.n, nm: L('lbname', '') || '' }) + '#' + gid;
    const text = `I did Clade ${GAMES[gid].title} #${puzzleNo()} ${describe(r, GAMES[gid])}. Can you beat me?\n${url}`;
    try { if (navigator.share) { await navigator.share({ text }); return; } } catch (e) { if (e && e.name === 'AbortError') return; }
    Kit.copy(text);
  }
  // Practice ("Endless") challenges, like LEXICON: the friend plays the exact same puzzle, free.
  const myScore = () => ({ w: !!S.won, n: scoreN() });
  const describeP = (r, g) => g && g.kind === 'lives' ? (r.w ? (r.n === 1 ? 'with no mistakes' : `with ${r.n - 1} mistake${r.n > 2 ? 's' : ''}`) : 'and ran out of lives') : g && g.setup && g.max !== Infinity && !g.kind ? (r.w ? `in ${r.n} tr${r.n === 1 ? 'y' : 'ies'}` : 'and missed') : (r.w ? `in ${r.n} guess${r.n === 1 ? '' : 'es'}` : 'and missed');
  async function practiceChallenge() {
    const G = GAMES[S.game], spec = { g: S.game, lv: S.level, id: Math.random().toString(36).slice(2, 8), nm: L('lbname', '') || '', ...myScore() };
    if (G.setup) spec.s = S.seed; else spec.t = S.target;
    const url = siteUrl() + '?play=' + enc(spec) + '#' + S.game + '-challenge';
    const lvl = S.level && S.level !== 'normal' ? ` (${S.level})` : '';
    const text = `I played this Clade ${G.title}${lvl} puzzle ${describeP(spec, G)}. Can you beat me? It's free to play:
${url}`;
    try { if (navigator.share) { await navigator.share({ text }); return; } } catch (e) { if (e && e.name === 'AbortError') return; }
    Kit.copy(text);
  }
  function challengeVerdict(box) {
    const c = S.challenge, me = myScore(), G = GAMES[S.game];
    const v = (me.w !== c.w) ? (me.w ? 1 : -1) : (me.w ? c.n - me.n : 0);
    box.insertAdjacentHTML('afterbegin', `<div class="verdict">🏁 ${esc(c.nm || 'Your friend')} did it ${esc(describeP(c, G))}. ${v > 0 ? '<b>You beat them!</b>' : v < 0 ? 'They win this one.' : 'It’s a tie!'}</div>`);
  }

  function beatBanner() {
    document.querySelectorAll('.beatban').forEach(e => e.remove());
    const b = L('beat', null);
    if (!b || b.d !== puzzleNo() || document.body.dataset.game !== b.g || isPractice()) return;
    const mine = logToday()[b.g], who = b.nm ? esc(b.nm) : 'Your friend';
    let html = `🏁 <b>${who}</b> did today’s ${esc(GAMES[b.g] ? GAMES[b.g].title : '')} ${esc(describe(b, GAMES[b.g]))}. `;
    if (mine) { const v = better(mine, b); html += v > 0 ? '<b>You beat them!</b>' : v < 0 ? 'They beat you this time.' : 'It’s a tie!'; }
    else html += 'Can you beat that?';
    const stage = document.getElementById('stage');
    if (stage) stage.insertAdjacentHTML('beforebegin', `<div class="beatban">${html}</div>`);
  }

  /* ---------------- Leaderboard & leagues ---------------- */
  async function setName(name) {
    const r = await api('name', { name });
    if (r && r.ok) SV('lbname', r.name);
    return r || { ok: false, error: 'Could not reach the server. Check your connection.' };
  }
  function nameForm(root, after) {
    root.insertAdjacentHTML('beforeend', `<form class="nameform"><input maxlength="16" placeholder="Pick a name (3–16 characters)" aria-label="Leaderboard name" value="${esc(L('lbname', ''))}"><button class="kit-btn">Save name</button><p class="err"></p></form>`);
    const f = root.lastElementChild, err = f.querySelector('.err');
    f.onsubmit = async e => { e.preventDefault(); err.textContent = 'Saving…'; const r = await setName(f.querySelector('input').value); if (r.ok) { err.textContent = ''; after && after(r.name); } else err.textContent = r.error; };
  }
  async function showBoard(league = null, tab = 'today') {
    const w = modal(league ? 'League' : 'Leaderboard', `<div class="lb"><p class="kit-muted">Loading…</p></div>`);
    const body = w.querySelector('.lb');
    await flush();
    const d = await api('board', { day: srvDay(), league });
    body.innerHTML = '';
    if (!d || d.error) { body.innerHTML = '<p class="err">The leaderboard couldn’t load. It works on the published site; check your connection and try again.</p>'; return; }
    if (d.my_name) SV('lbname', d.my_name);
    const head = document.createElement('div'); head.className = 'lbhead'; body.append(head);
    if (league && d.league) {
      head.innerHTML = `<p><b>${esc(d.league.name)}</b> · code <code>${esc(d.league.code)}</code> <button class="linkbtn" data-x="inv">Invite</button> · <button class="linkbtn" data-x="all">All players</button></p>`;
      head.querySelector('[data-x=inv]').onclick = () => shareLeague(d.league);
      head.querySelector('[data-x=all]').onclick = () => { closeAll(); showBoard(null, 'leagues'); };
    }
    if (!d.my_name) { head.insertAdjacentHTML('beforeend', '<p class="kit-muted">Choose a name to appear on the board. Your name is shared with LEXICON and Meridian.</p>'); nameForm(head, () => { closeAll(); showBoard(league, tab); }); }
    else head.insertAdjacentHTML('beforeend', `<p class="kit-muted">You’re playing as <b>${esc(d.my_name)}</b> · ${d.players} named players</p>`);
    const tabs = document.createElement('div'); tabs.className = 'tabs';
    const list = document.createElement('div'); list.className = 'lblist';
    body.append(tabs, list);
    const BD = CladeHumor.BOARDS;
    const T = BD.map(b => [b.k, b.tab]).concat([['leagues', 'Leagues']]);
    const strikeK = k => k === 'clean' || k === 'messy';
    const badge = (kind, r) => { const b = BD.find(x => x.k === kind); return b && r.rank === 1 ? `<span class="lbtitle">${esc(b.top)}</span>` : ''; };
    const score = (r, kind) => kind === 'streaks' ? `${r.current} now · best ${r.best}`
      : strikeK(kind) ? `${Number(r.avg).toFixed(2)} strikes/game · ${r.played} games`
      : `${r.wins} solved · ${r.mistakes} miss${r.mistakes === 1 ? '' : 'es'}`;
    const row = (r, kind) => `<div class="lbrow ${r.me ? 'me' : ''}"><span class="rk">#${r.rank}</span><span class="nm">${esc(r.name)}${r.sup ? '<em title="Clade Unlimited supporter">∞</em>' : ''}${badge(kind, r)}</span><span class="sc">${score(r, kind)}</span></div>`;
    const draw = t => {
      tab = t;
      tabs.innerHTML = T.filter(([k]) => !(league && k === 'leagues')).map(([k, l]) => `<button class="${k === t ? 'on' : ''}" data-t="${k}">${l}</button>`).join('');
      tabs.querySelectorAll('[data-t]').forEach(b => b.onclick = () => draw(b.dataset.t));
      list.innerHTML = '';
      if (t === 'leagues') return drawLeagues(list, d);
      const rows = d[t] || [], me = d[t + '_me'], b = BD.find(x => x.k === t);
      const min = d.strike_min || 10, mine = d.strike_played || 0;
      const empty = t === 'today' ? 'No one has finished a puzzle today yet. Be the first.'
        : strikeK(t) ? `Nobody has played ${min} daily puzzles yet. You’ve played ${mine}.` : 'No results yet.';
      list.innerHTML = (b ? `<p class="kit-muted lbsub"><b>${esc(b.title)}</b> · ${esc(b.sub)}</p>` : '')
        + (rows.length ? rows.map(r => row(r, t)).join('') : `<p class="kit-muted">${empty}</p>`)
        + (me && !rows.some(r => r.me) ? '<div class="lbgap">…</div>' + row(me, t) : '')
        + (!me && strikeK(t) && rows.length && mine < min ? `<p class="kit-muted">You’ll appear here after ${min} daily puzzles (you’ve played ${mine}).</p>` : '');
    };
    draw(tab);
  }
  function shareLeague(lg) {
    const text = `Join my Clade league “${lg.name}”: ${siteUrl()}?league=${lg.code}`;
    if (navigator.share) navigator.share({ text }).catch(() => {}); else Kit.copy(text);
  }
  function drawLeagues(list, d) {
    if (!d.my_name) { list.innerHTML = '<p class="kit-muted">Pick a name above first, then you can make or join leagues.</p>'; return; }
    list.innerHTML = (d.leagues || []).map((l, i) => `<div class="lbrow"><span class="nm">${esc(l.name)}</span><span class="sc">${l.members} player${l.members === 1 ? '' : 's'}</span><button class="linkbtn" data-o="${i}">Open</button><button class="linkbtn" data-i="${i}">Invite</button><button class="linkbtn" data-l="${i}">Leave</button></div>`).join('')
      + ((d.leagues || []).length ? '' : '<p class="kit-muted">Leagues are private boards for you and your friends. They’re shared with LEXICON and Meridian.</p>')
      + `<form class="nameform" data-f="create"><input maxlength="24" placeholder="League name" aria-label="New league name"><button class="kit-btn">Create</button></form>
         <form class="nameform" data-f="join"><input maxlength="6" placeholder="Code" aria-label="League code" style="text-transform:uppercase"><button class="kit-btn alt">Join</button></form><p class="err"></p>`;
    const L2 = d.leagues || [], err = list.querySelector('.err');
    list.querySelectorAll('[data-o]').forEach(b => b.onclick = () => { closeAll(); showBoard(L2[b.dataset.o].code); });
    list.querySelectorAll('[data-i]').forEach(b => b.onclick = () => shareLeague(L2[b.dataset.i]));
    list.querySelectorAll('[data-l]').forEach(b => b.onclick = async () => { await api('league_leave', { code: L2[b.dataset.l].code }); closeAll(); showBoard(null, 'leagues'); });
    list.querySelector('[data-f=create]').onsubmit = async e => { e.preventDefault(); const r = await api('league_create', { name: e.target.querySelector('input').value }); if (r && r.ok) { award('crew'); closeAll(); showBoard(r.code); } else err.textContent = (r && r.error) || 'Could not reach the server.'; };
    list.querySelector('[data-f=join]').onsubmit = async e => { e.preventDefault(); const r = await api('league_join', { code: e.target.querySelector('input').value }); if (r && r.ok) { award('crew'); closeAll(); showBoard(r.code); } else err.textContent = (r && r.error) || 'Could not reach the server.'; };
  }
  async function leagueInvite(code) {
    const r = await api('league_info', { code });
    if (!r || !r.ok) return Kit.toast((r && r.error) || 'Could not open that league');
    if (r.member) return showBoard(r.code);
    const w = modal('League invite', `<div class="inv"><p>You’ve been invited to <b>${esc(r.name)}</b> (${r.members} player${r.members === 1 ? '' : 's'}).</p></div>`);
    const body = w.querySelector('.inv');
    const err = document.createElement('p'); err.className = 'err';
    const join = async () => { const j = await api('league_join', { code: r.code }); if (j && j.ok) { award('crew'); closeAll(); showBoard(r.code); } else err.textContent = (j && j.error) || 'Could not join.'; };
    if (!L('lbname', '')) { body.insertAdjacentHTML('beforeend', '<p class="kit-muted">Choose your leaderboard name to join:</p>'); nameForm(body, join); }
    else { const b = document.createElement('button'); b.className = 'kit-btn'; b.textContent = 'Join league'; b.onclick = join; body.append(b); }
    body.append(err);
  }

  /* ---------------- Gifts ---------------- */
  function giftBox(root) {
    const link = code => siteUrl() + '?gift=' + code;
    root.insertAdjacentHTML('beforeend', `<div class="giftbox"><h3>🎁 Give Unlimited as a gift</h3>
      <p class="kit-muted">Buy a gift for ${CLADE.PREMIUM.price}. You get a link to send; whoever opens it first gets Clade Unlimited on their device.</p>
      <a class="ghost" target="_blank" rel="noopener" href="${CLADE.PREMIUM.giftUrl}?wanted=true&player_id=${encodeURIComponent(CLADE.playerId())}">Buy a gift</a><div class="giftlist"></div></div>`);
    const box = root.lastElementChild, list = box.querySelector('.giftlist');
    const loadGifts = async () => {
      const r = await api('gift_list'), gifts = (r && r.gifts) || [];
      if (gifts.length) award('gift');
      list.innerHTML = gifts.map(g => `<div class="lbrow"><code>${esc(g.code)}</code><span class="sc">${g.status === 'redeemed' ? 'Opened ✓' : 'Not opened yet'}</span>${g.status === 'redeemed' ? '' : `<button class="linkbtn" data-c="${esc(g.code)}">Send link</button>`}</div>`).join('');
      list.querySelectorAll('[data-c]').forEach(b => b.onclick = () => { const t = `I got you Clade Unlimited! Open your gift: ${link(b.dataset.c)}`; if (navigator.share) navigator.share({ text: t }).catch(() => {}); else Kit.copy(t); });
    };
    box.querySelector('a').onclick = () => { let n = 0; const t = setInterval(() => { loadGifts(); if (++n > 40) clearInterval(t); }, 6000); };
    loadGifts();
  }
  async function giftArrival(code) {
    const r = await api('gift_info', { code });
    if (!r || !r.ok) return modal('Gift', `<p>${esc((r && r.error) || 'Could not check that gift. Check your connection and try again.')}</p>`);
    if (r.status === 'yours' || r.status === 'redeemed') return modal('Gift', `<p>${r.status === 'yours' ? 'You’ve already opened this gift. Enjoy Unlimited!' : 'This gift has already been opened by someone else.'}</p>`);
    if (r.own) return modal('Your gift link', '<p>This is a gift you bought. Send this link to a friend; it unlocks Unlimited for whoever opens it first.</p>');
    const w = modal('You’ve been given a gift', `<div class="giftopen"><div class="seal">∞</div><p>Someone gave you <b>Clade Unlimited</b>: endless practice in every game, difficulty modes and no ads.</p>
      <input type="email" placeholder="Your email (optional, to restore later)" aria-label="Your email"><button class="kit-btn">Open my gift</button><p class="err"></p></div>`);
    const err = w.querySelector('.err');
    w.querySelector('.giftopen .kit-btn').onclick = async () => {
      err.textContent = 'Opening…';
      const x = await api('gift_redeem', { code, email: w.querySelector('input').value });
      if (x && x.ok) { err.textContent = ''; closeAll(); sfx('win'); CLADE.grantUnlock('Your gift is open: Unlimited is on. Enjoy!'); }
      else err.textContent = (x && x.error) || 'Could not open the gift.';
    };
  }

  /* ---------------- Your year in the field ---------------- */
  function wrapped() {
    const Lg = L('log', {}), now = new Date(), yr = now.getMonth() === 0 ? now.getFullYear() - 1 : now.getFullYear();
    const yearOfPuzzle = n => new Date(Date.UTC(2026, 10, 21) + (n - 1) * 864e5).getUTCFullYear();
    const days = Object.keys(Lg).map(Number).filter(n => yearOfPuzzle(n) === yr);
    const per = {}; let played = 0, solved = 0;
    days.forEach(dn => Object.entries(Lg[dn]).forEach(([g, r]) => { per[g] = (per[g] || 0) + 1; played++; if (r.w) solved++; }));
    const fav = Object.entries(per).sort((a, b) => b[1] - a[1])[0];
    const cab = Object.keys(L('cabinet', {})).filter(id => byId[id]).length, B = L('badges', {});
    const best = Math.max(0, ...games().map(g => Kit.stats.get(g.id).best || 0));
    const rows = [['Puzzles played', played], ['Puzzles solved', solved], ['Favourite game', fav ? (GAMES[fav[0]] ? GAMES[fav[0]].title : fav[0]) : '—'],
      ['Longest streak', best + (best === 1 ? ' day' : ' days')], ['Species in your cabinet', cab], ['Badges', `${Object.keys(B).length}/${BADGES.length}`]];
    const text = `My ${yr} on Clade: ${days.length} days in the field, ${solved}/${played} solved, ${cab} species collected${fav && GAMES[fav[0]] ? ', favourite: ' + GAMES[fav[0]].title : ''}.\n${siteUrl()}`;
    const w = modal(`Your ${yr} in the field`, `<div class="wrapped"><div class="wrapbig"><b>${days.length}</b><span>${days.length === 1 ? 'day in the field' : 'days in the field'}</span></div>
      <div class="wraprows">${rows.map(([k, v]) => `<div><span>${esc(k)}</span><b>${esc(String(v))}</b></div>`).join('')}</div>
      ${played ? '' : '<p class="kit-muted">Play a few dailies and your year fills in here.</p>'}
      <div class="btns"><button class="kit-btn" data-x="img">Share image</button><button class="kit-btn alt" data-x="txt">Copy text</button></div></div>`);
    w.querySelector('[data-x=img]').onclick = () => shareImage({ kicker: `${yr} in review`, title: 'My year in the field', big: `${days.length} days`, rows, file: `clade-${yr}.png`, text });
    w.querySelector('[data-x=txt]').onclick = () => Kit.copy(text);
  }

  /* ---------------- Reset progress ---------------- */
  const KEEP = ['clade:player_id', 'clade:unlimited', 'clade:theme', 'clade:lbname', 'clade:mute', 'clade:level:'];
  function resetProgress() {
    const w = modal('Reset progress?', `<p>This clears your stats, streaks, today’s games, your tree of life, specimen cabinet and badges on this device. Your Unlimited purchase, leaderboard name and past leaderboard results are kept.</p>
      <div class="btns"><button class="kit-btn danger" data-x="yes">Yes, reset everything</button><button class="kit-btn alt" data-x="no">Cancel</button></div>`);
    w.querySelector('[data-x=no]').onclick = closeAll;
    w.querySelector('[data-x=yes]').onclick = () => {
      const ks = []; for (let i = 0; i < localStorage.length; i++) { const k = localStorage.key(i); if (k && k.startsWith('clade:') && !KEEP.some(p => p.endsWith(':') ? k.startsWith(p) : k === p) && !k.startsWith('clade:seen:')) ks.push(k); }
      ks.forEach(k => localStorage.removeItem(k)); closeAll(); Kit.toast('Progress reset'); location.hash = ''; route();
    };
  }

  /* ---------------- Decorating screens ---------------- */
  function hubTools() {
    return `<div class="tools">
      <button class="tool" data-x="board"><i>🏆</i>Leaderboard</button>
      <button class="tool" data-x="badges"><i>🏅</i>Badges</button>
      <button class="tool" data-x="cabinet"><i>🦋</i>Cabinet</button>
      <button class="tool" data-x="year"><i>📅</i>Your year</button>
      <a class="tool unlt ${CLADE.isUnlocked() ? 'on' : ''}" href="#unlimited"><i>∞</i>${CLADE.isUnlocked() ? 'Unlimited ✓' : 'Unlimited'}</a></div>`;
  }
  function decorate() {
    const h = location.hash.replace(/^#\/?/, '');
    const tools = document.querySelector('.ck-tools');
    if (tools && !tools.querySelector('.mbtn')) tools.insertBefore(muteBtn(), tools.firstChild);
    const btns = document.querySelector('.ck-btns');
    if (btns && !btns.querySelector('.mbtn')) btns.append(muteBtn());
    if (!h || h === 'home') {
      const grove = document.querySelector('.grove');
      if (grove && !document.querySelector('.tools')) {
        const n = new Date(), season = n.getMonth() === 11 || (n.getMonth() === 0 && n.getDate() <= 10) || /[?&]wrapped=1/.test(location.search);
        if (season) grove.insertAdjacentHTML('beforebegin', `<button class="yearban" data-x="yearban"><span><small>Your year in the field</small><b>Clade ${n.getMonth() === 0 ? n.getFullYear() - 1 : n.getFullYear()} recap</b></span><i>→</i></button>`);
        const yb = document.querySelector('[data-x=yearban]'); if (yb) yb.onclick = wrapped;
        grove.insertAdjacentHTML('afterend', hubTools() + (Kit.canInstall() ? `<p class="kit-homerow">${Kit.installLink()}</p>` : '') + editionCard());
        const T = document.querySelector('.tools');
        T.querySelector('[data-x=board]').onclick = () => showBoard();
        T.querySelector('[data-x=badges]').onclick = showBadges;
        T.querySelector('[data-x=cabinet]').onclick = showCabinet;
        T.querySelector('[data-x=year]').onclick = wrapped;
        const ed = document.querySelector('.edition');
        if (ed) {
          ed.querySelector('[data-x=edtext]').onclick = () => Kit.copy(editionText());
          ed.querySelector('[data-x=edimg]').onclick = () => { const G = games(), done = G.filter(g => logToday()[g.id]).length; shareImage({ kicker: `Daily #${puzzleNo()}`, title: `${done} of ${G.length} solved`, rows: editionRows(), file: `clade-${puzzleNo()}.png`, text: editionText() }); };
        }
      }
      const foot = document.querySelector('.kit-footer');
      if (foot && !foot.querySelector('.resetb')) { foot.insertAdjacentHTML('beforeend', '<p><button class="linkbtn resetb">Reset progress</button></p>'); foot.querySelector('.resetb').onclick = resetProgress; }
    }
    if (h === 'unlimited' || /-practice$/.test(h)) { const pw = document.querySelector('.paywall'); if (pw && !pw.querySelector('.giftbox')) giftBox(pw); }
    beatBanner();
  }
  function decorateResult(d) {
    const box = d.box; if (!box) return;
    const extra = box.querySelector('.rb.extra'); if (!extra || extra.childElementCount) return;
    if (d.mode !== 'daily') {
      if (S.challenge) { challengeVerdict(box); extra.innerHTML = `<button class="alt" data-x="pc">Challenge someone else</button>`; }
      else extra.innerHTML = `<button class="alt" data-x="pc">Challenge a friend</button>`;
      extra.querySelector('[data-x=pc]').onclick = practiceChallenge;
      return;
    }
    const r = logToday()[d.game]; if (!r) return;
    const G = GAMES[d.game];
    extra.innerHTML = `<button class="alt" data-x="img">Share image</button><button class="alt" data-x="beat">Beat me</button><button class="alt" data-x="board">🏆 Leaderboard</button>`;
    extra.querySelector('[data-x=img]').onclick = () => { const s = Kit.stats.get(d.game); shareImage({ kicker: `Daily #${puzzleNo()}`, title: G.title, big: resultLabel({ ...G }, r), rows: [['Result', r.w ? 'Solved' : 'Missed', resultGlyph(G, r)], ['Current streak', s.streak], ['Best streak', s.best], ['Played', s.played]], file: `clade-${d.game}-${puzzleNo()}.png`, text: `Clade ${G.title} #${puzzleNo()} ${resultLabel(G, r)}\n${siteUrl()}` }); };
    extra.querySelector('[data-x=beat]').onclick = () => challenge(d.game);
    extra.querySelector('[data-x=board]').onclick = () => showBoard();
    beatBanner();
  }

  /* ---------------- Arrivals from shared links ---------------- */
  function arrivals() {
    const q = new URLSearchParams(location.search);
    let changed = false;
    if (q.get('beat')) { const b = dec(q.get('beat')); if (b && b.g) SV('beat', b); q.delete('beat'); changed = true; }
    if (q.get('play')) { const c = dec(q.get('play')); if (c && c.g && (c.s != null || c.t)) SV('challenge', c); q.delete('play'); changed = true; }
    const lg = q.get('league'), gf = q.get('gift');
    if (lg) { q.delete('league'); changed = true; }
    if (gf) { q.delete('gift'); changed = true; }
    if (changed) { try { history.replaceState(null, '', location.pathname + (q.toString() ? '?' + q : '') + location.hash); } catch (e) {} }
    if (lg && /^[A-Za-z2-9]{6}$/.test(lg)) setTimeout(() => leagueInvite(lg.toUpperCase()), 600);
    if (gf && /^[A-Za-z2-9]{10}$/.test(gf)) setTimeout(() => giftArrival(gf.toUpperCase()), 600);
  }

  new MutationObserver(() => setTimeout(decorate, 0)).observe(document.getElementById('app'), { childList: true });
  addEventListener('hashchange', () => setTimeout(decorate, 30));
  arrivals();
  setTimeout(decorate, 30);
  flush();
  setTimeout(checkBadges, 1500);
  window.CladeExtras = { showBoard, showBadges, showCabinet, wrapped, resetProgress, shareImage, editionText, challenge, award };
})();
