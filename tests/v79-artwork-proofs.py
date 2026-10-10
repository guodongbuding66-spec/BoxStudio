"""Independent SVG raster comparison against downloaded originals; native PDF proofs."""
from pathlib import Path
import json,io,zipfile
import cairosvg,pymupdf as fitz
from PIL import Image,ImageChops,ImageStat
root=Path('.');out=root/'artifacts/v79';checks=0
for row in json.loads((root/'assets/packaging-v79/sources.json').read_text()):
 a=Image.open(io.BytesIO(cairosvg.svg2png(url=str(root/'assets/packaging-v79'/f"{row['id']}.svg"),output_width=128,output_height=128))).convert('RGBA')
 b=Image.open(io.BytesIO(cairosvg.svg2png(url=str(out/'proofs'/f"{row['id']}.svg"),output_width=128,output_height=128))).convert('RGBA')
 # Composite over white to compare edge antialiasing and colored geometry.
 aa=Image.new('RGBA',a.size,'white');aa.alpha_composite(a);bb=Image.new('RGBA',b.size,'white');bb.alpha_composite(b)
 error=sum(ImageStat.Stat(ImageChops.difference(aa.convert('RGB'),bb.convert('RGB'))).mean)/3
 if error>3:raise AssertionError((row['id'],'Original multicolor curve mismatch',error))
 checks+=1
for p in (out/'proofs').glob('*.pdf'):
 doc=fitz.open(p);assert len(doc)==1
 pix=doc[0].get_pixmap(matrix=fitz.Matrix(1,1));assert pix.width>100 and pix.height>100
 assert sum(n<240 for n in pix.samples)>100,'Native glyphs actually render'
 pix.save(str(p.with_suffix('.png')));checks+=1
with zipfile.ZipFile(out/'proofs/process-plates.zip') as z:
 assert z.testzip() is None
 meta=json.loads(z.read('process-plates.json'));assert meta['units']=='mm' and meta['plates']
 for name in z.namelist():
  if name.endswith('.svg'):assert len(cairosvg.svg2png(bytestring=z.read(name)))>100
 checks+=1
(out/'independent-results.json').write_text(json.dumps({'status':'PASS','checks':checks},indent=2));print('PASS V79 independent renderer:',checks,'original color SVG / real native PDF / process ZIP checks')
