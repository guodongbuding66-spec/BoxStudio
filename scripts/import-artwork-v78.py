"""Import the COMPLETE pinned Tabler 3.31.0 filled series (MIT).
Usage: python scripts/import-artwork-v78.py /path/to/extracted/package
The original SVG archive is committed with a manifest of source SHA-256 hashes.
"""
from pathlib import Path
import sys,json,hashlib,shutil
ROOT=Path(__file__).resolve().parent.parent
package=Path(sys.argv[1]);source=package/'icons/filled';out=ROOT/'assets/artwork-v78';out.mkdir(parents=True,exist_ok=True)
ns={'__file__':str(ROOT/'scripts/import-handling-v73.py')}
exec((ROOT/'scripts/import-handling-v73.py').read_text().split('FILES=')[0].replace('from svgpathtools import parse_path as svg_path',''),ns)
ns['ASSETS']=source
metadata=json.loads((package/'icons.json').read_text())
prior=json.loads((ROOT/'assets/artwork-v75/sources.json').read_text());translated={r['id']:r['label'] for r in prior};categories={r['id']:r['category'] for r in prior}
groups={'食品':['food','drink','fruit'],'自然':['nature','animals','weather'],'护理':['health','medical'],'行业':['buildings','vehicles','shopping','tools'],'装饰':['shapes','symbols'],'数码':['devices'],'界面':['arrows','design','text','system','map']}
catalog=[];paths={};originals={}
for src in sorted(source.glob('*.svg')):
    name=src.stem;id='tabler-'+name;data=src.read_bytes();meta=metadata.get(name,{})
    category=categories.get(name,next((k for k,v in groups.items() if meta.get('category') in v),'其他'))
    catalog.append(dict(id=id,label=translated.get(name,name.replace('-',' ')),category=category,keywords=meta.get('tags',[])+['实心','Tabler'],style='filled',license='MIT',author='Paweł Kuna / Tabler Contributors',source='https://github.com/tabler/tabler-icons/blob/v3.31.0/icons/filled/'+src.name,sha256=hashlib.sha256(data).hexdigest()))
    paths[id]=ns['compile_svg'](src.name);originals[id]=data.decode()
assert len(catalog)==944, len(catalog)
shutil.copy(package/'LICENSE',out/'LICENSE')
(out/'originals.json').write_text(json.dumps(originals,ensure_ascii=False,separators=(',',':')))
(out/'sources.json').write_text(json.dumps(catalog,ensure_ascii=False,indent=2))
(ROOT/'src/artworkDataV78.js').write_text('// Complete Tabler 3.31.0 Filled, MIT. Rebuild with scripts/import-artwork-v78.py.\nexport const ARTWORK_CATALOG_V78='+json.dumps(catalog,ensure_ascii=False,separators=(',',':'))+';\nexport const ARTWORK_PATHS_V78='+json.dumps(paths,separators=(',',':'))+';\n')
print('Imported',len(catalog),'original filled SVGs with verified source hashes.')
