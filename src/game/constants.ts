/**
 * Fixed logical layout. The arena never scrolls: the heroine holds the left side and enemies
 * occupy the right-hand band. All positions are in a 1280x720 reference space that the renderer
 * fits to the viewport.
 */
export const VIEW_W = 1280;
export const VIEW_H = 720;

/** Ground line every combatant stands on. */
export const GROUND_Y = 596;

/** The heroine's permanent battle anchor. Lunges are animation-only and return here. */
export const HERO_X = 318;

/** The band regular enemy formations occupy. */
export const ENEMY_LANE_MIN = 660;
export const ENEMY_LANE_MAX = 1160;

/** A solo boss holds the centre-right of the stage. */
export const BOSS_X = 930;

/** Reference heroine height in logical pixels. */
export const HERO_HEIGHT = 292;

/** Kept for modules that used the scrolling-arena constants before the fixed layout. */
export const ARENA_WIDTH = VIEW_W;
export const ARENA_MIN_X = 60;
export const ARENA_MAX_X = VIEW_W - 60;
export const CAMERA_LERP = 0;

/** Legacy alias. */
export const HERO_SPRITE_HEIGHT = HERO_HEIGHT;

/** How long a cleared formation lingers so death animations can finish. */
export const ENCOUNTER_CLEAR_DELAY = 1.15;

/** How long the victory / defeat tableau holds before the results screen. */
export const VICTORY_HOLD = 1.7;

/** Interface colours reused by the canvas renderer. */
export const INK = '#1a1424';
export const CREAM = '#f6ecd9';
export const GOLD = '#f0c987';
