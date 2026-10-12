#!/usr/bin/env python3
"""Validate source-only enrollment in the Built Not Begged update service.

Copyright (c) 2026 Matthew X Murphy (https://MatthewxMurphy.com).
Product/support: https://builtnotbegged.com
SPDX-License-Identifier: GPL-2.0-or-later

The checker performs no network requests or writes. A valid declaration means
the checked source preserves its recorded identities and update routing; it
does not approve publication, construct a ZIP, or prove a deployed update.
All errors use fixed messages so credential-bearing input is not echoed to CI.
"""

from __future__ import annotations

import argparse
import codecs
import datetime as dt
import json
from pathlib import Path, PurePosixPath
import re
import sys
from typing import Any


SERVICE = "https://updates.builtnotbegged.com"
CONNECTOR = "bng-updates/bng-updates.php"
MINIMUM_CONNECTOR = "2026.10.11.001"
KINDS = {"plugin", "theme", "mu-plugin", "theme-patch"}
MODES = {"native", "existing-updater", "managed-source"}
MAX_MANIFEST_BYTES = 1_048_576
MAX_COMPONENTS = 1000
ROOT_KEYS = {
    "schema", "revision", "service", "connector", "publication",
    "components", "notes", "repository",
}
COMPONENT_KEYS = {
    "id", "kind", "source", "mode", "baseline_version", "release_pending",
    "headers", "update_uri", "target", "version_file", "publication", "notes", "distribution",
}
DISTRIBUTIONS = {"closed", "protected", "review-before-publication", "public", "internal"}
HEADER_KEYS = {"name", "author", "author_uri", "license"}
PRIVATE_KEY = re.compile(
    r"(?:password|passwd|credential|(?:^|_)token(?:$|_)|secret|private.?key|"
    r"api.?key|access.?key|authorization|bearer|cookie)", re.I
)
PRIVATE_VALUE = re.compile(r"-----BEGIN (?:OPENSSH |RSA |EC |DSA )?PRIVATE KEY-----")
SLUG = re.compile(r"[a-z0-9]+(?:-[a-z0-9]+)*\Z")
CALENDAR = re.compile(r"(\d{4})\.([1-9]|1[0-2])\.(\d{2})\.(\d{3})\Z")


class InputError(ValueError):
    """A deliberately generic error suitable for untrusted CI input."""


def calendar_parts(value: Any) -> tuple[int, int, int, int] | None:
    if not isinstance(value, str):
        return None
    match = CALENDAR.fullmatch(value)
    if not match:
        return None
    year, month, day, counter = map(int, match.groups())
    if not 1 <= counter <= 999:
        return None
    try:
        dt.date(year, month, day)
    except ValueError:
        return None
    return year, month, day, counter


def safe_relative(value: Any) -> bool:
    """Only canonical relative POSIX paths are accepted on every platform."""
    if not isinstance(value, str) or not value or len(value) > 4096:
        return False
    if "\\" in value or ":" in value or any(ord(c) < 32 for c in value):
        return False
    path = PurePosixPath(value)
    return (
        not path.is_absolute()
        and all(p not in {"", ".", ".."} for p in value.split("/"))
        and str(path) == value
    )


def source_file(root: Path, value: Any) -> Path:
    """Reject traversal, symlink parents/files, and anything outside root."""
    if not safe_relative(value):
        raise InputError("unsafe-path")
    candidate = root
    for part in PurePosixPath(value).parts:
        candidate = candidate / part
        if candidate.is_symlink():
            raise InputError("symlink-path")
    try:
        resolved = candidate.resolve(strict=True)
        resolved.relative_to(root)
    except (ValueError, OSError, RuntimeError):
        raise InputError("missing-or-escaped-path") from None
    if not resolved.is_file():
        raise InputError("not-file")
    return resolved


def wp_headers(path: Path) -> dict[str, str]:
    """Read WordPress's first 8192 bytes without executing PHP or CSS.

    An incomplete UTF-8 character exactly at the read boundary is ignored,
    while an invalid sequence inside the block remains a validation error.
    Header names and comment cleanup match WordPress's file-data convention.
    """
    try:
        with path.open("rb") as stream:
            data = stream.read(8192)
        text = codecs.getincrementaldecoder("utf-8")("strict").decode(data, final=False)
    except (OSError, UnicodeError):
        raise InputError("unreadable-header") from None
    fields = ["Plugin Name", "Theme Name", "Version", "Author", "Author URI", "License", "Update URI"]
    result = {}
    for field in fields:
        match = re.search(
            r"^[ \t\/*#@]*" + re.escape(field) + r":[ \t]*(.*)$",
            text.replace("\r", "\n"), re.I | re.M,
        )
        result[field] = re.sub(r"\s*(?:\*/|\?>).*", "", match.group(1)).strip() if match else ""
    return result


def _pairs(pairs: list[tuple[str, Any]]) -> dict[str, Any]:
    result = {}
    for key, value in pairs:
        if key in result:
            raise InputError("duplicate-json-key")
        result[key] = value
    return result


def _invalid_constant(_: str) -> None:
    raise InputError("non-json-constant")


def load_manifest(path: Path) -> Any:
    try:
        if path.stat().st_size > MAX_MANIFEST_BYTES:
            raise InputError("manifest-too-large")
        return json.loads(path.read_text(encoding="utf-8"), object_pairs_hook=_pairs, parse_constant=_invalid_constant)
    except InputError:
        raise
    except (OSError, UnicodeError, json.JSONDecodeError, RecursionError):
        raise InputError("unreadable-manifest") from None


def _private_input(value: Any) -> bool:
    """Inspect recursively; do not return or log the matching key/value."""
    pending = [(value, 0)]
    while pending:
        current, depth = pending.pop()
        if depth > 32:
            raise InputError("manifest-depth")
        if isinstance(current, dict):
            for key, item in current.items():
                if not isinstance(key, str):
                    raise InputError("schema")
                if PRIVATE_KEY.search(key):
                    return True
                pending.append((item, depth + 1))
        elif isinstance(current, list):
            pending.extend((item, depth + 1) for item in current)
        elif isinstance(current, str) and PRIVATE_VALUE.search(current):
            return True
    return False


def validate(manifest: Any, root: Path | str) -> dict[str, Any]:
    """Return sanitized diagnostics for an in-memory schema-1 declaration."""
    result: dict[str, Any] = {
        "valid": False,
        "counts": {"components": 0, "native": 0, "existing-updater": 0, "managed-source": 0},
        "errors": [], "warnings": [],
    }

    def problem(code: str, location: str, message: str, warning: bool = False) -> None:
        result["warnings" if warning else "errors"].append(
            {"code": code, "location": location, "message": message}
        )

    try:
        root_path = Path(root).resolve(strict=True)
        if not root_path.is_dir():
            raise OSError()
    except (OSError, RuntimeError):
        problem("root", "root", "The source root must be an existing directory.")
        return result
    if not isinstance(manifest, dict):
        problem("schema", "manifest", "The manifest must be a JSON object.")
        return result
    try:
        private_input = _private_input(manifest)
    except InputError as error:
        problem(str(error), "manifest", "The manifest structure exceeds supported JSON limits.")
        return result
    if private_input:
        problem("private-data", "manifest", "The manifest contains a prohibited credential key or private-key marker.")
        return result
    if set(manifest) - ROOT_KEYS:
        problem("unknown-field", "manifest", "The manifest contains an unsupported field.")
    if type(manifest.get("schema")) is not int or manifest.get("schema") != 1:
        problem("schema", "schema", "The supported schema is integer 1.")
    if calendar_parts(manifest.get("revision")) is None:
        problem("revision", "revision", "Revision must be a valid YYYY.M.DD.XXX calendar identity.")
    if manifest.get("service") != SERVICE:
        problem("service", "service", "The update service must be the fixed HTTPS Built Not Begged origin.")
    connector = manifest.get("connector")
    if not isinstance(connector, dict) or set(connector) != {"plugin", "minimum_version"}:
        problem("connector", "connector", "Declare the exact connector plugin and minimum_version fields.")
    else:
        version = calendar_parts(connector.get("minimum_version"))
        if connector.get("plugin") != CONNECTOR or version is None or version < calendar_parts(MINIMUM_CONNECTOR):
            problem("connector", "connector", "The connector identity or supported minimum version is invalid.")
    publication = manifest.get("publication")
    if not isinstance(publication, dict) or set(publication) != {"approved"} or publication.get("approved") is not False:
        problem("publication", "publication", "Source enrollment requires publication.approved to be false.")
    for field in ("notes", "repository"):
        if field in manifest and not isinstance(manifest[field], str):
            problem("metadata", field, "Optional repository metadata must be text.")
    components = manifest.get("components")
    if not isinstance(components, list) or not 1 <= len(components) <= MAX_COMPONENTS:
        problem("components", "components", "Declare between one and 1000 components.")
        return result
    ids: set[str] = set()
    paths: set[str] = set()
    targets: set[tuple[str, str]] = set()
    for index, component in enumerate(components):
        location = f"components[{index}]"
        result["counts"]["components"] += 1
        if not isinstance(component, dict):
            problem("component", location, "Each component must be an object.")
            continue
        if set(component) - COMPONENT_KEYS:
            problem("unknown-field", location, "The component contains an unsupported field.")
        identity, kind, mode = (component.get(key) for key in ("id", "kind", "mode"))
        if not isinstance(identity, str) or not SLUG.fullmatch(identity):
            problem("identity", location, "Component id must be a lowercase product slug.")
        elif identity in ids:
            problem("duplicate-id", location, "Component ids must be unique within the repository.")
        else:
            ids.add(identity)
        if not isinstance(kind, str) or kind not in KINDS:
            problem("kind", location, "The component kind is unsupported.")
            kind = "invalid"
        if not isinstance(mode, str) or mode not in MODES:
            problem("mode", location, "The component update mode is unsupported.")
            mode = "invalid"
        else:
            result["counts"][mode] += 1
        if kind in {"mu-plugin", "theme-patch"} and mode != "managed-source":
            problem("mode", location, "MU plugins and partial theme source require managed-source mode.")
        if component.get("release_pending") is not True:
            problem("release-pending", location, "Source enrollment must retain release_pending=true.")
        if "distribution" in component and (not isinstance(component["distribution"], str) or component["distribution"] not in DISTRIBUTIONS):
            problem("distribution", location, "Distribution must use an explicit supported scope.")
        if "publication" in component:
            value = component["publication"]
            if not isinstance(value, dict) or set(value) != {"approved"} or value.get("approved") is not False:
                problem("publication", location, "A component cannot approve publication through source enrollment.")
        baseline = component.get("baseline_version")
        if not isinstance(baseline, str) or len(baseline) > 100 or any(ord(c) < 32 for c in baseline) or (not baseline and mode != "managed-source"):
            problem("version", location, "A historical baseline_version is required; only managed source can preserve an empty version.")
        elif not baseline:
            problem("historical-version-gap", location, "Historical managed source has no declared version; it remains pending and is ineligible for a native release.", warning=True)
        recorded = component.get("headers")
        if not isinstance(recorded, dict) or set(recorded) != HEADER_KEYS or any(not isinstance(v, str) for v in recorded.values()):
            problem("headers", location, "Record exact name, author, author_uri and license header strings.")
            recorded = None
        target = component.get("target")
        if target is not None:
            good = safe_relative(target)
            if kind in {"theme", "theme-patch"}:
                good = good and "/" not in target and bool(SLUG.fullmatch(target))
            elif kind in {"plugin", "mu-plugin"}:
                good = good and target.endswith(".php")
            if not good:
                problem("target", location, "A target must be a safe WordPress plugin basename or theme slug.")
            elif (kind, target) in targets:
                problem("duplicate-target", location, "A runtime target can only be declared once per kind.")
            else:
                targets.add((kind, target))
        source = component.get("source")
        if isinstance(source, str) and source in paths:
            problem("duplicate-source", location, "Component source paths must be unique.")
        elif isinstance(source, str):
            paths.add(source)
        try:
            path = source_file(root_path, source)
            actual = wp_headers(path)
        except InputError as error:
            problem(str(error), location, "The component source must be a readable file inside the root without symlinks or traversal.")
            continue
        name_field = "Theme Name" if kind in {"theme", "theme-patch"} else "Plugin Name"
        opposite = "Plugin Name" if name_field == "Theme Name" else "Theme Name"
        if not actual.get(name_field) or actual.get(opposite):
            problem("header-kind", location, "The source header must declare only the matching WordPress component name.")
        if kind == "theme" and path.name != "style.css":
            problem("theme-header", location, "A theme header must come from style.css.")
        if kind == "theme-patch" and path.suffix != ".css":
            problem("theme-patch-header", location, "A partial theme header must come from a CSS file.")
        if kind in {"plugin", "mu-plugin"} and path.suffix != ".php":
            problem("plugin-header", location, "A plugin header must come from a PHP file.")
        if actual["Version"] != baseline:
            problem("version-mismatch", location, "The header version differs from the recorded historical baseline.")
        if recorded is not None:
            pairs = {"name": name_field, "author": "Author", "author_uri": "Author URI", "license": "License"}
            for key, field in pairs.items():
                if recorded[key] != actual[field]:
                    problem("identity-mismatch", location + ".headers." + key, "The recorded identity differs from the existing source header.")
            if not recorded["author"] or not recorded["author_uri"] or not recorded["license"]:
                problem("historical-metadata-gap", location, "Historical author or license metadata is incomplete and remains unchanged.", warning=True)
        update_uri = component.get("update_uri")
        if mode == "native":
            expected = SERVICE + "/products/" + identity if isinstance(identity, str) else None
            if update_uri != expected or actual["Update URI"] != expected:
                problem("update-uri", location, "Native source and manifest must use the exact per-product Built Not Begged Update URI.")
        elif mode == "existing-updater":
            if not isinstance(update_uri, str) or update_uri != actual["Update URI"]:
                problem("existing-updater-uri", location, "Record the original Update URI unchanged, including an empty historical header.")
        elif update_uri is not None and update_uri != actual["Update URI"]:
            problem("managed-source-uri", location, "Managed-source metadata must not invent or change the current Update URI.")
        if "version_file" in component:
            try:
                version_path = source_file(root_path, component["version_file"])
                if version_path.stat().st_size > 4096:
                    raise InputError("version-file-size")
                current = version_path.read_text(encoding="utf-8").strip()
            except (InputError, OSError, UnicodeError):
                problem("version-file", location, "The declared version file must be readable inside the root without symlinks or traversal.")
            else:
                if current != baseline:
                    problem("version-file-mismatch", location, "The declared version file differs from the preserved header baseline.")
    result["valid"] = not result["errors"]
    return result


def check(root: Path | str, manifest_path: str = "bng-updates.json") -> dict[str, Any]:
    """Read a repository-local declaration and report sanitized failures."""
    try:
        root_path = Path(root).resolve(strict=True)
        manifest = load_manifest(source_file(root_path, manifest_path))
    except (InputError, OSError, RuntimeError) as error:
        code = str(error) if isinstance(error, InputError) else "root"
        return {
            "valid": False, "counts": {"components": 0, "native": 0, "existing-updater": 0, "managed-source": 0},
            "errors": [{"code": code, "location": "manifest", "message": "The manifest must be readable inside the source root without symlinks or traversal."}],
            "warnings": [],
        }
    return validate(manifest, root_path)


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description=__doc__.split("\n")[0])
    parser.add_argument("action", nargs="?", choices=["check"], default="check", help="Read-only manifest check")
    parser.add_argument("--root", default=".", help="Repository source directory (default: current directory)")
    parser.add_argument("--manifest", default="bng-updates.json", help="Repository-relative manifest path")
    args = parser.parse_args(argv)
    result = check(args.root, args.manifest)
    print(json.dumps(result, indent=2, sort_keys=True))
    return 0 if result["valid"] else 1


if __name__ == "__main__":
    sys.exit(main())
