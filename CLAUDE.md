# Vocabulario — agent guidance

> ## ⚠️ MANDATORY FIRST STEP — run `./setup.sh`
>
> **Before you read, write, edit, review, or run any code in this repo, you
> MUST run `./setup.sh`.** It installs dependencies and fetches the
> `@parity/product-sdk` skills into `.claude/skills/` — the per-package SDK
> guidance you are expected to follow.
>
> - Run it at the **start of every session**. It is a fast no-op when already
>   set up, so there is no cost to running it again.
> - Do **not** skip it, defer it, or work around it. Do **not** begin the
>   user's task until it has completed.
> - The **only** exception is if the user **explicitly tells you to skip
>   setup** in this session. Their instruction overrides this; nothing else
>   does.
> - If it fails, **stop and report the failure** — do not silently continue
>   without the SDK skills loaded.
>
> (For Claude Code this also runs automatically via a `SessionStart` hook in
> `.claude/settings.json`; the rule above still applies to every other tool
> and as a backstop. See [Product SDK skills](#product-sdk-skills) below.)

Vocabulario is a per-wallet, on-chain dictionary for learning languages, built to run inside the Polkadot browser host (Triangle). It runs embedded in a Polkadot **host** — Polkadot Mobile, Desktop, or Web — and signing is always approved on Polkadot Mobile (see [Hosts & signing](#hosts--signing)). Built with React + Vite + TypeScript on the Host API.

## Polkadot stack

| Layer | Package |
|-------|---------|
| Product account / signing | `@parity/product-sdk-signer` |
| Host / TruAPI helpers | `@parity/product-sdk-host` (any Polkadot host: Mobile / Desktop / Web) |
| Chain RPC | `@parity/product-sdk-chain-client` (add with descriptors when you need it) |

Other packages worth knowing about for richer apps:

- `@parity/product-sdk-bulletin` — IPFS-style off-chain storage
- `@parity/product-sdk-contracts` — smart contract helpers
- `@parity/product-sdk-statement-store` — real-time P2P pub/sub
- `@parity/product-sdk-tx` — transaction submission helpers

## Product SDK skills

Run `./setup.sh` (or `/dev`) to fetch the `@parity/product-sdk` skills from
[paritytech/product-sdk](https://github.com/paritytech/product-sdk) into
`.claude/skills/` — per-package guidance (app builder, chain connection, cloud
storage, contracts, statement store, transactions, utilities). They're
gitignored and fetched fresh, so they never go stale; `./setup.sh --refresh`
re-pulls. Consult them before hand-rolling SDK usage.

## Hosts & signing

The app runs embedded in a Polkadot **host** (a Triangle container). There are
three hosts: **Polkadot Mobile**, **Polkadot Desktop**, and **Web**. The host
exposes the Host API (account access + signing) over a postMessage transport,
so the app only lights up when embedded in one — a plain browser tab won't show
a product account.

The **signer lives on Polkadot Mobile**. Mobile holds your keys:

- On **Mobile**, you approve signing requests on-device.
- On **Desktop** and **Web**, you log in by pairing your Polkadot Mobile; those
  hosts **relay every signing request to your phone**, where you approve it.

So no host has its own wallet/extension — signing always resolves on Mobile.
Don't propose browser-extension or injected-wallet fallbacks; they're
intentionally out of scope. (The product-sdk skills in `.claude/skills/` cover
the host model in more depth.)

## Conventions

- **Always go through `@parity/product-sdk-*` and the Host API — never escape the host with direct RPC.** Account access, signing, chain reads/writes, and storage all flow through the host-provided product account + Host API. Do **not** add a raw full-node WebSocket/RPC client, a public IPFS/Bulletin gateway fetch, a `polkadot-api` client wired to your own endpoint, or any path that bypasses the host. Those break the permissionless model, leak trust to a server, and won't work inside the host sandbox anyway. If a product-sdk package seems to be missing a capability, surface the gap — don't work around it with a direct-RPC shim. (The `polkadot-product-engineering` skill in `.claude/skills/` enumerates the forbidden dependencies.)
- Account access goes through the host: connect the signer to the `"host"` provider first, then request the app-scoped product account.
- Product account identifiers must match the host's current app identifier. Localhost uses `window.location.host` (for example `localhost:5173`), `.dot.li` gateway URLs map to `.dot`, and `VITE_PRODUCT_ACCOUNT_ID` can override this.
- Signed extrinsics (Bulletin uploads, contract calls, etc.) require PAS tokens. Faucets:
  - Asset Hub: https://faucet.polkadot.io/
  - Bulletin: https://paritytech.github.io/polkadot-bulletin-chain/authorizations?tab=faucet
- The Polkadot host apps (Mobile / Desktop) aren't installable from this repo — point users at the Polkadot documentation if they don't have one.

## Smart contracts

If this app includes a smart contract (look for a `cdm.json` manifest and a
Rust crate), it follows the Polkadot Hub contract model. If the app is
frontend-only, you can ignore this section.

- Contracts are written in **Rust** and compiled to **PVM (PolkaVM)** for
  `pallet-revive` — the Polkadot Hub contract runtime. Do **not** target
  EVM/Solidity or legacy ink!/WASM.
- Manage contract dependencies with the **CDM (Contract Dependency Manager,
  [paritytech/contract-dependency-manager](https://github.com/paritytech/contract-dependency-manager))**
  — the `@parity/cdm-*` toolchain and a `cdm.json` manifest — and build with
  **cargo**. A Rust toolchain (and a laptop) is required; this is not a
  browser-only flow. See the CDM repo for the manifest schema and commands.
- `playground deploy` (the `playground` CLI —
  [paritytech/playground-cli](https://github.com/paritytech/playground-cli))
  runs a **contract deploy/install pre-step** automatically
  (pass `--no-contracts` to skip it). Let the CLI handle on-chain contract
  deployment; don't hand-roll `pallet-revive` calls.
- The `product-sdk-contracts` skill in `.claude/skills/` covers calling contracts
  from the frontend via `@parity/product-sdk-contracts` (still through the host —
  see the no-direct-RPC convention above).

## Publishing & the App Detail Page

When you publish with `playground deploy --playground`, the app's card and **App
Detail Page** in the Playground are driven by a small metadata JSON the CLI
builds and stores on Bulletin. The CLI populates it from:

- **`README.md`** — inlined into the metadata (capped in size) and rendered on
  the Detail Page. **Update `README.md` before publishing** so the listing
  reflects the current app.
- **`--tag <tag>`** — the category used to filter the Apps grid. One of:
  `social`, `chat`, `defi`, `utility`, `gaming`, `marketplace`, `irl`. Pick the
  one that fits.
- **`--moddable`** — records your fork's GitHub `origin` as the public source
  `repository`, so others can `playground mod` it. Only set this if the `origin`
  is your own public fork.

So before any `--playground` publish, **ask the user to update `README.md` and
confirm the tag** (and the repository, if moddable) — those are what show up on
the Detail Page.

> **Known limitation:** the current `playground deploy` path does **not** write a
> custom **name, description, or icon/cover image** into the metadata. The app
> name is the `<name>.dot` domain, and the Detail Page falls back to a generated
> placeholder image. Setting an icon/cover is only available through the
> Playground app's owner UI today, not the CLI — don't add code that
> claims to upload an image at deploy time.

## Slash commands

- `/dev` — set up (deps + skills) and start the dev server in the background.
- `/deploy <name>` — build and deploy to `<name>.dot` via the `playground` CLI (phone signer).
