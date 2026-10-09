'use strict';
/* ===== Dominion Restored :: data ===== */

/* ---- overworld themes (one per biome, chronological) ---- */
const OTH = [
  { id: 'o1', seed: 1, name: 'EDEN', fl: 'grass', g1: '#3c9a3c', g2: '#2f8530', deco: 'flower', dc: '#f8e038', w1: '#8a8a7a', w2: '#5a5a4e', w3: '#b8b8a8', rock: 'boulder', tree: 'fruit', t1: '#40b840', t2: '#207020', t3: '#70e070', tr: '#7a4a1a', wa1: '#2878d8', wa2: '#68b0f8', bush: '#38a038', bush2: '#206020', berry: 1, seal: ['#ff8030', '#ffe060', '#f83800'], acc: '#f8d838', p1: '#c8b070' },
  { id: 'o2', seed: 2, name: 'ARARAT', fl: 'grass', g1: '#6a8a6a', g2: '#587858', deco: 'pebble', dc: '#98a098', w1: '#7a7a8a', w2: '#4a4a5a', w3: '#a8a8b8', rock: 'boulder', tree: 'round', t1: '#4a8a58', t2: '#2a5a3a', t3: '#6aaa78', tr: '#5a3a1a', wa1: '#3868b8', wa2: '#78a8e8', bush: '#4a8a58', bush2: '#2a5a3a', seal: ['#f83838', '#f8a038', '#f8f038', '#38c838', '#3878f8'], acc: '#a8c8f8', p1: '#9aa080' },
  { id: 'o3', seed: 3, name: 'SHINAR', fl: 'sand', g1: '#d8b878', g2: '#c0a060', deco: 'pebble', dc: '#a08850', w1: '#b05838', w2: '#783820', w3: '#d88858', rock: 'brick', tree: 'dead', t1: '#8a6a3a', t2: '#6a4a2a', tr: '#6a4a2a', wa1: '#3878c0', wa2: '#78b0f0', bush: '#a09040', bush2: '#706020', seal: ['#b878f8', '#f8f8f8', '#7848b8'], acc: '#e09068', p1: '#e8cc90' },
  { id: 'o4', seed: 4, name: 'EGYPT', fl: 'sand', g1: '#e8c878', g2: '#d0aa58', deco: 'pebble', dc: '#b89040', w1: '#c8a050', w2: '#8a6a30', w3: '#e8c880', rock: 'ruin', tree: 'palm', t1: '#38a038', t2: '#207020', tr: '#8a5a2a', wa1: '#2870c8', wa2: '#68b0f0', bush: '#a09040', bush2: '#706020', seal: ['#f8d838', '#fcfcfc', '#e8a018'], acc: '#f8d838', p1: '#f0d898' },
  { id: 'o5', seed: 5, name: 'JERICHO', fl: 'grass', g1: '#b8c868', g2: '#a0b050', deco: 'grass', dc: '#889838', w1: '#a89878', w2: '#706048', w3: '#d0c0a0', rock: 'ruin', tree: 'palm', t1: '#58a838', t2: '#388020', tr: '#8a5a2a', wa1: '#3878c0', wa2: '#78b0f0', bush: '#78a838', bush2: '#487818', seal: ['#fcfcfc', '#f8d838', '#c8c8d8'], acc: '#d0c0a0', p1: '#d8cc98' },
  { id: 'o6', seed: 6, name: 'ELAH', fl: 'grass', g1: '#68b048', g2: '#589038', deco: 'flower', dc: '#fcfcfc', w1: '#988868', w2: '#605038', w3: '#c0b090', rock: 'boulder', tree: 'round', t1: '#58a048', t2: '#387828', t3: '#88c868', tr: '#6a4a1a', wa1: '#3070c0', wa2: '#70b0f0', bush: '#58a048', bush2: '#387828', seal: ['#c0c0d0', '#fcfcfc', '#8890a8'], acc: '#c0b090', p1: '#c8b878' },
  { id: 'o7', seed: 7, name: 'BABYLON', fl: 'tile', g1: '#c8b898', g2: '#b0a078', dc: '#b0a078', w1: '#3858b8', w2: '#202868', w3: '#78a0f0', rock: 'brick', tree: 'palm', t1: '#48a048', t2: '#287828', tr: '#8a5a2a', wa1: '#2060c0', wa2: '#60a0f0', bush: '#48a048', bush2: '#287828', seal: ['#3878f8', '#f8d838', '#a8c8ff'], acc: '#f8d838', p1: '#d8c8a0' },
  { id: 'o8', seed: 8, name: 'WILDERNESS', fl: 'sand', g1: '#d0b070', g2: '#b89850', deco: 'bones', w1: '#a08858', w2: '#6a5838', w3: '#c8b080', rock: 'boulder', tree: 'cactus', t1: '#58a058', t2: '#388038', tr: '#6a5838', wa1: '#4890c0', wa2: '#88c8e8', bush: '#908040', bush2: '#605820', seal: ['#e0e0e0', '#a0a0a8', '#fcfcfc'], acc: '#c8b080', p1: '#e0c890' },
  { id: 'o9', seed: 9, name: 'JERUSALEM', fl: 'tile', g1: '#a8a898', g2: '#8a8a7a', dc: '#8a8a7a', w1: '#c8c0a8', w2: '#8a826a', w3: '#e8e0c8', rock: 'brick', tree: 'round', t1: '#708850', t2: '#4a6030', t3: '#90a870', tr: '#6a4a2a', wa1: '#3070c0', wa2: '#70b0f0', bush: '#708850', bush2: '#4a6030', seal: ['#fcfcfc', '#f8d838', '#f8a8a8'], acc: '#f8d838', p1: '#c8c0a0' },
  { id: 'o10', seed: 10, name: 'PATMOS', fl: 'grass', g1: '#4a3a4a', g2: '#382a38', deco: 'bones', w1: '#5a4a5a', w2: '#2a1a2a', w3: '#8a7a8a', rock: 'boulder', tree: 'dead', t1: '#5a3a3a', t2: '#3a2a2a', tr: '#3a2828', wa1: '#602030', wa2: '#a04050', bush: '#5a3a3a', bush2: '#3a2020', seal: ['#f83838', '#f8d838', '#fcfcfc'], acc: '#f83838', p1: '#6a5a6a' }
];
/* ---- dungeon themes ---- */
const DTH = [
  { id: 'd1', seed: 21, fl: 'tile', g1: '#2a5a3a', g2: '#1f4a2f', w1: '#3a7a4a', w2: '#1f4a2f', w3: '#60b070', acc: '#f8d838', deco: 'grass', dc: '#3a7a4a' },
  { id: 'd2', seed: 22, fl: 'tile', g1: '#8a5a2a', g2: '#6a4018', w1: '#a87038', w2: '#5a3410', w3: '#d09858', acc: '#c88040', deco: 'pebble' },
  { id: 'd3', seed: 23, fl: 'tile', g1: '#8a5040', g2: '#6a3828', w1: '#b86848', w2: '#6a3020', w3: '#e09068', acc: '#e09068', deco: 'pebble' },
  { id: 'd4', seed: 24, fl: 'tile', g1: '#c8a860', g2: '#a88840', w1: '#d8b868', w2: '#8a6a30', w3: '#f8e098', acc: '#f8d838', deco: 'pebble' },
  { id: 'd5', seed: 25, fl: 'tile', g1: '#706858', g2: '#585040', w1: '#908878', w2: '#484038', w3: '#b8b0a0', acc: '#d0c0a0', deco: 'pebble' },
  { id: 'd6', seed: 26, fl: 'tile', g1: '#5a6038', g2: '#484e2a', w1: '#7a7048', w2: '#403a20', w3: '#a09868', acc: '#a09868', deco: 'pebble' },
  { id: 'd7', seed: 27, fl: 'tile', g1: '#283878', g2: '#1c2860', w1: '#3858b8', w2: '#182058', w3: '#f8c838', acc: '#f8c838', deco: 'pebble' },
  { id: 'd8', seed: 28, fl: 'tile', g1: '#c0a068', g2: '#a08848', w1: '#8a7048', w2: '#5a4628', w3: '#d8c090', acc: '#d8c090', deco: 'bones' },
  { id: 'd9', seed: 29, fl: 'tile', g1: '#383848', g2: '#2a2a38', w1: '#585870', w2: '#1e1e2a', w3: '#8888a8', acc: '#a8c8ff', deco: 'bones' },
  { id: 'd10', seed: 30, fl: 'tile', g1: '#301828', g2: '#241020', w1: '#701830', w2: '#2a0c18', w3: '#f8c838', acc: '#f83838', deco: 'bones' }
];

/* ---- items ---- */
const ITEMS = {
  flame: { name: 'FLAMING SWORD', icon: 'flame', text: 'THE CHERUBIM\'S FLAMING SWORD! IT STRIKES HARDER AND BURNS THORNY BUSHES.' },
  dove: { name: 'DOVE OF PEACE', icon: 'dove', text: 'PRESS B TO SEND THE DOVE. IT RETURNS TO YOU, STUNNING FOES AND FETCHING TREASURE.', cost: 0 },
  bow: { name: 'HUNTER\'S BOW', icon: 'bow', text: 'PRESS B TO LOOSE AN ARROW. COSTS 1 FAITH.', cost: 1 },
  rod: { name: 'ROD OF MOSES', icon: 'rod', text: 'PRESS B TO STRIKE. IT PARTS THE WATERS BEFORE YOU AND STUNS FOES. COSTS 2 FAITH.', cost: 2 },
  shofar: { name: 'SHOFAR', icon: 'shofar', text: 'PRESS B TO BLOW THE TRUMPET. WALLS CRUMBLE AND ENEMIES REEL. COSTS 3 FAITH.', cost: 3 },
  sling: { name: 'SLING OF DAVID', icon: 'sling', text: 'PRESS B TO HURL A SMOOTH STONE. HEAVY DAMAGE. COSTS 1 FAITH.', cost: 1 },
  shield: { name: 'SHIELD OF FAITH', icon: 'shield', text: 'IT REFLECTS FIERY DARTS AND ARROWS FROM THE FRONT. FACE YOUR FOES!' },
  spirit: { name: 'SWORD OF THE SPIRIT', icon: 'spirit', text: 'THE WORD OF GOD! YOUR BLADE NOW FIRES BEAMS OF LIGHT AND TURNS ASIDE TEMPTATION.' },
  armor: { name: 'ARMOR OF LIGHT', icon: 'armor', text: 'THE ARMOR OF GOD. YOU TAKE LESS DAMAGE FROM EVERY BLOW.' },
  testimony: { name: 'WORD OF OUR TESTIMONY', icon: 'testimony', text: 'PRESS B TO SPEAK THE WORD. ITS LIGHT STUNS A FOE. COSTS 1 FAITH.', cost: 1 },
  blood: { name: 'BLOOD OF THE LAMB', icon: 'blood', text: 'THE POWER THAT OVERCOMES THE ACCUSER. WHEN THE DRAGON COMES, IT WILL BE YOUR ONLY WEAPON.' },
  crown: { name: 'CROWN OF LIFE', icon: 'crown', text: 'THE CROWN OF LIFE FOR THE FAITHFUL! YOUR FAITH OVERFLOWS AND YOUR WOUNDS ARE HEALED.' }
};
const ACTIVE_ITEMS = ['dove', 'bow', 'rod', 'shofar', 'sling', 'testimony'];

/* ---- enemies ---- */
const ENEMY = {
  viper: { name: 'VIPER', shape: 'snake', pal: { a: '#48b848', b: '#287828', c: '#f8e838' }, hp: 2, spd: 30, beh: 'wander', dmg: 1 },
  thornling: { name: 'THORNLING', shape: 'thorn', pal: { a: '#3a8a2a', b: '#2a5a1a', c: '#f83838' }, hp: 3, spd: 36, beh: 'ambush', dmg: 1 },
  figbat: { name: 'FIG BAT', shape: 'bat', pal: { a: '#9a4aa8', b: '#6a2a78', c: '#f8c838' }, hp: 1, spd: 52, beh: 'erratic', fly: 1, dmg: 1 },
  drowned: { name: 'DROWNED', shape: 'ghost', pal: { a: '#78a8d8', b: '#4878a8', c: '#fff' }, hp: 3, spd: 22, beh: 'float', fly: 1, dmg: 1 },
  raven: { name: 'RAVEN', shape: 'bat', pal: { a: '#383848', b: '#202030', c: '#f8c838' }, hp: 2, spd: 70, beh: 'swoop', fly: 1, dmg: 1 },
  sodden: { name: 'SODDEN', shape: 'blob', pal: { a: '#4888c8', b: '#2858a0', c: '#a8d8f8' }, hp: 3, spd: 26, beh: 'wander', dmg: 1 },
  brickling: { name: 'BRICKLING', shape: 'blob', pal: { a: '#c05838', b: '#803018', c: '#e89870' }, hp: 3, spd: 24, beh: 'chase', dmg: 1, split: 'mudling' },
  mudling: { name: 'MUDLING', shape: 'blob', pal: { a: '#a07840', b: '#704818', c: '#d0a870' }, hp: 1, spd: 36, beh: 'chase', dmg: 1, r: 5, small: 1 },
  mason: { name: 'MASON', shape: 'human', pal: { a: '#c89048', b: '#805828', c: '#f8b878' }, hp: 3, spd: 22, beh: 'shooter', shoot: { kind: 'brick', rate: 2.2, spd: 90 }, dmg: 1 },
  babbler: { name: 'BABBLER', shape: 'ghost', pal: { a: '#b878f8', b: '#7848b8', c: '#fff' }, hp: 2, spd: 26, beh: 'float', fly: 1, dmg: 1, confuse: 1 },
  scarab: { name: 'SCARAB', shape: 'bug', pal: { a: '#2880c8', b: '#184880', c: '#f8d838' }, hp: 3, spd: 30, beh: 'charge', dmg: 2 },
  jackal: { name: 'JACKAL', shape: 'beast', pal: { a: '#505060', b: '#303040', c: '#f8c838' }, hp: 3, spd: 46, beh: 'chase', dmg: 1 },
  frog: { name: 'FROG', shape: 'blob', pal: { a: '#58c838', b: '#308018', c: '#f8f838' }, hp: 2, spd: 70, beh: 'hop', dmg: 1 },
  locust: { name: 'LOCUST', shape: 'bug', pal: { a: '#a8b838', b: '#687818', c: '#f88838' }, hp: 1, spd: 60, beh: 'erratic', fly: 1, dmg: 1, r: 5 },
  mummy: { name: 'MUMMY', shape: 'human', pal: { a: '#e0d8b8', b: '#a89870', c: '#e0d8b8' }, hp: 5, spd: 20, beh: 'chase', dmg: 2 },
  sentinel: { name: 'SENTINEL', shape: 'human', pal: { a: '#a83838', b: '#701818', c: '#f8b878' }, hp: 4, spd: 28, beh: 'charge', dmg: 2 },
  archer: { name: 'ARCHER', shape: 'human', pal: { a: '#78a838', b: '#486818', c: '#f8b878' }, hp: 3, spd: 20, beh: 'shooter', shoot: { kind: 'arrow', rate: 2, spd: 110 }, dmg: 1 },
  rubble: { name: 'RUBBLE', shape: 'stone', pal: { a: '#908878', b: '#605848', c: '#c0b8a8' }, hp: 3, spd: 20, beh: 'chase', dmg: 1, split: 'pebble' },
  pebble: { name: 'PEBBLE', shape: 'stone', pal: { a: '#a09888', b: '#706858', c: '#d0c8b8' }, hp: 1, spd: 40, beh: 'chase', dmg: 1, r: 5, small: 1 },
  slinger: { name: 'SLINGER', shape: 'human', pal: { a: '#a85848', b: '#783828', c: '#f8b878' }, hp: 3, spd: 24, beh: 'shooter', shoot: { kind: 'stone', rate: 1.8, spd: 100 }, dmg: 1 },
  bear: { name: 'BEAR', shape: 'beast', pal: { a: '#7a4a28', b: '#4a2a10', c: '#d8a870' }, hp: 6, spd: 34, beh: 'charge', dmg: 2 },
  lion: { name: 'LION', shape: 'beast', pal: { a: '#e0a030', b: '#a06818', c: '#f8e0a0' }, hp: 5, spd: 40, beh: 'charge', dmg: 2 },
  imp: { name: 'FURNACE IMP', shape: 'imp', pal: { a: '#e04828', b: '#a02010', c: '#f8c838' }, hp: 2, spd: 30, beh: 'shooter', shoot: { kind: 'fire', rate: 2.4, spd: 80 }, dmg: 1 },
  flamesprite: { name: 'FLAME', shape: 'flame', pal: { a: '#f85820', b: '#c03010', c: '#f8e038' }, hp: 2, spd: 36, beh: 'float', fly: 1, dmg: 1 },
  magus: { name: 'MAGUS', shape: 'human', pal: { a: '#4838a8', b: '#281868', c: '#f8b878' }, hp: 3, spd: 0, beh: 'teleporter', shoot: { kind: 'orb', rate: 2.4, spd: 80 }, dmg: 1 },
  shade: { name: 'SHADE', shape: 'ghost', pal: { a: '#483858', b: '#281838', c: '#f83838' }, hp: 3, spd: 0, beh: 'teleporter', shoot: { kind: 'orb', rate: 2.2, spd: 85, n: 3, spread: .5 }, fly: 1, dmg: 1 },
  scorpion: { name: 'SCORPION', shape: 'bug', pal: { a: '#c89838', b: '#886018', c: '#f83838' }, hp: 3, spd: 36, beh: 'chase', dmg: 2 },
  stonemimic: { name: 'STONE', shape: 'stone', pal: { a: '#a09068', b: '#706040', c: '#d0c098' }, hp: 4, spd: 40, beh: 'mimic', dmg: 2 },
  coinmimic: { name: 'GOLD', shape: 'coin', pal: { a: '#f8c838', b: '#a07808', c: '#fff0a0' }, hp: 4, spd: 40, beh: 'mimic', dmg: 2 },
  skeleton: { name: 'SKELETON', shape: 'human', pal: { a: '#e8e8d8', b: '#a8a898', c: '#f8f8f0' }, hp: 4, spd: 24, beh: 'chase', dmg: 2 },
  wraith: { name: 'WRAITH', shape: 'skull', pal: { a: '#8890b8', b: '#585888', c: '#a8f8ff' }, hp: 3, spd: 24, beh: 'phase', fly: 1, dmg: 1 },
  stinger: { name: 'STINGER', shape: 'bug', pal: { a: '#c83838', b: '#782020', c: '#f8d838' }, hp: 2, spd: 56, beh: 'erratic', fly: 1, dmg: 2 },
  horseman: { name: 'RIDER', shape: 'beast', pal: { a: '#c82828', b: '#601010', c: '#f8d838' }, hp: 5, spd: 44, beh: 'charge', dmg: 2 },
  unclean: { name: 'UNCLEAN SPIRIT', shape: 'blob', pal: { a: '#88c838', b: '#486818', c: '#f8f838' }, hp: 3, spd: 60, beh: 'hopshoot', shoot: { kind: 'spit', rate: 2.6, spd: 80 }, dmg: 1 },
  harpy: { name: 'HARPY', shape: 'bat', pal: { a: '#c84848', b: '#802828', c: '#f8d838' }, hp: 2, spd: 72, beh: 'swoop', fly: 1, dmg: 1 },
  seabeast: { name: 'SEA BEAST', shape: 'beast', pal: { a: '#487868', b: '#285040', c: '#f8d838' }, hp: 6, spd: 30, beh: 'chase', dmg: 2 },
  falseprophet: { name: 'FALSE PROPHET', shape: 'human', pal: { a: '#e8e0d0', b: '#a02828', c: '#f8b878' }, hp: 5, spd: 0, beh: 'teleporter', shoot: { kind: 'fire', rate: 1.8, spd: 85, n: 3, spread: .35 }, dmg: 2 },
  cinder: { name: 'CINDER', shape: 'flame', pal: { a: '#d83020', b: '#801010', c: '#f8a038' }, hp: 2, spd: 40, beh: 'float', fly: 1, dmg: 1 }
};

/* ---- overworld biome enemy pools ---- */
const OPOOL = [
  ['viper', 'figbat', 'thornling'], ['drowned', 'raven', 'sodden'], ['brickling', 'mason', 'babbler'], ['scarab', 'jackal', 'frog', 'locust'],
  ['sentinel', 'archer', 'rubble'], ['slinger', 'bear', 'jackal'], ['lion', 'imp', 'magus'], ['scorpion', 'jackal', 'shade'],
  ['sentinel', 'archer', 'wraith'], ['stinger', 'harpy', 'cinder', 'unclean']
];

/* ---- dungeons ----  legend: S start, C combat, K key, J item(locked), I item, L locked combat, B boss,
   t stones room, p pinnacle room, g kingdoms room, u furnace/fire room */
const DUNGEONS = [
  { name: 'GARDEN OF EDEN', ref: 'GENESIS 3', boss: 'serpent', bossName: 'THE SERPENT', item: 'flame', mini: 'viper', miniName: 'ELDER ASP', pool: ['viper', 'thornling', 'figbat'], layout: ['...B.', '..CCK', '.JCCK', '..CC.', 'LCSC.'] },
  { name: 'THE ARK', ref: 'GENESIS 6-8', boss: 'leviathan', bossName: 'LEVIATHAN', item: 'dove', mini: 'sodden', miniName: 'DEEP SPAWN', pool: ['drowned', 'raven', 'sodden'], layout: ['....B', '..CCC', '..CCC', '.CCKK', 'JCSCL'] },
  { name: 'TOWER OF BABEL', ref: 'GENESIS 11', boss: 'nimrod', bossName: 'NIMROD THE HUNTER', item: 'bow', mini: 'brickling', miniName: 'BRICK GOLEM', pool: ['brickling', 'mason', 'babbler'], layout: ['.....B', '.J.KCC', '.CLCCC', '.C.CCC', '.CCCCK', '.LCSCK'] },
  { name: 'PHARAOH\'S PYRAMID', ref: 'EXODUS 7-14', boss: 'pharaoh', bossName: 'PHARAOH', item: 'rod', mini: 'mummy', miniName: 'TOMB GUARDIAN', pool: ['scarab', 'jackal', 'frog', 'locust'], layout: ['.B.....', 'CCKL...', 'CCCKCL.', 'CCKCCC.', 'CCCCC..', 'CCCSCJ.'], dark: 0.5 },
  { name: 'WALLS OF JERICHO', ref: 'JOSHUA 6', boss: 'colossus', bossName: 'COLOSSUS OF JERICHO', item: 'shofar', mini: 'sentinel', miniName: 'CAPTAIN OF THE WALL', pool: ['sentinel', 'archer', 'rubble'], layout: ['.B.....', 'JCCCCL.', '.CKCCC.', '.CCCCL.', '.CCCC..', 'CCKCKC.', '.LCSCK.'] },
  { name: 'VALLEY OF ELAH', ref: '1 SAMUEL 17', boss: 'goliath', bossName: 'GOLIATH OF GATH', item: 'sling', mini: 'bear', miniName: 'GREAT BEAR', pool: ['slinger', 'bear', 'sentinel', 'jackal'], layout: ['....B..', '.JCCCCL', '..CCCCC', '.LKKCKC', '..CKCC.', '...CCCL', '.CCSC..'] },
  { name: 'FURNACE OF BABYLON', ref: 'DANIEL 2-3', boss: 'image', bossName: 'THE GREAT IMAGE', item: 'shield', mini: 'lion', miniName: 'LION OF THE DEN', pool: ['lion', 'imp', 'flamesprite', 'magus'], layout: ['...B..', '.CCCCu', '.K.CCC', 'KCuCCu', 'J.CKCL', '.LCC..', 'CCCS..'] },
  { name: 'THE TEMPTATION', ref: 'MATTHEW 4', boss: 'tempter', bossName: 'THE TEMPTER', item: 'spirit', mini: 'shade', miniName: 'LEGION', pool: ['scorpion', 'shade', 'stonemimic', 'coinmimic'], layout: ['...B..', '.LCCKC', '.CgCCp', '..CCtK', '.JCSKL'] },
  { name: 'THE EMPTY TOMB', ref: 'MATTHEW 28', boss: 'death', bossName: 'DEATH', item: 'armor', mini: 'skeleton', miniName: 'GRAVE KNIGHT', pool: ['skeleton', 'wraith', 'skeleton', 'wraith'], layout: ['.....B', '....LC', '..KCCC', '..CCCC', '.LKCCK', 'JCCSCC'], dark: 1 },
  { name: 'THE ABYSS', ref: 'REVELATION 12', boss: 'dragon', bossName: 'THE DRAGON', item: 'testimony', items: ['testimony', 'blood'], mini: 'seabeast', minis: ['seabeast', 'falseprophet'], miniName: 'BEAST FROM THE SEA', pool: ['stinger', 'horseman', 'unclean', 'harpy', 'seabeast', 'cinder'], layout: ['....B...', '.CCCCCL.', '.CCKKKC.', '..CCCKCJ', '..LCCCC.', 'J..uuCCC', 'uCuCCCC.', '..KCSCL.'], dark: 0.3 }
];

/* ---- text ---- */
const SIGNS = [
  'IN THE BEGINNING GOD GAVE MAN DOMINION OVER THE EARTH. (GENESIS 1:28) WALK, HEIR, AND TAKE IT BACK.',
  'THE SERPENT LURKS IN THE GROVE BELOW THE TREE. THE SEAL ON THE EASTERN PATH HOLDS UNTIL HE FALLS.',
  'THE WATERS PREVAILED UPON THE EARTH, BUT NOAH FOUND GRACE. (GENESIS 7)',
  'A RAINBOW IS THE SIGN OF THE COVENANT. THE ARK STILL RESTS UPON THE MOUNTAIN, AND THE DEEP STIRS WITHIN.',
  'COME, LET US BUILD A TOWER WHOSE TOP REACHES TO HEAVEN. (GENESIS 11:4) THE LORD CONFUSED THEIR TONGUES.',
  'NIMROD, A MIGHTY HUNTER BEFORE THE LORD, STILL RULES THE TOWER OF BABEL. BEWARE THE BABBLERS.',
  'THUS SAYS THE LORD: LET MY PEOPLE GO! (EXODUS 5:1)',
  'THE NILE RUNS RED. PHARAOH\'S PYRAMID HOLDS A HARD HEART. A ROD OF GOD MAY YET PART THE SEA.',
  'BY FAITH THE WALLS OF JERICHO FELL DOWN AFTER THEY WERE ENCIRCLED FOR SEVEN DAYS. (HEBREWS 11:30)',
  'ONLY A TRUMPET\'S BLAST WILL BREAK THESE WALLS. SEEK THE COLOSSUS WITHIN THE CITY.',
  'THE VALLEY OF ELAH. FOR FORTY DAYS A GIANT MOCKED THE ARMIES OF GOD. (1 SAMUEL 17:16)',
  'THE LORD WHO DELIVERED ME FROM THE PAW OF THE LION AND THE BEAR WILL DELIVER ME FROM THIS GIANT. (1 SAMUEL 17:37)',
  'BY THE RIVERS OF BABYLON WE SAT DOWN AND WEPT. (PSALM 137:1)',
  'THE KING RAISED AN IMAGE OF GOLD. HEAD OF GOLD, CHEST OF SILVER, BELLY OF BRONZE, LEGS OF IRON, FEET OF CLAY. (DANIEL 2)',
  'MAN SHALL NOT LIVE BY BREAD ALONE, BUT BY EVERY WORD THAT PROCEEDS FROM THE MOUTH OF GOD. (MATTHEW 4:4)',
  'THE SPIRIT LED HIM INTO THE WILDERNESS, FASTING FORTY DAYS. THREE TRIALS AWAIT IN THE CAVES: STONES, THE PINNACLE, THE KINGDOMS.',
  'THEY LED HIM AWAY TO GOLGOTHA, THE PLACE OF A SKULL. (JOHN 19:17)',
  'HE IS NOT HERE, FOR HE IS RISEN, AS HE SAID. (MATTHEW 28:6) YET DEATH STILL STALKS THE TOMB.',
  'I WAS IN THE SPIRIT ON THE LORD\'S DAY ON THE ISLE CALLED PATMOS. (REVELATION 1:9)',
  'BEHOLD, A GREAT RED DRAGON HAVING SEVEN HEADS AND TEN HORNS. (REVELATION 12:3) HE KNOWS HIS TIME IS SHORT.'
];
const SEAL_TEXT = [
  'A FLAMING SEAL BLOCKS THE WAY. IT BREAKS WHEN THE SERPENT FALLS.',
  'A RAINBOW SEAL BLOCKS THE WAY. IT BREAKS WHEN LEVIATHAN IS SLAIN.',
  'A SEAL OF CONFUSED TONGUES BLOCKS THE WAY. NIMROD MUST FALL.',
  'THE WAY IS SEALED. THE RED SEA SLEEPS UNTIL PHARAOH FALLS.',
  'JERICHO\'S WALL STANDS FIRM. ONLY A TRUMPET BLAST WILL BRING IT DOWN.',
  'A SEAL BLOCKS THE WAY. THE GIANT OF GATH MUST FALL.',
  'THE SEAL OF BABYLON HOLDS UNTIL THE GREAT IMAGE FALLS.',
  'A HOLY SEAL BLOCKS THE WAY. THE TEMPTER MUST BE ANSWERED.',
  'THE SEAL HOLDS. DEATH ITSELF MUST BE SWALLOWED UP IN VICTORY.'
];
const INTRO = [
  'IN THE BEGINNING GOD MADE MAN IN HIS IMAGE AND GAVE HIM DOMINION OVER ALL THE EARTH.',
  'BUT A SERPENT DECEIVED, AND DOMINION WAS LOST. THORNS, FLOOD, BABEL, TYRANTS AND DEATH FOLLOWED.',
  'YOU ARE THE HEIR OF THE PROMISE: THE SEED OF THE WOMAN WHO SHALL CRUSH THE SERPENT\'S HEAD.',
  'WALK FROM EDEN TO REVELATION. BREAK TEN SEALS. RESTORE THE DOMINION.'
];
const BOSS_INTRO = {
  serpent: 'DID GOD REALLY SAY...? YOU WILL NOT SURELY DIE.',
  leviathan: 'THE DEEP ROARS. THE FLOOD REMEMBERS ALL.',
  nimrod: 'I AM THE MIGHTIEST HUNTER. I WILL STORM HEAVEN ITSELF!',
  pharaoh: 'WHO IS THE LORD, THAT I SHOULD OBEY HIM?',
  colossus: 'NO TRUMPET BREAKS MY STONE. NO MAN SCALES MY WALL.',
  goliath: 'AM I A DOG, THAT YOU COME TO ME WITH STICKS?',
  image: 'BOW DOWN, OR BURN IN THE FURNACE!',
  tempter: 'IF YOU ARE THE SON OF GOD... COMMAND THESE STONES TO BECOME BREAD.',
  death: 'ALL FLESH WITHERS. ALL ROADS END HERE.',
  dragon: 'I AM THE DRAGON. I DECEIVE THE WHOLE WORLD. KNEEL!'
};
const CLEAR_TEXT = [
  'THE SERPENT\'S HEAD IS CRUSHED! "I WILL PUT ENMITY BETWEEN YOU AND THE WOMAN." (GENESIS 3:15)',
  'THE DEEP IS STILLED. "I SET MY BOW IN THE CLOUD AS A COVENANT." (GENESIS 9:13)',
  'THE TOWER FALLS. "THE LORD SCATTERED THEM OVER THE FACE OF ALL THE EARTH." (GENESIS 11:8)',
  'PHARAOH FALLS. "THE LORD IS MY STRENGTH AND MY SONG." (EXODUS 15:2)',
  'THE WALLS COME DOWN! "BE STRONG AND COURAGEOUS." (JOSHUA 1:9)',
  'THE GIANT FALLS. "THE BATTLE IS THE LORD\'S." (1 SAMUEL 17:47)',
  'THE IMAGE CRUMBLES. "HIS KINGDOM IS AN EVERLASTING KINGDOM." (DANIEL 4:3)',
  'THE TEMPTER FLEES. "THEN ANGELS CAME AND MINISTERED TO HIM." (MATTHEW 4:11)',
  'DEATH IS SWALLOWED UP IN VICTORY! "O DEATH, WHERE IS YOUR STING?" (1 CORINTHIANS 15:55)',
  'THE DRAGON IS CAST DOWN! "BEHOLD, I MAKE ALL THINGS NEW." (REVELATION 21:5)'
];
const ENDING = [
  'THE OLD SERPENT IS BOUND. THE ACCUSER IS CAST DOWN FOREVER.',
  'THE TEN SEALS ARE BROKEN. THE DOMINION LOST IN EDEN IS RESTORED IN THE NEW CREATION.',
  '"BEHOLD, THE DWELLING OF GOD IS WITH MAN. HE WILL WIPE EVERY TEAR FROM THEIR EYES." (REVELATION 21:3-4)',
  'DOMINION RESTORED. THE END.'
];
/* sensible defaults so every dungeon theme can draw water, trees and rocks */
DTH.forEach(t => { t.wa1 = t.wa1 || '#2060c0'; t.wa2 = t.wa2 || '#68b0f8'; t.tree = t.tree || 'round'; t.t1 = t.t1 || '#40a040'; t.t2 = t.t2 || '#207020'; t.tr = t.tr || '#6a4a1a'; t.rock = t.rock || 'boulder'; });

/* ---------- after the Dragon: the throne room and the new earth (Revelation 4-5, 21-22) ---------- */
const HEAVEN_THEME = { id: 'hv', seed: 77, fl: 'tile', g1: '#b8e0f8', g2: '#d8f0ff', g3: '#fcfcfc', w1: '#f8e8a0', w2: '#c8a040', w3: '#fffce8', acc: '#f8d838', deco: 'flower', dc: '#fcfcfc', wa1: '#58a8f8', wa2: '#d8f0ff' };
const HEAVEN_TEXT = {
  arrive: ['"AFTER THIS I LOOKED, AND, BEHOLD, A {DOOR WAS OPENED IN HEAVEN}." (REVELATION 4:1)', 'THE STAIRS BELOW LEAD DOWN TO THE {NEW EARTH}. IN EVERY LAND A {LADDER OF LIGHT} LEADS BACK HERE.'],
  throne: ['"AND HE THAT SAT UPON THE THRONE SAID, {BEHOLD, I MAKE ALL THINGS NEW}." (REVELATION 21:5)'],
  crown: ['YOU CAST YOUR {CROWN OF LIFE} BEFORE THE THRONE, AS THE ELDERS DO. (REVELATION 4:10)', '"THOU ART WORTHY, O LORD, TO RECEIVE GLORY AND HONOUR AND POWER." (REVELATION 4:11)'],
  ladder: ['"AND HE DREAMED, AND BEHOLD A {LADDER} SET UP ON THE EARTH, AND THE TOP OF IT REACHED TO HEAVEN." (GENESIS 28:12)'],
  sealed: ['THE DARKNESS THAT DWELT HERE IS GONE FOR EVER. NOTHING REMAINS TO CONQUER.'],
};
// who stands in the throne room, and what they say (each speaker cycles through its lines)
const HEAVEN_NPCS = [
  { kind: 'lamb', x: 128, y: 78, lines: ['"TO HIM THAT OVERCOMETH WILL I GRANT TO SIT WITH ME IN MY THRONE, EVEN AS I ALSO OVERCAME." (REVELATION 3:21)', '"BEHOLD, I COME QUICKLY." (REVELATION 22:12)', '"I AM ALPHA AND OMEGA, THE BEGINNING AND THE END, THE FIRST AND THE LAST." (REVELATION 22:13)'] },
  { kind: 'lion', x: 88, y: 36 }, { kind: 'ox', x: 168, y: 36 }, { kind: 'man', x: 88, y: 68 }, { kind: 'eagle', x: 168, y: 68 },
  { kind: 'elder', x: 36, y: 44 }, { kind: 'elder', x: 36, y: 76 }, { kind: 'elder', x: 36, y: 108 },
  { kind: 'elder', x: 220, y: 44 }, { kind: 'elder', x: 220, y: 76 }, { kind: 'elder', x: 220, y: 108 },
  { kind: 'angel', x: 76, y: 112 }, { kind: 'angel', x: 180, y: 112 }, { kind: 'angel', x: 76, y: 148 },
  { kind: 'angel', x: 180, y: 148 }, { kind: 'angel', x: 36, y: 148 }, { kind: 'angel', x: 220, y: 148 },
];
const HEAVEN_LINES = {
  angel: [
    '"HOLY, HOLY, HOLY, IS THE LORD OF HOSTS: THE WHOLE EARTH IS FULL OF HIS GLORY." (ISAIAH 6:3)',
    '"WORTHY IS THE LAMB THAT WAS SLAIN TO RECEIVE POWER, AND RICHES, AND WISDOM, AND STRENGTH, AND HONOUR, AND GLORY, AND BLESSING." (REVELATION 5:12)',
    '"GLORY TO GOD IN THE HIGHEST, AND ON EARTH PEACE, GOOD WILL TOWARD MEN." (LUKE 2:14)',
    '"ALLELUIA: FOR THE LORD GOD OMNIPOTENT REIGNETH." (REVELATION 19:6)',
    '"BLESSING, AND HONOUR, AND GLORY, AND POWER, BE UNTO HIM THAT SITTETH UPON THE THRONE, AND UNTO THE LAMB FOR EVER AND EVER." (REVELATION 5:13)',
    '"THERE IS JOY IN THE PRESENCE OF THE ANGELS OF GOD OVER ONE SINNER THAT REPENTETH." (LUKE 15:10)',
    '"BEHOLD, THE TABERNACLE OF GOD IS WITH MEN, AND HE WILL DWELL WITH THEM." (REVELATION 21:3)',
    'WELL DONE, HEIR OF THE PROMISE. THE DOMINION THAT WAS LOST IN EDEN IS RESTORED.',
  ],
  living: ['"HOLY, HOLY, HOLY, LORD GOD ALMIGHTY, WHICH WAS, AND IS, AND IS TO COME." (REVELATION 4:8)', '"AMEN." (REVELATION 5:14)'],
  elder: [
    '"THOU ART WORTHY, O LORD, TO RECEIVE GLORY AND HONOUR AND POWER: FOR THOU HAST CREATED ALL THINGS." (REVELATION 4:11)',
    '"WEEP NOT: BEHOLD, THE LION OF THE TRIBE OF JUDA, THE ROOT OF DAVID, HATH PREVAILED." (REVELATION 5:5)',
    '"THESE ARE THEY WHICH CAME OUT OF GREAT TRIBULATION, AND HAVE WASHED THEIR ROBES, AND MADE THEM WHITE IN THE BLOOD OF THE LAMB." (REVELATION 7:14)',
    'WE ARE FOUR AND TWENTY ELDERS, CLOTHED IN WHITE RAIMENT, WITH CROWNS OF GOLD UPON OUR HEADS. (REVELATION 4:4)',
  ],
};
// the signs of the new earth, one per land
const RESTORED_SIGNS = [
  '"AND THE LEAVES OF THE TREE WERE FOR THE HEALING OF THE NATIONS. AND THERE SHALL BE {NO MORE CURSE}." (REVELATION 22:2-3)',
  '"I DO SET MY BOW IN THE CLOUD, AND IT SHALL BE FOR A TOKEN OF A COVENANT BETWEEN ME AND THE EARTH." (GENESIS 9:13)',
  '"A GREAT MULTITUDE, WHICH NO MAN COULD NUMBER, OF ALL NATIONS, AND KINDREDS, AND PEOPLE, AND TONGUES, STOOD BEFORE THE THRONE." (REVELATION 7:9)',
  '"AND THEY SING THE SONG OF MOSES THE SERVANT OF GOD, AND THE SONG OF THE LAMB." (REVELATION 15:3)',
  '"AND THE GATES OF IT SHALL NOT BE SHUT AT ALL BY DAY: FOR THERE SHALL BE {NO NIGHT} THERE." (REVELATION 21:25)',
  '"THEY SHALL BEAT THEIR SWORDS INTO PLOWSHARES... NEITHER SHALL THEY LEARN WAR ANY MORE." (ISAIAH 2:4)',
  '"AND THE KINGDOM AND {DOMINION}... SHALL BE GIVEN TO THE PEOPLE OF THE SAINTS OF THE MOST HIGH." (DANIEL 7:27)',
  '"THE WILDERNESS AND THE SOLITARY PLACE SHALL BE GLAD FOR THEM; AND THE DESERT SHALL REJOICE, AND BLOSSOM AS THE ROSE." (ISAIAH 35:1)',
  '"O DEATH, WHERE IS THY STING? O GRAVE, WHERE IS THY VICTORY?" (1 CORINTHIANS 15:55)',
  '"AND GOD SHALL WIPE AWAY ALL TEARS FROM THEIR EYES; AND THERE SHALL BE {NO MORE DEATH}." (REVELATION 21:4)',
];
