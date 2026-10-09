from pathlib import Path
import cairosvg, fitz, io, json
import numpy as np
from PIL import Image
root=Path('artifacts/v75'); checks=[]
for name,size in [('portrait-2k.png',(1152,2048)),('square-4k.png',(4096,4096))]:
    image=Image.open(root/name); assert image.size==size,(name,image.size)
    pixels=np.array(image.convert('RGB')); assert pixels.std()>12,name
    assert pixels[0,0,0]>pixels[0,0,2], 'uploaded pink backdrop appears in '+name
    checks.append(name+' independently decoded dimensions/background/variation')
for directory in sorted(root.glob('downloads-*')):
    svg=(directory/'boxstudio-mark.svg').read_bytes(); pdf=(directory/'boxstudio-mark-1to1.pdf').read_bytes()
    page=fitz.open(stream=pdf,filetype='pdf')[0]
    assert abs(page.rect.width-320*72/25.4)<.05 and abs(page.rect.height-220*72/25.4)<.05
    a=Image.open(io.BytesIO(cairosvg.svg2png(bytestring=svg,scale=1))).convert('RGB')
    pix=page.get_pixmap(matrix=fitz.Matrix(25.4/72,25.4/72),alpha=False)
    b=Image.frombytes('RGB',(pix.width,pix.height),pix.samples).resize(a.size)
    agreement=float(np.mean(np.abs(np.array(a,dtype=float)-np.array(b,dtype=float))<48))
    assert agreement>.97,(directory,agreement)
    checks.append(str(directory)+' PDF/SVG image agreement '+str(round(agreement,5)))
(root/'file-results.json').write_text(json.dumps(dict(status='PASS',checks=checks),indent=2))
print('PASS V0.75: '+str(len(checks))+' independently decoded native download checks')
