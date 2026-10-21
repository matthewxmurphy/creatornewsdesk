"""Synthetic HTTP boundaries; no real config, pipeline or provider operations.

Copyright (c) 2026 Matthew X Murphy, https://MatthewxMurphy.com.
Product: https://builtnotbegged.com. SPDX-License-Identifier: MIT
"""
import http.client
import importlib.util
import json
import os
from pathlib import Path
import tempfile
import threading
import unittest
from unittest.mock import patch, mock_open
from urllib.error import HTTPError
from urllib.request import ProxyHandler, Request, build_opener

spec = importlib.util.spec_from_file_location(
    "dashboard_server", Path(__file__).resolve().parents[1] / "dashboard_server.py")
module = importlib.util.module_from_spec(spec)
spec.loader.exec_module(module)
TOKEN = "synthetic-dashboard-owner-fixture-00000000"  # Never an operator credential.


class AccessTests(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.addCleanup(self.temp.cleanup)
        self.root = Path(self.temp.name)
        self.public = self.root / "public"
        self.public.mkdir()
        self.private = self.root / "private"
        self.private.mkdir()
        for name in module.PUBLIC_FILES:
            (self.public / name).write_text("public synthetic " + name)
        for name in [".env", "source.py", "data.db", "unknown.png"]:
            (self.public / name).write_text("private synthetic decoy")
        self.config = self.private / "config.json"
        self.config.write_text('{"synthetic": true}')
        self.status = self.private / "status.json"
        self.status.write_text('{"running": false, "fixture": "private-status"}')
        for name, value in [("PUBLIC_ROOT", self.public), ("CONFIG_FILE", str(self.config)),
                            ("STATUS_FILE", str(self.status))]:
            fixture = patch.object(module, name, value)
            fixture.start()
            self.addCleanup(fixture.stop)
        self.network = patch.object(module.requests.sessions.Session, "request",
                                    side_effect=AssertionError("External HTTP is forbidden in this fixture"))
        self.blocked_network = self.network.start()
        self.addCleanup(self.network.stop)
        self.server = module.create_server("127.0.0.1", 0, TOKEN)
        self.thread = threading.Thread(
            target=lambda: self.server.serve_forever(poll_interval=0.01), daemon=True)
        self.thread.start()
        self.addCleanup(self.stop_server)
        self.url = f"http://127.0.0.1:{self.server.server_port}"
        self.opener = build_opener(ProxyHandler({}))

    def stop_server(self):
        self.server.shutdown()
        self.server.server_close()
        self.thread.join()
        self.blocked_network.assert_not_called()

    def request(self, path, method="GET", body=None, auth=False, headers=None):
        request_headers = dict(headers or {})
        if auth:
            request_headers["Authorization"] = "Bearer " + TOKEN
        request = Request(self.url + path, data=body, method=method, headers=request_headers)
        try:
            with self.opener.open(request, timeout=3) as response:
                return response.status, response.read(), response.headers
        except HTTPError as response:
            with response:
                return response.code, response.read(), response.headers

    def assert_private_unchanged(self):
        self.assertEqual(json.loads(self.config.read_text()), {"synthetic": True})
        self.assertEqual(json.loads(self.status.read_text()),
                         {"running": False, "fixture": "private-status"})

    def test_config_read_write_require_owner(self):
        for path in ["/api/config", "/config.json?cache=1", "/api/status"]:
            self.assertEqual(self.request(path)[0], 401)
        self.assertEqual(self.request("/api/save-config", "POST", b'{"changed":true}')[0], 401)
        self.assert_private_unchanged()
        self.assertEqual(self.request("/api/save-config", "POST", b'{"changed":true}', True)[0], 200)
        self.assertEqual(json.loads(self.config.read_text()), {"changed": True})
        self.assertEqual(self.config.stat().st_mode & 0o777, 0o600)
        self.assertEqual(list(self.private.glob(".cnd-config-*")), [])

    def test_owner_can_read_only_intended_private_aliases(self):
        for path in ["/api/config?cache=1", "/config.json"]:
            code, body, headers = self.request(path, auth=True)
            self.assertEqual(code, 200)
            self.assertEqual(json.loads(body), {"synthetic": True})
            self.assertEqual(headers["Cache-Control"], "no-store")
        code, body, _ = self.request("/api/status?cache=1", auth=True)
        self.assertEqual(code, 200)
        self.assertEqual(json.loads(body), {"running": False, "fixture": "private-status"})

    def test_all_mutations_reject_before_state_or_provider_access(self):
        with patch.object(module, "load_status") as load, patch.object(module, "save_status") as save, \
                patch.object(module, "private_json_write") as write:
            for path in ["/api/save-config", "/api/run-pipeline", "/api/fetch-50?date=synthetic",
                         "/api/deploy-openclaw", "/unknown"]:
                self.assertEqual(self.request(path, "POST", b'{}')[0], 401)
                self.assertEqual(self.request(path, "POST", b'{}', headers={
                    "Authorization": "Bearer wrong-synthetic-token"})[0], 401)
            load.assert_not_called()
            save.assert_not_called()
            write.assert_not_called()
        self.assert_private_unchanged()

    def test_retired_agent_endpoint_owner_request_is_not_found_without_state_access(self):
        # Retired endpoint is a negative control, not an available component.
        with patch.object(module, "load_status") as load, patch.object(module, "save_status") as save, \
                patch.object(module, "private_json_write") as write, \
                patch.object(module, "open", mock_open(read_data='{"sites": []}'), create=True) as config_read:
            for path in ["/api/deploy-openclaw", "/api/download-openclaw-agent"]:
                code, body, _ = self.request(path, "POST", b'{}', True)
                self.assertEqual(code, 404)
                self.assertEqual(body, b'')
            load.assert_not_called()
            save.assert_not_called()
            write.assert_not_called()
            config_read.assert_not_called()
        self.assert_private_unchanged()

    def test_query_cookie_and_wrong_scheme_cannot_replace_bearer(self):
        for headers in [{"Cookie": "token=" + TOKEN}, {"Authorization": "Basic " + TOKEN},
                        {"Authorization": "Bearer " + TOKEN + "-wrong"}]:
            self.assertEqual(self.request("/api/config?token=" + TOKEN, headers=headers)[0], 401)
        self.assert_private_unchanged()

    def test_cross_origin_reads_and_mutations_rejected(self):
        for origin in ["https://attacker.invalid", "null", "ftp://127.0.0.1",
                       self.url + "0", "http://[malformed"]:
            for path, method, body in [("/api/config", "GET", None),
                                       ("/api/save-config", "POST", b'{}')]:
                self.assertEqual(self.request(path, method, body, True, {"Origin": origin})[0], 403)
        self.assert_private_unchanged()

    def test_same_origin_owner_write_and_nonbrowser_owner_read_remain_allowed(self):
        self.assertEqual(self.request("/api/save-config", "POST", b'{"synthetic":true}',
                                      True, {"Origin": self.url})[0], 200)
        self.assertEqual(self.request("/api/config", auth=True)[0], 200)
        self.assert_private_unchanged()

    def test_all_public_assets_get_and_head_without_owner(self):
        for path in ["/", "/?cache=1", *["/" + name for name in sorted(module.PUBLIC_FILES)]]:
            code, body, headers = self.request(path)
            self.assertEqual(code, 200)
            self.assertTrue(body.startswith(b"public synthetic "))
            self.assertEqual(int(headers["Content-Length"]), len(body))
            self.assertEqual(headers["Cache-Control"], "no-store")
            self.assertEqual(headers["X-Content-Type-Options"], "nosniff")
            self.assertEqual(headers["Referrer-Policy"], "no-referrer")
            code, head_body, head_headers = self.request(path, "HEAD")
            self.assertEqual((code, head_body), (200, b""))
            self.assertEqual(headers["Content-Length"], head_headers["Content-Length"])

    def test_private_unknown_and_traversal_targets_never_fall_back_to_files(self):
        for path in ["/.env", "/source.py", "/../private/config.json", "/%2e%2e/private/config.json",
                     "/%2eenv", "/data.db", "/unknown.png", "/dashboard.html/../config.json",
                     "/docs/", "/private/config.json", "/api/config/"]:
            for method in ["GET", "HEAD"]:
                code, body, _ = self.request(path, method)
                self.assertEqual(code, 404)
                self.assertNotIn(b"private synthetic", body)
                self.assertNotIn(b'"synthetic": true', body)
        for path in ["/config.json", "/api/config", "/api/status"]:
            self.assertEqual(self.request(path, "HEAD")[:2], (404, b""))
        self.assert_private_unchanged()

    def test_allowlisted_symlink_is_not_public(self):
        public = self.public / "dashboard.html"
        public.unlink()
        public.symlink_to(self.config)
        for method in ["GET", "HEAD"]:
            self.assertEqual(self.request("/dashboard.html", method)[0], 404)
        self.assert_private_unchanged()

    def test_config_symlink_write_denied_without_touching_target(self):
        target = self.private / "symlink-target.json"
        target.write_text('{"synthetic": true}')
        self.config.unlink()
        self.config.symlink_to(target)
        self.assertEqual(self.request("/api/save-config", "POST", b'{}', True)[0], 400)
        self.assertTrue(self.config.is_symlink())
        self.assert_private_unchanged()
        self.assertEqual(list(self.private.glob(".cnd-config-*")), [])

    def test_atomic_replace_failure_preserves_original_and_removes_temporary(self):
        original = self.config.read_bytes()
        with patch.object(module.os, "replace", side_effect=OSError("synthetic write failure")):
            self.assertEqual(self.request("/api/save-config", "POST", b'{}', True)[0], 400)
        self.assertEqual(self.config.read_bytes(), original)
        self.assertEqual(list(self.private.glob(".cnd-config-*")), [])
        self.assert_private_unchanged()

    def test_invalid_json_preserves_private_state(self):
        for body in [b'[]', b'{', b'null', b'true', b'1', b'"text"', b'{"bad":"\xff"}']:
            self.assertEqual(self.request("/api/save-config", "POST", body, True)[0], 400)
        self.assert_private_unchanged()

    def test_invalid_body_framing_preserves_private_state(self):
        for headers, expected in [({"Content-Length": "invalid"}, 400),
                                  ({"Content-Length": "-1"}, 413),
                                  ({"Content-Length": str(module.MAX_BODY + 1)}, 413),
                                  ({"Transfer-Encoding": "chunked"}, 400)]:
            self.assertEqual(self.request("/api/save-config", "POST", b'', True, headers)[0], expected)
        self.assert_private_unchanged()

    def test_owner_check_precedes_origin_and_body_parsing(self):
        self.assertEqual(self.request("/api/save-config", "POST", b'', headers={
            "Origin": "http://[malformed", "Content-Length": "invalid"})[0], 401)
        self.assert_private_unchanged()

    def test_malformed_get_head_targets_rejected_before_private_access(self):
        for method in ["GET", "HEAD"]:
            connection = http.client.HTTPConnection("127.0.0.1", self.server.server_port, timeout=3)
            try:
                connection.putrequest(method, "http://[malformed", skip_host=True)
                connection.putheader("Host", f"127.0.0.1:{self.server.server_port}")
                connection.endheaders()
                response = connection.getresponse()
                self.assertEqual(response.status, 400)
                self.assertNotIn(b'"synthetic": true', response.read())
            finally:
                connection.close()
        self.assertEqual(self.request("/api/config", auth=True)[0], 200)
        self.assert_private_unchanged()

    def test_missing_token_fails_startup_and_default_bind_is_loopback(self):
        for token in ["", "too-short"]:
            with self.assertRaises(ValueError):
                module.create_server("127.0.0.1", 0, token)
        with patch.dict(os.environ, {"CND_DASHBOARD_TOKEN": ""}):
            with self.assertRaises(ValueError):
                module.create_server(port=0)
        server = module.create_server(port=0, token=TOKEN)
        try:
            self.assertEqual(server.server_address[0], "127.0.0.1")
        finally:
            server.server_close()


if __name__ == "__main__":
    unittest.main()
