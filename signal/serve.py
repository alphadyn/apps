#!/usr/bin/env python3
"""Serve Signal locally and save removed trending terms to removed_trends.json."""

from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parent
REMOVED_FILE = ROOT / "removed_trends.json"
MAX_BODY = 1_000_000


class Handler(SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=str(ROOT), **kwargs)

    def do_PUT(self):
        if self.path.split("?")[0] != "/removed_trends.json":
            return self.send_error(404)
        try:
            length = int(self.headers.get("Content-Length", 0))
            if not 0 < length <= MAX_BODY:
                raise ValueError("bad length")
            removed = json.loads(self.rfile.read(length))["removed"]
            if not isinstance(removed, list) or not all(isinstance(t, str) for t in removed):
                raise ValueError("bad payload")
        except (ValueError, KeyError, TypeError):
            return self.send_error(400)
        REMOVED_FILE.write_text(json.dumps({"removed": sorted(set(removed), key=str.casefold)}, indent=2) + "\n", encoding="utf-8")
        self.send_response(204)
        self.end_headers()


if __name__ == "__main__":
    print("Signal: http://127.0.0.1:8000")
    ThreadingHTTPServer(("127.0.0.1", 8000), Handler).serve_forever()
