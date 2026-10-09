"""Pinned Lucide originals + official Google Fonts; development import only."""
from pathlib import Path
import json, shutil, hashlib, urllib.request, urllib.parse, io
from fontTools.ttLib import TTFont
from fontTools.varLib.instancer import instantiateVariableFont
from fontTools import subset

ROOT = Path(__file__).resolve().parent.parent
cache = ROOT/'artifacts/v75/source-cache/package'
out = ROOT/'assets/artwork-v75'; out.mkdir(parents=True, exist_ok=True)
ns={'__file__':str(ROOT/'scripts/import-handling-v73.py')}
exec((ROOT/'scripts/import-handling-v73.py').read_text().split('FILES=')[0].replace('from svgpathtools import parse_path as svg_path',''),ns)
ns['ASSETS']=out
geometry=ns['geometry']
def with_lines(e):
    if ns['etree'].QName(e).localname=='line':
        return f"M{e.get('x1','0')} {e.get('y1','0')}L{e.get('x2','0')} {e.get('y2','0')}"
    return geometry(e)
ns['geometry']=with_lines
prior={r['id']:r for r in json.loads((ROOT/'assets/artwork-v74/sources.json').read_text())}
tags=json.loads((cache/'tags.json').read_text())
groups={'食品':['food','fruit','drink','beverage','cooking','kitchen','candy','bakery'], '自然':['nature','plant','flower','weather','animal','environment'], '护理':['health','medical','medicine','beauty','science'], '装饰':['shapes','emoji','celebration','holiday','love'], '行业':['commerce','shopping','transportation','logistics','energy','security','tools','buildings'], '数码':['devices','multimedia','connectivity','gaming','communication'], '界面':['arrows','navigation','design','layout','text','development','files','charts','accessibility']}
translations={'banana':'香蕉','citrus':'柑橘','grape':'葡萄','pizza':'披萨','sandwich':'三明治','salad':'沙拉','milk':'牛奶','nut':'坚果','lollipop':'棒棒糖','ice-cream-bowl':'冰淇淋','bird':'鸟','rabbit':'兔子','cat':'猫','dog':'狗','paw-print':'爪印','tree-pine':'松树','tree-deciduous':'树木','trees':'森林','mountain':'山峰','mountain-snow':'雪山','cloud':'云','waves':'波浪','shell':'贝壳','rocket':'火箭','plane':'飞机','ship':'轮船','train-front':'火车','bike':'自行车','camera':'相机','headphones':'耳机','smartphone':'手机','monitor':'显示器','book-open':'翻开的书','scissors':'剪刀','ruler':'尺子','brush':'画笔','palette':'调色盘','ribbon':'丝带','award':'奖章','medal':'奖牌','crown':'皇冠','stamp':'印章','flower':'花卉','clover':'四叶草','trophy':'奖杯','earth':'地球','hand-heart':'关爱','heart-handshake':'合作','rabbit':'兔子','lightbulb':'灯泡','package-check':'包装验收','package-open':'开箱','package-2':'纸盒','factory':'工厂','warehouse':'仓库','container':'集装箱','thermometer':'温度计','umbrella':'雨伞','droplets':'水珠'}
catalog=[];paths={}
for src in sorted((cache/'icons').glob('*.svg')):
    id=src.stem; dest=out/src.name; shutil.copy(src,dest)
    paths[id]=ns['compile_svg'](src.name)
    keywords=tags.get(id,[])
    if isinstance(keywords,dict): keywords=keywords.get('tags',[])
    category=next((k for k,v in groups.items() if set(v)&set(keywords)), '其他')
    old=prior.get(id,{})
    catalog.append(dict(id=id,label=old.get('label',translations.get(id,id.replace('-',' '))),category=old.get('category',category),keywords=keywords,license='ISC',author='Lucide Contributors',source='https://github.com/lucide-icons/lucide/blob/0.468.0/icons/'+src.name,sha256=hashlib.sha256(dest.read_bytes()).hexdigest()))
shutil.copy(cache/'LICENSE',out/'LICENSE')
(out/'sources.json').write_text(json.dumps(catalog,ensure_ascii=False,indent=2))
(ROOT/'src/artworkDataV75.js').write_text('// All 1544 Lucide 0.468.0 originals, ISC. See assets/artwork-v75.\nexport const ARTWORK_CATALOG_V75='+json.dumps(catalog,ensure_ascii=False,separators=(',',':'))+';\nexport const ARTWORK_PATHS_V75='+json.dumps(paths,separators=(',',':'))+';\n')
print('Imported original SVGs:',len(catalog),flush=True)

fonts=[('manrope','manrope','Manrope[wght].ttf','BoxStudio Manrope'),('lexend','lexend','Lexend[wght].ttf','BoxStudio Lexend'),('oswald','oswald','Oswald[wght].ttf','BoxStudio Oswald'),('playfair','playfairdisplay','PlayfairDisplay[wght].ttf','BoxStudio Playfair'),('slab','sourceserif4','SourceSerif4[opsz,wght].ttf','BoxStudio Serif4'),('barlow','barlowcondensed','BarlowCondensed-Regular.ttf','BoxStudio Barlow'),('josefin','josefinsans','JosefinSans[wght].ttf','BoxStudio Josefin'),('bitter','bitter','Bitter[wght].ttf','BoxStudio Bitter')]
fontout=ROOT/'assets/fonts-v74'
rows=json.loads((fontout/'sources.json').read_text())
chars=set(range(32,591))|set(range(0x2000,0x2070))|{0x20ac,0x2122}
for id,folder,file,name in fonts:
    url='https://raw.githubusercontent.com/google/fonts/main/ofl/'+folder+'/'+urllib.parse.quote(file)
    local=ROOT/'artifacts/v75/source-cache'/file
    if not local.exists():local.write_bytes(urllib.request.urlopen(url,timeout=45).read())
    lic=urllib.request.urlopen('https://raw.githubusercontent.com/google/fonts/main/ofl/'+folder+'/OFL.txt',timeout=30).read().decode()
    (fontout/(id+'-OFL.txt')).write_text(lic)
    for weight in [400,700]:
        f=TTFont(local)
        source=url
        if 'fvar' in f:f=instantiateVariableFont(f,{a.axisTag:(weight if a.axisTag=='wght' else a.defaultValue) for a in f['fvar'].axes},inplace=True)
        elif weight==700:
            source=url.replace('Regular','Bold');f=TTFont(io.BytesIO(urllib.request.urlopen(source,timeout=30).read()))
        options=subset.Options();options.name_IDs=[0,1,2,3,4,5,6];options.layout_features=['*']
        s=subset.Subsetter(options=options);s.populate(unicodes=chars);s.subset(f)
        for rec in f['name'].names:
            if rec.nameID in [1,3,4,6]:rec.string=(name+(' Bold' if weight==700 else ' Regular')).encode(rec.getEncoding(),errors='replace')
        dest=fontout/(id+'-'+str(weight)+'.ttf');f.save(dest)
        rows=[r for r in rows if not(r['id']==id and r['weight']==weight)]
        rows.append(dict(id=id,weight=weight,name=name,source=source,license='OFL-1.1',file=dest.name,sha256=hashlib.sha256(dest.read_bytes()).hexdigest(),coverage='Latin + punctuation'))
        print(dest.name,dest.stat().st_size,flush=True)
(fontout/'sources.json').write_text(json.dumps(rows,ensure_ascii=False,indent=2))
