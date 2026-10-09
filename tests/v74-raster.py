"""Independent print verification: Cairo SVG, MuPDF PDF, ZIP reader and ZXing."""
from pathlib import Path
from io import BytesIO
import json,zipfile
import cairosvg,fitz,numpy as np,zxingcpp
from PIL import Image
root=Path('artifacts/v74');results=[]
for path in sorted(root.glob('font-*.svg'))+sorted(root.glob('asset-*.svg')):
    svg=Image.open(BytesIO(cairosvg.svg2png(url=str(path),dpi=300))).convert('RGB')
    doc=fitz.open(path.with_suffix('.pdf'));pix=doc[0].get_pixmap(matrix=fitz.Matrix(300/72,300/72),alpha=False)
    pdf=Image.frombytes('RGB',(pix.width,pix.height),pix.samples).crop((0,0,*svg.size))
    a=np.asarray(svg).mean(axis=2)<100;b=np.asarray(pdf).mean(axis=2)<100
    overlap=np.count_nonzero(a&b)/np.count_nonzero(a|b)
    assert overlap>.98,(path.stem,overlap)
    assert a.sum()>1000,(path.stem,'Empty vector')
    results.append({'file':path.stem,'ink_overlap':round(overlap,5)})
assert len(results)==36
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
print('PASS 36 SVG/PDF vector comparisons; min overlap',min(x['ink_overlap'] for x in results),'and',len(scans),'two-face ZIP barcode/QR scans')
