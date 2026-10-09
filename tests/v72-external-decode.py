"""Decode rasterized bytes of the final production PDFs with independent ZXing."""
import json
from pathlib import Path
import fitz
import zxingcpp
from PIL import Image
root=Path('artifacts/v72/codes')
report=[]
for item in json.loads((root/'fixtures.json').read_text()):
    doc=fitz.open(root/item['path']); pix=doc[0].get_pixmap(matrix=fitz.Matrix(300/72,300/72),alpha=False)
    image=Image.frombytes('RGB',(pix.width,pix.height),pix.samples)
    found=zxingcpp.read_barcodes(image)
    expected=item['value']
    if item['type']=='upca': expected='0'+expected  # UPC-A is also valid EAN-13.
    texts=[x.text for x in found]
    if item['type']=='gs1-128':
        expected=expected.replace('(','').replace(')','')
        texts=[x.replace('(','').replace(')','') for x in texts]
    if item['type']=='itf14': texts=[x.lstrip('0') for x in texts];expected=expected.lstrip('0')
    assert expected in texts,(item['path'],expected,texts)
    report.append({'file':item['path'],'decoded':[x.text for x in found],'format':str(found[0].format),'dpi':300})
(root/'external-decode.json').write_text(json.dumps({'status':'PASS','results':report},ensure_ascii=False,indent=2))
print(f'PASS external ZXing: {len(report)} real production PDF files at 300 DPI')
