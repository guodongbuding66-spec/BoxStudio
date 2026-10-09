"""Compare final production SVG and PDF using independent Cairo and MuPDF engines."""
from pathlib import Path
from io import BytesIO
import json
import cairosvg
import fitz
import numpy as np
from PIL import Image, ImageDraw
root=Path('artifacts/v73/symbols');report=[];sheet=Image.new('RGB',(960,720),'#eef0f3');draw=ImageDraw.Draw(sheet)
for i,path in enumerate(sorted(root.glob('*.svg'))):
    svg=Image.open(BytesIO(cairosvg.svg2png(url=str(path),dpi=300))).convert('RGB')
    pdf=fitz.open(path.with_suffix('.pdf'));pix=pdf[0].get_pixmap(matrix=fitz.Matrix(300/72,300/72),alpha=False)
    actual=Image.frombytes('RGB',(pix.width,pix.height),pix.samples).crop((0,0,*svg.size))
    a=np.asarray(svg).mean(axis=2)<100;b=np.asarray(actual).mean(axis=2)<100
    ratio=np.count_nonzero(a&b)/np.count_nonzero(a|b)
    assert ratio>.98,(path.stem,ratio)
    assert a.sum()>1000,(path.stem,'Empty artwork')
    report.append({'symbol':path.stem,'ink_overlap':round(ratio,5)})
    col=i%6;row=i//6;sheet.paste(svg.resize((144,144)),(col*160+8,row*240+24));draw.text((col*160+8,row*240+178),path.stem,fill='#202733')
assert len(report)==17
sheet.save('artifacts/v73/symbols-contact-sheet.png')
Path('artifacts/v73/raster-results.json').write_text(json.dumps({'status':'PASS','independent_renderers':['CairoSVG','MuPDF'],'results':report},indent=2))
print(f'PASS independent raster: {len(report)} final production SVG/PDF symbols, minimum ink overlap {min(r["ink_overlap"] for r in report):.3%}')
