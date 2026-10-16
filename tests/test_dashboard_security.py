"""Synthetic HTTP access-boundary tests; no pipeline/provider operations.
Matthew X Murphy, https://MatthewxMurphy.com; https://builtnotbegged.com. MIT.
"""
import importlib.util
from pathlib import Path
import tempfile
import threading
import unittest
from unittest.mock import patch
from urllib.request import Request, urlopen
from urllib.error import HTTPError
import json

spec = importlib.util.spec_from_file_location("dashboard_server", Path(__file__).resolve().parents[1] / "dashboard_server.py")
module = importlib.util.module_from_spec(spec)
spec.loader.exec_module(module)
TOKEN = "synthetic-dashboard-owner-fixture-00000000"  # Fixed fixture, never a credential.

class AccessTests(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.root = Path(self.temp.name)
        (self.root / "dashboard.html").write_text("public fixture")
        (self.root / ".env").write_text("SYNTHETIC=fixture")
        (self.root / "source.py").write_text("fixture")
        self.config = self.root / "config.json"
        self.config.write_text('{"synthetic": true}')
        self.patches = [patch.object(module, "PUBLIC_ROOT", self.root), patch.object(module, "CONFIG_FILE", str(self.config))]
        for p in self.patches: p.start()
        self.server = module.create_server("127.0.0.1", 0, TOKEN)
        self.thread = threading.Thread(target=self.server.serve_forever, daemon=True)
        self.thread.start()
        self.url = f"http://127.0.0.1:{self.server.server_port}"
    def tearDown(self):
        self.server.shutdown(); self.server.server_close(); self.thread.join()
        for p in self.patches: p.stop()
        self.temp.cleanup()
    def request(self, path, method="GET", body=None, auth=False, headers=None):
        h = headers or {}
        if auth: h["Authorization"] = "Bearer " + TOKEN
        try:
            with urlopen(Request(self.url + path, data=body, method=method, headers=h)) as r:
                return r.status, r.read(), r.headers
        except HTTPError as e:
            with e: return e.code, e.read(), e.headers
    def test_config_read_write_require_owner(self):
        for path in ["/api/config", "/config.json?cache=1", "/api/status"]:
            self.assertEqual(self.request(path)[0], 401)
        self.assertEqual(self.request("/api/save-config", "POST", b'{"changed":true}')[0], 401)
        self.assertEqual(json.loads(self.config.read_text()), {"synthetic": True})
        self.assertEqual(self.request("/api/config", auth=True)[0], 200)
        self.assertEqual(self.request("/api/save-config", "POST", b'{"changed":true}', True)[0], 200)
        self.assertEqual(json.loads(self.config.read_text()), {"changed": True})
        self.assertEqual(self.config.stat().st_mode & 0o777, 0o600)
    def test_static_allowlist_get_and_head(self):
        self.assertEqual(self.request("/")[0], 200)
        for path in ["/.env", "/source.py", "/../.env", "/%2eenv", "/data.db"]:
            for method in ["GET", "HEAD"]:
                self.assertEqual(self.request(path, method)[0], 404)
        self.assertEqual(self.request("/")[2]["Cache-Control"], "no-store")
    def test_cross_origin_mutation_rejected(self):
        self.assertEqual(self.request("/api/save-config", "POST", b'{}', True, {"Origin": "https://attacker.invalid"})[0], 403)
        self.assertEqual(json.loads(self.config.read_text()), {"synthetic": True})
    def test_invalid_and_oversized_json_preserve_config(self):
        for body in [b'[]', b'{']:
            self.assertIn(self.request("/api/save-config", "POST", body, True)[0], [400, 413])
        self.assertEqual(self.request("/api/save-config", "POST", b'', True, {"Content-Length": str(module.MAX_BODY + 1)})[0], 413)
        self.assertEqual(json.loads(self.config.read_text()), {"synthetic": True})
    def test_missing_token_fails_startup(self):
        for token in ["", "too-short"]:
            with self.assertRaises(ValueError): module.create_server("127.0.0.1", 0, token)

if __name__ == "__main__": unittest.main()
