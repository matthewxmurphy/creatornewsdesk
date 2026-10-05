# Legacy image integration maintenance runbook

Developer and copyright holder: [MatthewxMurphy.com](https://MatthewxMurphy.com).
Source revision: `2026.10.05.001`. License: `MIT`; full terms are in `LICENSE.txt`.

## Distribution owner

Release owner: **CreatorPublishingHub.com**. Channel: **internal**.
Evidence: User confirmed: every add-on under Creator Publishing Hub belongs to CreatorPublishingHub.com. Existing updater endpoints and channel status are preserved.
Developer credit does not transfer the existing updater, product, or release owner. This change is a source checkpoint only; no live installation, update feed, public download, payment or publication was changed.

## Source and contracts

- `cnd-openclaw.php`: The class connects REST/admin workflow to configured OpenClaw/image services and uses stored provider configuration. Provider availability, billing and route permission behavior require fresh verification before any live use.

## Preflight and verification

1. Identify the exact repository, WordPress root and site; inspect installed plugin/theme/MU state and the current configuration without exporting secrets.
2. Preserve the prior approved files and affected database state before an installation or behavior change. Read this package's existing README and comments before changing a contract.
3. Lint the file. In staging use fake HTTP/provider responses to verify permission denial, missing configuration, upload handling and featured/OG assignments. Never spend provider credits as a metadata test.
4. Record observed saved/runtime and rendered state separately. A source revision, HTTP 200, local queue, timer or successful upload is not delivery proof.

## Rollback

Restore the prior plugin directory and preserve configured options. Revoke an exposed provider credential at its owner, not by committing it. Do not restore an entire old database over newer unrelated content.

## Version, source control and release

Use `YYYY.M.DD.XXX` with the actual month, a two-digit day and a three-digit sequence beginning at `001` each day; increment it for another release of this package that day. Synchronize the header, runtime/cache identifiers, readme stable tag and `VERSION`. Keep npm/Composer fields valid SemVer and document any calendar mapping.

Keep first-party source in the existing Git repository and preserve its remote visibility. Review only intended source paths and scan the exact candidate for credentials/private keys before pushing. Exclude runtime data, uploads, databases, generated media, backups and dependency trees. A source checkpoint uses `source/2026.10.05.001`, never a production release tag. Read repository CI/deploy workflows before pushing; a backup must not deploy.

For an actual distribution, follow this package's assigned owner and existing update lane. CPH-owned public distributions retain the repository's permanent public release-note workflow; internal packages record their private changelog. Preserve earlier release notes/artifacts. Ambiguous distribution ownership stays internal until the owner assigns it. Do not repoint a Plugin URI or Update URI to the developer merely to change credit.

## Future updates

Keep comments near authentication, locks, schema/version checks and external side effects. Explain why a boundary exists and the expected failure behavior. Update this runbook and changelog when a contract, dependency, configuration or recovery procedure changes. Existing credentials belong in protected runtime configuration and never in source examples or troubleshooting logs.
