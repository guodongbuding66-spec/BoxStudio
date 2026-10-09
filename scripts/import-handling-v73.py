"""Offline source SVG → shared cubic vector data. Never fetched at runtime.

Regenerate with Python fontTools + lxml + svgpathtools (development only).
Original files, authors, licenses and SHA-256 hashes live in assets/handling-v73.
"""
import json, math, re, hashlib
from pathlib import Path
from lxml import etree
from fontTools.pens.basePen import BasePen
from fontTools.pens.transformPen import TransformPen
from fontTools.pens.boundsPen import BoundsPen
from fontTools.svgLib.path import parse_path
from fontTools.misc.transform import Transform
from fontTools.ttLib import TTFont
from svgpathtools import parse_path as svg_path

ROOT = Path(__file__).resolve().parent.parent
ASSETS = ROOT / 'assets/handling-v73'
class Pen(BasePen):
    def __init__(self): super().__init__(None); self.ops=[]
    def _moveTo(self,p): self.ops.append(['M',*p])
    def _lineTo(self,p): self.ops.append(['L',*p])
    def _curveToOne(self,a,b,c): self.ops.append(['C',*a,*b,*c])
    def _qCurveToOne(self,a,b):
        x,y=self._getCurrentPoint(); self._curveToOne((x+(a[0]-x)*2/3,y+(a[1]-y)*2/3),(b[0]+(a[0]-b[0])*2/3,b[1]+(a[1]-b[1])*2/3),b)
    def _closePath(self): self.ops.append(['Z'])
    def _endPath(self): pass

def transform(value):
    t=Transform()
    for name,v in re.findall(r'([a-z]+)\s*\(([^)]+)\)',value or '',re.I):
        n=[float(x) for x in re.split(r'[,\s]+',v.strip())]; name=name.lower()
        if name=='matrix': m=Transform(*n)
        elif name=='translate': m=Transform().translate(n[0],n[1] if len(n)>1 else 0)
        elif name=='scale': m=Transform().scale(n[0],n[1] if len(n)>1 else n[0])
        elif name=='rotate':
            m=Transform(); c=n[1:3] if len(n)>1 else [0,0];m=m.translate(*c).rotate(math.radians(n[0])).translate(-c[0],-c[1])
        else: raise ValueError('Unsupported transform '+name)
        t=t.transform(m)
    return t

def geometry(e):
    name=etree.QName(e).localname; n=lambda key,d=0:float(e.get(key,d))
    if name=='path': return e.get('d','')
    if name=='rect':
        x,y,w,h=n('x'),n('y'),n('width'),n('height');rx=min(w/2,n('rx',e.get('ry',0)));ry=min(h/2,n('ry',e.get('rx',0)))
        if not rx or not ry:return f'M{x} {y}h{w}v{h}h{-w}Z'
        return f'M{x+rx} {y}H{x+w-rx}A{rx} {ry} 0 0 1 {x+w} {y+ry}V{y+h-ry}A{rx} {ry} 0 0 1 {x+w-rx} {y+h}H{x+rx}A{rx} {ry} 0 0 1 {x} {y+h-ry}V{y+ry}A{rx} {ry} 0 0 1 {x+rx} {y}Z'
    if name in ['circle','ellipse']:
        x,y=n('cx'),n('cy');rx=n('r') if name=='circle' else n('rx');ry=n('r') if name=='circle' else n('ry')
        return f'M{x+rx} {y}A{rx} {ry} 0 1 1 {x-rx} {y}A{rx} {ry} 0 1 1 {x+rx} {y}Z'
    if name in ['polygon','polyline']:
        vals=re.findall(r'[-+\d.eE]+',e.get('points',''));return 'M'+' '.join(vals)+('Z' if name=='polygon' else '')
    return ''

def compile_svg(filename):
    tree=etree.parse(str(ASSETS/filename));paths=[]
    def visit(e,m=Transform(),inherited=None):
        name=etree.QName(e).localname
        if name in ['defs','metadata','namedview']:return
        style=dict(inherited or {'fill':'#000','stroke':'none'});style.update({k:v for k,v in e.attrib.items() if k in ['fill','stroke','stroke-width','fill-rule','stroke-linecap','stroke-linejoin']})
        style.update(dict(part.split(':',1)for part in e.get('style','').split(';')if ':' in part))
        if style.get('display')=='none':return
        m=m.transform(transform(e.get('transform')))
        d=geometry(e)
        # Source gray corner registration guides are construction marks, not icons.
        if d and style.get('stroke') not in ['#999','#999999']:
            if filename=='0630.svg':
                # Replace the source's XX kg placeholder, retaining its exact arrow,
                # separator and package silhouettes. Dynamic labels are outlined below.
                d=' '.join(p.d() for p in svg_path(d).continuous_subpaths() if p.bbox()[2]>106)
            if d:
                p=Pen();parse_path(d,TransformPen(p,m));b=BoundsPen(None);parse_path(d,TransformPen(b,m))
                fill=style.get('fill','black')!='none';stroke=style.get('stroke','none')!='none'
                if fill or stroke:paths.append({'ops':p.ops,'fill':fill,'rule':style.get('fill-rule','nonzero'),'stroke':float(style.get('stroke-width','1').replace('pt',''))*math.sqrt(abs(m.xx*m.yy-m.xy*m.yx)) if stroke else 0,'cap':style.get('stroke-linecap','butt'),'join':style.get('stroke-linejoin','miter'),'bounds':b.bounds})
        for child in e:
            if isinstance(child.tag,str):visit(child,m,style)
    visit(tree.getroot())
    if not paths:raise ValueError('Empty SVG '+filename)
    minx=min(p['bounds'][0]-p['stroke']/2 for p in paths);miny=min(p['bounds'][1]-p['stroke']/2 for p in paths)
    maxx=max(p['bounds'][2]+p['stroke']/2 for p in paths);maxy=max(p['bounds'][3]+p['stroke']/2 for p in paths);span=max(maxx-minx,maxy-miny)
    dx=(span-(maxx-minx))/2-minx;dy=(span-(maxy-miny))/2-miny
    for p in paths:
        p.pop('bounds');p['stroke']=round(p['stroke']/span*.84,7)
        p['ops']=[[op,*[round(.08+(v+(dy if i%2 else dx))/span*.84,7)for i,v in enumerate(values)]]for op,*values in p['ops']]
    return paths

FILES={'up':'0623.svg','fragile':'0621.svg','dry':'0626.svg','noHooks':'0622.svg','slingHere':'0625.svg','centerGravity':'0627.svg','protectHeat':'0624.svg','temperature':'0632.svg','noRoll':'0628.svg','noHandTruck':'0629.svg','stackWeight':'0630.svg','clampHere':'0631.svg','noClamp':'no-clamp.svg','recycle':'recycle.svg'}
data={k:compile_svg(v)for k,v in FILES.items()}
# Normal typographic figures retain their exact font outlines across SVG/PDF/Canvas.
font=TTFont('/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf');glyphs=font.getGlyphSet();cmap=font.getBestCmap();upem=font['head'].unitsPerEm;chars={}
for char in '0123456789.-kgm°C':
    name=cmap[ord(char)];p=Pen();glyphs[name].draw(TransformPen(p,Transform(1/upem,0,0,-1/upem,0,0)))
    chars[char]={'advance':round(glyphs[name].width/upem,7),'ops':[[op,*[round(v,7)for v in values]]for op,*values in p.ops]}
out='// Generated from pinned, freely licensed SVG files. Run scripts/import-handling-v73.py to reproduce.\nexport const HANDLING_ART_V73='+json.dumps(data,separators=(',',':'))+';\nexport const HANDLING_GLYPHS_V73='+json.dumps(chars,ensure_ascii=False,separators=(',',':'))+';\n'
(ROOT/'src/handlingArtworkV73.js').write_text(out)
print('Compiled',len(data),'downloaded vectors and',len(chars),'outline glyphs;',len(out),'bytes')
