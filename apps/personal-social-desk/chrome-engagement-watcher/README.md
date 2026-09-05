# CPH Engagement Watcher

This unpacked Chrome extension is the signed-in browser executor for Personal Social Desk. It does not own scheduling or generate a second queue.

Every five minutes it:

1. reads `GET http://127.0.0.1:4178/api/extension/hourly-feed`;
2. captures Facebook Birthday Center records and sends Facebook's prefilled birthday wishes with an audited rate limit;
3. captures unanswered comments and their exact post-plus-`comment_id` permalinks from the owned Built Not Begged profile/Page only;
4. sends those comments to the Social Desk AI/People CRM reply lane;
5. posts owned-Page replies automatically without a review step, while keeping group actions approval-gated;
6. executes only approval-gated group distribution items; and
7. checks for the exact reply before a retry, retries unconfirmed deliveries up to three times, and records `sent` only after rendered Facebook proof is found.

Load this directory as an unpacked extension in the Chrome profile signed into Matthew's Facebook account. The local `127.0.0.1:4178` tunnel must resolve to the Ryzen Social Desk owner before the extension is enabled.

Birthday capture and wishing use `/friends/birthdays`. The extension keeps a dedicated background tab open only while the bounded daily birthday pass is active, records each attempt before clicking, and never repeats an attempted wish automatically.
