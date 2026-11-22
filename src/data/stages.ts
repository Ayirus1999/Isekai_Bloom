/** Wave and stage definitions for the Blossom Meadow run. */

export interface EnemyGroup {
  id: string;
  count: number;
}

export interface WaveSpec {
  /** Simulated seconds after the stage starts. */
  at: number;
  enemies: EnemyGroup[];
}

export interface StageDef {
  index: number;
  name: string;
  subtitle: string;
  hpScale: number;
  damageScale: number;
  waves: WaveSpec[];
}

export const STAGES: StageDef[] = [
  {
    index: 1,
    name: 'Blossom Meadow',
    subtitle: 'Where the first rift opened',
    hpScale: 1,
    damageScale: 1,
    waves: [
      { at: 0, enemies: [{ id: 'star-slime', count: 3 }] },
      { at: 7, enemies: [{ id: 'star-slime', count: 4 }] },
    ],
  },
  {
    index: 2,
    name: 'Petal Path',
    subtitle: 'Sprites in the tall grass',
    hpScale: 1.1,
    damageScale: 1,
    waves: [
      { at: 0, enemies: [{ id: 'star-slime', count: 3 }, { id: 'forest-sprite', count: 2 }] },
      { at: 8, enemies: [{ id: 'forest-sprite', count: 3 }, { id: 'shadow-bunny', count: 2 }] },
    ],
  },
  {
    index: 3,
    name: 'Knightfall Glade',
    subtitle: 'The corrupted oath',
    hpScale: 1.2,
    damageScale: 1.05,
    waves: [
      { at: 0, enemies: [{ id: 'star-slime', count: 4 }] },
      { at: 6, enemies: [{ id: 'forest-sprite', count: 3 }] },
      { at: 13, enemies: [{ id: 'fairy-knight', count: 1 }] },
    ],
  },
  {
    index: 4,
    name: 'Mushroom Hollow',
    subtitle: 'Spores and shell',
    hpScale: 1.3,
    damageScale: 1.1,
    waves: [
      { at: 0, enemies: [{ id: 'mushroomling', count: 3 }, { id: 'star-slime', count: 3 }] },
      { at: 9, enemies: [{ id: 'crystal-beetle', count: 3 }, { id: 'forest-sprite', count: 2 }] },
    ],
  },
  {
    index: 5,
    name: 'The Sunken Shrine',
    subtitle: 'The meadow guardian wakes',
    hpScale: 1.4,
    damageScale: 1.15,
    waves: [
      { at: 0, enemies: [{ id: 'flame-spirit', count: 2 }, { id: 'mushroomling', count: 2 }] },
      { at: 9, enemies: [{ id: 'crystal-golem', count: 1 }] },
    ],
  },
  {
    index: 6,
    name: 'Scorched Verge',
    subtitle: 'Where the petals blacken',
    hpScale: 1.5,
    damageScale: 1.2,
    waves: [
      { at: 0, enemies: [{ id: 'crystal-beetle', count: 3 }, { id: 'flame-spirit', count: 2 }] },
      { at: 8, enemies: [{ id: 'shadow-bunny', count: 4 }] },
      { at: 15, enemies: [{ id: 'fairy-knight', count: 1 }] },
    ],
  },
  {
    index: 7,
    name: 'Wolfwood',
    subtitle: 'Eyes between the orchard rows',
    hpScale: 1.65,
    damageScale: 1.25,
    waves: [
      { at: 0, enemies: [{ id: 'shadow-wolf', count: 2 }] },
      { at: 9, enemies: [{ id: 'enchanted-treant', count: 1 }] },
      { at: 17, enemies: [{ id: 'forest-sprite', count: 4 }] },
    ],
  },
  {
    index: 8,
    name: 'The Thorn Gate',
    subtitle: "The rift's front line",
    hpScale: 1.55,
    damageScale: 1.3,
    waves: [
      { at: 0, enemies: [{ id: 'mushroomling', count: 4 }, { id: 'crystal-beetle', count: 4 }] },
      { at: 10, enemies: [{ id: 'flame-spirit', count: 2 }, { id: 'shadow-bunny', count: 3 }] },
    ],
  },
  {
    index: 9,
    name: 'Celestial Approach',
    subtitle: 'Everything the rift can spare',
    hpScale: 1.5,
    damageScale: 1.4,
    waves: [
      { at: 0, enemies: [{ id: 'arcane-guardian', count: 1 }, { id: 'shadow-wolf', count: 2 }] },
      { at: 10, enemies: [{ id: 'enchanted-treant', count: 1 }, { id: 'forest-sprite', count: 3 }] },
      { at: 19, enemies: [{ id: 'fairy-knight', count: 1 }] },
    ],
  },
  {
    index: 10,
    name: 'The Heart of the Rift',
    subtitle: 'The Thorn Queen',
    hpScale: 1.8,
    damageScale: 1.5,
    waves: [
      { at: 0, enemies: [{ id: 'thorn-queen', count: 1 }] },
      { at: 12, enemies: [{ id: 'shadow-bunny', count: 3 }] },
    ],
  },
];

export function getStage(index: number): StageDef {
  const stage = STAGES[index];
  if (!stage) throw new Error(`Unknown stage index: ${index}`);
  return stage;
}
