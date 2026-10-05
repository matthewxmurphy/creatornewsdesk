# Security maintenance

Maintainer: [MatthewxMurphy.com](https://MatthewxMurphy.com). No dedicated disclosure mailbox is established in this source; use the maintainer site's existing private contact path and omit raw credentials/customer records from public issues.

Keep credentials, signing/encryption private keys, customer data and runtime state outside Git. A public application ID or public verification key is not a credential. Preserve the source permission/nonces, request IDs, revision guards, bounded inputs and locking described in `cnd-article-feed.RUNBOOK.md`. If a credential is exposed, revoke/rotate it with its provider and record a redacted incident receipt; removing a string from the newest commit does not remove it from history. Do not rewrite shared history without explicit authorization.

Review supported PHP/WordPress/dependency behavior in staging before deploying a security change. Restore selected files and reconcile side effects using the runbook; never blindly retry an uncertain publication, payment, message or upload.
