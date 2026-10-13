from pathlib import Path
import urllib.request,json,zipfile,io,hashlib,concurrent.futures
from PIL import Image
ROOT=Path(__file__).resolve().parent.parent;OUT=ROOT/'assets/materials-v80';OUT.mkdir(parents=True,exist_ok=True);CACHE=ROOT/'artifacts/v80/materials';CACHE.mkdir(parents=True,exist_ok=True)
labels={'Paper001':'天然白纸纤维','Paper002':'再生纸纤维','Cardboard001':'牛皮卡纸纹理','Cardboard002':'细纤维卡纸','Cardboard003':'粗纤维卡纸'}
def acquire(item):
 id,label=item;url='https://ambientcg.com/get?file='+id+'_1K-JPG.zip';p=CACHE/(id+'.zip')
 if not p.exists():p.write_bytes(urllib.request.urlopen(urllib.request.Request(url,headers={'User-Agent':'Mozilla/5.0','Referer':'https://ambientcg.com/a/'+id}),timeout=90).read())
 raw=p.read_bytes();z=zipfile.ZipFile(io.BytesIO(raw));maps={}
 for kind,needle in [('normal','NormalGL'),('roughness','Roughness'),('color','Color'),('height','Displacement')]:
  name=next(n for n in z.namelist() if needle in n and n.lower().endswith('.jpg'));data=z.read(name);im=Image.open(io.BytesIO(data)).convert('RGB');im.thumbnail((1024,1024));dest=OUT/(id+'-'+kind+'.jpg');im.save(dest,quality=92,optimize=True);maps[kind]=dict(file='/assets/materials-v80/'+dest.name,width=im.width,height=im.height,originalSha256=hashlib.sha256(data).hexdigest(),sha256=hashlib.sha256(dest.read_bytes()).hexdigest())
 print('Imported CC0 scan',id,flush=True);return dict(id=id,label=label,source='https://ambientcg.com/a/'+id,download=url,author='Lennart Demes / ambientCG',license='CC0-1.0',licenseURL='https://docs.ambientcg.com/license/',archiveSha256=hashlib.sha256(raw).hexdigest(),maps=maps)
with concurrent.futures.ThreadPoolExecutor(max_workers=3) as pool:rows=list(pool.map(acquire,labels.items()))
(OUT/'sources.json').write_text(json.dumps(rows,ensure_ascii=False,indent=2));(ROOT/'src/materialSourcesV80.js').write_text('export const MATERIAL_SOURCES_V80='+json.dumps(rows,ensure_ascii=False,separators=(',',':'))+';\n')
