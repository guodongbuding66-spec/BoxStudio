#!/usr/bin/env python3
from http.server import ThreadingHTTPServer, SimpleHTTPRequestHandler
from urllib.parse import urlparse, parse_qs
from pathlib import Path
STARTED=Path('/tmp/boxstudio-v38-started'); PASS=Path('/tmp/boxstudio-v38-pass'); FAIL=Path('/tmp/boxstudio-v38-fail')
class Handler(SimpleHTTPRequestHandler):
    def do_GET(self):
        parsed=urlparse(self.path); query=parse_qs(parsed.query)
        if parsed.path=='/__v38_started__':
            STARTED.write_text(query.get('detail',['STARTED'])[0],encoding='utf-8'); self.send_response(204); self.end_headers(); return
        if parsed.path=='/__v38_pass__':
            PASS.write_text(query.get('detail',['PASS'])[0],encoding='utf-8'); self.send_response(204); self.end_headers(); return
        if parsed.path=='/__v38_fail__':
            FAIL.write_text(query.get('message',['FAIL'])[0],encoding='utf-8'); self.send_response(204); self.end_headers(); return
        return super().do_GET()
if __name__=='__main__':
    STARTED.unlink(missing_ok=True); PASS.unlink(missing_ok=True); FAIL.unlink(missing_ok=True)
    ThreadingHTTPServer(('127.0.0.1',8768),Handler).serve_forever()
