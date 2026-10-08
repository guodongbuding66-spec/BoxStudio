"""Decode the rendered production PDF, including its actual physical barcode layout."""
import json
import sys
from PIL import Image
import zxingcpp
codes = zxingcpp.read_barcodes(Image.open(sys.argv[1]))
assert any(c.format == zxingcpp.BarcodeFormat.Code39 and c.text == 'TEST-067' for c in codes), 'Production PDF Code 39 failed digital decoding'
assert any(c.format == zxingcpp.BarcodeFormat.QRCode and c.text == 'TEST-067' for c in codes), 'Production PDF QR failed digital decoding'
print(json.dumps({'status': 'PASS', 'codes': [{'format': str(c.format), 'value': c.text} for c in codes]}))
