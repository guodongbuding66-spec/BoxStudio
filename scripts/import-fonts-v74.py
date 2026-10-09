import urllib.request,pathlib,hashlib,json
from fontTools.ttLib import TTFont
from fontTools.varLib.instancer import instantiateVariableFont
from fontTools import subset
root=pathlib.Path(__file__).resolve().parent.parent/"assets/fonts-v74";root.mkdir(parents=True,exist_ok=True)
fonts=[("sans-sc","notosanssc","NotoSansSC[wght].ttf","BoxStudio Sans SC"),("serif-sc","notoserifsc","NotoSerifSC[wght].ttf","BoxStudio Serif SC"),("lato","lato","Lato-Regular.ttf","BoxStudio Lato"),("mono","robotomono","RobotoMono[wght].ttf","BoxStudio Mono")]
# GB2312 plus Latin, punctuation and metric symbols. Keep full Chinese coverage
# in the optional original-font import; the bundled version covers 6763 Hanzi.
chars=set(chr(i) for i in range(32,591))|set("×℃°—–•㎡㎏²³①②③④⑤⑥⑦⑧⑨⑩")
for a in range(0xa1,0xf8):
 for b in range(0xa1,0xff):
  try:chars.add(bytes([a,b]).decode("gb2312"))
  except:pass
rows=[]
for id,folder,file,name in fonts:
 url="https://raw.githubusercontent.com/google/fonts/main/ofl/"+folder+"/"+urllib.parse.quote(file)
 cache=pathlib.Path("/tmp/v74-"+id+".ttf")
 if id=="sans-sc":cache=pathlib.Path("/tmp/NotoSansSC.ttf")
 if not cache.exists():cache.write_bytes(urllib.request.urlopen(url,timeout=40).read())
 lic=urllib.request.urlopen("https://raw.githubusercontent.com/google/fonts/main/ofl/"+folder+"/OFL.txt",timeout=30).read();(root/(id+"-OFL.txt")).write_text("\n".join(line.rstrip() for line in lic.decode("utf-8").splitlines())+"\n")
 for weight in [400,700]:
  f=TTFont(cache)
  if "fvar" in f:f=instantiateVariableFont(f,{a.axisTag:(weight if a.axisTag=="wght" else a.defaultValue) for a in f["fvar"].axes},inplace=True)
  elif weight==700:
   boldurl=url.replace("Regular","Bold");f=TTFont(__import__("io").BytesIO(urllib.request.urlopen(boldurl,timeout=30).read()))
  opt=subset.Options();opt.name_IDs=[0,1,2,3,4,5,6];opt.layout_features=["*"];sub=subset.Subsetter(options=opt);sub.populate(unicodes=[ord(c) for c in chars]);sub.subset(f)
  for rec in f["name"].names:
   if rec.nameID in [1,3,4,6]:rec.string=(name+(" Bold" if weight==700 else " Regular")).encode(rec.getEncoding(),errors="replace")
  dest=root/(id+"-"+str(weight)+".ttf");f.save(dest);d=dest.read_bytes();print(dest.name,len(d),flush=True)
  rows.append(dict(id=id,weight=weight,name=name,source=(url.replace("Regular","Bold") if id=="lato" and weight==700 else url),license="OFL-1.1",file=dest.name,sha256=hashlib.sha256(d).hexdigest(),coverage="GB2312 + Latin" if "sc" in id else "Latin"))
(root/"sources.json").write_text(json.dumps(rows,ensure_ascii=False,indent=2))
