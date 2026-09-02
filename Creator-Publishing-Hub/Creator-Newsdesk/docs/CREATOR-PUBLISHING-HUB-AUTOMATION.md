# Creator Publishing Hub Automation Operations

## Workspace ownership

- Treat `/Users/mmurphy/Projects/Creator-Publishing-Hub` as the Mac workspace root.
- Keep every Creator Publishing Hub product, including Creator Newsdesk and Personal Social Desk, beneath that root.
- The Mac is a thin coordinator. Do not retain generated media batches, downloaded previews, duplicate site media, large archives, or long-lived evidence here.

## Durable Ryzen storage

- Store durable image-coordinator evidence under `/home/mmurphy/homelab/projects/creatornewsdesk/artifacts/cph-image-coordinator` on Ryzen.
- Store Codex history archives under `/home/mmurphy/homelab/archives/codex/<mac-host>/<date>` on Ryzen.
- Never transfer credentials, browser cookies, local session secrets, application passwords, or token files.
- Before removing a local copy, verify the remote directory exists, compare total bytes and file counts, and verify SHA-256 manifests on both hosts.
- A successful copy is not deletion authorization. Obtain explicit user approval before removing material local history or backups.

## Codex session containment

- Treat `~/.codex/sessions` as live application state, not a normal archive folder.
- Do not move or delete a session JSONL while Codex has it open. Check open files with `lsof` first.
- Archive or unpin a finished task in Codex, restart the app when practical, and verify that its JSONL is closed and no longer growing before migration.
- Move closed historical files to Ryzen only through a dated staging directory and checksum manifest. Preserve their original relative paths.
- Keep only the smallest practical recent working set on the Mac. Investigate any single transcript above 500 MB and any monthly session tree above 10 GB.
- `archived_sessions` is eligible for Ryzen migration after verification. Delete the Mac copy only after explicit approval.
- Use follow-up queue mode `steer` to prevent stacked follow-ups from multiplying transcript growth.

## Image coordinator

- Acquire the coordinator lock atomically and nonblocking. Record ownership and start time, recover only demonstrably stale locks, and always release the lock.
- Personal Social Desk PWA media and Creator Newsdesk run on every 30-minute Codex image pass. Non-Newsdesk WordPress article-image work runs no more than once every six hours so the live-news backlog receives the clear majority of ChatGPT image capacity.
- Creator Newsdesk images use only the exact decoded WordPress post title as the visual brief. Render that title verbatim, use the exact verified Creator Newsdesk logo directly with no pill or container, and keep the entire headline, logo, and important subjects at least 40 pixels inside all four edges. Do not add article summaries, body context, supporting claims, badges, or extra readable copy.
- Keep Creator Newsdesk at zero `post_status=future` items. Media completion may enter the Ready queue, but the existing release owner alone controls publication.
- Re-fetch live job state before mutation, generate only `required_roles`, preserve ready companions, inspect review roles, and verify the actual rendered card after attachment.
- Use the exact official site logo directly in the design, never inside a pill or container. Block the role when the logo is empty or cannot be verified.
- The `thedailysmirk.com` backend can return **Daily Fib** work. Treat Daily Smirk and Daily Fib as distinct editorial and visual identities; use each job's live `site_name`, editorial profile, and `site_logo_url`, and never mix their logos.
- Use a unique `mktemp` directory for current-run media. Upload, verify, write durable Ryzen evidence, then remove the local temporary directory.

## Personal Social Desk PWA

- Canonical Mac path: `/Users/mmurphy/Projects/Creator-Publishing-Hub/Creator-Newsdesk/apps/personal-social-desk`.
- Expected local URL: `http://127.0.0.1:4178`.
- Before restarting the service, verify that `server.mjs`, `package.json`, `public/index.html`, and the data directory exist at the canonical path. A browser service-worker cache can make the PWA appear healthy after source files have disappeared.
- Preserve the configured Facebook Page/account mapping and paired-media state. Do not publish, schedule, create an account, or change destinations from the image-review automation.

## Facebook fan-page runway

- Excluding Creator Newsdesk's separate live-news pipeline, each configured fan Page targets at least 12 Meta-confirmed posts per rolling 24 hours and 348 future two-hour slots across Meta's verified 29-day scheduling window. Keep the full archive in a local long-range inventory ledger; refill Facebook's bounded queue continuously rather than treating Meta as the archive.
- Treat Meta `published_posts` and `scheduled_posts` as delivery and runway proof. A local timer, WordPress queue, generated draft, or successful worker exit is not proof.
- Schedule each image-backed permalink at most once inside the active 29-day horizon. Never fill a runway gap with rapid duplicate recycling.
- When the runway is short, record the exact missing-slot count and image-backed unique supply. Use Meta engagement by category only when the token exposes real metrics; otherwise rotate categories evenly and label the result as a balanced fallback.
- The hourly image coordinator converts the prioritized category backlog into image-ready inventory. Controlled publish-ready timers publish at most one finished article every two hours, and the hourly runway worker schedules newly published inventory into the next open Meta slot.
- Automatically reschedule Meta past-due posts into the next open two-hour slots in bounded batches, preserving the original posts and recording every changed ID and timestamp. Continue normal runway filling after the past-due queue is clear.
- Page watchdogs stay silent and record-only. One fleet digest may email only when an issue still requires human action after automatic recovery has had time to run; routine shortages, cooldowns, recoveries, target changes, and healthy checks never email.

## Verification boundary

- Source edits, generated files, HTTP 200 responses, and upload success are intermediate evidence only.
- Completion requires the saved attachment/media identifiers, role and dimensions, unchanged companion state, live re-fetch, and the rendered WordPress or PWA card.
