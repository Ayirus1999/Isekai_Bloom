/** Fixed logical viewport and arena measurements, in canvas pixels. */

export const VIEW_W = 1280;
export const VIEW_H = 720;

/** The heroine may walk across this span; the camera follows her. */
export const ARENA_WIDTH = 2600;
export const ARENA_MIN_X = 160;
export const ARENA_MAX_X = ARENA_WIDTH - 160;

/** Y coordinate of the ground line where characters stand. */
export const GROUND_Y = 616;

/** Height the heroine sprite is drawn at. */
export const HERO_SPRITE_HEIGHT = 268;

export const CAMERA_LERP = 4.2;
export const CAMERA_SHAKE_DECAY = 7;
