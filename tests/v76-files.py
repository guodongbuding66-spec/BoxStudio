"""Independent 600 DPI MuPDF/CairoSVG proof comparison, including original source SVGs."""
from pathlib import Path
import io,json,math,copy
import fitz,cairosvg,numpy as np
from PIL import Image
from lxml import etree
ROOT=Path('artifacts/v76/proofs');model=json.loads(Path('artifacts/v76/model-results.json').read_text());results=[]
def raster(svg,pdf_path):
 doc=fitz.open(pdf_path);assert len(doc)==1;page=doc[0];assert abs(page.rect.width-120/25.4*72)<.01 and abs(page.rect.height-90/25.4*72)<.01
 pix=page.get_pixmap(matrix=fitz.Matrix(600/72,600/72),alpha=False);ref=np.asarray(Image.open(io.BytesIO(cairosvg.svg2png(bytestring=svg,dpi=600))).convert('RGB'));got=np.frombuffer(pix.samples,dtype=np.uint8).reshape(pix.height,pix.width,3).copy();doc.close();assert ref.shape==got.shape;return ref,got
def compare(name,svg_path=None,pdf_path=None):
 ref,got=raster((svg_path or ROOT/(name+'.svg')).read_bytes(),pdf_path or ROOT/(name+'.pdf'));a=np.min(ref,axis=2)<120;b=np.min(got,axis=2)<120;aa=int(a.sum());bb=int(b.sum());assert min(aa,bb)>200,name+' empty';agreement=int((a&b).sum())/max(aa,bb);assert agreement>=.98,(name,agreement,aa,bb);foreground=got[b];assert np.median(foreground[:,2])>np.median(foreground[:,0])+10,name+' lost real ink';results.append({'name':name,'inkAgreement':round(agreement,6),'inkPixels':bb})
for name in model['proofNames']:compare(name)
for id in ['leaf','houndstooth','topography','overcast']:
 for kind in ['native','v19']:compare(kind+'-'+id,svg_path=ROOT/('pattern-'+id+'.svg'))
for i in range(4):compare('native-rotated-'+str(i),svg_path=ROOT/('rotated-'+str(i)+'.svg'))
for entry in json.loads(Path('assets/patterns-v76/sources.json').read_text()):
 id=entry['id'];source=etree.fromstring(Path('assets/patterns-v76/'+id+'.svg').read_bytes());source.set('width','32');height=32*entry['height']/entry['width'];source.set('height',str(height));tiles=[]
 for iy in range(math.ceil(60/height)):
  for ix in range(math.ceil(90/32)):
   tile=copy.deepcopy(source);tile.set('x',str(ix*32));tile.set('y',str(iy*height));tile.set('overflow','hidden');tiles.append(etree.tostring(tile).decode())
 svg='<svg xmlns="http://www.w3.org/2000/svg" width="120mm" height="90mm" viewBox="0 0 120 90"><rect width="120" height="90" fill="white"/><defs><clipPath id="frame"><rect width="90" height="60"/></clipPath></defs><g transform="translate(12 12)" clip-path="url(#frame)">'+''.join(tiles)+'</g></svg>';ref,got=raster(svg.encode(),ROOT/('pattern-'+id+'.pdf'));a=np.min(ref,axis=2)<180;b=np.min(got,axis=2)<180;agreement=int((a&b).sum())/max(int(a.sum()),int(b.sum()));assert agreement>=.98,(id,'original source geometry changed',agreement);results.append({'name':'original-'+id,'inkAgreement':round(agreement,6)})
Path('artifacts/v76/file-results.json').write_text(json.dumps({'status':'PASS','proofs':len(results),'minimumInkAgreement':min(r['inkAgreement']for r in results),'results':results},indent=2));print('PASS V0.76:',len(results),'independent 600 DPI native/source vector comparisons; minimum',min(r['inkAgreement']for r in results))
