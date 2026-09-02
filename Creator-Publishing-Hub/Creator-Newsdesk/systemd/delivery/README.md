# Facebook delivery watchdog

This lane verifies Meta's `published_posts` edge instead of trusting WordPress state, a local queue, or a successful timer exit.

- Creator Newsdesk must deliver at least 12 Page posts in each rolling 24-hour window and keep its latest confirmed post younger than three hours.
- Factology, Daily Smirk, and Credit Repair Choices each require at least 12 confirmed posts per rolling day.
- Love Lies Abroad remains excluded until its legal and Facebook Page configuration gates are cleared.
- Checks run every 15 minutes and write atomic current state plus append-only history under `artifacts/facebook-delivery/`.
- Factology and Daily Smirk also maintain Meta's maximum 29-day runway of 348 two-hour slots. The runway worker schedules each image-backed article at most once per horizon and records the remaining content demand by category.
- Breaches send one email on the state change and repeat at most every six hours.
- Creator Newsdesk recovery calls its existing lock-protected pipeline only after two consecutive breaches and never more than once every three hours.
- Factology and Daily Smirk recovery write a bounded request file after two confirmed breaches whenever the future schedule is below 348 posts. A root-owned systemd path unit starts the runway worker, so the watchdog does not need elevated privileges.
- Per-Page watchdogs are record-only and never email. The fleet digest checks hourly, waits three hours for automatic recovery, emails only for a Facebook connection that still needs human action, combines every Page into one plain-English message, and suppresses the same escalation for seven days.
- Automatic recovery is blocked when Meta already has future scheduled posts or any past-due scheduled backlog. This prevents duplicates and catch-up bursts.

Install the service and timer templates plus profile drop-ins in `/etc/systemd/system/`, run `systemctl daemon-reload`, then enable the four configured Page timers.
