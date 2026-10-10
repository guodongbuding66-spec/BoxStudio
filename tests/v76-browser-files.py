"""Verify complete Chrome downloads with independent PDF/SVG/ZIP readers and code scanning."""
from pathlib import Path
import json,io,zipfile
import fitz,cairosvg,zxingcpp,numpy as np
from PIL import Image
results=[]
for viewport in ['desktop','laptop','tablet','mobile']:
 root=Path('artifacts/v76/downloads-'+viewport);pdf=fitz.open(root/'boxstudio-mark-1to1.pdf');page=pdf[0];assert abs(page.rect.width-320/25.4*72)<.01 and abs(page.rect.height-220/25.4*72)<.01
 pix=page.get_pixmap(matrix=fitz.Matrix(300/72,300/72),alpha=False);image=Image.frombytes('RGB',(pix.width,pix.height),pix.samples);codes=zxingcpp.read_barcodes(image);values=[c.text for c in codes];assert values.count('ITEM-001')>=2,(viewport,'PDF codes',values);assert any(c.format==zxingcpp.BarcodeFormat.Code39 for c in codes)and any(c.format==zxingcpp.BarcodeFormat.QRCode for c in codes)
 svg=(root/'boxstudio-mark.svg').read_bytes();assert b'data-font-v74="playfair"'in svg and b'data-pattern-v76="houndstooth"'in svg and b'CC BY 4.0'in svg;assert b'selection-box'not in svg and b'mark-hit'not in svg
 image=Image.open(io.BytesIO(cairosvg.svg2png(bytestring=svg,dpi=300)));svg_codes=zxingcpp.read_barcodes(image);assert [c.text for c in svg_codes].count('ITEM-001')>=2,(viewport,'SVG codes')
 with zipfile.ZipFile(root/'boxstudio-front-and-side-marks.zip')as z:
  assert {'front-mark.pdf','front-mark.svg','side-mark.pdf','side-mark.svg','mark-project.json','pattern-attribution.txt'}<=set(z.namelist());assert b'CC BY 4.0'in z.read('pattern-attribution.txt');project=json.loads(z.read('mark-project.json'));side=project['markFacesV74']['side'];vertical=next(e for e in side['elements']if e['id']=='side-vertical');assert vertical['textStyleV76']['direction']=='vertical-rl'and vertical['bold'];side_pdf=fitz.open(stream=z.read('side-mark.pdf'),filetype='pdf');assert abs(side_pdf[0].rect.width-220/25.4*72)<.01;assert b'data-font-v74="serif-sc"'in z.read('side-mark.svg');side_pdf.close()
 pdf.close();results.append({'viewport':viewport,'status':'PASS','PDFandSVGscan':'CODE39 + QR / ITEM-001','faces':2,'license':'CC BY 4.0','nativeDownloadComplete':True})
Path('artifacts/v76/download-file-results.json').write_text(json.dumps(results,indent=2));print('PASS V0.76: native PDF/SVG code scanning, ZIP contents, separate faces and credits in 4 viewports')
