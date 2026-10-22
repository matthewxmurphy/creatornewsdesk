# Shared WordPress updates — source integration

Enrollment revision `2026.10.12.001` (America/Chicago). Developer: [Matthew X Murphy](https://MatthewxMurphy.com). Storefront and product support: [Built Not Begged](https://builtnotbegged.com). Preserve every component's recorded author, license, publisher and release owner.

Install and activate the shared **Built Not Begged Updates** connector, minimum `2026.10.12.001`, once per site. Obtain its verified release through [the update service](https://updates.builtnotbegged.com/docs/api.html). This minimum is the new fleet-identity candidate until its own release receipt confirms delivery. Components remain usable without the connector; no hard dependency, bundled commercial plugin, customer account or silent installer is added. Update URI metadata alone does not fetch updates. The active connector also discovers inactive plugins and themes.

WordPress uses its existing scheduled checks and native Dashboard → Updates / Plugins → Update now workflow. Administrators may enable native automatic updates. This integration preserves those preferences and does not force installations, change staff access, send email or publish content. Update service outages leave installed software functioning.

| Component | Source header | Delivery mode | Preserved baseline |
| --- | --- | --- | --- |
| CND Article Feed | `cnd-article-feed.php` | native | 2026.10.05.001 |
| CND Auto Publisher | `cnd-auto-publisher.php` | native | 2026.10.05.001 |
| CND OpenClaw Image Generator | `cnd-openclaw/cnd-openclaw.php` | native | 2026.10.05.001 |
| CND Tip Form | `cnd-tip-form.php` | native | 2026.10.05.001 |

## Release and licensing

`bng-updates.json` is checked source enrollment, with publication approval false and each component release pending. Historical baseline versions, ZIPs and tags remain unchanged. Header routing edits are an unreleased source candidate, not a rebuilt release under the same version. Reserve each affected product's next `YYYY.M.DD.XXX` identity, synchronize runtime/cache bindings, run its documented tests, then freeze a complete installable ZIP. Prove the installed basename/stylesheet; never derive it from a generic checkout folder. Existing public CPH release-note/owner rules continue to apply.

All four components retain CreatorPublishingHub.com ownership and the internal
distribution channel recorded in their maintenance runbooks. Enrollment does not
authorize public distribution or change their individual licenses.

Publish only an owner-approved, scanned and independently reviewed package with verified native WordPress/browser behavior and immutable file/archive hashes. The off-host signer consumes a separately approved public or protected roster; this manifest cannot grant publication. LocalPro and other protected products require real product-specific purchase/license entitlement, revocation and cross-product denial checks before protected updates are enabled. A shared unrestricted bearer or an inquiry is not a paid license. BuiltNotBegged.com is the central commerce destination; other product sites can refer buyers there without hosting their own checkout. Do not invent prices, commercial terms, merchant products or working purchase receipts.

Exact per-product Update URI identities distinguish bundled variants sharing a WordPress basename. Explicit migration to the central service retains legacy hooks as fallback while no eligible signed central offer exists. Never select a customized bundle's replacement merely by its display name or highest unrelated variant version. MU files, frozen snapshots and partial theme patches retain their parent installer or separately scoped deployment route; the connector cannot individually upgrade them as ordinary plugins/themes.

## Checks and rollback

Run `python3 scripts/check_bng_updates.py check --root .` and `python3 -m unittest discover -s tests -p test_check_bng_updates.py -v`, plus the project's relevant checks and shared engineering standards checker where adopted. The source workflow validates the enrollment contract and syntax of declared PHP headers; it does not publish ZIPs, contact live sites or prove native installation. Standards adoption, exact staged-byte scans, source checkpoints, tested artifacts and verified runtime remain separate evidence.

Before an authorized rollout preserve the selected package and affected state. Use a reviewed reverse diff to undo only the new header routing/declaration and helper files; preserve unrelated source and all current site content/options. Deactivating the shared connector restores normal upstream checks. Never restore an old whole-site database over newer activity. Report bugs with the declaration revision, affected component and sanitized reproduction; keep credentials and customer/security records private. The helper is GPL-2.0-or-later under `docs/bng-updates/LICENSE.txt`; it does not relicense the surrounding product. Schema details are in [MANIFEST](bng-updates/MANIFEST.md). Follow [the engineering SOP](https://github.com/matthewxmurphy/developer-standards) for source review and release evidence.
