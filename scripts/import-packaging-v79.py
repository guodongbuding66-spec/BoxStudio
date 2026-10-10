"""Pinned color illustration originals, Commons hazard symbols and CC0 photos."""
from pathlib import Path
import json, hashlib, shutil, urllib.request, urllib.parse, concurrent.futures, re, io
from PIL import Image, ImageColor
ROOT=Path(__file__).resolve().parent.parent
OUT=ROOT/'assets/packaging-v79';OUT.mkdir(parents=True,exist_ok=True)
SOURCE=ROOT/'artifacts/v79/twemoji-source/twemoji-14.0.2'
groups={
 '食品': '🍇葡萄 🍈蜜瓜 🍉西瓜 🍊柑橘 🍋柠檬 🍌香蕉 🍍菠萝 🥭芒果 🍎苹果 🍏青苹果 🍐梨 🍑蜜桃 🍒樱桃 🍓草莓 🫐蓝莓 🥝猕猴桃 🍅番茄 🥥椰子 🥑牛油果 🍆茄子 🥔土豆 🥕胡萝卜 🌽玉米 🌶辣椒 🫑甜椒 🥒黄瓜 🥬绿叶菜 🥦西兰花 🧄大蒜 🧅洋葱 🍄蘑菇 🥜花生 🌰栗子 🍞面包 🥐羊角面包 🥖法棍 🥯贝果 🥞松饼 🧇华夫饼 🧀芝士 🍖肉食 🍗鸡肉 🥩牛排 🥓培根 🍔汉堡 🍕披萨 🥪三明治 🥗蔬菜沙拉 🍿爆米花 🍙饭团 🍚米饭 🍜面条 🍝意面 🍣寿司 🍤炸虾 🍦冰淇淋 🍩甜甜圈 🍪曲奇 🎂生日蛋糕 🧁纸杯蛋糕 🍫巧克力 🍬糖果 🍯蜂蜜 🥛牛奶 ☕咖啡 🍵绿茶 🧃果汁',
 '植物': '🌱嫩芽 🌲松树 🌳树木 🌴棕榈 🌵仙人掌 🌾稻穗 🌿草本 ☘三叶草 🍀四叶草 🍁枫叶 🍂秋叶 🍃绿叶 🌷郁金香 🌹玫瑰 🌺木槿 🌻向日葵 🌼雏菊 🌸樱花 💐花束 🪴盆栽',
 '节日': '🎁礼物 🎀丝带 🎈气球 🎉庆祝 🎊彩纸 🎄圣诞树 🎃万圣节 🧧红包 🏮灯笼 🥮月饼 🕯蜡烛 ⭐星星 ❄雪花 💝心形礼盒 💌信笺 🪅彩饰 🧸玩具熊 🐰兔子 🦌鹿 🕊和平鸽',
 '日化服饰': '🧴乳液 🧼香皂 🧽海绵 🧹清洁 🪥牙刷 🧺洗衣篮 🧵缝线 🪡绣针 👕上衣 👖牛仔裤 👗连衣裙 🧣围巾 🧤手套 🧦袜子 👒帽子 👟运动鞋 👜手袋 🕶眼镜 💄彩妆 💎珠宝',
}
ns={'__file__':str(ROOT/'scripts/import-handling-v73.py')}
code=(ROOT/'scripts/import-handling-v73.py').read_text().split('FILES=')[0].replace('from svgpathtools import parse_path as svg_path','')
code=code.replace("'bounds':b.bounds}","'bounds':b.bounds,'color':style.get('fill','#000000'),'strokeColor':style.get('stroke','#000000')}")
# Preserve the original viewport, including margins and proportions.
old=code[code.index("    minx=min("):code.index("    return paths")]
new="""    box=[float(v) for v in re.split(r'[,\\s]+',tree.getroot().get('viewBox','0 0 '+tree.getroot().get('width','36')+' '+tree.getroot().get('height','36')))]
    minx,miny,width,height=box;span=max(width,height);dx=(span-width)/2-minx;dy=(span-height)/2-miny
    for p in paths:
        p.pop('bounds');p['stroke']=round(p['stroke']/span,7)
        p['ops']=[[op,*[round((v+(dy if i%2 else dx))/span,7) for i,v in enumerate(values)]]for op,*values in p['ops']]
"""
code=code.replace(old,new).replace("'stroke-linejoin']","'stroke-linejoin','opacity']").replace("'strokeColor':style.get('stroke','#000000')}","'strokeColor':style.get('stroke','#000000'),'opacity':float(style.get('opacity','1'))}")
exec(code,ns);ns['ASSETS']=OUT
manifest=[];paths={}
def add_svg(id,label,category,original,source,license,author,regulatory=False):
 target=OUT/(id+'.svg');target.write_bytes(original);rows=ns['compile_svg'](target.name)
 for p in rows:
  for key in ['color','strokeColor']:
   color=p[key];p[key]='#%02x%02x%02x'%ImageColor.getrgb(color) if color!='none' else '#000000'
 paths[id]=rows
 manifest.append(dict(id=id,label=label,category=category,keywords=[label,category],source=source,license=license,author=author,sha256=hashlib.sha256(original).hexdigest(),regulatory=regulatory,colors=list(dict.fromkeys(p['color'] for p in rows if p['fill']))))
for category,text in groups.items():
 for token in text.split():
  split=2 if len(token)>1 and ord(token[1])==0xfe0f else 1
  emoji,label=token[:split],token[split:];codepoint='-'.join(format(ord(c),'x') for c in emoji if ord(c)!=0xfe0f);file=SOURCE/'assets/svg'/(codepoint+'.svg')
  if not file.exists():raise ValueError('Missing original '+str(file))
  add_svg('pack-'+codepoint,label,category,file.read_bytes(),'https://github.com/twitter/twemoji/blob/v14.0.2/assets/svg/'+file.name,'CC-BY-4.0','Twitter / Twemoji contributors')
shutil.copy(SOURCE/'LICENSE-GRAPHICS',OUT/'TWEMOJI-LICENSE')

def commons_metadata(titles):
 url='https://commons.wikimedia.org/w/api.php?'+urllib.parse.urlencode(dict(action='query',titles='|'.join('File:'+t for t in titles),prop='imageinfo',iiprop='url|extmetadata',format='json'))
 req=urllib.request.Request(url,headers={'User-Agent':'BoxStudio/0.79 free asset attribution importer'})
 return list(json.load(urllib.request.urlopen(req,timeout=45))['query']['pages'].values())
hazards={'explos':'爆炸危险','flamme':'易燃','rondflam':'氧化性','bottle':'高压气体','acid':'腐蚀','skull':'急性毒性','exclam':'有害或刺激','silhouette':'严重健康危害','pollu':'环境危害'}
pages=commons_metadata(['GHS-pictogram-'+k+'.svg' for k in hazards])
def fetch_page(p):
 info=p['imageinfo'][0];url=info['url'].split('?')[0];cache=OUT/(p['title'].removeprefix('File:'))
 if cache.exists():data=cache.read_bytes()
 else:
  redirect='https://commons.wikimedia.org/wiki/Special:Redirect/file/'+urllib.parse.quote(p['title'].removeprefix('File:'))
  data=urllib.request.urlopen(urllib.request.Request(redirect,headers={'User-Agent':'Mozilla/5.0 BoxStudio'}),timeout=45).read();cache.write_bytes(data)
 return p,info,url,data
for p,info,url,data in map(fetch_page,pages):
 key=p['title'].removeprefix('File:GHS-pictogram-').removesuffix('.svg');meta=info['extmetadata'];license=meta.get('LicenseShortName',{}).get('value','')
 if 'Public domain' not in license:raise ValueError('Unverified hazard license '+license)
 author=re.sub('<[^>]+>','',meta.get('Artist',{}).get('value','UNECE / Wikimedia contributors'))
 add_svg('ghs-'+key,hazards[key],'监管标识',data,'https://commons.wikimedia.org/wiki/'+urllib.parse.quote(p['title']),'Public domain',author,True)
(OUT/'sources.json').write_text(json.dumps(manifest,ensure_ascii=False,indent=2))
(ROOT/'src/packagingDataV79.js').write_text('// Original color artwork. Attribution: assets/packaging-v79/sources.json\nexport const PACKAGING_CATALOG_V79='+json.dumps(manifest,ensure_ascii=False,separators=(',',':'))+';\nexport const PACKAGING_PATHS_V79='+json.dumps(paths,separators=(',',':'))+';\n')
print('Imported',len(manifest),'original color illustrations and hazard symbols',flush=True)
