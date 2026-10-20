# CND OpenClaw Image Generator

Developer: [Matthew X Murphy](https://MatthewxMurphy.com).
Product attribution: https://builtnotbegged.com.
Creator Newsdesk remains the plugin's product/site identity. The native source
version remains **1.1**.

## Attribution and license

The entrypoint now identifies the developer and makes the repository's existing
MIT terms explicit. [LICENSE](LICENSE) is an exact copy of the repository-root
license, retaining its copyright 2025 Matthew Murphy notice and complete terms.
No repository or component is relicensed. Other components keep their own terms,
including the Article Feed's GPL and the Chart.js notice.

Developer attribution does not establish a new release owner, package channel,
update service, entitlement or support eligibility. Existing owner and Taylor
review gates remain applicable; public source visibility is not release approval.

## Source and API boundaries

`cnd-openclaw.php` registers the existing `cnd/v1` routes. Read routes require
`edit_posts`; per-post mutations additionally require `edit_post` for the requested
positive post ID. Batch authorization checks every supplied post before the
handler can start provider work. See [security boundaries](../docs/SECURITY-BOUNDARIES.md)
and the existing permission fixture for the exact supported request shapes.

This correction changes only the initial comment and these adjacent documents.
Every executable byte from the `ABSPATH` guard through EOF remains unchanged,
including routes, capability checks, provider behavior and settings. No new
version, Update URI, updater enrollment or runtime compatibility claim is added.

## Verification and operations

Review the header and full license; compare the executable suffix with the base
commit and lint the PHP entrypoint. The existing fixture can be run from the
repository root with `php tests/openclaw-permissions.php`; its invented requests
do not certify native WordPress, deployed authentication, providers or image
delivery. No live handler or image provider is invoked by this metadata change.

Rollback consists of reverting the scoped source commit. An installation or
rollout needs its own authorized site inventory, backup and rendered/runtime
verification. Future actual releases use `YYYY.M.DD.XXX`, America/Chicago;
historical versions and artifacts remain unchanged.

## Maintenance and standards adoption

Use scoped PRs with affected source/version, expected and actual behavior,
sanitized reproduction, tests and limits. Keep credentials, unpublished content,
customer records and runtime files out of source and issue reports. Follow the
[shared engineering SOP](https://github.com/matthewxmurphy/developer-standards)
and preserve existing licenses and owner review requirements.

This maintenance records developer metadata, existing complete legal terms and
focused API/operations/security notes. Repository-wide `engineering.json`,
portable-checker CI, complete documentation, enforced required checks and
runtime/release qualification remain adoption gaps. File presence is not an
adoption or CI pass. No portable helper is redistributed here.
