"""Source enrollment boundary tests using isolated fixtures, never live sites.

Copyright (c) 2026 Matthew X Murphy (https://MatthewxMurphy.com).
Product/support: https://builtnotbegged.com
SPDX-License-Identifier: GPL-2.0-or-later
"""

from __future__ import annotations

import copy
import importlib.util
import json
from pathlib import Path
import subprocess
import sys
import tempfile
import unittest

SCRIPT = Path(__file__).resolve().parents[1] / "scripts" / "check_bng_updates.py"
SPEC = importlib.util.spec_from_file_location("check_bng_updates", SCRIPT)
checker = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(checker)


class EnrollmentTests(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.addCleanup(self.temp.cleanup)
        self.root = Path(self.temp.name)
        self.source = self.root / "plugin" / "sample" / "sample.php"
        self.source.parent.mkdir(parents=True)
        self.source.write_text(
            "<?php\n/**\n"
            " * Plugin Name: Sample Product\n"
            " * Version: 0.1.0\n"
            " * Author: Historical Author\n"
            " * Author URI: https://example.test\n"
            " * License: GPL-2.0-or-later\n"
            " * Update URI: https://updates.builtnotbegged.com/products/sample\n"
            " */\n",
            encoding="utf-8",
        )
        (self.root / "VERSION").write_text("0.1.0\n", encoding="utf-8")
        self.manifest = {
            "schema": 1,
            "revision": "2026.10.11.001",
            "service": checker.SERVICE,
            "connector": {"plugin": checker.CONNECTOR, "minimum_version": checker.MINIMUM_CONNECTOR},
            "publication": {"approved": False},
            "components": [{
                "id": "sample", "kind": "plugin", "source": "plugin/sample/sample.php",
                "mode": "native", "baseline_version": "0.1.0", "release_pending": True,
                "headers": {"name": "Sample Product", "author": "Historical Author", "author_uri": "https://example.test", "license": "GPL-2.0-or-later"},
                "update_uri": checker.SERVICE + "/products/sample",
                "target": "sample/sample.php", "version_file": "VERSION",
            }],
        }

    @property
    def component(self):
        return self.manifest["components"][0]

    def result(self):
        return checker.validate(self.manifest, self.root)

    def assert_error(self, code):
        result = self.result()
        self.assertFalse(result["valid"])
        self.assertIn(code, {item["code"] for item in result["errors"]})
        return result

    def test_native_and_historical_version_are_valid_and_source_is_not_changed(self):
        before = self.source.read_bytes()
        self.assertTrue(self.result()["valid"])
        self.assertEqual(self.result()["counts"]["native"], 1)
        self.assertEqual(before, self.source.read_bytes())

    def test_optional_runtime_target_is_not_invented(self):
        del self.component["target"]
        self.assertTrue(self.result()["valid"])

    def test_existing_updater_is_preserved(self):
        old = "https://vendor.example.test/sample"
        self.source.write_text(self.source.read_text().replace(self.component["update_uri"], old))
        self.component.update(mode="existing-updater", update_uri=old)
        self.assertTrue(self.result()["valid"])
        self.component["update_uri"] = checker.SERVICE + "/products/sample"
        self.assert_error("existing-updater-uri")

    def test_existing_updater_without_historical_update_uri_is_preserved(self):
        self.source.write_text(self.source.read_text().replace(" * Update URI: " + self.component["update_uri"] + "\n", ""))
        self.component.update(mode="existing-updater", update_uri="")
        self.assertTrue(self.result()["valid"])

    def test_must_use_fixed_service(self):
        for value in ["http://updates.builtnotbegged.com", checker.SERVICE + "/", "https://attacker.example.test"]:
            with self.subTest(value=value):
                self.manifest["service"] = value
                self.assert_error("service")

    def test_calendar_revision_validation(self):
        for value in ["2026.01.11.001", "2026.10.1.001", "2026.2.30.001", "2026.10.11.000", "2026.10.11.1000", "1.0.0"]:
            with self.subTest(value=value):
                self.manifest["revision"] = value
                self.assert_error("revision")
        for value in ["2026.1.01.001", "2028.2.29.999"]:
            self.manifest["revision"] = value
            self.assertTrue(self.result()["valid"])

    def test_schema_is_strict_and_not_boolean(self):
        for value in [True, "1", 0, 2, None]:
            with self.subTest(value=value):
                self.manifest["schema"] = value
                self.assert_error("schema")

    def test_unknown_fields_are_not_silently_ignored(self):
        self.manifest["unexpected"] = "value"
        self.assert_error("unknown-field")
        del self.manifest["unexpected"]
        self.component["unexpected"] = "value"
        self.assert_error("unknown-field")

    def test_connector_identity_and_minimum_supported_version(self):
        self.manifest["connector"]["plugin"] = "different/different.php"
        self.assert_error("connector")
        self.manifest["connector"]["plugin"] = checker.CONNECTOR
        self.manifest["connector"]["minimum_version"] = "2026.10.10.001"
        self.assert_error("connector")
        self.manifest["connector"]["minimum_version"] = "2026.10.12.001"
        self.assertTrue(self.result()["valid"])

    def test_publication_cannot_be_approved(self):
        self.manifest["publication"]["approved"] = True
        self.assert_error("publication")
        self.manifest["publication"]["approved"] = False
        self.component["publication"] = {"approved": True}
        self.assert_error("publication")
        self.component["publication"] = {"approved": False}
        self.assertTrue(self.result()["valid"])

    def test_release_is_pending(self):
        self.component["release_pending"] = False
        self.assert_error("release-pending")

    def test_all_header_identity_fields_are_compared_exactly(self):
        for field in ["name", "author", "author_uri", "license"]:
            with self.subTest(field=field):
                original = self.component["headers"][field]
                self.component["headers"][field] = "Changed identity"
                self.assert_error("identity-mismatch")
                self.component["headers"][field] = original

    def test_historical_metadata_gaps_are_recorded_not_fabricated(self):
        self.source.write_text(self.source.read_text().replace(" * License: GPL-2.0-or-later\n", ""))
        self.component["headers"]["license"] = ""
        result = self.result()
        self.assertTrue(result["valid"])
        self.assertEqual(result["warnings"][0]["code"], "historical-metadata-gap")

    def test_header_version_and_version_file_are_synchronized(self):
        self.component["baseline_version"] = "0.2.0"
        self.assert_error("version-mismatch")
        self.component["baseline_version"] = "0.1.0"
        (self.root / "VERSION").write_text("0.2.0\n")
        self.assert_error("version-file-mismatch")

    def test_missing_header_version_is_rejected(self):
        self.source.write_text(self.source.read_text().replace(" * Version: 0.1.0\n", ""))
        self.assert_error("version-mismatch")

    def test_header_outside_wordpress_first_8192_bytes_is_not_used(self):
        self.source.write_bytes(b" " * 8192 + self.source.read_bytes())
        self.assert_error("header-kind")

    def test_utf8_boundary_is_supported_but_interior_invalid_encoding_is_not(self):
        self.source.write_bytes(self.source.read_bytes() + b" " * (8191 - len(self.source.read_bytes())) + b"\xc3\xa9")
        self.assertTrue(self.result()["valid"])
        self.source.write_bytes(b"\xff" + self.source.read_bytes())
        self.assert_error("unreadable-header")

    def test_comment_cleanup_and_case_insensitive_headers_match_wordpress(self):
        self.source.write_text(self.source.read_text().replace(" * Version: 0.1.0", " * VERSION: 0.1.0 */ trailing ignored"))
        self.assertTrue(self.result()["valid"])

    def test_native_uri_must_match_in_header_and_manifest(self):
        self.component["update_uri"] += "?token=example"
        self.assert_error("update-uri")
        self.component["update_uri"] = checker.SERVICE + "/products/sample"
        self.source.write_text(self.source.read_text().replace(self.component["update_uri"], "https://vendor.example.test"))
        self.assert_error("update-uri")

    def test_native_must_not_claim_mu_or_partial_theme_updates(self):
        for kind in ["mu-plugin", "theme-patch"]:
            with self.subTest(kind=kind):
                self.component["kind"] = kind
                self.assert_error("mode")

    def test_mu_plugin_managed_source_retains_header(self):
        self.component.update(kind="mu-plugin", mode="managed-source")
        self.assertTrue(self.result()["valid"])
        self.component["update_uri"] = "https://invented.example.test"
        self.assert_error("managed-source-uri")

    def test_managed_source_can_preserve_a_missing_historical_version(self):
        self.source.write_text(self.source.read_text().replace(" * Version: 0.1.0\n", ""))
        self.component.update(kind="mu-plugin", mode="managed-source", baseline_version="")
        del self.component["version_file"]
        result = self.result()
        self.assertTrue(result["valid"])
        self.assertIn("historical-version-gap", {w["code"] for w in result["warnings"]})
        self.component.update(kind="plugin", mode="native")
        self.assert_error("version")

    def test_distribution_scopes_do_not_approve_publication(self):
        for scope in sorted(checker.DISTRIBUTIONS):
            self.component["distribution"] = scope
            self.assertTrue(self.result()["valid"])
        self.component["distribution"] = "automatically-publish"
        self.assert_error("distribution")

    def test_theme_style_css_header_and_partial_mode(self):
        style = self.root / "theme" / "sample" / "style.css"
        style.parent.mkdir(parents=True)
        style.write_text(self.source.read_text().replace("<?php\n", "").replace("Plugin Name", "Theme Name"))
        self.component.update(kind="theme", source="theme/sample/style.css", target="sample")
        self.assertTrue(self.result()["valid"])
        self.component.update(kind="theme-patch", mode="managed-source")
        self.assertTrue(self.result()["valid"])

    def test_named_css_theme_patch_is_managed_and_cannot_claim_native(self):
        patch = self.root / "patches" / "cph-theme-sync-style.css"
        patch.parent.mkdir(parents=True)
        patch.write_text(self.source.read_text().replace("<?php\n", "").replace("Plugin Name", "Theme Name"))
        self.component.update(kind="theme-patch", mode="managed-source", source="patches/cph-theme-sync-style.css", target="sample")
        self.assertTrue(self.result()["valid"])
        self.component["mode"] = "native"
        self.assert_error("mode")
        self.component.update(kind="theme", mode="managed-source")
        self.assert_error("theme-header")

    def test_opposite_component_header_is_rejected(self):
        self.source.write_text(self.source.read_text() + "/* Theme Name: Opposite */\n")
        self.assert_error("header-kind")

    def test_wrong_header_file_extension_is_rejected(self):
        other = self.source.with_suffix(".txt")
        other.write_bytes(self.source.read_bytes())
        self.component["source"] = "plugin/sample/sample.txt"
        self.assert_error("plugin-header")

    def test_unsafe_source_paths_fail(self):
        for value in ["../escape.php", "/etc/passwd", "plugin//sample.php", "plugin/./sample.php", "plugin/../sample.php", "C:/sample.php", "plugin\\sample.php", "plugin/\x00sample.php", ""]:
            with self.subTest(value=value):
                self.component["source"] = value
                self.assert_error("unsafe-path")

    def test_missing_or_directory_source_is_rejected(self):
        self.component["source"] = "absent.php"
        self.assert_error("missing-or-escaped-path")
        self.component["source"] = "plugin/sample"
        self.assert_error("not-file")

    def test_symlink_files_and_parents_are_rejected_even_when_inside_root(self):
        link = self.root / "linked.php"
        link.symlink_to(self.source)
        self.component["source"] = "linked.php"
        self.assert_error("symlink-path")
        link_dir = self.root / "linked"
        link_dir.symlink_to(self.source.parent, target_is_directory=True)
        self.component["source"] = "linked/sample.php"
        self.assert_error("symlink-path")

    def test_version_file_paths_are_checked_the_same_way(self):
        self.component["version_file"] = "../VERSION"
        self.assert_error("version-file")

    def test_unique_id_source_and_runtime_target(self):
        self.manifest["components"].append(copy.deepcopy(self.component))
        result = self.result()
        self.assertEqual({e["code"] for e in result["errors"]}, {"duplicate-id", "duplicate-source", "duplicate-target"})

    def test_unsafe_runtime_target_is_rejected(self):
        self.component["target"] = "../sample.php"
        self.assert_error("target")

    def test_untrusted_malformed_field_types_do_not_crash(self):
        for field in ["id", "kind", "mode", "baseline_version", "target", "source", "headers"]:
            with self.subTest(field=field):
                original = self.component[field]
                self.component[field] = []
                self.assertFalse(self.result()["valid"])
                self.component[field] = original

    def test_credentials_are_rejected_without_echoing_the_input(self):
        sentinel = "DO-NOT-PRINT-THIS-TEST-VALUE"
        self.component["nested"] = {"client_secret": sentinel}
        result = self.assert_error("private-data")
        self.assertNotIn(sentinel, json.dumps(result))
        self.assertNotIn("client_secret", json.dumps(result))

    def test_private_key_marker_in_notes_is_rejected_without_echo(self):
        self.manifest["notes"] = "-----BEGIN " + "OPENSSH PRIVATE KEY----- TEST"
        result = self.assert_error("private-data")
        self.assertNotIn("BEGIN", json.dumps(result))

    def test_duplicate_json_keys_are_rejected_without_echo(self):
        (self.root / "bng-updates.json").write_text('{"schema":1,"schema":2}')
        self.assertEqual(checker.check(self.root)["errors"][0]["code"], "duplicate-json-key")

    def test_excessive_nesting_has_sanitized_diagnostic(self):
        value = "deep"
        for _ in range(100):
            value = [value]
        self.manifest["notes"] = value
        self.assert_error("manifest-depth")

    def test_non_json_number_constants_are_rejected(self):
        for value in ["NaN", "Infinity", "-Infinity"]:
            with self.subTest(value=value):
                (self.root / "bng-updates.json").write_text('{"schema":' + value + '}')
                self.assertEqual(checker.check(self.root)["errors"][0]["code"], "non-json-constant")

    def test_non_string_in_memory_key_does_not_crash(self):
        self.manifest[1] = "value"
        self.assert_error("schema")

    def test_manifest_symlink_and_escape_are_rejected(self):
        (self.root / "real.json").write_text(json.dumps(self.manifest))
        (self.root / "bng-updates.json").symlink_to(self.root / "real.json")
        self.assertEqual(checker.check(self.root)["errors"][0]["code"], "symlink-path")
        self.assertEqual(checker.check(self.root, "../real.json")["errors"][0]["code"], "unsafe-path")

    def test_large_manifest_is_rejected(self):
        (self.root / "bng-updates.json").write_bytes(b" " * (checker.MAX_MANIFEST_BYTES + 1))
        self.assertEqual(checker.check(self.root)["errors"][0]["code"], "manifest-too-large")

    def test_component_list_schema(self):
        self.manifest["components"] = []
        self.assert_error("components")

    def test_cli_exit_status_and_sanitized_output(self):
        (self.root / "bng-updates.json").write_text(json.dumps(self.manifest))
        good = subprocess.run([sys.executable, str(SCRIPT), "check", "--root", str(self.root)], capture_output=True, text=True)
        self.assertEqual(good.returncode, 0)
        self.assertTrue(json.loads(good.stdout)["valid"])
        self.manifest["api_key"] = "UNSAFE-TEST-CREDENTIAL"
        (self.root / "bng-updates.json").write_text(json.dumps(self.manifest))
        bad = subprocess.run([sys.executable, str(SCRIPT), "--root", str(self.root)], capture_output=True, text=True)
        self.assertEqual(bad.returncode, 1)
        self.assertNotIn("UNSAFE-TEST-CREDENTIAL", bad.stdout + bad.stderr)


if __name__ == "__main__":
    unittest.main()
