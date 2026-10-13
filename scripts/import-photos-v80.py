from pathlib import Path
import json,hashlib,urllib.request,urllib.parse,re,io,time
from PIL import Image,ImageOps
ROOT=Path(__file__).resolve().parent.parent;OUT=ROOT/'assets/packaging-v80/photos';OUT.mkdir(parents=True,exist_ok=True);CACHE=ROOT/'artifacts/v80/photos';CACHE.mkdir(parents=True,exist_ok=True)
titles={'File:Bun-Bar-Line-Split.jpg':'巧克力夹心糖（剖面）','File:Bun-Bar-Whole.jpg':'巧克力夹心糖','File:Potato-Chips.jpg':'薯片','File:Vegetable-Carrot-Bundle-wStalks.jpg':'胡萝卜','File:Chocolate-Gold-Coins.jpg':'金币巧克力','File:Dough-Donut-Lemon-Ginger.jpg':'柠檬甜甜圈','File:Lemon-Whole-Split.jpg':'柠檬','File:CSA-Red-Spring-Onions.jpg':'洋葱'};rows=[];meta=CACHE/'metadata.json'
try:
 if not meta.exists():meta.write_bytes(urllib.request.urlopen(urllib.request.Request('https://commons.wikimedia.org/w/api.php?'+urllib.parse.urlencode(dict(action='query',titles='|'.join(titles),prop='imageinfo',iiprop='url|extmetadata|size',iiurlwidth=1280,format='json')),headers={'User-Agent':'Mozilla/5.0 BoxStudio product photograph audit'}),timeout=30).read())
 for page in json.loads(meta.read_text()).get('query',{}).get('pages',{}).values():
  if 'imageinfo' not in page:continue
  info=page['imageinfo'][0];m=info.get('extmetadata',{});license=m.get('LicenseShortName',{}).get('value','')
  if license not in ['Public domain','CC0']:continue
  cached=CACHE/(str(page['pageid'])+'.photo');url=info.get('thumburl')or info['url']
  if not cached.exists():
   try:cached.write_bytes(urllib.request.urlopen(urllib.request.Request(url,headers={'User-Agent':'Mozilla/5.0 BoxStudio product photograph audit'}),timeout=30).read())
   except urllib.error.HTTPError as e:
    print('Photo download paused',e.code,flush=True)
    if e.code==429:break
    continue
   time.sleep(20)
  raw=cached.read_bytes();im=ImageOps.exif_transpose(Image.open(io.BytesIO(raw))).convert('RGB');im.thumbnail((1600,1600));id='photo-v80-'+str(page['pageid']);dest=OUT/(id+'.jpg');im.save(dest,quality=90,optimize=True);w,h=im.size;im.thumbnail((320,320));im.save(OUT/(id+'-thumb.jpg'),quality=84,optimize=True);rows.append(dict(id=id,label=titles[page['title']],category='产品摄影',keywords=[titles[page['title']]],source='https://commons.wikimedia.org/wiki/'+urllib.parse.quote(page['title']),originalURL=info['url'],downloadURL=url,author=re.sub('<[^>]+>','',m.get('Artist',{}).get('value','详见来源')),license=license,originalSha256=hashlib.sha256(raw).hexdigest(),sha256=hashlib.sha256(dest.read_bytes()).hexdigest(),width=w,height=h,file='/assets/packaging-v80/photos/'+dest.name,thumbnail='/assets/packaging-v80/photos/'+id+'-thumb.jpg'));print('Imported actual photo',titles[page['title']],flush=True)
except Exception as e:print('Photography unavailable',str(e)[:100],flush=True)
(OUT/'sources.json').write_text(json.dumps(rows,ensure_ascii=False,indent=2));(ROOT/'src/photoCatalogV80.js').write_text('export const PHOTO_CATALOG_V80='+json.dumps(rows,ensure_ascii=False,separators=(',',':'))+';\n')
