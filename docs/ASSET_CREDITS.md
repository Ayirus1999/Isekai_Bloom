# Asset credits

## Character, background and boss art

All illustrations in `assets/` were generated specifically for this project with an image-generation
model and then integrated here. They are original works made for *Hoshi no Hanabira: Isekai Bloom*
and are not derived from any existing anime, manga or game artwork.

| File | Subject | Purpose |
| --- | --- | --- |
| `assets/heroes/yuzuki-portrait.jpg` | Yuzuki Hoshino key visual | Title screen, roster card, HUD portrait |
| `assets/heroes/yuzuki-sprite.jpg` | Yuzuki full-body figure on chroma green | In-combat sprite (keyed at runtime) |
| `assets/backgrounds/blossom-meadow.jpg` | Blossom Meadow stage backdrop | Combat background, menu backdrop |
| `assets/bosses/thorn-queen.jpg` | The Thorn Queen | Boss encounter sprite |

The in-combat sprite is chroma-keyed in the browser (`src/render/assets.ts`): pixels close to the
key colour are made transparent and green fringing is removed, so the flat green backdrop never
reaches the screen.

Character designs are original interpretations of broad archetypes (elegant swordswoman, energetic
duelist, gentle princess, warm guardian, refined aristocrat, ethereal mage). No existing character's
face, outfit, hairstyle, accessory or pose is reproduced.

## Audio

There are no audio files in this repository. Every sound effect is synthesised at runtime with the
Web Audio API (`src/audio/sfx.ts`), which keeps the project free of sampled or licensed audio.

## Fonts

The interface uses the player's locally installed fonts through a system serif/sans stack. No font
files are bundled or downloaded.

## Code and libraries

Runtime code is written for this project. Development dependencies: Vite, TypeScript and Vitest,
each under its own licence (MIT). They are not redistributed in source form.

## Licensing note

No licence has been chosen for this repository yet. Until one is added, the code and art remain
all-rights-reserved by the author; treat the repository as source-available rather than open source.
