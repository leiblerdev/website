# Leibler logo

Built from favicon.svg: black rounded tile, lowercase "l", grey cursor block (#6b6b6b).
Glyphs are outlined paths (no font dependency), taken from DejaVu Sans Mono
(Bitstream Vera license, free for embedding and modification). It is the same "l"
that Menlo renders in the favicon, so the logo and favicon match on every platform.

| File | Use |
|---|---|
| logo-mark.svg / .png | Icon only, black tile (avatars, app icons) |
| logo-mark-light.svg / .png | Icon only, white tile |
| logo-dark.svg / .png | Mark + "leibler" wordmark, white text, for dark backgrounds (site default) |
| logo-light.svg / .png | Same lockup, black text, for light backgrounds |
| wordmark-dark.svg, wordmark-light.svg | "leibler" + cursor block, no tile |
| logo-social.svg / .png | 640x640 black square with stacked mark and wordmark (X, LinkedIn, GitHub org) |

PNGs are 512px tall (social: 1024px). Re-export any size with `rsvg-convert -h <px> file.svg -o file.png`.
