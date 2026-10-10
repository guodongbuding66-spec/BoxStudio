"""Actual CC0 / public-domain photographs, validated against Commons metadata."""
from pathlib import Path
import json,urllib.request,urllib.parse,hashlib,re,io
from PIL import Image,ImageOps
ROOT=Path(__file__).resolve().parent.parent;OUT=ROOT/'assets/packaging-v79/photos';OUT.mkdir(parents=True,exist_ok=True)

chosen={'Coffee-Beans.jpg':'咖啡豆','Honeycrisp-Apple.jpg':'苹果','Blueberries-In-Pack.jpg':'蓝莓','Green-Bell-Pepper.jpg':'甜椒','Grapefruit-Whole-&-Split.jpg':'葡萄柚','Choc-Chip-Cookie.jpg':'巧克力曲奇','Beets-Bundle.jpg':'甜菜','Baby-Port-Mushrooms.jpg':'蘑菇','CSA-Chocolate-Mint.jpg':'薄荷','Cherry-Tomatoes-in-Pack.jpg':'樱桃番茄','Bagel-Plain-Alt.jpg':'贝果','6-Pack-Chicken-Eggs.jpg':'鸡蛋'}
metadataCache=ROOT/'artifacts/v79/food-metadata.json'
if metadataCache.exists():meta=json.loads(metadataCache.read_text())['query']['pages']
else:
 u='https://commons.wikimedia.org/w/api.php?'+urllib.parse.urlencode(dict(action='query',titles='|'.join('File:'+t for t in chosen),prop='imageinfo',iiprop='url|extmetadata',format='json'))
 meta=json.load(urllib.request.urlopen(urllib.request.Request(u,headers={'User-Agent':'Mozilla/5.0 BoxStudio'}),timeout=45))['query']['pages']

rows=[]
for p in meta.values():
 title=p['title'].removeprefix('File:')
 if title not in chosen:continue
 info=p['imageinfo'][0];m=info['extmetadata'];license=m['LicenseShortName']['value']
 if license not in ['Public domain','CC0']:raise ValueError('Unverified photo license '+title)
 source='https://commons.wikimedia.org/wiki/'+urllib.parse.quote(p['title']);redirect='https://commons.wikimedia.org/wiki/Special:Redirect/file/'+urllib.parse.quote(title)+'?width=1280';cache=ROOT/'artifacts/v79'/title
 if cache.exists():data=cache.read_bytes()
 else:data=urllib.request.urlopen(urllib.request.Request(redirect,headers={'User-Agent':'Mozilla/5.0 BoxStudio'}),timeout=45).read();cache.write_bytes(data)
 image=ImageOps.exif_transpose(Image.open(io.BytesIO(data))).convert('RGB');image.thumbnail((2000,2000));id='photo-'+re.sub('[^a-z0-9]+','-',title.lower().removesuffix('.jpg')).strip('-');path=OUT/(id+'.jpg');image.save(path,quality=88,optimize=True);w,h=image.size;image.thumbnail((320,320));image.save(OUT/(id+'-thumb.jpg'),quality=82,optimize=True)
 rows.append(dict(id=id,label=chosen[title],category='产品摄影',source=source,originalURL=info['url'],license=license,author=re.sub('<[^>]+>','',m.get('Artist',{}).get('value','Evan-Amos')),originalSha256=hashlib.sha256(data).hexdigest(),sha256=hashlib.sha256(path.read_bytes()).hexdigest(),width=w,height=h,file='/assets/packaging-v79/photos/'+path.name,thumbnail='/assets/packaging-v79/photos/'+id+'-thumb.jpg'))
 print('Imported photo',title,w,h,flush=True)
(OUT/'sources.json').write_text(json.dumps(rows,ensure_ascii=False,indent=2));(ROOT/'src/photoCatalogV79.js').write_text('export const PHOTO_CATALOG_V79='+json.dumps(rows,ensure_ascii=False,separators=(',',':'))+';\n')
