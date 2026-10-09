from pathlib import Path
import json,hashlib,shutil
root=Path(__file__).resolve().parent.parent;out=root/'assets/artwork-v74';out.mkdir(exist_ok=True)
rows=[('leaf','叶片','自然'),('sprout','幼苗','自然'),('flower-2','花朵','自然'),('wheat','麦穗','食品'),('coffee','咖啡','食品'),('wine','酒杯','食品'),('cherry','樱桃','食品'),('apple','苹果','食品'),('carrot','胡萝卜','食品'),('candy','糖果','食品'),('fish','鱼','食品'),('beef','肉类','食品'),('cookie','饼干','食品'),('croissant','可颂','食品'),('gift','礼物','装饰'),('heart','爱心','装饰'),('star','星形','装饰'),('sun','太阳','自然'),('moon','月亮','自然'),('snowflake','雪花','自然'),('flask-conical','实验瓶','护理'),('droplet','水滴','护理'),('sparkles','闪光','装饰'),('gem','宝石','装饰'),('package','包装盒','行业'),('recycle','回收','行业'),('shopping-bag','购物袋','行业'),('battery','电池','行业'),('shield-check','盾牌','行业'),('flame','火焰','自然'),('truck','卡车','行业'),('globe','地球','行业')]
ns={'__file__':str(root/'scripts/import-handling-v73.py')};exec((root/'scripts/import-handling-v73.py').read_text().split('FILES=')[0].replace('from svgpathtools import parse_path as svg_path',''),ns);ns['ASSETS']=out
catalog=[];data={}
for id,label,category in rows:
 src=Path('/tmp/v74-lucide/package/icons')/(id+'.svg');dest=out/src.name;shutil.copy(src,dest);data[id]=ns['compile_svg'](dest.name);catalog.append(dict(id=id,label=label,category=category,license='ISC',author='Lucide Contributors',source='https://github.com/lucide-icons/lucide/blob/0.468.0/icons/'+src.name,sha256=hashlib.sha256(dest.read_bytes()).hexdigest()))
shutil.copy('/tmp/v74-lucide/package/LICENSE',out/'LICENSE');(out/'sources.json').write_text(json.dumps(catalog,ensure_ascii=False,indent=2))
(root/'src/artworkDataV74.js').write_text('// Lucide 0.468.0 ISC, see assets/artwork-v74/LICENSE and sources.json.\nexport const ARTWORK_CATALOG_V74='+json.dumps(catalog,ensure_ascii=False,separators=(',',':'))+';\nexport const ARTWORK_PATHS_V74='+json.dumps(data,separators=(',',':'))+';\n')
print('Imported',len(rows),'licensed SVGs')
