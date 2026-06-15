---
description: Build and deploy the app to a .dot domain.
---

Deploy the app using `playground deploy`. The user's chosen domain name is: $ARGUMENTS

Steps:
1. If no domain name was provided in $ARGUMENTS, ask the user for one before proceeding (e.g. "reinhard" will become "reinhard.dot").
2. **If the app's smart contract changed since the last deploy** (new or redeployed contract — a changed contract has a new on-chain address), **ask the user whether to publish under a new `<name>.dot` domain** instead of overwriting the existing one. A changed contract is effectively a new app version; re-pointing the old domain at it can strand the previous contract's users and state. If they want a new domain, use that name for the rest of this flow.
3. **Before publishing, ask the user to update what drives the App Detail Page:**
   - **`README.md`** — it's inlined into the published metadata and rendered on the app's Detail Page. Offer to help refresh it so it matches the current app.
   - **the tag** — pick the category that fits via `--tag <tag>` (one of: `social`, `chat`, `defi`, `utility`, `gaming`, `marketplace`, `irl`).
   - Note honestly: the CLI publish path does **not** support a custom name/description/icon image — the name is the domain and the Detail Page uses a placeholder image. Don't promise an image upload.
4. Run `npm run build` to ensure a fresh build.
5. Run `playground deploy --no-build --buildDir dist --domain <name>.dot --signer phone --playground --tag <tag>` where `<name>` is the domain the user provided (strip any trailing `.dot` if they included it — the CLI adds it) and `<tag>` is the category chosen in step 3. Use a 5-minute timeout — deploys involve multiple on-chain transactions that wait for phone approval.
6. Show the user the output. The phone signer is already paired. There are **no push notifications** — tell the user to **open the Polkadot App on their phone** themselves; pending approval requests appear inside the app and they need to approve each one (4 approvals total: commitment, register, setContenthash, publish). Do not mention QR codes, links, or notifications.
7. If it succeeded, remind them to open `<name>.dot` inside a **Polkadot host** (Mobile, Desktop, or Web) to verify the deployment. On Desktop/Web tell them to **hard-refresh** (Cmd+Shift+R / Ctrl+Shift+R) — the browser may serve a cached version of the previous deploy.
