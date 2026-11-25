/* Clade, stage 3: plant games.
   Plant Families (herbarium, Connections-style), Plant Habitat (botanist's atlas), Origins (trade-route map),
   Leaf Shadow (sun-dappled shadow). Plants live in byId (ids start with "p") but not in A, so animal games are unaffected. */
(function () {
  const R0 = () => window.CladeRounds;
  let PLANTS = [], ORIGINS = [];
  const FAM = {
    Fabaceae: 'Legume family', Rosaceae: 'Rose family', Asteraceae: 'Daisy family', Apiaceae: 'Carrot family', Malvaceae: 'Mallow family',
    Solanaceae: 'Nightshade family', Brassicaceae: 'Cabbage family', Poaceae: 'Grass family', Lamiaceae: 'Mint family', Cucurbitaceae: 'Gourd family',
    Rutaceae: 'Citrus family', Amaryllidaceae: 'Onion & daffodil family', Arecaceae: 'Palm family', Pinaceae: 'Pine family', Cactaceae: 'Cactus family',
    Ericaceae: 'Heather family', Moraceae: 'Fig family', Myrtaceae: 'Myrtle family', Oleaceae: 'Olive family', Asparagaceae: 'Asparagus family',
    Lauraceae: 'Laurel family', Anacardiaceae: 'Cashew family', Amaranthaceae: 'Amaranth family', Rubiaceae: 'Coffee family', Cupressaceae: 'Cypress family',
    Euphorbiaceae: 'Spurge family', Zingiberaceae: 'Ginger family', Polygonaceae: 'Buckwheat family', Fagaceae: 'Beech family', Orchidaceae: 'Orchid family',
    Iridaceae: 'Iris family', Convolvulaceae: 'Morning glory family', Juglandaceae: 'Walnut family', Betulaceae: 'Birch family', Cannabaceae: 'Hemp family',
    Vitaceae: 'Grape family', Bromeliaceae: 'Bromeliad family', Musaceae: 'Banana family', Theaceae: 'Tea family', Papaveraceae: 'Poppy family',
    Sapindaceae: 'Soapberry family', Salicaceae: 'Willow family', Magnoliaceae: 'Magnolia family', Liliaceae: 'Lily family', Ranunculaceae: 'Buttercup family',
    Plantaginaceae: 'Plantain family', Urticaceae: 'Nettle family', Araliaceae: 'Ivy family', Araceae: 'Arum family', Droseraceae: 'Sundew family',
    Proteaceae: 'Protea family', Asphodelaceae: 'Aloe family', Taxaceae: 'Yew family', Nelumbonaceae: 'Lotus family', Nymphaeaceae: 'Water lily family',
    Rhizophoraceae: 'Mangrove family', Araucariaceae: 'Monkey puzzle family', Meliaceae: 'Mahogany family', Santalaceae: 'Sandalwood family',
    Burseraceae: 'Frankincense family', Sapotaceae: 'Sapodilla family', Piperaceae: 'Pepper family', Pedaliaceae: 'Sesame family', Linaceae: 'Flax family',
    Actinidiaceae: 'Kiwifruit family', Caricaceae: 'Papaya family', Passifloraceae: 'Passionflower family', Lythraceae: 'Loosestrife family',
    Dioscoreaceae: 'Yam family', Gesneriaceae: 'African violet family', Crassulaceae: 'Stonecrop family', Aizoaceae: 'Ice plant family', Paeoniaceae: 'Peony family',
    Violaceae: 'Violet family', Primulaceae: 'Primrose family', Boraginaceae: 'Borage family', Rafflesiaceae: 'Rafflesia family', Nyctaginaceae: 'Four o’clock family',
    Equisetaceae: 'Horsetail family', Dennstaedtiaceae: 'Bracken family', Cycadaceae: 'Cycad family', Ginkgoaceae: 'Ginkgo family', Welwitschiaceae: 'Welwitschia family',
    Nepenthaceae: 'Pitcher plant family', Sarraceniaceae: 'Pitcher plant family', Strelitziaceae: 'Bird-of-paradise family', Xanthorrhoeaceae: 'Grass tree family',
  };
  const famName = f => FAM[f] || f;
  const KIND = { crop: 'Crop', tree: 'Tree', flower: 'Flower', herb: 'Herb or spice', wild: 'Wild plant', garden: 'Garden plant' };
  const decCells = str => { const out = []; if (!str) return out; for (const part of str.split(',')) { const [a, b] = part.split('.'); const st = parseInt(a, 36), n = b ? parseInt(b, 36) : 1; for (let i = 0; i < n; i++) out.push(st + i); } return out; };

  /* ---------------- Plant Families: herbarium, Connections-style ---------------- */
  function famSetup(seed, C) {
    const r = rng(seed), byFam = {};
    PLANTS.filter(p => !C.kinds || C.kinds.includes(p.k)).forEach(p => (byFam[p.fam] ||= []).push(p));
    let fams = shuffled(Object.keys(byFam).filter(f => byFam[f].length >= 4 && (!C.famList || C.famList.includes(f))), seed);
    const used = new Set(), groups = [];
    for (const f of fams) {
      // no two plants in a group that share a name word ("Oil palm", "Date palm") — that would give it away
      const members = [], words = new Set(), wordsOf = n => n.toLowerCase().split(/[\s-]+/).filter(w => w.length >= 3);
      for (const p of shuffled(byFam[f], hash(seed + f))) {
        if (used.has(p.n) || wordsOf(p.n).some(w => words.has(w))) continue;
        members.push(p); wordsOf(p.n).forEach(w => words.add(w)); if (members.length === 4) break;
      }
      if (members.length < 4) continue;
      members.forEach(p => used.add(p.n));
      groups.push({ fam: f, ids: members.map(p => p.id) });
      if (groups.length === C.groups) break;
    }
    const tiles = shuffled(groups.flatMap(g => g.ids), seed + 3);
    return { groups, tiles };
  }
  const famOf = (P, id) => P.groups.find(g => g.ids.includes(id));
  function famState(S) {
    const P = S.puzzle, solved = [], wrong = [];
    for (const sel of S.guesses) { const g = famOf(P, sel[0]); if (sel.every(id => famOf(P, id) === g)) solved.push(g); else wrong.push(sel); }
    return { solved, wrong, mistakes: wrong.length };
  }
  RENDER.plantfamilies = function () {
    const P = S.puzzle, C = cfg('plantfamilies', S.level), st = famState(S), stage = document.getElementById('stage');
    S.sel = (S.sel || []).filter(id => !st.solved.some(g => g.ids.includes(id)));
    const left = S.done ? [] : P.tiles.filter(id => !st.solved.some(g => g.ids.includes(id)));
    const shown = S.done ? P.groups : st.solved;
    const label = g => `<div class="hlabel"><div class="hl-l">${esc(g.fam)}</div><div class="hl-e">${esc(famName(g.fam))}</div><div class="hl-m">${g.ids.map(id => esc(byId[id].n)).join(' · ')}</div>${st.solved.includes(g) ? '' : '<span class="stamp">missed</span>'}</div>`;
    stage.innerHTML = `<div class="herbarium">
      <div class="rhead"><span class="hand">find ${P.groups.length} families of 4</span>${R0().livesRow(S.max, st.mistakes)}</div>
      ${C.showFams && !S.done ? `<div class="famhint">This sheet’s families: ${P.groups.map(g => `<b>${esc(famName(g.fam))}</b>`).join(', ')}</div>` : ''}
      <div class="hlabels">${shown.map(label).join('')}</div>
      <div class="sheets">${left.map((id, k) => { const p = byId[id]; return `<button class="sheet ${S.sel.includes(id) ? 'on' : ''}" data-id="${id}" style="--rot:${((hash(id) % 7) - 3) * .5}deg"><span class="tape"></span>${p.img ? `<img data-sil="${id}" alt="">` : ''}<span class="nm">${esc(p.n)}</span></button>`; }).join('')}</div>
      ${S.done ? '' : `<div class="btns" style="justify-content:center;margin-top:12px"><button class="ghost" id="shuf">Shuffle</button><button class="ghost" id="clr" ${S.sel.length ? '' : 'disabled'}>Clear</button><button class="kit-btn" id="sub" ${S.sel.length === 4 ? '' : 'disabled'}>Submit</button></div>`}
    </div>`;
    stage.querySelectorAll('.sheet').forEach(b => b.onclick = () => {
      const id = b.dataset.id;
      if (S.sel.includes(id)) S.sel = S.sel.filter(x => x !== id); else if (S.sel.length < 4) S.sel.push(id);
      window.CladeSfx && CladeSfx('tick'); RENDER.plantfamilies();
    });
    const sh = document.getElementById('shuf'); if (sh) sh.onclick = () => { P.tiles = shuffled(P.tiles, (Math.random() * 1e9) | 0); RENDER.plantfamilies(); };
    const cl = document.getElementById('clr'); if (cl) cl.onclick = () => { S.sel = []; RENDER.plantfamilies(); };
    const sb = document.getElementById('sub');
    if (sb) sb.onclick = () => {
      const sel = S.sel.slice().sort();
      if (S.guesses.some(g => g.slice().sort().join() === sel.join())) { setMsg2('You already tried those four.'); return; }
      S.guesses.push(sel); S.sel = [];
      const after = famState(S), right = after.solved.length > st.solved.length;
      dispatchEvent(new CustomEvent('clade:guess', { detail: { game: 'plantfamilies', right } }));
      if (after.solved.length === P.groups.length) { S.done = true; S.won = true; }
      else if (after.mistakes >= S.max) { S.done = true; S.won = false; }
      persist();
      if (!right && !S.done) { const best = Math.max(...P.groups.map(g => sel.filter(id => g.ids.includes(id)).length)); renderGame(true); setMsg2(best === 3 ? 'One away…' : 'Not one family.'); }
      else renderGame(true);
    };
    document.getElementById('rows').innerHTML = '';
  };
  function setMsg2(t) { const st = document.querySelector('.herbarium .rhead .hand'); if (!st) return; const m = document.createElement('div'); m.className = 'herbmsg'; m.textContent = t; document.querySelector('.herbarium').prepend(m); setTimeout(() => m.remove(), 1800); }

  /* ---------------- Plant Habitat: botanist's atlas ---------------- */
  const PH_CLUES = [['Type', T => KIND[T.k] || 'Plant'], ['Family', T => famName(T.fam)], ['Genus', T => T.sci.split(' ')[0]], ['Letters', T => T.n.replace(/[^A-Za-z]/g, '').length], ['Starts with', T => T.n[0]]];
  RENDER.planthabitat = function (T) {
    const C = cfg('planthabitat', S.level), n = S.done ? 99 : S.guesses.length;
    const wrong = S.guesses.filter(id => id !== S.target).map(id => byId[id]).filter(a => a.cells);
    const frac = Math.min(1, .3 + .14 * n), fog = C.fog && !S.done ? (i => (hash(T.id + ':' + i) % 1000) / 1000 < frac) : null;
    const open = C.startClue ? 1 : 0;
    document.getElementById('stage').innerHTML = `<div class="atlaspanel botan"><div class="cartouche">${S.done ? esc(T.n) : 'Flora incognita'}${fog ? ` <small>${Math.round(frac * 100)}% charted</small>` : ''}</div>${R0().atlasSVG(T, S.done ? [] : wrong, fog)}
      <div class="legend" style="margin:8px 4px 2px"><span><i style="background:#2f6b4f"></i>where it grows wild</span><span><i style="background:#c0632a"></i>your guesses</span><span><i style="background:#7a5bb5"></i>overlap</span></div>
      <div class="cluechips">${PH_CLUES.map(([k, get], i) => `<span class="chip">${k}: <b>${n + open > i ? esc(get(T)) : '🔒'}</b></span>`).join('')}</div></div>`;
    document.getElementById('rows').innerHTML = S.guesses.slice().reverse().map(id => {
      const a = byId[id], ok = id === S.target, ov = a.cells ? Math.round(overlap(a, T) * 100) : null;
      const fam = a.fam === T.fam ? '✓ same family' : famName(a.fam);
      return `<div class="row"><div class="khead"><div class="nm"><span class="em">${ok ? '✅' : em(a)}</span>${esc(a.n)}</div><div class="ovl" style="color:${ok ? 'var(--good)' : ov >= 40 ? '#7a5bb5' : ov > 0 ? '#c0632a' : 'var(--muted)'}">${ok ? 'Match!' : ov == null ? 'no wild map' : ov + '% overlap'}</div></div>${ok ? '' : `<div class="sub" style="margin-top:3px">${esc(fam)}</div>`}</div>`;
    }).join('');
  };

  /* ---------------- Leaf Shadow: a shadow in the sun ---------------- */
  RENDER.leafshadow = function (T, G) {
    const C = cfg('leafshadow', S.level), max = S.max ?? G.max, n = S.guesses.length;
    const k = S.done ? 6 : Math.min(5, Math.floor(n * 6 / max));
    const blur = [14, 10, 6, 3.5, 2, .5, 0][k], scale = [2.8, 2.3, 1.9, 1.5, 1.2, 1, 1][k];
    const r = rng(hash(T.id + 'leaf')), ox = 25 + Math.round(r() * 50), oy = 25 + Math.round(r() * 50);
    const tw = C.twist && !S.done ? ['rotate(90deg)', 'rotate(180deg)', 'rotate(-90deg)', 'scaleX(-1) rotate(180deg)'][hash(T.id + 'tw') % 4] : '';
    const chips = [];
    if (!C.noClues || S.done) {
      if (C.startClue || n >= 2 || S.done) chips.push(`<span class="chip">Type: <b>${esc(KIND[T.k] || 'Plant')}</b></span>`);
      if (n >= 4 || S.done) chips.push(`<span class="chip">Family: <b>${esc(famName(T.fam))}</b></span>`);
    }
    const credit = S.done && T.img ? `<div class="sub" style="margin-top:6px">Silhouette: <a href="${esc(T.img.url)}">${esc(T.img.by)}</a>, ${esc(T.img.lic)}</div>` : '';
    document.getElementById('stage').innerHTML = `<div class="sunwall"><div class="leaves" aria-hidden="true"></div>
      <div class="silbox"><div class="sil" style="filter:${S.done ? 'none' : `brightness(0) blur(${blur}px) opacity(.82)`};transform:scale(${S.done ? 1 : scale}) ${tw};transform-origin:${ox}% ${oy}%"><img data-sil="${T.id}" alt=""></div></div>
      <div class="cluechips">${chips.join('') || `<span class="chip">${C.noClues ? 'No clues on Hard' : 'Clues unlock after guesses 2 and 4'}</span>`}</div>${credit}</div>`;
    document.getElementById('rows').innerHTML = S.guesses.slice().reverse().map(id => {
      const a = byId[id], ok = id === S.target;
      return `<div class="row"><div class="khead"><div class="nm"><span class="em">${ok ? '✅' : '❌'}</span>${esc(a.n)}</div>${ok ? '' : `<div class="sub">${a.fam === T.fam ? '🌿 same family' : esc(famName(a.fam))}</div>`}</div></div>`;
    }).join('');
  };

  /* ---------------- Origins: where was it first farmed? ---------------- */
  const km = (a, b, c, d) => { const R = 6371, t = Math.PI / 180, x = Math.sin((c - a) * t / 2) ** 2 + Math.cos(a * t) * Math.cos(c * t) * Math.sin((d - b) * t / 2) ** 2; return 2 * R * Math.asin(Math.sqrt(x)); };
  function oriSetup(seed, C) {
    return { rounds: shuffled(ORIGINS, seed).slice(0, C.rounds).map(o => ({ ...o, ans: 'x', radius: C.radius })) };
  }
  const tapOf = g => { const [lat, lon] = String(g).split(',').map(Number); return { lat, lon }; };
  function routeMap(R, tap) {
    const W = 360, H = LAT_TOP - LAT_BOT + 4;
    let s = `<svg class="map routes" viewBox="0 0 ${W} ${H}" xmlns="http://www.w3.org/2000/svg">`;
    // portolan-style rhumb lines from two compass points
    for (const [cx, cy] of [[110, H * .42], [262, H * .5]]) for (let a = 0; a < 16; a++) { const t = a * Math.PI / 8; s += `<path d="M${cx} ${cy}L${(cx + Math.cos(t) * 420).toFixed(0)} ${(cy + Math.sin(t) * 420).toFixed(0)}" class="rhumb"/>`; }
    DOTS.forEach(d => { if (d.land) s += `<circle cx="${X(d.lon)}" cy="${Y(d.lat)}" r=".95" class="l"/>`; });
    if (tap) {
      const x1 = X(tap.lon), y1 = Y(tap.lat);
      s += `<g class="pin"><path d="M${x1} ${y1}l-3.2-7a3.6 3.6 0 1 1 6.4 0z"/><circle cx="${x1}" cy="${y1 - 8.4}" r="1.3" fill="#fff"/></g>`;
      if (R.done) {
        const x2 = X(R.lon), y2 = Y(R.lat), mx = (x1 + x2) / 2, my = Math.min(y1, y2) - Math.max(10, Math.abs(x2 - x1) * .25);
        s += `<path d="M${x1} ${y1}Q${mx} ${my} ${x2} ${y2}" class="route"/>`;
        s += `<circle cx="${x2}" cy="${y2}" r="${(R.radius / 111).toFixed(1)}" class="zone"/><g class="star" transform="translate(${x2} ${y2})"><path d="M0-5l1.5 3.4 3.7.4-2.8 2.5.8 3.6L0 3 -3.2 4.9l.8-3.6-2.8-2.5 3.7-.4z"/></g>`;
      }
    }
    return s + '</svg>';
  }
  RENDER.origins = function () {
    const { i, R, answered, pick: p } = R0().roundState(), stage = document.getElementById('stage'), C = cfg('origins', S.level);
    if (!R) { stage.innerHTML = '<p class="intro">Couldn’t load the crops.</p>'; return; }
    const plant = byId[R.id] || {}, tap = answered ? tapOf(p) : S._tap;
    const dist = answered ? Math.round(km(tap.lat, tap.lon, R.lat, R.lon)) : null, ok = answered && dist <= R.radius;
    stage.innerHTML = `<div class="tradepanel">${R0().roundHead(i, S.puzzle.rounds.length)}
      <div class="cropcard">${plant.img ? `<img data-sil="${plant.id}" alt="">` : '<span class="seed">🌱</span>'}<div><div class="hand">where was it first farmed?</div><b>${esc(R.n)}</b>${C.showCont && !answered ? `<div class="sub">Hint: ${esc(R.cont)}</div>` : ''}</div></div>
      <div class="routewrap">${routeMap({ ...R, done: answered }, tap)}</div>
      ${answered ? `<div class="explain">${ok ? '✅' : '❌'} ${dist.toLocaleString('en-US')} km away. ${esc(R.n)} was first farmed in <b>${esc(R.region)}</b>${R.ago ? ', about ' + esc(R.ago.replace(/^about /, '')) : ''}.<div class="more">${esc(R.fact)}</div></div>`
        : `<div class="btns" style="justify-content:center;margin-top:10px"><button class="kit-btn" id="lock" ${S._tap ? '' : 'disabled'}>${S._tap ? 'Lock in this spot' : 'Tap the map'}</button></div><p class="sub" style="text-align:center">Within ${R.radius.toLocaleString('en-US')} km counts as right.</p>`}
    </div>`;
    const svg = stage.querySelector('svg.routes');
    if (!answered) svg.onclick = e => {
      const pt = svg.createSVGPoint(); pt.x = e.clientX; pt.y = e.clientY;
      const q = pt.matrixTransform(svg.getScreenCTM().inverse());
      S._tap = { lat: Math.max(-60, Math.min(80, LAT_TOP + 2 - q.y)), lon: Math.max(-180, Math.min(180, q.x - 180)) };
      window.CladeSfx && CladeSfx('tick'); RENDER.origins();
    };
    const lk = document.getElementById('lock');
    if (lk) lk.onclick = () => { const t = S._tap; S._tap = null; R0().answerRound(t.lat.toFixed(1) + ',' + t.lon.toFixed(1)); };
    R0().nextButton(stage.querySelector('.tradepanel'));
    document.getElementById('rows').innerHTML = '';
  };

  /* ---------------- Credits for the plant data ---------------- */
  const _credits = renderCredits;
  renderCredits = async function () {
    await _credits.apply(this, arguments);
    if (!PLANTS.length) return;
    const sil = PLANTS.filter(p => p.img).sort((a, b) => a.n.localeCompare(b.n));
    app.insertAdjacentHTML('beforeend', `<div class="panel"><h3 style="font-size:18px;margin-bottom:8px">Plant games</h3>
      <p style="margin:0 0 10px;font-size:14px;line-height:1.45"><a href="https://www.gbif.org/dataset/d7dddbf4-2cf0-4f39-9b2a-bb099caae36c">GBIF Backbone Taxonomy</a><br><span class="sub">Plant names and botanical families · CC BY 4.0</span></p>
      <p style="margin:0 0 10px;font-size:14px;line-height:1.45"><a href="https://www.gbif.org/dataset/50c9509d-22c7-4a22-a47d-8c48425ef4a7">iNaturalist research-grade observations</a>, via GBIF<br><span class="sub">Where plants grow wild (records licensed CC0 or CC BY only; planted and cultivated plants excluded)</span></p>
      <p style="margin:0 0 10px;font-size:14px;line-height:1.45">Crop origins<br><span class="sub">Compiled by Clade from published archaeology and genetics research. Origins are approximate regions.</span></p>
      <h3 style="font-size:16px;margin:12px 0 6px">Plant silhouettes (PhyloPic)</h3>
      ${sil.map(p => `<div class="sub" style="margin-bottom:4px">${esc(p.n)}: <a href="${esc(p.img.url)}">${esc(p.img.by)}</a>, ${esc(p.img.lic)}</div>`).join('')}</div>`);
  };

  /* ---------------- Registering ---------------- */
  Object.assign(ICONS, {
    plantfamilies: `<svg viewBox="0 0 32 32" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="5" y="3" width="22" height="26" rx="1.5"/><path d="M16 24V10M16 15c-3 0-5-2-5-5 3 0 5 2 5 5zM16 19c3 0 5-2 5-5-3 0-5 2-5 5z"/><path d="M9 3v3M23 3v3" opacity=".5"/></svg>`,
    planthabitat: `<svg viewBox="0 0 32 32" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="16" cy="16" r="12"/><path d="M4 16h24M16 4c4 4 4 20 0 24M16 4c-4 4-4 20 0 24" opacity=".45"/><path d="M19 21c0-5 2-8 6-9-1 4-3 7-6 9z" fill="currentColor"/></svg>`,
    origins: `<svg viewBox="0 0 32 32" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 24c6-14 18-14 24-6" stroke-dasharray="3 2.5"/><circle cx="4" cy="24" r="2.2" fill="currentColor"/><path d="M26 10v8M26 12c-2 0-3-1-3-3 2 0 3 1 3 3zM26 15c2 0 3-1 3-3-2 0-3 1-3 3z"/></svg>`,
    leafshadow: `<svg viewBox="0 0 32 32" fill="currentColor"><path d="M6 26C6 13 14 6 27 5c0 13-7 21-21 21z" opacity=".9"/><path d="M7 25L22 10" stroke="var(--card,#fff)" stroke-width="1.6" fill="none"/><circle cx="16" cy="16" r="14" fill="none" stroke="currentColor" stroke-width="1.6" stroke-dasharray="2 3"/></svg>`,
  });
  Object.assign(LATIN, { plantfamilies: 'Herbarium', planthabitat: 'Flora mundi', origins: 'Origines cultae', leafshadow: 'Umbra folii' });

  const previous = window.extendGames;
  window.extendGames = async function () {
    if (previous) await previous();
    if (MODE !== 'generated') return;
    const get = f => fetch('data/' + f).then(r => r.ok ? r.json() : null).catch(() => null);
    const [pl, or] = await Promise.all([get('plants.json'), get('origins.json')]);
    if (!pl) return;
    PLANTS = pl.plants.map(p => Object.assign(p, { g: famName(p.fam), cells: p.cells ? decCells(p.cells) : undefined }));
    PLANTS.forEach(p => { byId[p.id] = p; });
    ORIGINS = (or || []).filter(o => true);
    const G = GAMES, RG = R0().roundsGame, byPop = list => list.slice().sort((a, b) => (b.wp ? 1 : 0) - (a.wp ? 1 : 0));
    const COMMON = ['Rosaceae', 'Solanaceae', 'Brassicaceae', 'Apiaceae', 'Fabaceae', 'Cucurbitaceae', 'Poaceae', 'Asteraceae', 'Lamiaceae', 'Rutaceae', 'Amaryllidaceae', 'Arecaceae', 'Pinaceae', 'Cactaceae', 'Lauraceae', 'Zingiberaceae'];
    G.plantfamilies = { title: 'Plant Families', icon: '🌿', color: 'var(--pfam)', shelf: 'plants', max: 4, kind: 'lives', noInput: true,
      blurb: 'Sixteen pressed plants, four botanical families. Did you know the almond is a rose and the potato a nightshade?',
      pool: [], guessable: [], setup: famSetup,
      scoreN: S => famState(S).mistakes + 1,
      share: S => { const st = famState(S); return `${S.won ? (st.mistakes ? `${st.mistakes} mistake${st.mistakes > 1 ? 's' : ''}` : 'perfect') : 'out of lives'}\n` + S.guesses.map(sel => { const g = famOf(S.puzzle, sel[0]); return sel.every(id => famOf(S.puzzle, id) === g) ? ['🟩', '🟨', '🟦', '🟪'][S.puzzle.groups.indexOf(g)].repeat(4) : sel.map(id => ['🟩', '🟨', '🟦', '🟪'][S.puzzle.groups.indexOf(famOf(S.puzzle, id))]).join(''); }).join('\n'); },
      result: S => { const st = famState(S); return { title: S.won ? (st.mistakes ? 'Sheet complete!' : 'Perfect herbarium!') : 'Out of lives', big: '🌿', line: S.won ? `All ${S.puzzle.groups.length} families found${st.mistakes ? ` with ${st.mistakes} mistake${st.mistakes > 1 ? 's' : ''}` : ''}.` : 'The full sheet is above. Better luck tomorrow.' }; },
      levels: { easy: { groups: 4, famList: COMMON, kinds: ['crop', 'herb'], max: 5, showFams: true, note: 'Easy: fruit, vegetables and herbs, five lives, and you see which families are on the sheet.' },
        normal: { groups: 4, famList: COMMON },
        hard: { groups: 4, max: 3, note: 'Hard: any family, including trees and wildflowers, and only three lives.' } } };
    const mapped = PLANTS.filter(p => p.cells && p.cells.length);
    if (mapped.length >= 30) {
      G.planthabitat = { title: 'Plant Habitat', icon: '🌍', color: 'var(--phab)', shelf: 'plants', max: 6,
        blurb: 'A botanist’s map of where a plant grows in the wild. Guess the plant; your guesses show up on the map too.',
        pool: byPop(mapped), guessable: PLANTS,
        levels: { easy: { pool: byPop(mapped).slice(0, 60), max: 8, startClue: true, note: 'Easy: 8 guesses, and you know what kind of plant it is from the start.' },
          normal: {}, hard: { fog: true, note: 'Hard: fog of war. Only part of the map is charted, and each guess reveals more.' } } };
    }
    if (ORIGINS.length >= 20) {
      G.origins = RG({ title: 'Origins', icon: '🧭', color: 'var(--ori)', shelf: 'plants', max: 3, badge: '🧭', winTitle: 'Well travelled!',
        blurb: 'Where were wheat, chocolate and the potato first farmed? Tap the spot on the old trade map.',
        pool: [], guessable: [], setup: oriSetup,
        isRight: (R, g) => { if (!g) return false; const t = tapOf(g); return km(t.lat, t.lon, R.lat, R.lon) <= R.radius; },
        levels: { easy: { rounds: 5, radius: 2500, showCont: true, note: 'Easy: within 2,500 km counts, and you get the continent as a hint.' },
          normal: { rounds: 6, radius: 1500 }, hard: { rounds: 7, radius: 800, note: 'Hard: you have to land within 800 km.' } } });
    }
    const shadows = PLANTS.filter(p => p.img);
    if (shadows.length >= 30) {
      G.leafshadow = { title: 'Leaf Shadow', icon: '🍃', color: 'var(--lsh)', shelf: 'plants', max: 6, hideIcons: true,
        blurb: 'A plant’s shadow falls across a sunny wall, blurry and zoomed in. Each wrong guess brings it into focus.',
        pool: shadows, guessable: PLANTS,
        levels: { easy: { pool: shadows.filter(p => ['crop', 'tree'].includes(p.k)), max: 8, startClue: true, note: 'Easy: crops and trees, 8 guesses, and you know what kind of plant it is.' },
          normal: {}, hard: { twist: true, noClues: true, note: 'Hard: the shadow is flipped or turned sideways, and there are no clues.' } } };
    }
  };
})();
