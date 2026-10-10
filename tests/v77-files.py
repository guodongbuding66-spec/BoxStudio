"""Compare printed rich text with independent SVG and PDF raster engines."""
from pathlib import Path
import io,json
import fitz,cairosvg,numpy as np
from PIL import Image
root=Path('artifacts/v77/proofs');results=[]
def dilate(a):
 p=np.pad(a,1);return np.logical_or.reduce([p[y:y+a.shape[0],x:x+a.shape[1]]for y in range(3)for x in range(3)])
for i in range(3):
 reference=np.asarray(Image.open(io.BytesIO(cairosvg.svg2png(bytestring=(root/f'rich-{i}.svg').read_bytes(),dpi=600))).convert('RGB'))
 for prefix in ['', 'v19-', 'v23-']:
  name=f'{prefix}rich-{i}';doc=fitz.open(root/(name+'.pdf'));assert len(doc)==1;page=doc[0];assert abs(page.rect.width-120/25.4*72)<.01
  pix=page.get_pixmap(matrix=fitz.Matrix(600/72,600/72),alpha=False);got=np.frombuffer(pix.samples,dtype=np.uint8).reshape(pix.height,pix.width,3);assert reference.shape==got.shape
  a=np.min(reference,axis=2)<150;b=np.min(got,axis=2)<150;assert a.sum()>1000 and b.sum()>1000;agreement=int((a&b).sum())/max(int(a.sum()),int(b.sum()));within=min(int((a&dilate(b)).sum())/int(a.sum()),int((b&dilate(a)).sum())/int(b.sum()));assert agreement>.95 and within>.995,(name,agreement,within)
  # Both blue and magenta fragments must survive as real print ink.
  blue=(got[:,:,2]>got[:,:,0]+20)&(got[:,:,0]<150);purple=(got[:,:,0]>got[:,:,1]+30)&(got[:,:,2]>got[:,:,1]+20)&(got[:,:,1]<120);assert blue.sum()>500 and purple.sum()>500,(name,'missing run ink')
  results.append({'name':name,'agreement':round(agreement,6),'withinOnePixel':round(within,6)});doc.close()
Path('artifacts/v77/file-results.json').write_text(json.dumps({'status':'PASS','proofs':len(results),'dpi':600,'results':results},indent=2));print('PASS V77:',len(results),'independent 600 DPI mixed-font / mixed-color / rotated print comparisons')
