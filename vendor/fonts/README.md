# BoxStudio Chinese interface font

`boxstudio-ui-sc.woff` is a renamed subset of the already bundled Noto Sans SC
Regular font at assets/fonts-v74/sans-sc-400.ttf. Its current license is in
LICENSE-UI.txt; the older subset source license remains in LICENSE.txt.

Regenerate with `python scripts/build-ui-font.py` (requires fontTools).
Run `python scripts/build-ui-font.py --check` to verify that shipping-symbol
names and controls are covered by the actual bundled font. The subset uses UI
characters in src/, with a renamed BoxStudio UI SC family.

This interface subset does not change custom artwork fonts or PDF font embedding.
