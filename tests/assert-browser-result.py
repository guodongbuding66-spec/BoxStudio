"""Fail CI unless the full-entry browser fixture reports successful completion."""
import html.parser
import json
import sys
class BodyParser(html.parser.HTMLParser):
    attrs = {}
    def handle_starttag(self, tag, attrs):
        if tag == 'body': self.attrs = dict(attrs)
parser = BodyParser()
parser.feed(open(sys.argv[1], encoding='utf8').read())
if sys.argv[2] == 'live':
    report = json.loads(parser.attrs.get('data-live-artwork-result', '{}'))
    assert report.get('status') == 'PASS', report
    print(json.dumps(report, ensure_ascii=False))
else:
    assert parser.attrs.get('data-capture-ready') == sys.argv[2], parser.attrs
    assert 'data-capture-error' not in parser.attrs, parser.attrs
    print('Full-entry screenshot ready:', sys.argv[2])
