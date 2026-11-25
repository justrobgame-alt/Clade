/* Clade, stage 2.
   - Themed, harder/easier versions of Silhouette (museum lightbox), Vital Signs (patient monitor) and Habitat (explorer's atlas).
   - New animal games: Odd One Out (specimen jars), Twins (look-alikes), Higher or Lower (balance scale), Size Up (ruler).
   Uses the page's globals (A, byId, PATH, GAMES, RENDER, S, cfg, persist, renderGame…). Called once data is loaded. */
(function () {
  const byPop = list => list.slice().sort((a, b) => (b.pop || 0) - (a.pop || 0));
  const pick = (r, list) => list[Math.floor(r() * list.length)];
  const cap = s => s ? s[0].toUpperCase() + s.slice(1) : s;
  const an = w => /^[aeiou]/i.test(w) ? 'an' : 'a';
  const pic = (a, cls = '') => a.img ? `<img class="${cls}" data-sil="${a.id}" alt="">` : `<span class="${cls} emo">${a.e || '🐾'}</span>`;
  const NAME_FIX = { 'Lacertilia (Sauria)': 'Reptiles & birds (Sauria)' };
  const cladeName = n => NAME_FIX[n] || n;
  const unnamed = n => /^(a branch within|an early animal branch)/.test(n.name);

  // Harder pool = animals that are not daily answers, best known first.
  function harderPool(pool, everyone, n = 900) {
    const inPool = new Set(pool.map(a => a.id));
    const rest = byPop(everyone.filter(a => !inPool.has(a.id) && a.n !== a.sci)).slice(0, n);
    return rest.length >= 60 ? rest : everyone;
  }

  /* ------------------------------------------------------------------ */
  /* Round games with lives (Odd One Out, Twins, Higher or Lower)        */
  /* ------------------------------------------------------------------ */
  const isRight = (S, R, g) => { const G = GAMES[S.game]; return !!R && (G.isRight ? G.isRight(R, g) : g === R.ans); };
  const misses = S => S.guesses.filter((g, i) => !isRight(S, S.puzzle.rounds[i], g)).length;
  const livesRow = (lives, miss) => `<span class="lives" aria-label="${Math.max(0, lives - miss)} of ${lives} lives left">${'🌿'.repeat(Math.max(0, lives - miss))}<span class="lost">${'🍂'.repeat(Math.min(lives, miss))}</span></span>`;
  function roundsGame(def) {
    return Object.assign({
      kind: 'lives', rounded: true, noInput: true,
      scoreN: S => misses(S) + 1,
      share: S => {
        const m = misses(S), line = S.guesses.map((g, i) => isRight(S, S.puzzle.rounds[i], g) ? '🟩' : '🟥').join('');
        return `${S.won ? (m ? `${m} miss${m > 1 ? 'es' : ''}` : 'perfect') : 'out of lives'}\n${line}`;
      },
      result: S => {
        const m = misses(S), right = S.guesses.length - m;
        return { title: S.won ? (m ? def.winTitle || 'Well done!' : 'Perfect run!') : 'Out of lives', big: def.badge,
          line: S.won ? `${right} of ${S.puzzle.rounds.length} right${m ? `, with ${m} miss${m > 1 ? 'es' : ''}` : ''}.` : `You got ${right} right before your last leaf fell. Better luck tomorrow.` };
      },
    }, def);
  }
  function answerRound(val) {
    if (S.done || S.view < S.guesses.length) return;
    const R = S.puzzle.rounds[S.view]; if (!R) return;
    S.guesses.push(val);
    dispatchEvent(new CustomEvent('clade:guess', { detail: { game: S.game, right: isRight(S, R, val) } }));
    const m = misses(S);
    if (m >= S.max) { S.done = true; S.won = false; }
    else if (S.guesses.length >= S.puzzle.rounds.length) { S.done = true; S.won = true; }
    persist(); renderGame(true);
  }
  // Header + "next" button shared by the round games. Returns {i, R, answered}.
  function roundState() {
    if (S.done) S.view = Math.min(S.view, S.guesses.length - 1);
    const i = Math.max(0, S.view), R = S.puzzle.rounds[i];
    return { i, R, answered: S.guesses.length > i, pick: S.guesses[i] };
  }
  const roundHead = (i, total) => `<div class="rhead"><span class="hand">round ${i + 1} of ${total}</span>${livesRow(S.max, misses(S))}</div>`;
  function nextButton(stage) {
    if (S.done || S.view >= S.guesses.length) return;
    stage.insertAdjacentHTML('beforeend', `<div class="btns" style="justify-content:center;margin-top:12px"><button class="kit-btn" id="nextr">Next round →</button></div>`);
    stage.querySelector('#nextr').onclick = () => { S.view++; renderGame(); };
  }

  /* ---------------- Odd One Out: specimen jars ---------------- */
  function oddSetup(seed, C) {
    const r = rng(seed), P = C.pool.filter(a => PATH[a.id]), used = new Set(), rounds = [];
    const k = C.jars - 1;
    const under = (a, node) => PATH[a.id].includes(node);
    for (let tries = 0; rounds.length < C.rounds && tries < 3000; tries++) {
      const a = pick(r, P), path = PATH[a.id];
      const cands = path.filter((n, d) => d >= 3 && d < path.length && !unnamed(n) && (C.latinOk || /\(/.test(n.name)));
      if (!cands.length) continue;
      const X = pick(r, cands), Xi = path.indexOf(X);
      const ins = P.filter(b => !used.has(b.id) && under(b, X));
      if (ins.length < k || ins.length > P.length * .6) continue;
      // outsider: from the nearest branch that holds animals outside X (hard), a named branch further up (normal) or anywhere (easy)
      let outs = [];
      if (C.mode === 'easy') {
        const insiders0 = shuffled(ins, hash(seed + ':' + tries)).slice(0, k), gs = new Set(insiders0.map(b => b.g));
        outs = P.filter(b => !used.has(b.id) && !under(b, X) && !gs.has(b.g));
        if (!outs.length) continue;
        const odd = pick(r, outs);
        rounds.push({ opts: shuffled([...insiders0, odd].map(b => b.id), hash(seed + 'o' + tries)), ans: odd.id, clade: X.name });
        [...insiders0, odd].forEach(b => used.add(b.id)); continue;
      }
      let up = Xi - 1, namedSeen = 0;
      for (; up >= 2; up--) {
        const Y = path[up];
        const o = P.filter(b => !used.has(b.id) && under(b, Y) && !under(b, X));
        if (!o.length) continue;
        if (C.mode === 'hard') { outs = o; break; }
        if (!unnamed(Y)) { outs = o; if (++namedSeen >= 1) break; }
      }
      if (!outs.length) continue;
      const insiders = shuffled(ins, hash(seed + ':' + tries)).slice(0, k), odd = pick(r, outs);
      rounds.push({ opts: shuffled([...insiders, odd].map(b => b.id), hash(seed + 'o' + tries)), ans: odd.id, clade: X.name });
      [...insiders, odd].forEach(b => used.add(b.id));
    }
    return { rounds };
  }
  function sharedNamed(a, b) {
    const p = PATH[a] || [], q = PATH[b] || []; let i = 0;
    while (i < p.length && i < q.length && p[i] === q[i]) i++;
    for (let j = i - 1; j >= 0; j--) if (!unnamed(p[j])) return p[j].name;
    return 'animals';
  }
  function jarSVG(color) {
    return `<svg class="jarsvg" viewBox="0 0 100 120" aria-hidden="true"><rect x="30" y="4" width="40" height="12" rx="3" class="lid"/><path d="M34 16v8C18 28 12 38 12 52v52a10 10 0 0 0 10 10h56a10 10 0 0 0 10-10V52c0-14-6-24-22-28v-8z" class="glass"/><path d="M14 62h72v42a8 8 0 0 1-8 8H22a8 8 0 0 1-8-8z" class="fluid" style="fill:${color}"/><path d="M22 40c-2 8-2 30 0 56" class="shine"/></svg>`;
  }
  RENDER.oddone = function () {
    const { i, R, answered, pick: p } = roundState(), stage = document.getElementById('stage');
    if (!R) { stage.innerHTML = '<p class="intro">Couldn’t build today’s jars. Try practice.</p>'; return; }
    const tints = ['#d9b45a', '#9cc48a', '#8fb7c9', '#c9a0b8', '#c8a77a'];
    stage.innerHTML = `<div class="panel shelfpanel">${roundHead(i, S.puzzle.rounds.length)}
      <p class="q">${answered ? (p === R.ans ? '✅ Right!' : '❌ Not that one.') : `${R.opts.length === 5 ? 'Four' : 'Three'} of these share a branch of the tree of life. <b>Which one doesn’t belong?</b>`}</p>
      <div class="jars n${R.opts.length}">${R.opts.map((id, j) => {
        const a = byId[id], cls = answered ? (id === R.ans ? 'odd' : id === p ? 'wrong' : 'in') : '';
        return `<button class="jar ${cls}" data-id="${id}" ${answered ? 'disabled' : ''}>${jarSVG(tints[(j + i) % tints.length])}<span class="jspec">${pic(a)}</span><span class="label">${esc(a.n)}</span></button>`;
      }).join('')}</div>
      ${answered ? `<div class="explain">The others are all <b>${esc(cladeName(R.clade))}</b>. The <b>${esc(byId[R.ans].n)}</b> only joins them further back, among <b>${esc(cladeName(sharedNamed(R.ans, R.opts.find(x => x !== R.ans))))}</b>.</div>` : ''}
    </div>`;
    stage.querySelectorAll('.jar:not([disabled])').forEach(b => b.onclick = () => answerRound(b.dataset.id));
    nextButton(stage.querySelector('.panel'));
    document.getElementById('rows').innerHTML = '';
  };

  /* ---------------- Twins: look-alikes ---------------- */
  let TWINS = [];
  function twinSetup(seed, C) {
    const r = rng(seed);
    let pairs = TWINS.filter(p => byId[p.a] && byId[p.b] && (!C.silOnly || (byId[p.a].img && byId[p.b].img)));
    if (C.dmin) pairs = pairs.filter(p => p.d >= C.dmin);
    if (C.dmax) pairs = pairs.filter(p => p.d <= C.dmax);
    const rounds = shuffled(pairs, seed).slice(0, C.rounds).map((p, k) => {
      const f = p.f[Math.floor(r() * p.f.length)], ab = r() < .5 ? [p.a, p.b] : [p.b, p.a];
      return { opts: ab, ans: f[1] === 'a' ? p.a : p.b, q: f[0], pair: p };
    });
    return { rounds };
  }
  RENDER.twins = function () {
    const { i, R, answered, pick: p } = roundState(), stage = document.getElementById('stage'), C = cfg('twins', S.level);
    if (!R) { stage.innerHTML = '<p class="intro">Twins needs the full animal data.</p>'; return; }
    const hide = C.silOnly && !answered;
    const other = answered ? R.pair.f.filter(f => f[0] !== R.q).slice(0, 2) : [];
    stage.innerHTML = `<div class="panel twinpanel">${roundHead(i, S.puzzle.rounds.length)}
      <p class="q">${esc(R.q)}</p>
      <div class="mirror">${R.opts.map(id => {
        const a = byId[id], cls = answered ? (id === R.ans ? 'right' : id === p ? 'wrong' : 'dim') : '';
        return `<button class="twin ${cls}" data-id="${id}" ${answered ? 'disabled' : ''}><span class="frame">${pic(a)}</span><span class="label">${hide ? '?' : esc(a.n)}</span></button>`;
      }).join('<span class="vs">or</span>')}</div>
      ${answered ? `<div class="explain">${p === R.ans ? '✅' : '❌'} It’s the <b>${esc(byId[R.ans].n)}</b>.${other.length ? '<div class="more">' + other.map(f => `<div>${esc(f[0])} <b>${esc((f[1] === 'a' ? byId[R.pair.a] : byId[R.pair.b]).n)}</b></div>`).join('') + '</div>' : ''}</div>` : ''}
    </div>`;
    stage.querySelectorAll('.twin:not([disabled])').forEach(b => b.onclick = () => answerRound(b.dataset.id));
    nextButton(stage.querySelector('.panel'));
    document.getElementById('rows').innerHTML = '';
  };

  /* ---------------- Higher or Lower: balance scale ---------------- */
  const STATS = {
    kg: { label: 'Weight', up: 'Heavier', down: 'Lighter', q: (r, l) => `Is the <b>${r}</b> heavier or lighter than the ${l}?`, fmt: v => fmtKg(v) },
    life: { label: 'Longest recorded lifespan', up: 'Longer', down: 'Shorter', q: (r, l) => `Can the <b>${r}</b> live longer or shorter than the ${l}?`, fmt: v => v + ' yrs' },
    gest: { label: 'Pregnancy or egg time', up: 'Longer', down: 'Shorter', q: (r, l) => `Does the <b>${r}</b> take longer or shorter than the ${l} to be born or hatch?`, fmt: v => fmtDays(v) },
    brood: { label: 'Babies per litter or clutch', up: 'More', down: 'Fewer', q: (r, l) => `Does the <b>${r}</b> have more or fewer babies at a time than the ${l}?`, fmt: v => String(+(+v).toFixed(1)) },
  };
  function hlSetup(seed, C) {
    const r = rng(seed), P = shuffled(C.pool, seed), used = new Set();
    const ok = (a, b, s) => a[s] > 0 && b[s] > 0 && Math.max(a[s], b[s]) / Math.min(a[s], b[s]) >= C.ratio;
    let cur = P.find(a => C.stats.some(s => a[s] > 0)); used.add(cur.id);
    const chain = [cur.id], rounds = [];
    for (let k = 0; k < C.rounds; k++) {
      const stats = shuffled(C.stats.filter(s => cur[s] > 0), hash(seed + 's' + k));
      let next = null, st = null;
      for (const s of stats) { next = P.find(b => !used.has(b.id) && ok(cur, b, s)); if (next) { st = s; break; } }
      if (!next) break;
      rounds.push({ l: cur.id, rt: next.id, s: st, ans: next[st] > cur[st] ? 'up' : 'down' });
      used.add(next.id); chain.push(next.id); cur = next;
    }
    return { rounds };
  }
  function scaleSVG(R, answered) {
    const L = byId[R.l], Rr = byId[R.rt], v1 = L[R.s], v2 = Rr[R.s];
    const tilt = answered ? Math.max(-14, Math.min(14, Math.log(v2 / v1) * 6)) : 0; // positive: right side sinks
    return `<svg class="scale" viewBox="0 0 320 150" aria-hidden="true">
      <path d="M160 140V40M118 142h84" class="post"/><circle cx="160" cy="38" r="6" class="pivot"/>
      <g class="beam" style="transform:rotate(${tilt}deg);transform-origin:160px 40px"><path d="M40 40H280" class="bar"/>
        <path d="M40 40l-26 52M40 40l26 52M280 40l-26 52M280 40l26 52" class="string"/><path d="M8 92h64a32 10 0 0 1-64 0zM248 92h64a32 10 0 0 1-64 0z" class="pan"/></g></svg>`;
  }
  RENDER.higherlower = function () {
    const { i, R, answered, pick: p } = roundState(), stage = document.getElementById('stage');
    if (!R) { stage.innerHTML = '<p class="intro">Couldn’t build today’s line-up. Try practice.</p>'; return; }
    const st = STATS[R.s], L = byId[R.l], Rt = byId[R.rt];
    stage.innerHTML = `<div class="panel brasspanel">${roundHead(i, S.puzzle.rounds.length)}
      <div class="statpill">${esc(st.label)}</div>
      <div class="scalewrap">${scaleSVG(R, answered)}
        <div class="pans"><div class="panitem">${pic(L)}<b>${esc(L.n)}</b><span class="val">${st.fmt(L[R.s])}</span></div>
        <div class="panitem">${pic(Rt)}<b>${esc(Rt.n)}</b><span class="val ${answered ? (p === R.ans ? 'ok' : 'bad') : ''}">${answered ? st.fmt(Rt[R.s]) : '?'}</span></div></div></div>
      <p class="q">${st.q(esc(Rt.n), esc(L.n))}</p>
      ${answered ? `<div class="explain">${p === R.ans ? '✅ Right' : '❌ Wrong'}: ${esc(Rt.n)} ${st.fmt(Rt[R.s])} vs ${esc(L.n)} ${st.fmt(L[R.s])}.</div>`
        : `<div class="hlbtns"><button class="kit-btn" data-v="up">▲ ${st.up}</button><button class="kit-btn" data-v="down">▼ ${st.down}</button></div>`}
    </div>`;
    stage.querySelectorAll('[data-v]').forEach(b => b.onclick = () => answerRound(b.dataset.v));
    nextButton(stage.querySelector('.panel'));
    document.getElementById('rows').innerHTML = '';
  };

  /* ---------------- Size Up: ruler ---------------- */
  function sizeSetup(seed, C) {
    const P = shuffled(C.pool.filter(a => a.kg > 0), seed), chosen = [];
    for (const a of P) { if (chosen.every(b => Math.max(a.kg, b.kg) / Math.min(a.kg, b.kg) >= C.ratio)) chosen.push(a); if (chosen.length >= C.n) break; }
    const sorted = chosen.slice().sort((a, b) => a.kg - b.kg).map(a => a.id);
    let start = shuffled(sorted, seed + 7);
    if (start.every((id, k) => id === sorted[k])) start = start.slice().reverse();
    return { sorted, start };
  }
  function rulerSVG(ids) {
    const W = 340, as = ids.map(id => byId[id]), lo = Math.log10(Math.min(...as.map(a => a.kg))) - .3, hi = Math.log10(Math.max(...as.map(a => a.kg))) + .3;
    const X = kg => 14 + (Math.log10(kg) - lo) / (hi - lo) * (W - 28);
    let ticks = '';
    for (let e = Math.ceil(lo); e <= Math.floor(hi); e++) { const x = X(10 ** e); ticks += `<path d="M${x.toFixed(1)} 40v14" class="tk"/><text x="${x.toFixed(1)}" y="68" class="tl">${fmtKg(10 ** e)}</text>`; for (let m = 2; m < 10; m++) { const v = m * 10 ** e; if (Math.log10(v) < hi) ticks += `<path d="M${X(v).toFixed(1)} 40v${m === 5 ? 9 : 5}" class="tk sm"/>`; } }
    const marks = as.map((a, k) => { const x = X(a.kg), up = k % 2 === 0; return `<path d="M${x.toFixed(1)} 40V${up ? 26 : 84}" class="mk"/><circle cx="${x.toFixed(1)}" cy="40" r="3.5" class="dot"/><text x="${x.toFixed(1)}" y="${up ? 20 : 96}" class="ml">${esc(a.n.length > 16 ? a.n.slice(0, 15) + '…' : a.n)}</text>`; }).join('');
    return `<svg class="ruler" viewBox="0 0 ${W} 104" role="img" aria-label="The animals on a weight scale"><rect x="4" y="34" width="${W - 8}" height="40" rx="4" class="wood"/>${ticks}${marks}</svg>`;
  }
  RENDER.sizeup = function () {
    const C = cfg('sizeup', S.level), P = S.puzzle, stage = document.getElementById('stage');
    if (!P.sorted.length) { stage.innerHTML = '<p class="intro">Couldn’t build today’s line-up.</p>'; return; }
    if (!S.cur || S.cur.length !== P.sorted.length) S.cur = P.start.slice();
    const last = S.guesses[S.guesses.length - 1];
    const cur = S.done ? P.sorted : S.cur;
    const mark = (id, k) => S.done ? 'ok' : last ? (last[k] === P.sorted[k] && id === last[k] ? 'ok' : '') : '';
    stage.innerHTML = `<div class="panel rulerpanel">
      <div class="rhead"><span class="hand">lightest at the top</span><span class="tries">${S.done ? '' : `try ${S.guesses.length + 1} of ${S.max}`}</span></div>
      <ol class="lineup">${cur.map((id, k) => { const a = byId[id]; return `<li class="${mark(id, k)}"><span class="rk">${k + 1}</span>${pic(a, 'lp')}<span class="nm">${esc(a.n)}${S.done ? `<small>${fmtKg(a.kg)}</small>` : ''}</span>${S.done ? '' : `<span class="mv"><button data-u="${k}" aria-label="Move ${esc(a.n)} up" ${k === 0 ? 'disabled' : ''}>▲</button><button data-d="${k}" aria-label="Move ${esc(a.n)} down" ${k === cur.length - 1 ? 'disabled' : ''}>▼</button></span>`}</li>`; }).join('')}</ol>
      ${S.done ? rulerSVG(P.sorted) : `<div class="btns" style="justify-content:center;margin-top:10px"><button class="kit-btn" id="check">Check order</button></div>`}
      ${S.guesses.length ? `<div class="tryhist">${S.guesses.map(g => g.map((id, k) => id === P.sorted[k] ? '🟩' : '⬜').join('')).join('<br>')}</div>` : ''}
    </div>`;
    const swap = (a, b) => { const c = S.cur.slice(); [c[a], c[b]] = [c[b], c[a]]; S.cur = c; persist(); window.CladeSfx && CladeSfx('tick'); renderGame(); };
    stage.querySelectorAll('[data-u]').forEach(b => b.onclick = () => swap(+b.dataset.u, +b.dataset.u - 1));
    stage.querySelectorAll('[data-d]').forEach(b => b.onclick = () => swap(+b.dataset.d, +b.dataset.d + 1));
    const ck = document.getElementById('check');
    if (ck) ck.onclick = () => {
      const g = S.cur.slice(); S.guesses.push(g);
      const right = g.every((id, k) => id === P.sorted[k]);
      dispatchEvent(new CustomEvent('clade:guess', { detail: { game: 'sizeup', right } }));
      if (right) { S.done = true; S.won = true; } else if (S.guesses.length >= S.max) { S.done = true; S.won = false; }
      persist(); renderGame(true);
    };
    document.getElementById('rows').innerHTML = '';
  };

  /* ------------------------------------------------------------------ */
  /* Themed versions of the first games                                  */
  /* ------------------------------------------------------------------ */
  RENDER.silhouette = function (T, G) {
    const C = cfg('silhouette', S.level), max = S.max ?? G.max, n = S.guesses.length;
    const k = S.done ? 6 : Math.min(5, Math.floor(n * 6 / max));
    const blur = [16, 11, 7, 4, 2, 0.5, 0][k], scale = [3.1, 2.5, 2, 1.6, 1.25, 1, 1][k];
    const r = rng(hash(T.id + 'sil')), ox = 20 + Math.round(r() * 60), oy = 20 + Math.round(r() * 60);
    const tw = C.twist && !S.done ? [`rotate(90deg)`, `rotate(180deg)`, `rotate(-90deg)`, `scaleX(-1) rotate(180deg)`][hash(T.id + 'tw') % 4] : '';
    const filt = S.done ? 'none' : `brightness(0) blur(${blur}px)`;
    const chips = [];
    if (!C.noClues) {
      if (C.startClue || n >= 2 || S.done) chips.push(`<span class="chip">Group: <b>${esc(T.g)}</b></span>`);
      if (n >= 4 || S.done) chips.push(`<span class="chip">Name starts with <b>${esc(T.n[0])}</b></span>`);
    } else if (S.done) chips.push(`<span class="chip">Group: <b>${esc(T.g)}</b></span>`);
    const picHTML = T.img ? `<img data-sil="${T.id}" alt="">` : T.e;
    const credit = S.done && T.img ? `<div class="sub" style="margin-top:6px">Silhouette: <a href="${esc(T.img.url)}">${esc(T.img.by)}</a>, ${esc(T.img.lic)}</div>` : '';
    const no = String((hash(T.id) % 9000) + 1000);
    document.getElementById('stage').innerHTML = `
      <div class="lightbox"><div class="lbtag"><span>Specimen ${no}</span><span>${S.done ? 'lights on' : 'backlit · ' + (C.twist ? 'turned' : 'zoom ' + scale + '×')}</span></div>
        <div class="silbox"><div class="sil" style="filter:${filt};transform:scale(${S.done ? 1 : scale}) ${tw};transform-origin:${ox}% ${oy}%">${picHTML}</div></div>
        <div class="cluechips">${chips.join('') || `<span class="chip">${C.noClues ? 'No clues on Hard' : 'Clues unlock after guesses 2 and 4'}</span>`}</div>${credit}</div>`;
    document.getElementById('rows').innerHTML = S.guesses.slice().reverse().map(id => {
      const a = byId[id], ok = id === S.target, c = ok ? null : kin(id);
      return `<div class="row"><div class="khead"><div class="nm"><span class="em">${ok ? '✅' : '❌'}</span>${esc(a.n)}</div>${ok || !c ? '' : `<div class="sub">${kinTemp(c)} ${esc(c.apart)}</div>`}</div></div>`;
    }).join('');
  };

  function ecg() {
    let d = 'M0 30', x = 0;
    while (x < 640) { d += ` L${x + 30} 30 L${x + 36} 26 L${x + 42} 30 L${x + 50} 30 L${x + 54} 36 L${x + 58} 6 L${x + 62} 44 L${x + 66} 30 L${x + 78} 30 L${x + 88} 24 L${x + 98} 30 L${x + 160} 30`; x += 160; }
    return `<svg class="ecg" viewBox="0 0 320 50" preserveAspectRatio="none" aria-hidden="true"><path d="${d}" class="trace"/></svg>`;
  }
  RENDER.vitals = function (T, G) {
    const C = cfg('vitals', S.level), open = C.open || 2, n = S.done ? 99 : S.guesses.length;
    const clues = VITALS.clues.map(([k, get], i) => ({ k, v: get(T), show: i < open + n, at: i - open + 1 }));
    const bpm = 60 + (hash(T.id) % 60);
    document.getElementById('stage').innerHTML = `<div class="monitor"><div class="montop"><span class="rec">● LIVE</span><span>PATIENT: ${S.done ? esc(T.n.toUpperCase()) : 'UNKNOWN'}</span><span>${bpm} ♥</span></div>${ecg()}
      <div class="clues">${clues.map((c, i) => `<div class="clue ${c.show ? 'on' : 'lock'}" ${i === 0 ? 'style="grid-column:span 2"' : ''}><div class="k">${c.k}</div><div class="v">${c.show ? esc(c.v) : '— — after guess ' + c.at}</div></div>`).join('')}</div>
      <div class="legend"><span><i style="background:#bfe3c8"></i>within 25%</span><span><i style="background:#f6dca6"></i>within 2×</span><span>⬆️⬇️ answer is higher / lower</span></div></div>`;
    const R0 = RENDER._vitalsRows; R0(T);
  };

  function atlasSVG(target, others, fog) {
    const W = 360, H = LAT_TOP - LAT_BOT + 4, tset = rangeSet(target), oset = new Set();
    others.forEach(o => rangeSet(o).forEach(i => oset.add(i)));
    let s = `<svg class="map atlas" viewBox="0 0 ${W} ${H}" xmlns="http://www.w3.org/2000/svg">`;
    for (let lon = -150; lon <= 150; lon += 30) s += `<path d="M${X(lon)} 0V${H}" class="grat"/>`;
    for (let lat = -60; lat <= 60; lat += 30) s += `<path d="M0 ${Y(lat)}H${W}" class="grat"/>`;
    DOTS.forEach((d, i) => {
      const t = tset.has(i) && (!fog || fog(i)), o = oset.has(i);
      if (!d.land && !t && !o) return;
      const c = t ? (o ? 'b' : 't') : o ? 'o' : 'l';
      s += `<circle cx="${X(d.lon)}" cy="${Y(d.lat)}" r="${c === 'l' ? .95 : 1.25}" class="${c}"/>`;
    });
    if (!fog) s += smallMarkers(target, '#2f6b4f', false);
    others.forEach(o => { s += smallMarkers(o, '#c0632a', true); });
    s += `<g class="rose" transform="translate(${W - 26} ${H - 26})"><circle r="15"/><path d="M0-17L4 0 0 17-4 0z"/><path d="M-17 0L0 3 17 0 0-3z" opacity=".55"/><text y="-19">N</text></g>`;
    return s + '</svg>';
  }
  RENDER.habitat = function (T, G) {
    const C = cfg('habitat', S.level), n = S.done ? 99 : S.guesses.length;
    const wrong = S.guesses.filter(id => id !== S.target).map(id => byId[id]);
    const frac = Math.min(1, .3 + .14 * n), fog = C.fog && !S.done ? (i => (hash(T.id + ':' + i) % 1000) / 1000 < frac) : null;
    const open = C.startClue ? 1 : 0;
    document.getElementById('stage').innerHTML = `<div class="atlaspanel"><div class="cartouche">${S.done ? esc(T.n) : 'Terra incognita'}${fog ? ` <small>${Math.round(frac * 100)}% charted</small>` : ''}</div>${atlasSVG(T, S.done ? [] : wrong, fog)}
      <div class="legend" style="margin:8px 4px 2px"><span><i style="background:#2f6b4f"></i>mystery animal</span><span><i style="background:#c0632a"></i>your guesses</span><span><i style="background:#7a5bb5"></i>overlap</span></div>
      <div class="cluechips">${HAB_CLUES.map(([k, get], i) => `<span class="chip">${k}: <b>${n + open > i ? esc(get(T)) : '🔒'}</b></span>`).join('')}</div></div>`;
    document.getElementById('rows').innerHTML = S.guesses.slice().reverse().map(id => {
      const a = byId[id], ok = id === S.target, ov = Math.round(overlap(a, T) * 100);
      return `<div class="row"><div class="khead"><div class="nm"><span class="em">${ok ? '✅' : em(a)}</span>${esc(a.n)}</div><div class="ovl" style="color:${ok ? 'var(--good)' : ov >= 40 ? '#7a5bb5' : ov > 0 ? '#c0632a' : 'var(--muted)'}">${ok ? 'Match!' : ov + '% range overlap'}</div></div></div>`;
    }).join('');
  };

  /* ------------------------------------------------------------------ */
  /* Registering everything                                              */
  /* ------------------------------------------------------------------ */
  Object.assign(ICONS, {
    oddone: `<svg viewBox="0 0 32 32" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M11 3h10M12.5 3v5C8 9 6 12 6 16v9a3 3 0 0 0 3 3h14a3 3 0 0 0 3-3v-9c0-4-2-7-6.5-8V3"/><path d="M6.5 18h19" opacity=".45"/><circle cx="16" cy="22" r="3" fill="currentColor"/></svg>`,
    twins: `<svg viewBox="0 0 32 32" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 6C8 8 5 14 6 25c5-1 8-6 8-19z"/><path d="M18 6c6 2 9 8 8 19-5-1-8-6-8-19z" stroke-dasharray="2.6 2.4"/><path d="M16 2v28" opacity=".35"/></svg>`,
    higherlower: `<svg viewBox="0 0 32 32" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M16 6v21M10 28h12"/><path d="M5 12l22-4"/><path d="M5 12l-3 7h6zM27 8l-3 7h6z"/><circle cx="16" cy="6" r="1.7" fill="currentColor"/></svg>`,
    sizeup: `<svg viewBox="0 0 32 32" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="2.5" y="11" width="27" height="10" rx="1.5"/><path d="M7 11v4M11 11v2.5M15 11v4M19 11v2.5M23 11v4"/></svg>`,
  });
  Object.assign(LATIN, { oddone: 'Intrusus', twins: 'Gemini similes', higherlower: 'Libra naturae', sizeup: 'Mensura animalium' });

  window.extendGames = async function () {
    const G = GAMES, gen = MODE === 'generated';
    // --- levels for the first games ---
    if (G.silhouette) {
      const every = A.filter(a => gen ? a.img : a.e);
      G.silhouette.levels = { easy: { pool: byPop(G.silhouette.pool).slice(0, 120), max: 8, startClue: true, note: 'Easy: famous animals, 8 guesses, and you know its group from the start.' },
        normal: {}, hard: { pool: harderPool(G.silhouette.pool, every), twist: true, noClues: true, note: 'Hard: lesser-known animals, and the shadow is flipped or turned on its side. No clues.' } };
      G.silhouette.blurb = 'A shadow on the lightbox, zoomed in and blurred. Every wrong guess pulls back and sharpens it.';
    }
    if (G.vitals) {
      G.vitals.levels = { easy: { pool: byPop(G.vitals.pool).slice(0, 120), max: 8, open: 3, note: 'Easy: famous animals, 8 guesses and three readings to start.' },
        normal: {}, hard: { pool: harderPool(G.vitals.pool, G.vitals.guessable), open: 1, note: 'Hard: lesser-known animals and only one reading to start.' } };
    }
    if (G.habitat) {
      G.habitat.levels = { easy: { pool: byPop(G.habitat.pool).slice(0, 120), max: 8, startClue: true, note: 'Easy: famous animals, 8 guesses and its group from the start.' },
        normal: {}, hard: { fog: true, note: 'Hard: fog of war. Only part of the range is charted, and each guess reveals more.' } };
    }
    // --- new animal games ---
    const kinPool = A.filter(a => PATH[a.id] && (gen ? a.img : a.e));
    if (kinPool.length >= 40) {
      const P = byPop(kinPool);
      G.oddone = roundsGame({ title: 'Odd One Out', icon: '🫙', color: 'var(--odd)', max: 3, badge: '🫙', winTitle: 'Sharp eye!',
        blurb: 'Specimen jars on a shelf. All but one share a branch of the tree of life. Spot the one that doesn’t belong.',
        pool: P.slice(0, 500), guessable: [], setup: oddSetup,
        levels: { easy: { pool: P.slice(0, 220), rounds: 5, jars: 4, mode: 'easy', note: 'Easy: famous animals, and the odd one is from a different group altogether.' },
          normal: { rounds: 6, jars: 4, mode: 'normal' },
          hard: { pool: P.slice(0, 1500), rounds: 7, jars: 5, mode: 'hard', latinOk: true, note: 'Hard: five jars, and the odd one out is a close relative.' } } });
      G.oddone.levels.normal.pool = G.oddone.pool;
    }
    if (gen) {
      try { TWINS = await fetch('data/twins.json').then(r => r.ok ? r.json() : []); } catch (e) { TWINS = []; }
      if (TWINS.length >= 20) {
        G.twins = roundsGame({ title: 'Twins', icon: '👯', color: 'var(--twn)', max: 2, badge: '🪞', winTitle: 'Good eye!',
          blurb: 'Two look-alikes, one question. Can you tell the alligator from the crocodile, the stoat from the weasel?',
          pool: [], guessable: [], setup: twinSetup,
          levels: { easy: { rounds: 5, dmax: 2, max: 3, note: 'Easy: the easier pairs, and three lives.' },
            normal: { rounds: 6 },
            hard: { rounds: 7, dmin: 2, silOnly: true, note: 'Hard: no names, just the two silhouettes. Which shadow is which?' } } });
      }
    }
    const statPool = (keys, n) => byPop(A.filter(a => keys.every(k => a[k] > 0) && (!gen || a.img))).slice(0, n);
    const hlNormal = statPool(['kg', 'life'], 450);
    if (hlNormal.length >= 40) {
      G.higherlower = roundsGame({ title: 'Higher or Lower', icon: '⚖️', color: 'var(--hl)', max: 3, badge: '⚖️', winTitle: 'Well balanced!',
        blurb: 'One animal on each pan of the scale. Is the next one heavier or lighter, longer-lived or shorter-lived?',
        pool: hlNormal, guessable: [], setup: hlSetup,
        levels: { easy: { pool: statPool(['kg'], 200), rounds: 8, stats: ['kg'], ratio: 3, note: 'Easy: weight only, and the gaps are big.' },
          normal: { rounds: 10, stats: ['kg', 'life'], ratio: 1.6 },
          hard: { pool: statPool(['kg', 'life'], 1400), rounds: 12, stats: ['kg', 'life', 'gest', 'brood'], ratio: 1.2, note: 'Hard: four different measures and close calls.' } } });
      G.higherlower.levels.normal.pool = hlNormal;
    }
    const szPool = statPool(['kg'], 450);
    if (szPool.length >= 30) {
      G.sizeup = { title: 'Size Up', icon: '📏', color: 'var(--siz)', max: 4, noInput: true,
        blurb: 'Line up the animals from lightest to heaviest. Green marks show which spots you’ve got right.',
        pool: szPool, guessable: [], setup: sizeSetup,
        share: S => `${S.won ? S.guesses.length + '/' + S.max : 'X/' + S.max}\n` + S.guesses.map(g => g.map((id, k) => id === S.puzzle.sorted[k] ? '🟩' : '⬜').join('')).join('\n'),
        result: S => ({ title: S.won ? 'Perfect line-up!' : 'Not quite', big: '📏', line: S.won ? `Sorted in ${S.guesses.length} of ${S.max} tries.` : 'The right order is on the ruler above.' }),
        levels: { easy: { pool: statPool(['kg'], 200), max: 5, n: 5, ratio: 2.5, note: 'Easy: five famous animals with big size gaps, and five tries.' },
          normal: { n: 6, ratio: 1.6 },
          hard: { pool: statPool(['kg'], 1400), max: 3, n: 7, ratio: 1.25, note: 'Hard: seven animals, close weights and only three tries.' } } };
    }
  };

  window.CladeRounds = { roundsGame, answerRound, roundState, roundHead, nextButton, livesRow, misses, isRight, pic, byPop, harderPool, atlasSVG };

  // Vital Signs comparison rows, unchanged from the original game.
  RENDER._vitalsRows = function (T) {
    document.getElementById('rows').innerHTML = S.guesses.slice().reverse().map(id => {
      const a = byId[id], ok = id === S.target;
      const cells = VITALS.stats.map(st => {
        const g = a[st.k], t = T[st.k];
        if (g == null || t == null) return `<div class="vc c-bad"><small>${st.label}</small>${g == null ? '?' : st.fmt(g)}</div>`;
        const ratio = Math.max(g, t) / Math.min(g, t), cls = ratio <= 1.25 ? 'c-good' : ratio <= 2 ? 'c-warm' : 'c-bad', arrow = ratio <= 1.25 ? '✓' : (t > g ? '⬆️' : '⬇️');
        return `<div class="vc ${cls}"><small>${st.label}</small>${st.fmt(g)} ${arrow}</div>`;
      }).join('');
      return `<div class="row"><div class="khead"><div class="nm"><span class="em">${ok ? '✅' : em(a)}</span>${esc(a.n)}</div><div class="sub">${a.g === T.g ? '✓ same group' : esc(a.g)}</div></div><div class="vgrid">${cells}</div></div>`;
    }).join('');
  };
})();
