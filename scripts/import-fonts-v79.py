"""Import full upstream font repertoires, static weights and real italic outlines.
Development-only; generated gzip files are served locally and decoded in browser.
"""
from pathlib import Path
import urllib.request, urllib.parse, json, hashlib, gzip, concurrent.futures
from fontTools.ttLib import TTFont
from fontTools.varLib.instancer import instantiateVariableFont

ROOT=Path(__file__).resolve().parent.parent
OUT=ROOT/'assets/fonts-v79'; OUT.mkdir(parents=True,exist_ok=True)
CACHE=ROOT/'artifacts/v79/font-source'; CACHE.mkdir(parents=True,exist_ok=True)
FONTS=[
 ('noto-sc-full','notosanssc','NotoSansSC[wght].ttf','纸工全字库黑体',[400,500,600,700]),
 ('noto-serif-full','notoserifsc','NotoSerifSC[wght].ttf','纸工全字库宋体',[400,500,700]),
 ('xiaowei','zcoolxiaowei','ZCOOLXiaoWei-Regular.ttf','站酷小薇体',[400]),
 ('mashan','mashanzheng','MaShanZheng-Regular.ttf','马善政毛笔楷书',[400]),
 ('arabic','notonaskharabic','NotoNaskhArabic[wght].ttf','Noto 阿拉伯文',[400,700]),
 ('devanagari','notosansdevanagari','NotoSansDevanagari[wdth,wght].ttf','Noto 天城文',[400,700]),
 ('lato','lato','Lato-Italic.ttf','Lato 真正斜体',[400]),
 ('lato','lato','Lato-BoldItalic.ttf','Lato 真正粗斜体',[700]),
]
def fetch(row):
 id,folder,file,label,weights=row
 url='https://raw.githubusercontent.com/google/fonts/main/ofl/'+folder+'/'+urllib.parse.quote(file)
 dest=CACHE/file
 if not dest.exists(): dest.write_bytes(urllib.request.urlopen(url,timeout=60).read())
 license_file=OUT/(id+'-OFL.txt')
 license_file.write_bytes(urllib.request.urlopen('https://raw.githubusercontent.com/google/fonts/main/ofl/'+folder+'/OFL.txt',timeout=60).read())
 return row,url,dest
sources=list(concurrent.futures.ThreadPoolExecutor(max_workers=6).map(fetch,FONTS))
manifest=[]
for row,url,source in sources:
 id,folder,file,label,weights=row
 italic='Italic' in file
 for weight in weights:
  font=TTFont(source)
  if 'fvar' in font:
   font=instantiateVariableFont(font,{a.axisTag:(weight if a.axisTag=='wght' else a.defaultValue) for a in font['fvar'].axes},inplace=True)
  # Preserve all glyphs, GSUB/GPOS, vertical alternates and original names.
  target=CACHE/(id+'-'+str(weight)+('-italic' if italic else '')+'.ttf')
  font.save(target); data=target.read_bytes(); packed=gzip.compress(data,compresslevel=9,mtime=0)
  name=target.name+'.gz'; (OUT/name).write_bytes(packed)
  cmap=font.getBestCmap();han=sum(0x3400<=cp<=0x9fff or 0x20000<=cp<=0x3134f for cp in cmap)
  manifest.append(dict(id=id,label=label,weight=weight,italic=italic,file=name,license='OFL-1.1',source=url,sourceSha256=hashlib.sha256(source.read_bytes()).hexdigest(),sha256=hashlib.sha256(data).hexdigest(),packedSha256=hashlib.sha256(packed).hexdigest(),characters=len(cmap),hanzi=han,bytes=len(data),packedBytes=len(packed)))
  print(name,len(cmap),'characters',han,'hanzi',len(packed),'bytes',flush=True)
(OUT/'sources.json').write_text(json.dumps(manifest,ensure_ascii=False,indent=2))
print('Saved',len(manifest),'real font faces',flush=True)
