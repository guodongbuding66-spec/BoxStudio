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
    # Compare decoded payload bytes, avoiding decoder-specific GS1 HRI labels.
    qr=[c.bytes.decode('utf8') for c in codes if c.format==zxingcpp.BarcodeFormat.QRCode]
    bars=[c.bytes.decode('utf8') for c in codes if c.format!=zxingcpp.BarcodeFormat.QRCode]
    assert case['qr'] in qr, (case,[(str(c.format),c.text) for c in codes])
    # UPC-A and leading-zero EAN-13 have the same encoded symbol. ZXing may
    # report the latter; preserve all 12 UPC digits when comparing that form.
    equivalent_upc=Path(case['file']).name.startswith('UPCA-') and ('0'+case['barcode']) in bars
    assert case['barcode'] in bars or equivalent_upc, (case,bars)
    print('PASS independent 300 DPI scan',case['file'],bars,qr)
print('PASS',len(manifest),'production PDF pages; all barcode and QR contents match')

for dpi in [300,600]:
    image=Image.open(f'artifacts/v70/metadata-{dpi}.png')
    image.load()
    assert all(abs(x-dpi)<.03 for x in image.info['dpi']), image.info
    print('PASS independent PNG metadata/CRC', dpi)
