/* Clade's sense of humour: teasing lines for the results panel, nature-themed leaderboard
   titles and the cocoon → butterfly streak icon. The teasing laughs at nature, not at the player. */
(function () {
  const LOSE = [
    'Natural selection has reviewed your answer. It was not selected.',
    'Somewhere, a sloth just solved that faster than you.',
    'Darwin is taking notes. Mostly question marks.',
    'Your guess has been placed on the endangered list.',
    'That answer was an evolutionary dead end.',
    'A goldfish forgot the puzzle and still came closer.',
    'The vultures are circling. They smell a lost streak.',
    'Bold of you to invent a new species just for this.',
    'Even the mushrooms are embarrassed, and they live in the dark.',
    'You have been demoted to plankton. Tomorrow you may evolve.',
    'Your instincts went into hibernation early this year.',
    'The dodo would like a word. It understands.',
    'A pigeon is laughing at you. Pigeons are not known for laughing.',
    'That was less survival of the fittest, more survival of the guessiest.',
    'The food chain has moved you down a link or two.',
    'Somewhere a moss is growing faster than your score.',
    'Your field guide has filed a complaint.',
    'Camouflage worked: the right answer hid from you all day.',
    'The squirrels saw that. They will tell the others.',
    'A wild miss appeared. It was super effective.',
  ];
  const WIN = [
    'Survival of the fittest. Today that was you.',
    'Darwin would have put you in the appendix. A flattering appendix.',
    'Your brain has evolved a new fold just for this.',
    'The naturalists of the world nod in quiet approval.',
    'A worthy forager. You may keep the berries.',
    'The owls are impressed, and owls are hard to impress.',
    'You have climbed one rung up the food chain.',
    'Your field notes are now slightly less embarrassing.',
    'Adapted, overcame, solved.',
    'Somewhere, a bee did a little dance about it.',
  ];
  const GREAT = [
    'Apex predator behaviour. The puzzle never saw you coming.',
    'You spotted that faster than a hawk spots a mouse.',
    'David Attenborough is narrating your victory as we speak.',
    'A specimen of rare intelligence. Someone pin this player to a board.',
    'The whole ecosystem stood up and clapped. Even the barnacles.',
  ];
  /* A few lines per game, mixed in with the general ones. */
  const GAME = {
    kinship: { lose: ['Your family tree just grew a branch it did not have.', 'Those two are not related. They have never even met.', 'Kinship status: estranged.'], great: ['You read that family tree like gossip at a reunion.'] },
    silhouette: { lose: ['It was right there in the shadows. As shadows tend to be.', 'You squinted at a shadow and the shadow won.'], great: ['Eagle-eyed. Possibly an actual eagle.'] },
    vitals: { lose: ['Vital signs: weak. Please stay calm, a nurse is on the way.', 'The heart monitor flatlined out of second-hand embarrassment.'], great: ['Pulse steady, guesses perfect. Discharged with full honours.'] },
    habitat: { lose: ['You sent it to the wrong side of the planet. It is very cross.', 'That animal has never been there. It would not survive the weekend.'], great: ['You found its home faster than it could.'] },
    oddone: { lose: ['You picked the odd one out. Unfortunately it was you.'], great: ['The odd one out never stood a chance.'] },
    twins: { lose: ['Those two are not twins. They are barely acquaintances.'], great: ['You can tell twins apart. Their own mother cannot.'] },
    higherlower: { lose: ['Higher? Lower? Sideways, apparently.'], great: ['Higher, lower, flawless.'] },
    sizeup: { lose: ['You sized it up, and it sized you up right back.'], great: ['A perfect measure. The tape measure is jealous.'] },
    plantfamilies: { lose: ['Those plants are not family. They are not even on speaking terms.'], great: ['You know every plant’s cousins by name.'] },
    planthabitat: { lose: ['That plant would wilt on sight of where you put it.'], great: ['You know where it grows better than its seeds do.'] },
    origins: { lose: ['That is not where it came from. It is offended.'], great: ['You traced its roots. Literally.'] },
    leafshadow: { lose: ['You were barking up the wrong tree. Literally.', 'Leaf it to tomorrow.'], great: ['You read that leaf like a book. A very green book.'] },
  };

  function hash(s) { let h = 2166136261; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; }
  const pick = (arr, seed) => arr[hash(seed) % arr.length];

  /* grade: 'lose' | 'win' | 'great' */
  function quip(gameId, grade, practice) {
    const g = GAME[gameId] || {};
    const pool = grade === 'lose' ? LOSE.concat(g.lose || [], g.lose || [])
      : grade === 'great' ? GREAT.concat(g.great || [], g.great || []) : WIN.concat(g.great || []);
    const day = (window.Kit && Kit.dayNumber) ? Kit.dayNumber() : 0;
    return pick(pool, practice ? String(Math.random()) : `${gameId}:${grade}:${day}`);
  }

  /* Leaderboard boards, each with a nature title. `top` is the badge for whoever is #1. */
  const BOARDS = [
    { k: 'today', tab: 'Today', title: 'Today’s Watering Hole', sub: 'Most puzzles solved today, then fewest misses.', top: 'Alpha' },
    { k: 'alltime', tab: 'Apex', title: 'Apex Predators', sub: 'Most puzzles solved of all time.', top: 'Top of the Food Chain' },
    { k: 'streaks', tab: 'Migrations', title: 'Great Migrations', sub: 'Longest unbroken run of daily wins.', top: 'Arctic Tern' },
    { k: 'clean', tab: 'Kings', title: 'Kings of the Jungle', sub: 'Fewest strikes per game (10+ games).', top: 'King of the Jungle' },
    { k: 'messy', tab: 'Carrion', title: 'Carrion Feeders', sub: 'Most strikes per game (10+ games). Someone has to clean up.', top: 'Head Vulture' },
  ];

  /* Streak icon: a cocoon with nothing hatched yet, a butterfly once the streak is going. */
  function cocoon(size = 15) {
    return `<svg class="ck-cocoon" width="${size}" height="${size}" viewBox="0 0 24 24" aria-hidden="true" style="vertical-align:-2px">`
      + '<path d="M12 1.5v3" stroke="currentColor" stroke-width="1.2" stroke-linecap="round" opacity=".6"/>'
      + '<path d="M12 4.5c3.6 0 5.2 4.2 5.2 8.6c0 4.8-2.4 9.2-5.2 9.4c-2.8-.2-5.2-4.6-5.2-9.4c0-4.4 1.6-8.6 5.2-8.6z" fill="#b59a6a"/>'
      + '<path d="M8.2 10.5c2.4 1 5.2 1 7.6 0M7.6 14.5c2.8 1.1 6 1.1 8.8 0M8.4 18.4c2.2.9 5 .9 7.2 0" fill="none" stroke="#7d6845" stroke-width="1" stroke-linecap="round"/>'
      + '</svg>';
  }
  const streakIcon = n => n ? '🦋' : cocoon();
  const streakTitle = n => n ? `Days in a row you've played: your butterfly has hatched` : 'Your cocoon is waiting. Play today to hatch a streak';

  window.CladeHumor = { quip, BOARDS, streakIcon, streakTitle, cocoon };
})();
