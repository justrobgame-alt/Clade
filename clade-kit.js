/* Clade + Kit: plugs the shared site kit into Clade without touching the game code.
   Loaded after Clade's main script; wraps renderHome / renderGame / renderResult / shareText. */
(function () {
  const SISTERS = [
    { name: 'LEXICON', url: 'https://lexiconarcade.com', icon: '📖', color: '#7a1f2b', tag: 'Seven daily word games' },
    { name: 'Meridian', url: 'https://meridianarcade.net', icon: '🧭', color: '#e8b04a', tag: 'Eleven daily geography games' },
  ];
  Kit.unlocked = () => CLADE.isUnlocked();   // no ads for Clade Unlimited players
  Kit.init({
    name: 'Clade', prefix: 'clade', email: 'lexiconarcade@gmail.com', url: 'https://cladearcade.netlify.app',
    sisters: SISTERS, themeToggle: true, pwa: true,
    ads: { client: 'ca-pub-1429096474963566', bottomSlot: '' },   // same AdSense account as LEXICON and Meridian
    confetti: ['#2f6b4f', '#3d9a5f', '#6b4fa0', '#c2454a', '#2a7f8a', '#e0a03c'],
  });

  const RULES = {
    kinship: `<p>Find the mystery animal using the tree of life.</p><ul>
      <li>Type any animal. You'll see <b>how long ago</b> it shared an ancestor with the answer, and the branch they share.</li>
      <li>The hotter the emoji (🧊 → 🌤️ → 🌡️ → 🌶️ → 🔥), the closer the relative.</li>
      <li>No guess limit. Stuck? Use 💡 Hint to reveal a deeper branch.</li></ul>`,
    silhouette: `<p>A blurry, zoomed-in silhouette hides today's animal.</p><ul>
      <li>Every wrong guess pulls the camera back and sharpens the shape.</li>
      <li>After 2 guesses you see its group, after 4 the first letter.</li><li>You have <b>6 guesses</b>.</li></ul>`,
    vitals: `<p>Guess the animal from its body and life statistics.</p><ul>
      <li>Two clue cards are open from the start; each guess unlocks another.</li>
      <li>Each guess compares its stats with the answer: <b>green</b> = within 25%, <b>yellow</b> = within 2×, arrows say higher or lower.</li>
      <li>You have <b>6 guesses</b>.</li></ul>`,
    habitat: `<p>Guess the animal from where in the world it lives.</p><ul>
      <li>The map shows the mystery animal's range in green. Your guesses appear in orange, and overlaps in purple.</li>
      <li>Each guess shows how much its range overlaps the answer's, and unlocks a clue.</li>
      <li>You have <b>6 guesses</b>.</li></ul>`,
    oddone: `<p>A shelf of specimen jars. All of them but one belong to the same branch of the tree of life.</p><ul>
      <li>Tap the jar that <b>doesn't belong</b>. Looks can trick you: a whale is closer to a cow than to a shark.</li>
      <li>After each round you'll see the branch the others share.</li>
      <li>Six rounds and <b>3 lives</b> 🌿. Practice adds Easy and Hard (five jars, close relatives).</li></ul>`,
    twins: `<p>Two animals that look alike, and one question.</p><ul>
      <li>Tap the one the question is about: which has ear flaps, which one hovers, which one is venomous…</li>
      <li>Six rounds and <b>2 lives</b> 🌿.</li>
      <li>On Hard (in practice) the names are hidden, so you have to tell the silhouettes apart.</li></ul>`,
    higherlower: `<p>Two animals on a balance scale.</p><ul>
      <li>You can see the left animal's number. Is the right one <b>higher or lower</b>?</li>
      <li>The measure changes: weight or the longest recorded lifespan (Hard adds pregnancy time and litter size).</li>
      <li>Ten rounds and <b>3 lives</b> 🌿. Numbers come from the AnAge database and are approximate.</li></ul>`,
    sizeup: `<p>Line the animals up from <b>lightest</b> (top) to <b>heaviest</b> (bottom).</p><ul>
      <li>Move them with ▲ and ▼, then tap <b>Check order</b>.</li>
      <li>Animals in the right spot turn green.</li>
      <li>You have <b>4 tries</b>. At the end, everyone goes on the ruler with their real weight.</li></ul>`,
    plantfamilies: `<p>Sixteen pressed plants hide <b>four botanical families</b> of four.</p><ul>
      <li>Tap four plants you think are in the same family, then <b>Submit</b>.</li>
      <li>Families are surprising: strawberries and almonds are roses, potatoes and chilies are nightshades.</li>
      <li>You can make <b>4 mistakes</b> 🌿. “One away” means three of your four were right.</li></ul>`,
    planthabitat: `<p>Guess the plant from where it grows in the wild.</p><ul>
      <li>The map shows wild sightings in green (planted and garden plants are left out). Your guesses appear in orange.</li>
      <li>Each guess shows how much the ranges overlap and unlocks a clue.</li>
      <li>You have <b>6 guesses</b>.</li></ul>`,
    origins: `<p>Where in the world was each crop first farmed?</p><ul>
      <li>Tap the map to drop a pin, then <b>Lock in</b>. Landing within 1,500 km counts as right.</li>
      <li>A route shows how far off you were, plus a fact about the crop.</li>
      <li>Six crops and <b>3 lives</b> 🌿.</li></ul>`,
    leafshadow: `<p>A plant's shadow, blurred and zoomed in.</p><ul>
      <li>Every wrong guess pulls back and sharpens it.</li>
      <li>After 2 guesses you see what kind of plant it is, after 4 its family.</li><li>You have <b>6 guesses</b>.</li></ul>`,
  };
  // Tree-only Kinship (used until dates can be shown): closeness instead of "how long ago".
  const KIN_TREE_RULE = `<p>Find the mystery animal using the tree of life.</p><ul>
      <li>Type any animal. You'll see the <b>closest group</b> it shares with the answer (cat family, mammals, vertebrates…) and how close that is.</li>
      <li>The hotter the emoji (🧊 → 🌤️ → 🌡️ → 🌶️ → 🔥), the closer the relative.</li>
      <li>No guess limit. Stuck? Use 💡 Hint to reveal a deeper branch.</li></ul>`;
  const ruleFor = id => (id === 'kinship' && typeof KIN_DATED !== 'undefined' && !KIN_DATED) ? KIN_TREE_RULE
    : RULES[id] || `<p>${Kit.esc((GAMES[id] && GAMES[id].blurb) || '')}</p>`;

  /* home: toolbar on top, sister sites + legal links at the bottom */
  const _home = renderHome;
  renderHome = function () {
    _home.apply(this, arguments);
    const brand = app.querySelector('.brand');
    if (brand) {
      const streak = Kit.stats.siteStreak();
      brand.insertAdjacentHTML('beforeend', `<div class="ck-tools"><span class="ck-streak" title="${CladeHumor.streakTitle(streak)}">${CladeHumor.streakIcon(streak)} ${streak}</span>${Kit.theme.button()}</div>`);
    }
    app.insertAdjacentHTML('beforeend', Kit.footer());
  };

  /* game screen: How to play + Stats buttons, and an intro on the first visit */
  const _game = renderGame;
  renderGame = function () {
    _game.apply(this, arguments);
    const top = app.querySelector('.top'), G = GAMES[S.game];
    if (top && !top.querySelector('.ck-btns')) {
      const modes = top.querySelector('.modes');
      const btns = document.createElement('div'); btns.className = 'ck-btns';
      btns.innerHTML = `<button class="back" aria-label="How to play">?</button><button class="back" aria-label="Your stats">📊</button>`;
      btns.children[0].onclick = () => Kit.howTo(S.game, G.title, ruleFor(S.game));
      btns.children[1].onclick = () => Kit.stats.open(S.game, G.title);
      modes ? top.insertBefore(btns, modes) : top.appendChild(btns);
    }
    Kit.howTo(S.game, G.title, ruleFor(S.game), true);
  };

  /* result: record the daily result once, show streaks and the countdown, confetti on a fresh win */
  const _result = renderResult;
  renderResult = function (T, G) {
    _result.apply(this, arguments);
    if (S.done) {
      const qbox = document.querySelector('#result .result');
      if (qbox && !qbox.querySelector('.ck-quip')) {
        const n = S.guesses ? S.guesses.length : null, cap = S.max ?? G.max;
        const grade = !S.won ? 'lose' : (!G.result && n != null && n <= (cap === Infinity ? 3 : 2)) ? 'great' : 'win';
        const q = document.createElement('p'); q.className = 'ck-quip ' + grade;
        q.textContent = CladeHumor.quip(S.game, grade, S.mode !== 'daily');
        const h = qbox.querySelector('h3'), line = h && h.nextElementSibling && h.nextElementSibling.tagName === 'P' && !h.nextElementSibling.querySelector('i') ? h.nextElementSibling : null;
        (line || h || qbox.firstElementChild).after(q);
      }
    }
    if (S.mode !== 'daily' || !S.done) return;
    const before = Kit.stats.get(S.game).played;
    const n = scoreN();
    const bucket = !S.won ? 'x' : (G.max === Infinity ? (n >= 10 ? '10+' : String(n)) : String(n));
    const s = Kit.stats.record(S.game, S.won, bucket);
    const box = document.querySelector('#result .result');
    if (box && !box.querySelector('.ck-stats')) {
      const rb = box.querySelector('.rb');
      const wrap = document.createElement('div'); wrap.className = 'ck-stats';
      wrap.innerHTML = Kit.stats.row(S.game) + `<p class="ck-next">Next puzzle in <b class="kit-cd">${Kit.fmtCountdown(Kit.msToMidnight())}</b></p>`;
      box.insertBefore(wrap, rb);
    }
    if (s.played > before && S.won) setTimeout(Kit.confetti, 250);
    Kit.installNudge(box);
  };

  /* share: add the site link */
  const _share = shareText;
  shareText = function () { const t = _share.apply(this, arguments); const u = Kit.url(); return u ? t + '\n' + u : t; };
})();
