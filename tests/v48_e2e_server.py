from http.server import ThreadingHTTPServer, SimpleHTTPRequestHandler
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]
SIGNALS={'/__v48_started__':'/tmp/boxstudio-v48-started','/__v48_pass__':'/tmp/boxstudio-v48-pass','/__v48_fail__':'/tmp/boxstudio-v48-fail'}
class H(SimpleHTTPRequestHandler):
    def __init__(self,*a,**kw): super().__init__(*a,directory=str(ROOT),**kw)
    def do_POST(self):
        target=SIGNALS.get(self.path)
        if not target: self.send_error(404); return
        n=int(self.headers.get('Content-Length','0') or 0);Path(target).write_text(self.rfile.read(n).decode('utf-8','replace'),encoding='utf-8');self.send_response(204);self.end_headers()
    def log_message(self,fmt,*args): print(fmt%args,flush=True)
ThreadingHTTPServer(('127.0.0.1',8778),H).serve_forever()
