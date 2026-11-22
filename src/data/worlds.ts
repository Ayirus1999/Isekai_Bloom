import type { EncounterDef, WorldDef } from '../game/types';

/** A ten-step adventure: fights, two rift blessings, a solo mini-boss and a solo final boss. */
function adventure(options: {
  minibossId: string;
  bossId: string;
  normals: string[];
  elites: string[];
  hp: number;
  damage: number;
}): EncounterDef[] {
  const [a, b, c, d] = options.normals;
  const [eliteA, eliteB, eliteC] = options.elites;
  const scale = (n: number) => ({
    hpScale: options.hp * n,
    damageScale: options.damage * n,
  });

  return [
    {
      kind: 'group',
      title: 'Riftfall',
      subtitle: 'The first tear answers your arrival.',
      groups: [{ id: a!, count: 3 }],
      reward: 40,
      ...scale(1),
    },
    {
      kind: 'group',
      title: 'Gathering Shadows',
      subtitle: 'Something is calling them here.',
      groups: [{ id: a!, count: 3 }, { id: b!, count: 2 }],
      reward: 55,
      ...scale(1.06),
    },
    {
      kind: 'event',
      title: 'A Star Petal Remains',
      subtitle: 'Warm light settles on your blade.',
      groups: [],
      reward: 30,
      ...scale(1),
    },
    {
      kind: 'group',
      title: 'Broken Formation',
      subtitle: 'They have learned to fight together.',
      groups: [{ id: b!, count: 3 }, { id: c!, count: 2 }],
      reward: 70,
      ...scale(1.14),
    },
    {
      kind: 'miniboss',
      title: 'The Seal Holds',
      subtitle: 'A guardian steps out of the rift — alone.',
      groups: [{ id: options.minibossId, count: 1 }],
      reward: 150,
      ...scale(1.2),
    },
    {
      kind: 'group',
      title: 'The Long Road',
      subtitle: 'A larger host bars the way.',
      groups: [{ id: a!, count: 3 }, { id: c!, count: 3 }],
      reward: 90,
      ...scale(1.3),
    },
    {
      kind: 'group',
      title: 'Elite Vanguard',
      subtitle: 'Corrupted champions take the field.',
      groups: [{ id: eliteA!, count: 1 }, { id: d!, count: 2 }],
      reward: 120,
      ...scale(1.38),
    },
    {
      kind: 'event',
      title: 'Rift Blessing',
      subtitle: 'The Star Petals answer your resolve.',
      groups: [],
      reward: 50,
      ...scale(1),
    },
    {
      kind: 'group',
      title: 'Last Threshold',
      subtitle: 'Everything the rift has left.',
      groups: [{ id: eliteB!, count: 1 }, { id: eliteC!, count: 1 }, { id: b!, count: 2 }],
      reward: 160,
      ...scale(1.46),
    },
    {
      kind: 'final',
      title: 'The Heart of the Rift',
      subtitle: 'One guardian. One stage. No reinforcements.',
      groups: [{ id: options.bossId, count: 1 }],
      reward: 400,
      ...scale(1.5),
    },
  ];
}

export const WORLDS: WorldDef[] = [
  {
    id: 'blossom',
    name: 'Blossom Meadow',
    jp: '花咲の草原',
    subtitle: 'Where the first rift opened',
    element: 'nature',
    accent: '#ffb7d0',
    skyTop: '#2b2350',
    skyBottom: '#ffc7b2',
    ground: '#7fce8d',
    groundDark: '#3d7a58',
    motif: 'meadow',
    minibossId: 'thorn-guardian',
    bossId: 'thorn-queen',
    unlockCost: 0,
    encounters: adventure({
      minibossId: 'thorn-guardian',
      bossId: 'thorn-queen',
      normals: ['star-slime', 'forest-sprite', 'shadow-bunny', 'thorn-crawler'],
      elites: ['fairy-knight', 'enchanted-treant', 'crystal-golem'],
      hp: 1,
      damage: 1,
    }),
  },
  {
    id: 'forest',
    name: 'Moonlit Forest',
    jp: '月影の森',
    subtitle: 'Luminous mushrooms and older things',
    element: 'moon',
    accent: '#a9e8ff',
    skyTop: '#101a33',
    skyBottom: '#334d7a',
    ground: '#2f4b53',
    groundDark: '#17282f',
    motif: 'forest',
    minibossId: 'moonlit-sentinel',
    bossId: 'crystal-dragon',
    unlockCost: 250,
    encounters: adventure({
      minibossId: 'moonlit-sentinel',
      bossId: 'crystal-dragon',
      normals: ['forest-sprite', 'mushroomling', 'shadow-bunny', 'arcane-wisp'],
      elites: ['shadow-wolf', 'enchanted-treant', 'fairy-knight'],
      hp: 1.5,
      damage: 1.25,
    }),
  },
  {
    id: 'crystal',
    name: 'Crystal Kingdom',
    jp: '水晶の王国',
    subtitle: 'A court of glass and frozen light',
    element: 'ice',
    accent: '#bfe9ff',
    skyTop: '#1c2c5e',
    skyBottom: '#9fd8f5',
    ground: '#a8c8e8',
    groundDark: '#506a94',
    motif: 'crystal',
    minibossId: 'crystal-warden',
    bossId: 'crystal-dragon',
    unlockCost: 500,
    encounters: adventure({
      minibossId: 'crystal-warden',
      bossId: 'crystal-dragon',
      normals: ['crystal-beetle', 'arcane-wisp', 'star-slime', 'corrupted-fairy'],
      elites: ['crystal-golem', 'arcane-guardian', 'fairy-knight'],
      hp: 2.0,
      damage: 1.5,
    }),
  },
  {
    id: 'ember',
    name: 'Ember Highlands',
    jp: '燼火の高地',
    subtitle: 'A sky the colour of banked coals',
    element: 'fire',
    accent: '#ffb27a',
    skyTop: '#2a0f1a',
    skyBottom: '#ff7a4d',
    ground: '#7a3a34',
    groundDark: '#3a1717',
    motif: 'ember',
    minibossId: 'ember-beast',
    bossId: 'fallen-star-guardian',
    unlockCost: 800,
    encounters: adventure({
      minibossId: 'ember-beast',
      bossId: 'fallen-star-guardian',
      normals: ['flame-spirit', 'shadow-bunny', 'thorn-crawler', 'corrupted-fairy'],
      elites: ['shadow-wolf', 'enchanted-treant', 'fairy-knight'],
      hp: 2.5,
      damage: 1.8,
    }),
  },
  {
    id: 'celestial',
    name: 'Celestial Ruins',
    jp: '天空の遺跡',
    subtitle: 'Where the Starflower Goddess slept',
    element: 'light',
    accent: '#ffe6a8',
    skyTop: '#1a1535',
    skyBottom: '#6b5ba8',
    ground: '#b9a9d8',
    groundDark: '#5e4f84',
    motif: 'celestial',
    minibossId: 'moonlit-sentinel',
    bossId: 'corrupted-celestial',
    unlockCost: 1200,
    encounters: adventure({
      minibossId: 'moonlit-sentinel',
      bossId: 'corrupted-celestial',
      normals: ['corrupted-fairy', 'arcane-wisp', 'crystal-beetle', 'star-slime'],
      elites: ['arcane-guardian', 'crystal-golem', 'fairy-knight'],
      hp: 3.2,
      damage: 2.2,
    }),
  },
];

export function getWorld(id: string): WorldDef {
  return WORLDS.find((world) => world.id === id) ?? WORLDS[0]!;
}

export function toRoman(n: number): string {
  return ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X'][n - 1] ?? String(n);
}
