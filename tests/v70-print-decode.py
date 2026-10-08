"""Independent decoder reads 300 DPI rasterized final PDF pages, both physical sizes."""
import json, subprocess
from pathlib import Path
from PIL import Image
import zxingcpp

manifest=json.loads(Path('artifacts/v70/scan-manifest.json').read_text())
for case in manifest:
    stem=Path(case['file']).with_suffix('')
    subprocess.run(['pdftoppm','-r','300','-singlefile','-png',case['file'],str(stem)],check=True,capture_output=True)
    image=Image.open(str(stem)+'.png')
    codes=zxingcpp.read_barcodes(image)
    qr=[c.text for c in codes if c.format==zxingcpp.BarcodeFormat.QRCode]
    bars=[c.text for c in codes if c.format!=zxingcpp.BarcodeFormat.QRCode]
    assert case['qr'] in qr, (case,[(str(c.format),c.text) for c in codes])
    assert case['barcode'] in bars, (case,bars)
    print('PASS independent 300 DPI scan',case['file'],bars,qr)
print('PASS',len(manifest),'production PDF pages; all barcode and QR contents match')
