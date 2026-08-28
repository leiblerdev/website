#!/usr/bin/env python3
"""Local preview of public/ that mimics Vercel cleanUrls and the 404 page. Run: python3 tools/serve.py [port]"""
import http.server
import os
import sys

ROOT = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "public")


class Handler(http.server.SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=ROOT, **kwargs)

    def translate_path(self, path):
        full = super().translate_path(path)
        base = full.split("?")[0]
        if not os.path.exists(base) and os.path.isfile(base + ".html"):
            return base + ".html"
        return full

    def send_error(self, code, *args, **kwargs):
        page = os.path.join(ROOT, "404.html")
        if code == 404 and os.path.isfile(page):
            self.send_response(404)
            self.send_header("Content-Type", "text/html; charset=utf-8")
            self.end_headers()
            with open(page, "rb") as handle:
                self.wfile.write(handle.read())
            return
        super().send_error(code, *args, **kwargs)


port = int(sys.argv[1]) if len(sys.argv) > 1 else 8765
http.server.ThreadingHTTPServer(("", port), Handler).serve_forever()
