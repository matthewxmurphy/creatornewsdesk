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

Set CND_DASHBOARD_TOKEN in an owner-private /etc/creatornewsdesk/dashboard.env before using the service template. Put CND_CONFIG_FILE and CND_STATUS_FILE in an owner-private directory outside source; no token belongs in URLs, logs or Git. Enter the token in the dashboard password field; it is not persisted to browser storage. Nonloopback CND_DASHBOARD_HOST needs separately authorized private transport/TLS. Older pipeline-run status scaffolding is not proof of delivery. The active feature plugin e4306f4a and three fetched plugin revisions had empty xAI defaults, with no nonplaceholder provider-shaped assignment found; this does not verify any deployed plugin or provider key.

## Test and rollback

Required local security check: `python3 -m unittest discover -s tests -p test_dashboard_security.py -v`. Tests use synthetic temporary state,
mock adapters or local HTTP/Fastify fixtures; they never contact provider services
or establish native delivery. Syntax/build and rendered checks are recorded in
the private source receipt. Revert this reviewed code commit for a source rollback;
retain new private state and authorization configuration. Do not restore anonymous
network access or old public databases as a routine rollback.

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
