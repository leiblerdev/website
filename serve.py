#!/usr/bin/env python3
"""Local preview mimicking Vercel cleanUrls. Run: python3 serve.py [port]"""
import http.server, os, sys
class H(http.server.SimpleHTTPRequestHandler):
    def translate_path(self, path):
        p = super().translate_path(path)
        base = p.split('?')[0]
        if not os.path.exists(base) and os.path.isfile(base + '.html'): return base + '.html'
        return p
    def send_error(self, code, *a, **k):
        if code == 404 and os.path.isfile('404.html'):
            self.send_response(404); self.send_header('Content-Type', 'text/html; charset=utf-8'); self.end_headers()
            self.wfile.write(open('404.html', 'rb').read()); return
        super().send_error(code, *a, **k)
port = int(sys.argv[1]) if len(sys.argv) > 1 else 8765
http.server.ThreadingHTTPServer(('', port), H).serve_forever()
