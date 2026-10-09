"""Independently scan native browser downloads and decode real video frames."""
import hashlib,json,subprocess,sys
from pathlib import Path
import fitz,zxingcpp
from PIL import Image
view=sys.argv[1];root=Path(f'artifacts/v72/native-{view}');results=[]
expect={'boxstudio-code128-300dpi.png':['TEST-ITEM-072'],'boxstudio-qrcode-300dpi.png':['箱子编号：测试-072'],'boxstudio-mark-1to1.pdf':['TEST-ITEM-072','箱子编号：测试-072']}
for name,values in expect.items():
    path=root/name
    if path.suffix=='.pdf':
        doc=fitz.open(path);pix=doc[0].get_pixmap(matrix=fitz.Matrix(300/72,300/72),alpha=False);img=Image.frombytes('RGB',(pix.width,pix.height),pix.samples)
    else:
        img=Image.open(path);assert all(abs(n-300)<.1 for n in img.info['dpi']),img.info
    texts=[r.text for r in zxingcpp.read_barcodes(img)]
    assert all(v in texts for v in values),(name,values,texts)
    results.append({'file':name,'decoded':texts,'dpi':300})
video=root/'boxstudio-animation.webm'
probe=json.loads(subprocess.check_output(['ffprobe','-v','error','-select_streams','v:0','-count_frames','-show_entries','stream=codec_name,width,height,nb_read_frames:format=duration','-of','json',str(video)]));stream=probe['streams'][0]
assert stream['codec_name'] in ['vp8','vp9'] and stream['width']==1280 and stream['height']==960,stream
assert int(stream['nb_read_frames'])>=24,stream
hashes=[]
for t in [0,3,5.5]:
    data=subprocess.check_output(['ffmpeg','-v','error','-ss',str(t),'-i',str(video),'-frames:v','1','-f','image2pipe','-vcodec','png','-threads','1','-'])
    assert len(data)>2000,('Video frame missing',t);hashes.append(hashlib.sha256(data).hexdigest())
assert len(set(hashes))==3,'Assembly animation must contain changing frames'
results.append({'file':video.name,'probe':probe,'frame_times':[0,3,5.5],'different_frames':True})
(root/'independent-verification.json').write_text(json.dumps({'status':'PASS','results':results},ensure_ascii=False,indent=2))
print(f'PASS {view}: native PDF/PNG decode, 300 DPI metadata and changing 1280x960 video frames')
