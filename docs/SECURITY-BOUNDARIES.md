# Security boundaries and maintenance record

Author/developer Matthew X Murphy, https://MatthewxMurphy.com.
Product attribution: https://builtnotbegged.com. Preserve actual existing project
licenses, upstream copyright and release ownership. No new license is granted
where existing first-party distribution terms remain unassigned.

## Scope

Source fixes for APP-02, October16,2026. No deployment, provider action, artifact
publication or software-version bump. User's model selection does not change
software versions; historical releases and API compatibility remain intact.

## Behavior and configuration

The dashboard binds127.0.0.1 by default and refuses startup without CND_DASHBOARD_TOKEN (32+ random bytes). Only public dashboard/art filenames are served; GET/HEAD cannot serve source, dotfiles or runtime data. All status/config APIs and mutations require a Bearer owner token, reject cross-origin callers, bound request bodies and atomically replace config with0600 permissions. Chart.js4.4.1 is now served locally with its upstream MIT notice; a third-party script cannot receive the newly entered token.

October 18 follow-up: malformed request targets return 400 before routing;
malformed/cross-origin Origin headers with a valid owner token return 403.
Unauthenticated requests are denied before Origin/body parsing or state access.
Same-origin browser requests and bearer-authenticated CLI requests without Origin
remain supported. Only static asset serving is public; authorized config/status
reads intentionally return private data to the owner. Configuration/status files
are runtime state, excluded from the source candidate; historical Git copies are
not removed by this maintenance and are a separate credential/history review.

The two source copies retain their established different OpenClaw defaults.
Chart.js payload and license were matched byte-for-byte against npm 4.4.1
(the vendored file adds a CDN comment wrapper), including the registry tarball's
SHA-512 integrity. The vendored SHA-256 is
`d2af8974e95271638772e9e9524db5b9a6f58d6ec2d5d781400447b4a31c681e`.
This is an integrity/license check, not a complete dependency security audit.
Existing external Font Awesome CSS is unchanged; no offline-complete UI is claimed.
The private backup deliberately excludes generated artwork; obtain separately
reviewed runtime assets before treating that source snapshot as an install bundle.

Set CND_DASHBOARD_TOKEN in an owner-private /etc/creatornewsdesk/dashboard.env before using the service template. Put CND_CONFIG_FILE and CND_STATUS_FILE in an owner-private directory outside source; no token belongs in URLs, logs or Git. Enter the token in the dashboard password field; it is not persisted to browser storage. Nonloopback CND_DASHBOARD_HOST needs separately authorized private transport/TLS. Older pipeline-run status scaffolding is not proof of delivery. The active feature plugin e4306f4a and three fetched plugin revisions had empty xAI defaults, with no nonplaceholder provider-shaped assignment found; this does not verify any deployed plugin or provider key.

## Test and rollback

Required local security check: `python3 -m unittest discover -s tests -p test_dashboard_security.py -v`. Tests use synthetic temporary state,
mock adapters or local HTTP/Fastify fixtures; they never contact provider services
or establish native delivery. Syntax/build and rendered checks are recorded in
the private source receipt. Revert this reviewed code commit for a source rollback;
retain new private state and authorization configuration. Do not restore anonymous
network access or old public databases as a routine rollback.

The dashboard check now has 16 local HTTP cases in each copy. Configuration,
status and public roots all point to temporary synthetic files; external Requests
HTTP is forbidden and local clients bypass ambient proxies. Cases cover every
unauthenticated mutation, wrong/query/cookie credentials, private read aliases,
same/cross/malformed Origin, default loopback/token startup, all public GET/HEAD
assets, traversal/unknown files, symlinks, invalid framing/JSON and atomic-write
failure preservation. The backup's six existing native-policy cases use mocked
social adapters; no actual provider/pipeline/host action is executed.

## Article Feed editorial access

Both GET `cnd-feed/v1/articles` and GET `cnd-feed/v1/stats` require BOTH native
WordPress capabilities `edit_others_posts` and `read_private_posts` before the
handler queries records or counts. The explicit `cnd_feed_forbidden` WP_Error uses
WordPress authorization status:401 for anonymous callers,403 for authenticated
callers missing either capability. Default administrators/editors qualify; custom
roles qualify only with both capabilities. Default author/contributor/subscriber
accounts do not qualify.

Worker accounts must authenticate using the site's separately authorized WordPress
mechanism and hold both capabilities. This intentionally restricts older anonymous
pipeline consumers. A dashboard bearer token is a separate boundary and does not
authorize this feed; no live account or credential is configured here.

The identical preceding runtime body was reproduced with real WordPress7.1.3/
PHP8.5.7 and official SQLite Integration3.1.0 on fresh synthetic state: anonymous
internal REST dispatch returned a draft's title/excerpt/author/SEO and draft/pending
statistics. The capability matrix passed 114 checks and 21 internal REST requests
in each source copy, using nine native actors including custom roles with either
or both required capabilities. Denials preceded post-domain queries; authorized
draft/private fields and statistics remained available. Independent readback
verified all existing synthetic rows and schema. Bootstrap added only two core
theme-pattern cache options per copy; all raw rows and schema were unchanged across
the requests. No HTTP/mail attempt, observed request mutation, stderr or late error
occurred. This source change preserves versions, identifiers, query/response
formatting and existing licenses/attribution. Native internal REST
dispatch is not HTTP cookie/application-password authentication, a deployed consumer
or MySQL/multisite/older-floor qualification. No provider, deployment, updater
enrollment or release is authorized by these notes.

## Engineering SOP adoption and remaining gaps

Read https://github.com/matthewxmurphy/developer-standards and the project's own
instructions before maintenance. This scoped change adds security contracts,
regression tests and operational notes. Exact staged/index bytes are scanned and
manually reviewed before commit. Existing licenses/upstream notices are retained;
missing distribution choices await the owner's decision.

This document is not a claim of complete engineering adoption: portable checker
integration/engineering.json, full architecture/API/contribution/support docs,
required remote checks/branch enforcement and release/runtime acceptance remain
to be assessed in their own scoped maintenance work. The portable helper currently
has internal distribution terms; public products must not copy it without recorded
permission. A source commit and offline test pass do not certify a release.
