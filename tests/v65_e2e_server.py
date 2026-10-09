from http.server import ThreadingHTTPServer, SimpleHTTPRequestHandler
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]
SIGNALS={'/__v65_started__':'/tmp/boxstudio-v65-started','/__v65_pass__':'/tmp/boxstudio-v65-pass','/__v65_fail__':'/tmp/boxstudio-v65-fail'}
class H(SimpleHTTPRequestHandler):
    def __init__(self,*a,**kw): super().__init__(*a,directory=str(ROOT),**kw)
    def do_GET(self):
        if self.path.split("?")[0] == "/marks": self.path="/index.html"
        super().do_GET()
    def do_POST(self):
        if self.path in ['/__v71_glb__','/__v71_png__']:
            output=ROOT/'artifacts/v71'/('browser.glb' if self.path.endswith('glb__') else 'browser.png')
            output.parent.mkdir(parents=True,exist_ok=True)
            n=int(self.headers.get('Content-Length','0') or 0)
            if n>50*1024*1024: self.send_error(413); return
            output.write_bytes(self.rfile.read(n)); self.send_response(204); self.end_headers(); return
        target=SIGNALS.get(self.path)
        if not target: self.send_error(404); return
        n=int(self.headers.get('Content-Length','0') or 0); Path(target).write_text(self.rfile.read(n).decode('utf-8','replace'),encoding='utf-8'); self.send_response(204); self.end_headers()
    def log_message(self,fmt,*args): print(fmt%args,flush=True)
ThreadingHTTPServer(('127.0.0.1',8795),H).serve_forever()
