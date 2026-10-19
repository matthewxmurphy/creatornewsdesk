# Changelog

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
