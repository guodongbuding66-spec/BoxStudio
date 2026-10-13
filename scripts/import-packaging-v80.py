from pathlib import Path
import json,hashlib,re,urllib.request,urllib.parse
from PIL import ImageColor
ROOT=Path(__file__).resolve().parent.parent;OUT=ROOT/'assets/packaging-v80';OUT.mkdir(parents=True,exist_ok=True);CACHE=ROOT/'artifacts/v80/symbols';CACHE.mkdir(parents=True,exist_ok=True)
code=(ROOT/'scripts/import-packaging-v79.py').read_text().split('manifest=[];paths={}')[0];ns={'__file__':str(ROOT/'scripts/import-packaging-v79.py')};exec(code,ns);ns=ns['ns'];ns['ASSETS']=OUT;rows=[];paths={};used={r['id'] for r in json.loads((ROOT/'assets/packaging-v79/sources.json').read_text())}
groups={'食品':'🥨椒盐卷饼 🥙夹馅饼 🧆豆丸 🌭热狗 🌮玉米饼 🌯卷饼 🥘炖饭 🍲汤锅 🫕奶酪锅 🥫罐装食品 🧂调味盐 🫙储物罐 🍳煎蛋 🥚鸡蛋 🥟饺子 🥠幸运饼干 🥡外带餐盒 🍘米饼 🍛咖喱饭 🍱便当 🍠红薯 🍡团子 🍥鱼板 🍢串烧 🦪生蚝 🦐鲜虾 🦞龙虾 🦀螃蟹 🦑鱿鱼 🐟鲜鱼 🍨甜品杯 🍧刨冰 🥧水果派 🍰切片蛋糕 🍭棒棒糖 🧉马黛茶 🫖茶壶 🥤饮料杯 🧋珍珠奶茶 🫗饮品倾注 🍼婴儿奶瓶 🍶米酒 🍷葡萄酒 🍸调饮 🍹果饮 🍺精酿啤酒 🥂庆典饮品 🧊冰块','节日':'🎆庆典烟花 🎇节日焰火 🎐风铃 🎏鲤鱼旗 🎎节庆摆饰 🎑赏月 🪔节日油灯 🎠童趣木马 🎡欢乐庆典 🪁风筝 🎲桌游礼盒 🧩拼图礼盒 🪀玩具礼品 🎨创意美术 🎭艺术节 🎶音乐礼品 💕双心 💗粉色爱心 💖闪耀爱心 💘情人节 🤍纯白爱心 🤎暖棕爱心 🧡橙色爱心 💛金色爱心 💚绿色爱心 💙蓝色爱心 💜紫色爱心 🌟闪亮星光 ✨金色闪光 🌙月夜 ☀晴日 🌈彩虹 🌊海洋风格 🪸珊瑚 🪷莲花','日化服饰':'🥾户外鞋 🥿平底鞋 👡凉鞋 👞皮鞋 🩴拖鞋 👔领带 👚女装 🧥外套 🥼工作服 👘服饰礼盒 🩳短裤 🩱泳衣 👙泳装 🎩礼帽 🎓学院用品 🪒剃须刀 🪞化妆镜 🧻纸巾 🪶羽毛配饰 💍首饰 💅美甲用品 🧪试剂包装 🧫实验用品 🩺医疗用品 🩹护理用品 💊胶囊包装','宠物用品':'🐶犬用品 🐱猫用品 🐭鼠类用品 🐹仓鼠用品 🦊狐狸插画 🦝浣熊插画 🐻熊插画 🐼熊猫插画 🐨考拉插画 🐯虎插画 🦁狮子插画 🐮奶牛插画 🐷小猪插画 🐸青蛙插画 🐢龟类用品 🐦鸟类用品 🐤幼禽用品 🐔禽类用品 🐠观赏鱼用品 🐾宠物脚印'}
def add(id,label,category,raw,source,license,author,originalURL=None):
 if id in used:return
 p=OUT/(id+'.svg');p.write_bytes(raw)
 try:compiled=ns['compile_svg'](p.name)
 except Exception as e:p.unlink();print('Skipped unsupported vector',id,str(e)[:60]);return
 if not compiled:p.unlink();return
 for row in compiled:
  for key in ['color','strokeColor']:row[key]='#%02x%02x%02x'%ImageColor.getrgb(row[key]) if row[key]!='none' else '#000000'
 paths[id]=compiled;rows.append(dict(id=id,label=label,category=category,keywords=[label,category],source=source,originalURL=originalURL,license=license,author=author,sha256=hashlib.sha256(raw).hexdigest(),regulatory=category=='运输标识',colors=list(dict.fromkeys(p['color'] for p in compiled if p['fill']))));used.add(id)
for category,text in groups.items():
 for token in text.split():
  split=2 if len(token)>1 and ord(token[1])==0xfe0f else 1;cp='-'.join(format(ord(c),'x') for c in token[:split] if ord(c)!=0xfe0f);p=ROOT/'artifacts/v80/twemoji-source/assets/svg'/(cp+'.svg')
  if p.exists():add('pack-'+cp,token[split:],category,p.read_bytes(),'https://github.com/twitter/twemoji/blob/v14.0.2/assets/svg/'+p.name,'CC-BY-4.0','Twitter / Twemoji contributors')
titles={'File:EU food contact material symbol.svg':'食品接触标识','File:ESD (Protected).svg':'静电防护','File:ESD (Susceptible).svg':'静电敏感器件','File:ISO 7000 - Ref-No 2406.svg':'禁止叉车搬运','File:WEEE symbol vectors.svg':'电子电器分类回收'}
for i,name in enumerate(['PETE','HDPE','V','LDPE','PP','PS','OTHER'],1):titles['File:Symbol Resin Code '+str(i)+' '+name+'.svg']=str(i)+' '+name+' 树脂识别'
meta=CACHE/'metadata.json'
try:
 if not meta.exists():
  params=dict(action='query',titles='|'.join(titles),prop='imageinfo',iiprop='url|extmetadata',format='json');meta.write_bytes(urllib.request.urlopen(urllib.request.Request('https://commons.wikimedia.org/w/api.php?'+urllib.parse.urlencode(params),headers={'User-Agent':'Mozilla/5.0 BoxStudio source audit'}),timeout=30).read())
 for page in json.loads(meta.read_text()).get('query',{}).get('pages',{}).values():
  if 'imageinfo' not in page:continue
  info=page['imageinfo'][0];m=info.get('extmetadata',{});license=m.get('LicenseShortName',{}).get('value','')
  if license not in ['Public domain','CC0']:continue
  p=CACHE/(str(page['pageid'])+'.svg')
  if not p.exists():
   try:p.write_bytes(urllib.request.urlopen(urllib.request.Request(info['url'],headers={'User-Agent':'Mozilla/5.0 BoxStudio source audit'}),timeout=30).read())
   except urllib.error.HTTPError as e:
    print('Source download paused',e.code,flush=True)
    if e.code==429:break
    continue
  raw=p.read_bytes()
  if b'<text' in raw or b'<use' in raw:
   import subprocess
   dest=p.with_name(p.stem+'-paths.svg');subprocess.run(['inkscape',str(p),'--export-text-to-path','--export-plain-svg','--export-type=svg','--export-filename='+str(dest)],check=True,capture_output=True);raw=dest.read_bytes()
  add('transport-'+str(page['pageid']),titles[page['title']],'运输标识',raw,'https://commons.wikimedia.org/wiki/'+urllib.parse.quote(page['title']),license,re.sub('<[^>]+>','',m.get('Artist',{}).get('value','详见来源页面')),info['url']);print('Imported packaging mark',titles[page['title']],flush=True)
except Exception as e:print('Packaging source unavailable',str(e)[:100],flush=True)
(OUT/'sources.json').write_text(json.dumps(rows,ensure_ascii=False,indent=2));(ROOT/'src/packagingDataV80.js').write_text('export const PACKAGING_CATALOG_V80='+json.dumps(rows,ensure_ascii=False,separators=(',',':'))+';\nexport const PACKAGING_PATHS_V80='+json.dumps(paths,separators=(',',':'))+';\n');print('New sourced packaging vectors',len(rows),flush=True)
