"""Independent print verification: Cairo SVG, MuPDF PDF, ZIP reader and ZXing."""
from pathlib import Path
from io import BytesIO
import json,zipfile,xml.etree.ElementTree as ET
import cairosvg,fitz,numpy as np,zxingcpp
from PIL import Image
root=Path('artifacts/v74');results=[]
for path in sorted(root.glob('font-*.svg'))+sorted(root.glob('asset-*.svg')):
    doc=fitz.open(path.with_suffix('.pdf'))
    tree=ET.fromstring(path.read_bytes());w=float(tree.get('width').removesuffix('mm'));h=float(tree.get('height').removesuffix('mm'))
    assert abs(doc[0].rect.width-w*72/25.4)<.05 and abs(doc[0].rect.height-h*72/25.4)<.05
    # Fine serif hairlines need 600 dpi to compare binary ink coverage across
    # independent antialiasers. Keep the 98% threshold and actual 1:1 scale.
    # Crop only blank paper for bounded memory, on the same pixel grid.
    bounds=fitz.Rect()
    for drawing in doc[0].get_drawings():
        if (drawing.get('fill') and min(drawing['fill'])<.9) or (drawing.get('color') and min(drawing['color'])<.9):
            bounds |= drawing['rect']
    assert not bounds.is_empty,(path.stem,'No printable vector')
    bounds=fitz.Rect(bounds.x0-3,bounds.y0-3,bounds.x1+3,bounds.y1+3)&doc[0].rect
    dpi=600;pix=doc[0].get_pixmap(matrix=fitz.Matrix(dpi/72,dpi/72),clip=bounds,alpha=False)
    scale=dpi/25.4;tree.set('width',str(pix.width));tree.set('height',str(pix.height));tree.set('viewBox',f'{pix.x/scale} {pix.y/scale} {pix.width/scale} {pix.height/scale}')
    svg=Image.open(BytesIO(cairosvg.svg2png(bytestring=ET.tostring(tree)))).convert('RGB')
    pdf=Image.frombytes('RGB',(pix.width,pix.height),pix.samples)
    a=np.asarray(svg).mean(axis=2)<100;b=np.asarray(pdf).mean(axis=2)<100
    overlap=np.count_nonzero(a&b)/np.count_nonzero(a|b)
    assert overlap>.98,(path.stem,overlap)
    assert a.sum()>1000,(path.stem,'Empty vector')
    results.append({'file':path.stem,'ink_overlap':round(overlap,5)})
assert len(results)==44
scans=[]
for archive in [root/'both-marks.zip',*root.glob('downloads-*/boxstudio-front-and-side-marks.zip')]:
    with zipfile.ZipFile(archive) as z:
        assert z.testzip() is None and len(z.namelist())==5
        front=next(n for n in z.namelist() if n.startswith('front') and n.endswith('.pdf'))
        data=z.read(front);doc=fitz.open(stream=data,filetype='pdf');pix=doc[0].get_pixmap(matrix=fitz.Matrix(300/72,300/72),alpha=False)
        decoded=zxingcpp.read_barcodes(Image.frombytes('RGB',(pix.width,pix.height),pix.samples))
        values=[x.text for x in decoded]
        assert 'ITEM-001' in values,(archive,values)
        assert any(x.format==zxingcpp.BarcodeFormat.Code39 for x in decoded),(archive,values)
        assert any(x.format==zxingcpp.BarcodeFormat.QRCode for x in decoded),(archive,values)
        scans.append({'archive':str(archive),'values':values})
Path('artifacts/v74/independent-print-results.json').write_text(json.dumps({'status':'PASS','engines':['CairoSVG','MuPDF','ZXing','Python ZIP'],'vectors':results,'actual_download_scans':scans},indent=2))
print('PASS 44 SVG/PDF vector comparisons; min overlap',min(x['ink_overlap'] for x in results),'and',len(scans),'two-face ZIP barcode/QR scans')
