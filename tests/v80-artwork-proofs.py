from pathlib import Path
import json,io,zipfile,xml.etree.ElementTree as ET
import cairosvg
from PIL import Image,ImageChops,ImageStat
out=Path('artifacts/v80');checks=0
for row in json.loads(Path('assets/packaging-v80/sources.json').read_text()):
 a=Image.open(io.BytesIO(cairosvg.svg2png(bytestring=ET.tostring(ET.fromstring(Path('assets/packaging-v80/'+row['id']+'.svg').read_bytes())),output_width=128,output_height=128))).convert('RGBA')
 b=Image.open(io.BytesIO(cairosvg.svg2png(url=str(out/'proofs'/f"{row['id']}.svg"),output_width=128,output_height=128))).convert('RGBA');aa=Image.new('RGBA',a.size,'white');aa.alpha_composite(a);bb=Image.new('RGBA',b.size,'white');bb.alpha_composite(b);error=sum(ImageStat.Stat(ImageChops.difference(aa.convert('RGB'),bb.convert('RGB'))).mean)/3
 assert error<=3,(row['id'],error);checks+=1
p=out/'downloads/boxstudio-print-scan-evidence.zip'
if p.exists():
 with zipfile.ZipFile(p) as z:
  assert z.testzip() is None;report=json.loads(z.read('print-scan-report.json'));assert report['isoGrade'] is None and report['instrumentReport']['softwareGeneratedGrade'] is False;assert report['reportFile']['sha256'];assert any(n.startswith('print-photo-') for n in z.namelist()) and any(n.startswith('instrument-report-') for n in z.namelist());checks+=1
(out/'independent-results.json').write_text(json.dumps({'status':'PASS','checks':checks}));print('PASS V80 independent proofs:',checks)
