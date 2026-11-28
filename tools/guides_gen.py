"""Generate readable guide + article pages, a home-page intro, sitemap and robots for Meridian and Clade.
usage: python3 guides_gen.py meridian /path/to/daylight   |   python3 guides_gen.py clade /path/to/clade-repo"""
import sys, os, re, html
site, root = sys.argv[1], sys.argv[2]

CFG = {
 'meridian': dict(name='Meridian', icon='🧭', url='https://meridianarcade.net', email='meridianarcade@gmail.com',
   css=':root{--bg:#f3ead4;--card:#fbf5e4;--ink:#1d2a3a;--muted:#57503f;--acc:#b8432f;--line:#d6c49c}'
       '@media(prefers-color-scheme:dark){:root{--bg:#0f1626;--card:#152036;--ink:#efe6d2;--muted:#b7b0a0;--acc:#e8b04a;--line:#2a3a5a}}',
   font="Figtree", tagline='Daily geography and geopolitics puzzles'),
 'clade': dict(name='Clade', icon='🌿', url='https://cladearcade.com', email='lexiconarcade@gmail.com',
   css=':root{--bg:#f4f1e8;--card:#fffdf6;--ink:#1f2a24;--muted:#6b736d;--acc:#2f6b4f;--line:#e2ddcf}'
       '@media(prefers-color-scheme:dark){:root{--bg:#141a16;--card:#1c241f;--ink:#e8efe9;--muted:#9aa59d;--acc:#7fc29b;--line:#2c3a31}}',
   font="Inter", tagline='Daily biology puzzles about animals and plants'),
}[site]

def page(title, desc, body):
    c = CFG
    return f'''<!DOCTYPE html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>{html.escape(title)} · {c['name']}</title><meta name="description" content="{html.escape(desc)}">
<meta name="google-adsense-account" content="ca-pub-1429096474963566">
<link rel="icon" href="/favicon.ico" sizes="48x48"><link rel="icon" type="image/png" sizes="192x192" href="/icons/icon-192.png">
<link href="https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,700&family={c['font']}:wght@400;600&display=swap" rel="stylesheet">
<style>{c['css']}
*{{box-sizing:border-box}}body{{margin:0;background:var(--bg);color:var(--ink);font:17px/1.65 {c['font']},system-ui,sans-serif}}
main{{max-width:700px;margin:0 auto;padding:28px 18px 60px}}a{{color:var(--acc)}}
h1{{font-family:Fraunces,Georgia,serif;font-size:36px;line-height:1.1;margin:8px 0 10px}}
h2{{font-family:Fraunces,Georgia,serif;font-size:22px;margin:30px 0 6px}}.muted{{color:var(--muted);font-size:14px}}
.card{{background:var(--card);border:1px solid var(--line);border-radius:12px;padding:14px 18px;margin:14px 0}}
.btn{{display:inline-block;background:var(--acc);color:var(--bg);font-weight:700;text-decoration:none;padding:12px 22px;border-radius:999px;margin-top:8px}}
.top a{{text-decoration:none;font-weight:700;color:var(--ink);font-size:18px}}
nav{{display:flex;gap:16px;flex-wrap:wrap;margin-top:36px;padding-top:16px;border-top:1px solid var(--line);font-size:14px}}</style></head><body><main>
<p class="top"><a href="/">{c['icon']} {c['name']}</a></p>
{body}
<p style="margin-top:28px"><a class="btn" href="/">Play today's puzzles →</a></p>
<p class="muted">Free every day. One puzzle per game, the same for everyone, new at midnight.</p>
<nav><a href="/">Play</a><a href="/guides/">Guides</a><a href="/about.html">About</a><a href="/privacy.html">Privacy</a><a href="/terms.html">Terms</a><a href="mailto:{c['email']}">Contact</a></nav>
<p class="muted">© 2026 {c['name']}</p>
</main></body></html>'''

def guide(n, total, name, intro, rules, example, tips, extra=''):
    ex = f'<h2>An example</h2>{example}' if example else ''
    return (f'<p class="muted">Guide · Game {n} of {total}</p><h1>How to play {name}</h1><p>{intro}</p>'
            f'<h2>The rules</h2><ol>{"".join(f"<li>{r}</li>" for r in rules)}</ol>{ex}'
            f'<h2>Tips</h2><ul>{"".join(f"<li>{t}</li>" for t in tips)}</ul>{extra}')

GAMES, ARTICLES = [], []   # (slug, name, one-liner, intro, rules, example, tips)
if site == 'meridian':
    GAMES = [
 ('daylight','Daylight','Find the city from today’s sunrise and sunset times.',
  'Every place on Earth gets its own sunrise and sunset. Daylight turns that into a detective game: your only clue is when the sun rises and sets in a mystery city today, and you have to work out where it is.',
  ['Every day there is a mystery city. You see today’s sunrise, solar noon and sunset there, shown in your own time zone.','Guess a city. Each guess shows the distance and direction to the answer, and that city’s own daylight bar under the mystery one so you can compare.','After three misses the continent is revealed, and after five the country. You have six guesses.'],
  '<div class="card">Sunrise <b>05:10</b>, sunset <b>21:40</b>, in a city a few time zones from you, in June.</div><p>That is about sixteen and a half hours of daylight, so it is summer and the city is far from the equator, probably above 50° north. If the sun rises there earlier on your clock than it does for you, the city is to your east.</p>',
  ['<b>Day length tells you latitude.</b> About twelve hours means near the equator. Long days mean summer, short days mean winter, and the difference grows the further you go from the equator.','<b>Timing tells you longitude.</b> The earlier the sun rises on your clock, the further east the city is. One hour of difference is roughly 15 degrees of longitude.','<b>Remember the hemispheres.</b> A long day in December means the city is in the southern hemisphere.','<b>Compare the bars.</b> If your guess’s daylight bar is wider than the mystery bar, move towards the equator, or into the other hemisphere.']),
 ('street-signs','Street Signs','Five real streets from one city. Name the city.',
  'Street names carry a city’s history, language and heroes. Street Signs shows you real street names from one city, from obscure to famous, and asks you to name the city.',
  ['Five real street names from one city appear one at a time, starting with the most obscure.','Guess the city. Each wrong guess, or skip, reveals the next street.','Each guess shows how far away the answer is and in which direction. You have six guesses.'],
  '',
  ['<b>Read the language.</b> <i>Rua</i> suggests Portuguese, <i>Calle</i> Spanish, <i>Straße</i> or <i>Gasse</i> German, <i>Ulica</i> Polish or another Slavic language, <i>Via</i> Italian, <i>Rue</i> French.','<b>Look at the people.</b> Streets are often named after national heroes, writers and leaders, which can pin down the country quickly.','<b>Dates and events</b> such as independence days or famous battles point to a particular country’s history.','<b>Famous streets come last.</b> If you know the country by the second clue, use a guess on its biggest city and let the arrow guide you.']),
 ('neighborhood','Neighborhood','The country is a hole in the map. Its neighbours appear one by one.',
  'In Neighborhood the mystery country is missing from the map. All you can see are the countries around it, revealed one at a time.',
  ['The mystery country is a hole in the map. At the start you see one neighbour, usually the biggest and least helpful.','Each wrong guess or skip adds another neighbour and more of the hole’s outline.','Once every neighbour is shown, the next clue reveals the coastline. You have six guesses.'],
  '<p>Some countries have only one land neighbour, which makes them tricky. If the only neighbour shown is Spain, the answer is almost certainly Portugal. Germany alone suggests Denmark, and Senegal wrapped all the way around points to The Gambia.</p>',
  ['<b>Count the neighbours.</b> A country with many neighbours is usually large or central, such as Germany, Brazil or China.','<b>Watch the coastline.</b> A landlocked hole narrows things down a lot.','<b>Think about shape.</b> The outline of the hole often matches a country you know well once a few neighbours are filled in.'],
  '<p>See also: <a href="/notes/countries-with-one-neighbour.html">countries with only one neighbour</a>.</p>'),
 ('midpoint','Midpoint','Tap the true halfway point between two cities.',
  'Flat maps distort distances, especially over long routes. Midpoint asks you to find the true halfway point between two cities, measured along the curve of the Earth, the way a plane flies.',
  ['You get two cities. Tap the spot exactly halfway between them along the Earth’s surface.','You score up to 5,000 points per round, based on how many kilometres you are from the true midpoint.','After each guess you see the real route on the map and on a globe. There are five rounds a day.'],
  '<p>On a flat map the straight line between London and Tokyo runs across Central Asia. The real shortest route curves far to the north, over Scandinavia and Siberia, so the true midpoint is in northern Russia, much closer to the Arctic than most people expect.</p>',
  ['<b>Long routes bend towards the poles.</b> On the usual flat map, the true route between two cities in the same hemisphere curves towards the nearest pole.','<b>Short routes barely bend.</b> For cities a few thousand kilometres apart, the flat-map halfway point is close enough.','<b>Picture a globe.</b> Imagine stretching a string between the two cities on a globe; the midpoint is in the middle of the string.'],
  '<p>See also: <a href="/notes/why-flat-maps-lie.html">why flat maps lie about distance</a>.</p>'),
 ('antipode','Antipode','Dig straight through the Earth. Where do you come out?',
  'The antipode of a place is the point exactly on the opposite side of the Earth. In Antipode you tap where you would come out if you dug a tunnel straight through the centre of the planet.',
  ['You get a place. Tap the spot on the exact opposite side of the Earth.','Round one is always your own city. You pick it once and it is remembered.','You score up to 5,000 points per round based on how many kilometres you are off. There are five rounds a day.'],
  '<p>Take Madrid, at about 40° north and 4° west. Flip the latitude to 40° south, then move the longitude by 180° to about 176° east. That lands in New Zealand’s North Island, which is why Spain and New Zealand are a famous pair of near-antipodes.</p>',
  ['<b>Flip the latitude:</b> north becomes south by the same number of degrees.','<b>Add or subtract 180° from the longitude:</b> a place 30° east has its antipode at 150° west.','<b>Expect ocean.</b> Most of the land on Earth has ocean on its opposite side, so do not be surprised to dig into the Pacific.']),
 ('passport-power','Passport Power','A map of where one passport can travel. Whose is it?',
  'Some passports open almost every border; others open only a few. Passport Power shows you where one mystery passport can travel without a visa, and asks you to name the country that issued it.',
  ['The map shows where the mystery passport can travel: visa-free, visa on arrival or e-travel authorisation, or visa needed in advance.','The passport’s own country is hidden. Guess which country it belongs to.','Each guess shows distance, direction and how similar that passport’s access is. After three misses you get the continent, after five the first letter. You have six guesses.'],
  '',
  ['<b>Check the neighbours.</b> Travel is usually easiest between neighbouring countries and regional blocs such as the EU, the Gulf states, ECOWAS in West Africa or Mercosur in South America.','<b>Gaps are clues too.</b> A grey patch in a region that is otherwise open often marks a political dispute.','<b>Very open maps</b> usually belong to wealthy countries in Europe or East Asia.','Visa rules change often. The game uses a snapshot from early 2026.']),
 ('membership-card','Membership Card','Which country belongs to all these clubs?',
  'Countries join clubs: military alliances, trade blocs, currency unions and international organisations. Membership Card shows you a mystery country’s memberships one by one, from the biggest club to the most exclusive.',
  ['You see the mystery country’s memberships one at a time, starting with the largest and least helpful club.','Guess the country. Each wrong guess reveals another, more exclusive membership.','You have six guesses.'],
  '',
  ['<b>Big clubs narrow the continent.</b> The African Union, ASEAN or the Organization of American States tell you where to look.','<b>Small clubs are decisive.</b> Groups such as the G7, the Nordic Council or a currency union have only a handful of members.','<b>Combine them.</b> A country in both the EU and NATO but not the eurozone is a short list.']),
 ('embassy-map','Embassy Map','Where does this country keep its embassies?',
  'Embassies show where a country cares about. Embassy Map lights up every country where the mystery country has an embassy or high commission, and you have to work out which country it is.',
  ['The map lights up every country where the mystery country has an embassy or high commission. The mystery country itself is hidden.','Guess the country. Each guess shows distance, direction and how alike its embassy network is.','After three misses you get the continent, after five the first letter. You have six guesses.'],
  '',
  ['<b>Count the lights.</b> Large and wealthy countries have embassies almost everywhere; small countries have only a few.','<b>Look for clusters.</b> A dense cluster in one region often marks the country’s own neighbourhood.','<b>Look for history.</b> Former colonial ties and old trade links often show up as embassies far from home.','Consulates and honorary missions are not counted.']),
 ('border-ties','Border Ties','Find the country from how it gets on with its neighbours.',
  'Border Ties shows every land neighbour of a mystery country as a card with five facts: military alliance, open border, diplomatic relations, shared language and shared currency.',
  ['Each land neighbour of the mystery country is shown as a card with five yes-or-no facts.','Guess the country. Each wrong guess reveals one neighbour’s name.','You have six guesses.'],
  '<p>Imagine four neighbours, all sharing the same currency, three in a military alliance with the mystery country, and open borders with all of them. That pattern points to a country in the middle of the euro area and the Schengen zone.</p>',
  ['<b>Open borders</b> often mean the Schengen area in Europe, or special arrangements such as India and Nepal.','<b>Shared currencies</b> usually mean the euro, the West or Central African CFA franc, or the US dollar.','<b>Count the neighbours</b> first. It rules out many countries straight away.']),
 ('twin-towns','Twin Towns','Name the city from its sister cities.',
  'Cities twin with each other for a reason: a shared name, a port, a university, a war, an immigrant community. Twin Towns shows you a mystery city’s official twins and asks you to name it.',
  ['You see the official twin towns and sister cities of a mystery city, one at a time, starting with the farthest away.','Guess the city. Each wrong guess reveals another twin.','You have six guesses.'],
  '',
  ['<b>Look for patterns.</b> Many twins in one country often point to a shared history or a large immigrant community.','<b>Port cities twin with ports,</b> and university towns often twin with other university towns.','<b>Shared names</b> are a classic reason to twin, especially between Europe and the Americas.']),
 ('un-twin','UN Twin','Who votes most like whom at the United Nations?',
  'At the UN General Assembly, countries vote yes, no or abstain on hundreds of resolutions every year. UN Twin asks which country voted most like another.',
  ['Each round names a country.','Pick which of four countries voted the same way most often.','After you answer, you see the real agreement rates. There are five rounds a day.'],
  '',
  ['<b>Neighbours and blocs vote together.</b> EU members, Nordic countries and Latin American states often vote alike.','<b>Think about alliances and politics,</b> not just geography.','The data covers UN General Assembly roll-call votes from 2000 to 2019. Agreement means the share of votes where both countries cast the same vote.']),
    ]
    ARTICLES = [
 ('countries-with-one-neighbour','Countries with only one land neighbour','The countries that share a land border with only one other country, and why it makes them tricky in geography games.',
  '<p class="muted">Article · Borders</p><h1>Countries with only one land neighbour</h1><p>Most countries share land borders with several others. A handful share a border with just one. They make great puzzle answers, and you will meet several of them in <a href="/guides/neighborhood.html">Neighborhood</a>.</p>'
  '<ul><li><b>Portugal</b>: only Spain.</li><li><b>Denmark</b>: only Germany.</li><li><b>Ireland</b>: only the United Kingdom, and the UK’s only land neighbour is Ireland.</li><li><b>Canada</b>: only the United States.</li>'
  '<li><b>Monaco</b>: only France.</li><li><b>San Marino</b> and <b>Vatican City</b>: entirely surrounded by Italy.</li><li><b>Lesotho</b>: entirely surrounded by South Africa.</li><li><b>The Gambia</b>: surrounded by Senegal except for its short Atlantic coast.</li>'
  '<li><b>Haiti</b> and the <b>Dominican Republic</b>: they share the island of Hispaniola.</li><li><b>South Korea</b>: only North Korea.</li><li><b>Qatar</b>: only Saudi Arabia.</li><li><b>Brunei</b>: only Malaysia.</li><li><b>Timor-Leste</b> and <b>Papua New Guinea</b>: each borders only Indonesia.</li></ul>'
  '<h2>Why it matters in Neighborhood</h2><p>When the game shows just one neighbour and no more appear after a wrong guess, you are probably looking at one of these countries. Lesotho, San Marino and Vatican City are the only three countries completely surrounded by a single other country.</p>'),
 ('why-flat-maps-lie','Why flat maps lie about distance','How map projections such as Mercator distort distance and size, and why the shortest route between two cities curves on a flat map.',
  '<p class="muted">Article · Maps</p><h1>Why flat maps lie about distance</h1><p>You cannot flatten the surface of a sphere without stretching or tearing it. Every flat world map makes a trade-off, and most of them get distances wrong. That is the idea behind our game <a href="/guides/midpoint.html">Midpoint</a>.</p>'
  '<h2>The Mercator problem</h2><p>The Mercator projection, created in 1569 for sailors, keeps angles correct so that a constant compass bearing is a straight line. The price is that areas near the poles are hugely enlarged. Greenland looks about as big as Africa, but Africa is roughly fourteen times larger.</p>'
  '<h2>Great circles</h2><p>The shortest path between two points on a sphere is a great circle: a slice through the globe that passes through its centre. On a flat map, great-circle routes look curved, bending towards the nearest pole. That is why flights from Europe to North America pass over Greenland and Iceland, and flights from Europe to East Asia often cross Siberia.</p>'
  '<h2>Finding the true midpoint</h2><p>The true midpoint between two cities lies halfway along the great circle, not halfway along a straight line on the map. For short distances the two are close. For long routes in the same hemisphere, the true midpoint is much nearer the pole than the flat map suggests.</p>'
  '<h2>Try it yourself</h2><p>Take a ball and a piece of string. Hold the string tight between two points and you have traced a great circle. The middle of the string is the midpoint.</p>'),
    ]
else:
    GAMES = [
 ('kinship','Kinship','Find the mystery animal on the tree of life.',
  'Every animal alive today shares an ancestor with every other. Kinship asks you to find a mystery animal by measuring how closely related your guesses are to it.',
  ['Type any animal. You see how long ago it shared an ancestor with the answer, and the branch of the tree of life they share.','The hotter the emoji, from ice to fire, the closer the relative.','There is no guess limit. If you are stuck, a hint reveals a deeper branch.'],
  '<p>Guess <b>lion</b> when the answer is the house cat, and you will see that they last shared an ancestor roughly 15 million years ago, in the cat family. Guess <b>dog</b> and the shared branch jumps back to the carnivorans, more than 50 million years ago.</p>',
  ['<b>Start broad.</b> A first guess such as a human, a fish or an insect tells you which big branch you are on.','<b>Then narrow down.</b> Once you know it is a mammal, try one animal from each major group: rodents, carnivores, hoofed animals, primates.','<b>Use the dates.</b> A few million years means a close cousin; hundreds of millions means a different part of the animal kingdom.'],
  '<p>Divergence times come from the <a href="https://timetree.org">TimeTree of Life</a>, used with permission. See also: <a href="/notes/surprising-animal-relatives.html">surprising animal relatives</a>.</p>'),
 ('silhouette','Silhouette','Name the animal from a blurry, zoomed-in shadow.',
  'Silhouette shows a mystery animal as a shadow on a lightbox: zoomed in and blurred. Every wrong guess pulls the camera back and sharpens the shape.',
  ['A blurry, zoomed-in silhouette hides today’s animal.','Every wrong guess pulls the camera back and sharpens the shape.','After two guesses you see its group, after four its first letter. You have six guesses.'],'',
  ['<b>Look for body parts.</b> Ears, horns, fins, tails and the number of legs narrow things down fast.','<b>Think about posture.</b> Animals standing on two legs, coiled, or with wings spread are easy to group.','<b>Use the group hint</b> to decide between look-alikes.']),
 ('vital-signs','Vital Signs','Guess the animal from its body and life statistics.',
  'Vital Signs is themed as a hospital monitor. Instead of a heartbeat, you see a mystery animal’s statistics: its weight, how long it lives, how long its pregnancy lasts and how many young it has.',
  ['Two clue cards are open from the start; each guess unlocks another.','Each guess compares its statistics with the answer: green means within 25%, yellow within two times, and arrows show higher or lower.','You have six guesses.'],'',
  ['<b>Weight first.</b> It separates mice from elephants immediately.','<b>Long lives with few young</b> usually mean large mammals, parrots or tortoises. Short lives with many young usually mean small rodents.','<b>Follow the arrows</b> rather than guessing at random.']),
 ('habitat','Habitat','Guess the animal from where in the world it lives.',
  'Habitat shows a map of where a mystery animal has been recorded in the wild. Your guesses appear on the same map, so you can see how their ranges compare.',
  ['The map shows the mystery animal’s range in green. Your guesses appear in orange, and overlaps in purple.','Each guess shows how much its range overlaps the answer’s, and unlocks a clue.','You have six guesses.'],'',
  ['<b>Read the continents.</b> Australia, Madagascar and South America each have animals found nowhere else.','<b>Look at the edges.</b> A range that follows coastlines suggests a seabird or marine animal; one that follows mountains suggests a specialist.','<b>Compare overlap.</b> A big purple area means you are close; adjust towards the green.']),
 ('odd-one-out','Odd One Out','Spot the specimen that does not belong.',
  'Odd One Out is a shelf of specimen jars. All of them but one belong to the same branch of the tree of life. Find the one that does not.',
  ['Tap the jar that does not belong.','After each round you see the branch the others share.','There are six rounds and three lives.'],
  '<p>A whale, a cow, a hippo and a shark: the shark is the odd one out. Whales and hippos are close relatives, and both belong to the same group as cows, while sharks are fish.</p>',
  ['<b>Ignore looks.</b> Body shape often comes from lifestyle, not ancestry. Dolphins look like fish; bats look like birds.','<b>Think about the big groups:</b> mammals, birds, reptiles, amphibians, fish, insects.']),
 ('twins','Twins','Tell two look-alike animals apart.',
  'Twins shows two animals that look alike and asks a question that only one of them fits: which has ear flaps, which one hovers, which one is venomous.',
  ['Two look-alike animals appear with one question.','Tap the animal the question is about.','There are six rounds and two lives.'],
  '<p>Alligator or crocodile: which shows its lower teeth when its mouth is closed? The crocodile. Seals or sea lions: which has visible ear flaps? The sea lion.</p>',
  ['<b>Learn the classic pairs:</b> alligator and crocodile, seal and sea lion, frog and toad, moth and butterfly, rabbit and hare.','<b>Read the question carefully.</b> It usually points to one specific feature.']),
 ('higher-or-lower','Higher or Lower','Is the next animal heavier or lighter, longer-lived or shorter-lived?',
  'Higher or Lower puts two animals on a balance scale. You can see one animal’s number; you have to say whether the other’s is higher or lower.',
  ['You see the left animal’s number for weight or lifespan.','Decide whether the right animal’s number is higher or lower.','There are ten rounds and three lives. Numbers are approximate.'],'',
  ['<b>Lifespans surprise people.</b> Some small animals, such as certain bats and parrots, live far longer than their size suggests.','<b>Weight is easier.</b> Picture the two animals side by side.']),
 ('size-up','Size Up','Line the animals up from lightest to heaviest.',
  'Size Up gives you a handful of animals and asks you to sort them by weight, lightest at the top and heaviest at the bottom.',
  ['Move the animals into order with the arrows, then check your order.','Animals in the right spot turn green.','You have four tries. At the end, every animal goes on the ruler with its real weight.'],'',
  ['<b>Place the extremes first.</b> The lightest and heaviest are usually obvious.','<b>Use the green marks.</b> Keep correct animals fixed and swap the others.']),
 ('plant-families','Plant Families','Sort sixteen plants into four botanical families.',
  'Plant Families shows sixteen pressed plants that hide four botanical families of four. Botany is full of surprises: strawberries and almonds are in the rose family, and potatoes and chillies are nightshades.',
  ['Tap four plants you think are in the same family, then submit.','“One away” means three of your four were right.','You can make four mistakes.'],'',
  ['<b>Start with the family you are surest of.</b>','<b>Remember the big families:</b> roses, nightshades, grasses, legumes, cabbages, carrots and gourds.'],
  '<p>See also: <a href="/notes/surprising-plant-families.html">plant families with surprising members</a>.</p>'),
 ('plant-habitat','Plant Habitat','Guess the plant from where it grows in the wild.',
  'Plant Habitat is a botanist’s map. It shows where a mystery plant has been seen growing wild, and your guesses appear on the same map.',
  ['The map shows wild sightings in green; garden and planted specimens are left out. Your guesses appear in orange.','Each guess shows how much the ranges overlap and unlocks a clue.','You have six guesses.'],'',
  ['<b>Climate is the biggest clue.</b> Deserts, rainforests and cold northern forests each have their own plants.','<b>Islands matter.</b> Many plants grow wild only on particular islands.']),
 ('origins','Origins','Where was each crop first farmed?',
  'Every crop on your plate was first farmed somewhere. Origins asks you to pin where wheat, chocolate, potatoes and other crops were first domesticated.',
  ['Tap the map to drop a pin, then lock it in. Landing within 1,500 km counts as right.','A route shows how far off you were, plus a fact about the crop.','There are six crops and three lives.'],
  '<p>Potatoes were first farmed in the Andes of South America, wheat in the Fertile Crescent of the Middle East, and cacao, the source of chocolate, in the Americas.</p>',
  ['<b>Many crops come from a few centres:</b> the Fertile Crescent, China, Mesoamerica, the Andes, West Africa and New Guinea.','<b>Do not be fooled by modern farming.</b> Where a crop grows most today is often far from where it began.']),
 ('leaf-shadow','Leaf Shadow','Name the plant from a blurred, zoomed-in shadow.',
  'Leaf Shadow is Silhouette for plants: a plant’s shadow, blurred and zoomed in, that sharpens with every wrong guess.',
  ['A plant’s shadow starts blurred and zoomed in.','Every wrong guess pulls back and sharpens it.','After two guesses you see what kind of plant it is, after four its family. You have six guesses.'],'',
  ['<b>Look at the leaf edges.</b> Smooth, toothed and lobed leaves belong to very different plants.','<b>Count the leaflets</b> on compound leaves.']),
    ]
    ARTICLES = [
 ('surprising-animal-relatives','Surprising animal relatives','Animals that are more closely related than they look, from whales and hippos to elephants and manatees.',
  '<p class="muted">Article · Evolution</p><h1>Surprising animal relatives</h1><p>Appearances can be misleading. Animals that live alike often look alike, even when they are distant relatives. Here are some surprising family ties, the kind you will meet in <a href="/guides/kinship.html">Kinship</a> and <a href="/guides/odd-one-out.html">Odd One Out</a>.</p>'
  '<h2>Whales and hippos</h2><p>The closest living relatives of whales and dolphins are hippos. Both belong to the even-toed hoofed mammals, the same group as cows, pigs and deer.</p>'
  '<h2>Elephants, manatees and hyraxes</h2><p>The small, rabbit-sized hyrax and the sea-dwelling manatee are among the closest living relatives of elephants.</p>'
  '<h2>Birds and dinosaurs</h2><p>Birds are not just related to dinosaurs: they are dinosaurs, the one surviving branch. A sparrow is more closely related to <i>Tyrannosaurus</i> than a crocodile is.</p>'
  '<h2>Horses and rhinos</h2><p>Horses, rhinos and tapirs form their own group, the odd-toed hoofed mammals, separate from cows and deer.</p>'
  '<h2>Hyenas and cats</h2><p>Hyenas look like dogs, but they belong to the cat-like branch of the carnivores, alongside cats, mongooses and civets.</p>'
  '<h2>Giant pandas and red pandas</h2><p>The giant panda is a true bear. The red panda is not; it sits in a family of its own, closer to raccoons and weasels.</p>'
  '<h2>Fungi and animals</h2><p>Mushrooms are more closely related to animals than to plants. Fungi and animals share a common ancestor that is not shared with plants.</p>'),
 ('surprising-plant-families','Plant families with surprising members','Which fruits and vegetables belong to the same botanical family, from roses and almonds to potatoes and tomatoes.',
  '<p class="muted">Article · Botany</p><h1>Plant families with surprising members</h1><p>Botanists group plants by flowers and ancestry, not by how we cook them. That puts some unexpected foods side by side. These families appear in <a href="/guides/plant-families.html">Plant Families</a>.</p>'
  '<h2>The rose family</h2><p>Apples, pears, cherries, plums, peaches, almonds, strawberries and raspberries all belong to the rose family.</p>'
  '<h2>The nightshade family</h2><p>Potatoes, tomatoes, aubergines (eggplants), chilli and bell peppers, and tobacco are all nightshades.</p>'
  '<h2>The cabbage family</h2><p>Cabbage, broccoli, cauliflower, kale and Brussels sprouts are all varieties of a single species. Mustard, turnips and radishes are in the same family.</p>'
  '<h2>The grass family</h2><p>Wheat, rice, maize (corn), barley, sugarcane and bamboo are all grasses. Grasses feed most of humanity.</p>'
  '<h2>The carrot family</h2><p>Carrots, celery, parsley, coriander, dill and cumin are relatives, which is why their flowers all grow in umbrella-shaped clusters.</p>'
  '<h2>The gourd family</h2><p>Pumpkins, cucumbers, courgettes (zucchini), melons and watermelons all belong to the gourd family.</p>'),
    ]

total = len(GAMES)
pages = {}
for i,(slug,name,one,intro,rules,ex,tips,*extra) in enumerate(GAMES,1):
    pages[f'guides/{slug}.html'] = (f'How to play {name}', f'How to play {name} on {CFG["name"]}: rules, an example and tips. {one}', guide(i,total,name,intro,rules,ex,tips,extra[0] if extra else ''))
cards = ''.join(f'<div class="card"><h2 style="margin-top:0"><a href="/guides/{s}.html">{n}</a></h2><p>{o}</p></div>' for s,n,o,*_ in GAMES)
arts = ''.join(f'<li><a href="/notes/{s}.html">{t}</a></li>' for s,t,*_ in ARTICLES)
pages['guides/index.html'] = (f'Guides: how to play every {CFG["name"]} game', f'How to play all {total} {CFG["name"]} games, plus articles.',
    f'<h1>Guides</h1><p>{CFG["name"]} is a set of {total} free daily puzzles. These guides explain the rules of each game, walk through an example and share tips.</p>{cards}<h2>Articles</h2><ul>{arts}</ul>')
for s,t,d,b in ARTICLES: pages[f'notes/{s}.html'] = (t,d,b)
for fn,(t,d,b) in pages.items():
    p = os.path.join(root, fn); os.makedirs(os.path.dirname(p), exist_ok=True); open(p,'w').write(page(t,d,b))
urls = ['/','/about.html','/privacy.html','/terms.html'] + ['/'+fn.replace('index.html','') for fn in pages]
open(os.path.join(root,'sitemap.xml'),'w').write('<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n'+''.join(f'  <url><loc>{CFG["url"]}{u}</loc></url>\n' for u in urls)+'</urlset>\n')
open(os.path.join(root,'robots.txt'),'w').write(f'User-agent: *\nAllow: /\n\nSitemap: {CFG["url"]}/sitemap.xml\n')
# static home intro, readable without JavaScript; the app's own content renders inside #app above it
intro = (f'<style>#seoIntro a{{color:inherit}}</style><section id="seoIntro" style="max-width:760px;margin:0 auto;padding:10px 18px 40px;font:16px/1.6 system-ui,sans-serif;opacity:.9">'
  f'<h2 style="font-family:Fraunces,Georgia,serif">{total} free daily puzzles</h2><p>{CFG["name"]} is a free set of {CFG["tagline"].lower()}. Every game has a new puzzle each day, the same for everyone, so you can compare results with friends. Play in your browser, keep a streak alive and climb the leaderboard.</p><ul>'
  + ''.join(f'<li><a href="/guides/{s}.html"><b>{n}</b></a>: {o}</li>' for s,n,o,*_ in GAMES)
  + f'</ul><p>New here? Read the <a href="/guides/">guides</a>'+ ''.join(f', or <a href="/notes/{s}.html">{t.lower()}</a>' for s,t,*_ in ARTICLES[:1]) + '.</p></section>')
idx = os.path.join(root,'index.html'); s = open(idx).read()
s = re.sub(r'(<style>#seoIntro a\{color:inherit\}</style>)?<section id="seoIntro".*?</section>\n?', '', s, flags=re.S)
i = s.rfind('<script'); j = s.find('</body>')
s = s[:j] + intro + '\n' + s[j:] if j>0 else s
open(idx,'w').write(s)
print(site, len(pages), 'pages')
