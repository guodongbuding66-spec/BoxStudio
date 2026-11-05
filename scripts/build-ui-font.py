"""Build the UI subset from the already bundled OFL font; --check verifies labels."""
from pathlib import Path
import sys
from fontTools.ttLib import TTFont
from fontTools import subset

root = Path(__file__).resolve().parent.parent
labels = ''.join((root / 'src' / p).read_text() for p in
                 ['handlingArtworkV82.js', 'handlingSymbolsV72.js', 'symbolLibraryV73.js', 'symbolBatchV83.js'])
target = root / 'vendor/fonts/boxstudio-ui-sc.woff'
if '--check' in sys.argv:
    cmap = TTFont(target).getBestCmap()
    missing = sorted({c for c in labels if '\u4e00' <= c <= '\u9fff' and ord(c) not in cmap})
    if missing:
        raise SystemExit('Missing UI glyphs: ' + ''.join(missing))
    print('PASS Chinese shipping-symbol labels covered by bundled UI font')
    raise SystemExit(0)

font = TTFont(root / 'assets/fonts-v74/sans-sc-400.ttf')
text = ''.join(p.read_text(errors='ignore') for p in (root / 'src').glob('*')
               if p.suffix in ['.js', '.css'])
options = subset.Options()
options.layout_features = ['*']
subsetter = subset.Subsetter(options=options)
subsetter.populate(unicodes={ord(c) for c in text} | set(range(32, 127)))
subsetter.subset(font)
names = {1: 'BoxStudio UI SC', 2: 'Regular', 3: 'BoxStudio UI SC subset 0.82',
         4: 'BoxStudio UI SC', 6: 'BoxStudioUISc-Regular'}
for name in font['name'].names:
    if name.nameID in names:
        name.string = names[name.nameID].encode(name.getEncoding(), errors='replace')
font.flavor = 'woff'
font.save(target)
print('Built UI font:', target.stat().st_size, 'bytes')
