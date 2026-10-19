# CND Article Feed — public source notes

Developer: [Matthew X Murphy](https://MatthewxMurphy.com).
Product attribution: https://builtnotbegged.com.
Release owner: **CreatorPublishingHub.com**. Native version: **1.0.0**.
Canonical entrypoint: `cnd-article-feed.php`. Component license:
GPL-2.0-or-later; retain the complete [terms](cnd-article-feed.LICENSE.txt) and
[notices](cnd-article-feed.NOTICE.md). The repository's root MIT license and
Chart.js notices remain separate and unchanged.

## Entry points and authorization

The constructor registers `rest_api_init`. GET `cnd-feed/v1/articles` accepts
the existing post-status query (default `any`), and GET `cnd-feed/v1/stats`
returns editorial counts. Both routes require BOTH native WordPress capabilities
`edit_others_posts` and `read_private_posts` before handler queries. Anonymous
callers receive `cnd_feed_forbidden` with401; authenticated callers missing either
capability receive403. Administrators/editors normally qualify; custom roles must
hold both capabilities. Default authors/contributors/subscribers do not qualify.

Workers must authenticate through the site's separately authorized WordPress
mechanism and hold both capabilities. The dashboard bearer token does not
authorize this feed. No account, credential or authentication configuration is
created by these source notes. For the query/security and prior synthetic native
evidence, see [security boundaries](docs/SECURITY-BOUNDARIES.md).

## Source verification and operational boundaries

This metadata/legal correction preserves all bytes from the `ABSPATH` guard to
EOF, including the complete class, native version, route identifiers, capability
checks, queries and response formatting. It does not add an Update URI, allocate
a release, enroll an updater or integrate the separate draft updater feature.
The maintained private counterpart supplies attribution/legal provenance;
its internal package channel is not assigned to this public mirror.

Review the exact candidate's header, complete license and unchanged runtime bytes
before source integration. A separately reviewed source ZIP, if prepared, is a
private unreleased DATA artifact, not an installation bundle or a tested release.
No PHP, WordPress, provider, live site or package installer is exercised by the
metadata inspection. The prior capability matrix used synthetic native internal
REST dispatch; it does not verify HTTP cookies/application passwords, TLS,
deployed workers, MySQL, multisite or older compatibility floors. Existing native
proof is retained without rerunning unchanged code.

Before any separately authorized installation, identify the exact WordPress
root and review active plugins/MU plugins/themes and activation effects. Preserve
the existing source and affected private configuration/database/media state.
Revert only the scoped source change for source rollback; do not restore
anonymous editorial access or replace live data from this source snapshot.

Taylor assigns ship-day versions under the owner’s standing release policy; this
source review does not assign a release. Preserve historical
versions/artifacts, including this native1.0.0 source, and the actual owner's
release/public-notes requirements. Source visibility, tested artifact, authorized
distribution and verified runtime remain separate states.

## Contributions, security and standards adoption

Use scoped PRs with sanitized source/version, expected/actual behavior,
reproduction and verification limits. Keep unpublished content, credentials,
customer data and runtime state out of source/issues/logs. Review dependency PRs
and scan exact candidate bytes before pushing. Read the
[shared engineering SOP](https://github.com/matthewxmurphy/developer-standards)
and project instructions before maintenance.

This correction records component metadata, full legal bytes and focused
architecture/API/operations/security notes. `engineering.json`, portable checker
integration, complete repository-wide documentation, required checks/branch
enforcement and dependency/runtime/release qualification remain adoption gaps.
Current main has no workflow file; no CI pass is inferred from these notes.
The portable helper's redistribution permission remains separate for this public
repository. No new tracked builder or implementation-mirroring test is added.
