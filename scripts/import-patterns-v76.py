"""Import pinned original Hero Patterns; parse SVG as data, never execute its JS."""
import re,json,hashlib,urllib.request,math
from pathlib import Path
from lxml import etree
from fontTools.svgLib.path import parse_path
from fontTools.pens.basePen import BasePen
PIN='6a2ed74a6910a8b1095d15dd31f7f3f0188517ad'
SOURCE=f'https://raw.githubusercontent.com/sschoger/hero-patterns/{PIN}/js/app.js'
class Pen(BasePen):
 def __init__(self):super().__init__(None);self.ops=[]
 def _moveTo(self,p):self.ops.append(['M',*p])
 def _lineTo(self,p):self.ops.append(['L',*p])
 def _curveToOne(self,a,b,c):self.ops.append(['C',*a,*b,*c])
 def _qCurveToOne(self,b,c):
  a=self._getCurrentPoint();self._curveToOne(tuple(a[i]+2/3*(b[i]-a[i])for i in range(2)),tuple(c[i]+2/3*(b[i]-c[i])for i in range(2)),c)
 def _closePath(self):self.ops.append(['Z'])
 def _endPath(self):pass
def inherited(e,key,default):
 while e is not None:
  if e.get(key) is not None:return e.get(key)
  e=e.getparent()
 return default
def opacity(e):
 n=1
 while e is not None:n*=float(e.get('opacity','1'));e=e.getparent()
 return n
labels={'jigsaw':'拼图','overcast':'云影','formal-invitation':'请柬纹','topography':'等高线','leaf':'叶片','houndstooth':'千鸟格','polka-dots':'圆点','bubbles':'气泡','brick-wall':'砖墙','hexagons':'六边形','stripes':'条纹','wave':'波浪','endless-clouds':'连绵云朵','diagonal-stripes':'斜条纹','circuit-board':'电路板','floor-tile':'地砖','wiggle':'波线','squares':'方格','plus':'十字','graph-paper':'方格纸','glamorous':'菱纹','random-shapes':'随机图形','rain':'雨滴','bamboo':'竹节'}
root=Path('assets/patterns-v76');root.mkdir(parents=True,exist_ok=True)
raw=urllib.request.urlopen(SOURCE).read();text=raw.decode();catalog=[];tiles={};sources=[]
for name,svg,download in re.findall(r"name: '([^']+)',\s*image: '(.*?)',\s*download: '([^']+)'",text,re.S):
 id=Path(download).stem;tree=etree.fromstring(svg.encode());w,h=map(float,tree.get('viewBox').split()[2:]);paths=[]
 for e in tree.iter():
  tag=etree.QName(e).localname;pen=Pen()
  if tag=='path':parse_path(e.get('d'),pen)
  elif tag=='polygon':
   points=list(map(float,re.findall(r'[-+]?(?:\d*\.\d+|\d+)(?:[eE][-+]?\d+)?',e.get('points'))));pen.moveTo(tuple(points[:2]))
   for i in range(2,len(points),2):pen.lineTo(tuple(points[i:i+2]))
   pen.closePath()
  elif tag=='circle':
   cx,cy,r=map(float,[e.get('cx','0'),e.get('cy','0'),e.get('r')]);pen.moveTo((cx+r,cy))
   for i in range(8):
    a=i*math.pi/4;b=(i+1)*math.pi/4;k=4/3*math.tan((b-a)/4);pen.curveTo((cx+r*(math.cos(a)-k*math.sin(a)),cy+r*(math.sin(a)+k*math.cos(a))),(cx+r*(math.cos(b)+k*math.sin(b)),cy+r*(math.sin(b)-k*math.cos(b))),(cx+r*math.cos(b),cy+r*math.sin(b)))
   pen.closePath()
  else:continue
  if e.get('transform'):raise ValueError('Unexpected transform: '+id)
  paths.append({'ops':[[op,*[round(n,9)for n in vals]]for op,*vals in pen.ops],'rule':inherited(e,'fill-rule','nonzero'),'opacity':opacity(e)*float(inherited(e,'fill-opacity','1'))})
 assert paths,id
 category='自然'if any(k in id for k in ['leaf','cloud','rain','bamboo','flower','wave','topography','grass'])else '行业'if any(k in id for k in ['circuit','food','bank','brick','architect','signal','tic-tac'])else '装饰'if any(k in id for k in ['glam','formal','wiggle','jigsaw','houndstooth','overcast'])else '几何'
 entry={'id':id,'name':name,'label':labels.get(id,name),'category':category,'width':w,'height':h,'author':'Steve Schoger','license':'CC BY 4.0','website':'https://heropatterns.com/'};catalog.append(entry);tiles[id]={'width':w,'height':h,'paths':paths};(root/(id+'.svg')).write_text(svg)
 sources.append({**entry,'sha256':hashlib.sha256(svg.encode()).hexdigest(),'source':SOURCE,'revision':PIN})
assert len(catalog)==87
(root/'sources.json').write_text(json.dumps(sources,ensure_ascii=False,indent=2))
(root/'LICENSE.txt').write_text('Hero Patterns by Steve Schoger\nhttps://heropatterns.com/\nLicense: Creative Commons Attribution 4.0 International (CC BY 4.0)\nhttps://creativecommons.org/licenses/by/4.0/\nhttps://creativecommons.org/licenses/by/4.0/legalcode\nOriginal source SVG files preserved. BoxStudio adapts colors, repetitions and converts curves for print. Keep attribution and license when sharing exported designs.\nPinned source revision: '+PIN+'\nSource SHA256: '+hashlib.sha256(raw).hexdigest()+'\n')
Path('src/patternDataV76.js').write_text('// Generated from pinned Hero Patterns. Steve Schoger, CC BY 4.0. See assets/patterns-v76/LICENSE.txt.\nexport const PATTERN_CATALOG_V76='+json.dumps(catalog,ensure_ascii=False,separators=(',',':'))+';\nexport const PATTERN_TILES_V76='+json.dumps(tiles,separators=(',',':'))+';\n')
print('Imported',len(catalog),'original SVG patterns and vector curves; CC BY 4.0')
