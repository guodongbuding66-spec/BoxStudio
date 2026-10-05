#!/usr/bin/env python3
from http.server import ThreadingHTTPServer, SimpleHTTPRequestHandler
from urllib.parse import urlparse, parse_qs
from pathlib import Path
STARTED=Path('/tmp/boxstudio-v40-started'); PASS=Path('/tmp/boxstudio-v40-pass'); FAIL=Path('/tmp/boxstudio-v40-fail')
INDEX_STARTED=Path('/tmp/boxstudio-v40-index-started'); INDEX_PASS=Path('/tmp/boxstudio-v40-index-pass'); INDEX_FAIL=Path('/tmp/boxstudio-v40-index-fail')
class Handler(SimpleHTTPRequestHandler):
    def do_GET(self):
        parsed=urlparse(self.path); query=parse_qs(parsed.query)
        routes={
            '/__v40_started__':(STARTED,'detail','STARTED'),'/__v40_pass__':(PASS,'detail','PASS'),'/__v40_fail__':(FAIL,'message','FAIL'),
            '/__v40_index_started__':(INDEX_STARTED,'detail','STARTED'),'/__v40_index_pass__':(INDEX_PASS,'detail','PASS'),'/__v40_index_fail__':(INDEX_FAIL,'message','FAIL'),
        }
        if parsed.path in routes:
            target,key,default=routes[parsed.path]; target.write_text(query.get(key,[default])[0],encoding='utf-8'); self.send_response(204); self.end_headers(); return
        return super().do_GET()
if __name__=='__main__':
    for p in [STARTED,PASS,FAIL,INDEX_STARTED,INDEX_PASS,INDEX_FAIL]: p.unlink(missing_ok=True)
    ThreadingHTTPServer(('127.0.0.1',8770),Handler).serve_forever()
