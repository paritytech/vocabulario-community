> [!WARNING]
> The following is a prototype, reference implementation, and proof-of-concept. This open source code is provided for research, experimentation, and developer education only. This code has not been audited, is actively experimental, and may contain bugs, vulnerabilities, or incomplete features. Use at your own risk.

# Vocabulario

A per-wallet, on-chain dictionary for learning languages — built to run as a
product inside the Polkadot browser host (Triangle).

Each connected wallet owns its own dictionaries: add words, take quizzes, and
build sentences from random words. You can back up a dictionary to a local JSON
file, and publish/retrieve it on the **Polkadot Bulletin chain** by reference (CID).

> Vision: publish your own dictionaries, download highly-rated ones from others,
> compose sentences the community corrects and rates, and progress in the
> language you choose. This repo is the MVP foundation for that.

## Stack

- React + Vite (SPA, `base: './'` so it can be served from a content hash / Bulletin)
- Storage: per-wallet, multi-dictionary in `localStorage` (no server)
- On-chain: Bulletin chain for publish/retrieve (`polkadot-api`, lazy-loaded)

## Getting Started

Requires **Node 22+**.

### Deploy your own (recommended)

One guided command takes you from nothing to a live `.dot` product — generate or
paste a wallet, fund it, build the app, and publish it to a `.dot` domain. One
mnemonic, end to end; nothing secret is written to disk:

```bash
npm install
npm run deploy        # interactive: wallet → fund → domain → build → publish
```

The publish goes to the **Polkadot Bulletin chain + DotNS** via
[`@parity/polkadot-app-deploy`](https://www.npmjs.com/package/@parity/polkadot-app-deploy)
on Paseo Next v2 (the script installs it on first run). A clean, no-trailing-digits
label (e.g. `vocabulario`) requires the signing account to have **Personhood (PoP)**
set on Paseo Next v2; otherwise pick a name ending in two digits. See
[scripts/deploy.mjs](scripts/deploy.mjs) for the lower-level steps.

### Run locally (quick look)

```bash
npm install
npm run dev      # http://localhost:5173
```

In a plain browser tab you get a **dev-wallet switcher** in the header — each
account is an isolated set of dictionaries, so per-wallet isolation is visible
locally before the Triangle host is wired.

## Structure

```
src/
  App.jsx              tabs + state + dictionary/wallet bar
  api.js               words/meta + dictionaries + backup/publish/retrieve (scoped to wallet+dict)
  wallet.js            identity (dev accounts now; host getProductAccount in Phase 2)
  store.js             per-wallet, multi-dictionary KV (localStorage)
  seed.js              curated demo dictionaries (ES/DE/FR/IT → English) seeded on first load
  starter.js           legacy one-time seed of the original Spanish set (kept, no longer auto-loaded)
  sentences.js         facade for the community board (fills author/lang/id) → onchain/statements.js
  onchain/
    bulletin.js        retrieve-by-CID (gateway fetch) + publish dispatcher + env flag
    bulletin-write.js  lazy: CID calc + preimageManager.submit (heavy deps)
    statements.js      community sentences/corrections on the Statement Store (host-only)
    host-allowances.js shared RFC-0010 + RFC-0002 onboarding for Bulletin + Statement Store
  pages/               AddWord · WordList · Quiz · Sentence (Write) · Community · Backup
  components/          DictionaryBar · WalletPill · CompactPicker · Icons · …
product.manifest.json  Triangle product manifest (spa mode)
data/vocabulary.json   legacy 683-word Spanish set (kept for reference; not auto-loaded)
```

See [ONCHAIN.md](ONCHAIN.md) for the Bulletin/Triangle design and Phase 2 plan.

## Backup & Bulletin (the "Backup" tab)

- **Local backup** — download the current dictionary as JSON / import a backup
  as a new dictionary (works across accounts). The durable backup of record.
- **Retrieve from Bulletin** — paste a CID → fetched from the IPFS gateway → imported.
- **Publish on Bulletin** — host-only. Inside the Polkadot host it
  publishes under your wallet's **RFC-0010 Bulletin allowance**
  (`preimageManager.submit`, your own account — no dev key). There is no
  standalone fallback, so publishing is unavailable outside the host. Bulletin
  storage is temporary (retention period) — keep the local JSON as the real backup.

Config: see [`.env.example`](.env.example) (only the IPFS gateway is configurable;
publishing has no config).

## Roadmap

Where the app is today (V1, shipped) and where it's going (V2, planned) — plus a note on when an
on-chain contract is actually worth it — lives in [ROADMAP.md](ROADMAP.md).

## Deploy

This is a reference blueprint — deploy your own instance, to your own `.dot`
domain, signed by your own account. The one-command flow is `npm run deploy` (see
[Getting Started](#deploy-your-own-recommended) above); it builds `dist/` and
publishes it to the Bulletin chain + DotNS on Paseo Next v2. No CI or hosted
service is required — you run it locally and the mnemonic never leaves memory.

Parity's own reference build is published at **https://vocabulario.dot.li/**.

## Security

> [!WARNING]
> The following is a prototype, reference implementation, and proof-of-concept. This open source code is provided for research, experimentation, and developer education only. This code has not been audited, is actively experimental, and may contain bugs, vulnerabilities, or incomplete features. Use at your own risk.

Before deploying it for real use cases, you are responsible for:

- Reviewing the code yourself, we publish a reference, not a hardened production build
- Checking that the dependencies are up to date and free of known vulnerabilities
- Securing your own fork or deployment environment (keys, secrets, network configuration)
- Tracking the latest tagged release/commits for security fixes; older releases are not backported (exceptions might apply)

For Parity's security disclosure process, and Bug Bounty program, feel free to visit: https://parity.io/bug-bounty

Vocabulario is experimental proof-of-concept code **developed and published by Parity Technologies**. It is **not** a Parity product or service, and Parity does **not** operate, host, deploy, or endorse any deployment of it — anyone who runs it does so on their own infrastructure and at their own discretion.

## License

Licensed under the **GNU General Public License v3.0 (GPL-3.0-only)** — see [LICENSE](LICENSE) for the full text. Third-party dependency licenses are listed in [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md).

Copyright (C) 2026 Parity Technologies (UK) Ltd. and contributors.
