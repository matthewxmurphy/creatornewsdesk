# Source enrollment schema and runbook

Schema `1` binds source-only declarations to the fixed signed-update service.
The repository-relative `source` is the file containing its WordPress header:
the plugin's entry PHP file, a full theme's `style.css`, or a managed theme
patch's named CSS file carrying a Theme Name header. No executable code is read
as instructions. The checker reads only the first 8192 header bytes, matching
WordPress file-data conventions, and requires readable UTF-8.

```json
{
  "schema": 1,
  "revision": "2026.10.11.001",
  "service": "https://updates.builtnotbegged.com",
  "connector": {
    "plugin": "bng-updates/bng-updates.php",
    "minimum_version": "2026.10.11.001"
  },
  "publication": {"approved": false},
  "components": [
    {
      "id": "sample",
      "kind": "plugin",
      "source": "plugin/sample/sample.php",
      "mode": "native",
      "baseline_version": "0.1.0",
      "release_pending": true,
      "headers": {
        "name": "Sample Product",
        "author": "Historical Author",
        "author_uri": "https://example.test",
        "license": "GPL-2.0-or-later"
      },
      "update_uri": "https://updates.builtnotbegged.com/products/sample",
      "target": "sample/sample.php",
      "version_file": "VERSION",
      "distribution": "review-before-publication"
    }
  ]
}
```

`revision` versions the enrollment declaration, using `YYYY.M.DD.XXX`, America/Chicago
for its release date. It does not relabel any component. `baseline_version` is
the exact unchanged header version, including historical numbering schemes.
It must equal a declared `version_file`, if present. Missing versions are allowed
only in `managed-source` and produce a pending historical-gap warning. A future
native release needs its own reserved valid calendar identity, synchronized
runtime bindings and immutable signed artifact.

`headers` records the existing name, author, author URI and license exactly.
The checker rejects identity changes against that baseline. Empty historical
author/license strings can be recorded, generating a gap warning; the checker
does not manufacture ownership or licensing. Optional `notes` and `repository`
fields may describe review boundaries without credentials or private records.

Component kinds are `plugin`, `theme`, `mu-plugin` and `theme-patch`. Modes are:

- `native`: complete plugin/theme source, with both the actual header and
  `update_uri` set to the exact service product URL above. A repository checkout
  being complete is an inventory/reviewer responsibility; this checker does not
  construct or install a package.
- `existing-updater`: complete plugin/theme with an existing update lane. Its
  `update_uri` records the original header unchanged, including an empty header
  when the historical updater used hooks rather than Update URI. Retaining
  routing is a compatibility contract; existing signing and entitlement logic
  need separate review before any migration.
- `managed-source`: MU plugins and partial theme source use this mode because
  they are not individually installable native WordPress update packages. Their
  parent installer or explicit deployment lane owns delivery. Complete source
  may also remain managed while package identity is unresolved. If `update_uri`
  is recorded, it must equal the unchanged current header.

`target` is optional when the installation root is unknown. When supplied, it is
the runtime plugin basename (for example `sample/sample.php`) or theme slug
(`sample`). It does not change the source path. `version_file` is optional when
the header is the canonical baseline. Component ids, source paths and runtime
targets must be unique within their declared scopes.

Optional `distribution` is one of `closed`, `protected`, `review-before-publication`,
`public` or `internal`. It documents existing product scope; it grants neither
public distribution rights nor access to a private update channel. All scopes
remain publication-unapproved through this manifest. A component may repeat
`publication: {"approved": false}`; otherwise it inherits the repository's
required false approval.

Paths must be canonical relative POSIX paths, without traversal or symlink
parents/files. Absolute paths, drive prefixes, backslashes, duplicate JSON keys,
unknown fields and credential-bearing keys/private-key markers are rejected.
Diagnostics use fixed messages and indices, without echoing input values.
The manifest is bounded to one MiB, 1000 components and 32 nesting levels;
non-JSON number constants are rejected. This is a source
contract check, separate from the exact staged-byte credential scanner.

For a release, inspect the existing owner instructions, full package source,
licenses, dependent installer/updater, prior versions/tags and publication scope.
Reserve a fresh identity; run the product tests and native WordPress/plugin-theme
compatibility checks; freeze exact ZIP bytes and hashes; have the release owner
approve the appropriate public/protected channel; publish through the existing
off-host signer. Re-fetch and verify the real package, signed catalog and native
runtime before recording delivery. Never reuse a differing historical ZIP or
declare ordinary native delivery for an MU file or partial theme checkout.

CI can run the read-only checker on pull requests and source pushes without
credentials. Rollback removes the selected manifest/checker integration in a
reviewed revert; it does not restore a stale database or change installed
versions. Report bugs with schema revision, Python version, sanitized error code
and a synthetic reproducer. Keep credential/security reports private.
