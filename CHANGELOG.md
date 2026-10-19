# Changelog

## Unreleased — Article Feed component attribution and legal scope

- Record Matthew X Murphy developer/product attribution and established
  CreatorPublishingHub.com release ownership on the public source component.
  Include its existing GPL-2.0-or-later terms in full, with component notices and
  focused operational notes; preserve the root MIT2025 Matthew Murphy license
  and Chart.js notices.
- Preserve native1.0.0 and the entire executable suffix, including current
  authorization. No runtime/test rerun, version allocation, updater integration,
  package distribution, deployment or release is implied by this source change.

## Unreleased — Article Feed authorization

- Require both `edit_others_posts` and `read_private_posts` for article records and
  editorial statistics; deny anonymous callers with401 and missing capabilities
  with403 before handler queries. Worker accounts must authenticate with WordPress
  and hold both capabilities; anonymous worker access is intentionally restricted.
- Preserve native1.0.0, technical identifiers, query/response behavior and existing
  licenses/attribution. Both copies passed 114 native checks/21 internal REST
  requests each with existing rows/schema preserved and no request mutations.
  Source maintenance does not deploy, enroll an updater or allocate a release.

## Unreleased — 2026-10-18 follow-up

Reject malformed HTTP targets/Origin headers without uncaught parser failures;
expand synthetic dashboard boundary checks to 16 cases in each maintained copy.
Exclude runtime configuration/status from source and document placeholder setup,
dependency integrity and the source-copy/runtime qualification limits. No
deployment or release identity is allocated.


## Unreleased — source security maintenance2026-10-16

- Fix APP-02; see docs/SECURITY-BOUNDARIES.md for configuration/compatibility and test limits.
- No production deployment or release-version change.

## Unreleased OpenClaw security maintenance

- Require native per-post edit permission before image/tag generation requests
  or any batch handler starts. Preserve the existing read-route policy, provider
  behavior, native versions, identifiers and license/owner/distribution terms.
- Add isolated request/capability regressions; these are not live WordPress,
  authentication or provider acceptance. No deployment or release is included.
