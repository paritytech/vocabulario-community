# Deploying your own copy of this app

This guide walks you through deploying your own instance of the Vocabulario app: your own frontend on Bulletin Chain, served from your
own `.dot` name, starting from nothing but a GitHub account, a terminal, and
a phone.

This app is **frontend-only** — there's no smart contract, so no Rust
toolchain or contract build to set up. One tool does all the work:

- **[Playground CLI](https://github.com/paritytech/playground-cli)** (`playground`, short alias `pg`) builds the frontend,
  uploads it to Bulletin Chain, registers your `.dot` name, and (optionally)
  publishes the app to the playground registry so it shows up in the Apps
  grid.

Rough time: about 10 minutes end to end. There's no slow Rust build here —
the wait is mostly the on-chain steps that pause for phone approval.

## 0. Prerequisites

You need three things:

**The Polkadot App on your phone**, with an account created. The standard
flow signs every deploy step by approving on the phone. (Deploying with a
pre-provisioned mnemonic instead is covered at the end of step 5.)

**Node.js** (with `npm`) — the build in step 3 uses it.

**The Playground CLI**:

```sh
curl -fsSL https://raw.githubusercontent.com/paritytech/playground-cli/main/install.sh | bash
```

Open a fresh terminal afterwards so it's on your PATH, then verify:

```sh
playground --version
```

## 1. Fork and clone the repository

Fork this repo on GitHub (the **Fork** button), then clone **your fork**,
not the upstream repo:

```sh
git clone https://github.com/<your-github-username>/vocabulario-community.git
cd vocabulario-community
```

*What's happening:* you now own a copy of the app — frontend (`src/`),
build config, and the deploy wiring.

The fork matters if you deploy with `--moddable` (step 4): that flag
publishes your git `origin` as the app's public source repo, so others can
`playground mod` your version. Clone upstream directly and you'd advertise
the original app's code instead of yours.

## 2. Sign in with the Playground CLI

```sh
playground login
```

*What's happening:* `login` asks for a display name, then shows a QR code.
Scan it with the Polkadot App and approve once: that verifies you via Proof
of Personhood, pairs a product account (an address like `playground.dot/0`),
and provisions a local session key. Sign out later with `playground logout`.

A warning like `[cloudStorage] checkAuthorization: query failed ...
DisjointError` *after* `✓ setup complete` has been observed and was
harmless. If you got the `setup complete` line, proceed.

## 3. Build the frontend

```sh
npm install
npm run build
```

*What's happening:* this type-checks and builds the static site into
`dist/` — the directory the deploy step uploads.

## 4. Deploy to Bulletin and register your `.dot` name

```sh
playground deploy --no-build --buildDir dist --domain <name> --signer phone --playground
```

Pick any available name (`<name>` becomes `<name>.dot`; a trailing `.dot` is
fine — the CLI strips it). Two constraints to know: if the name is already
taken by someone else, pick another; and very short names currently require
personhood verification, so prefer names of 9+ characters.

Want your fork to be moddable by others? Add `--moddable` (requires
`--playground` and a public GitHub `origin` — your fork):

```sh
playground deploy --no-build --buildDir dist --domain <name> --signer phone --playground --moddable
```

The CLI shows a **preflight summary** before submitting anything. Read it
before pressing Enter — in particular, if you used `--moddable`, the
`moddable: yes ... <repo url>` line must point at **your fork**. It's
auto-detected from your git `origin`; if it shows the upstream repo, you
cloned instead of forking. Fix with
`git remote set-url origin https://github.com/<you>/vocabulario-community.git`.

Press Enter and **open the Polkadot App on your phone**. There are no push
notifications and no QR code for this step — pending approval requests
appear *inside the app*, and you approve each one there. Expect **4
approvals**, plus possibly one more to top up your Bulletin storage
allowance:

1. **reserve domain** (DotNS commitment)
2. **finalize domain** (DotNS register)
3. **link content** (setContenthash — points the name at your upload)
4. **publish to Playground registry**

Between the first two approvals there is a deliberate ~60-second pause
(DotNS's anti-front-running commit-reveal window); it's not stuck.

*What's happening:*

1. uploads the `dist/` assets + app metadata to **Bulletin Chain**
   (decentralized storage, no server anywhere),
2. registers your **`.dot` domain** via DotNS and points it at the upload,
3. publishes the app to the **playground registry**, which puts it in the
   playground's Apps grid,
4. prints the result: your live URL (`https://<name>.dot.li`, or
   `<name>.dot` inside a Polkadot host — Mobile, Desktop, or Web) plus the
   app, IPFS, and metadata CIDs.

### What shows on your app's listing

The playground's Apps grid and **App Detail Page** are driven by a metadata
JSON the publish step builds from your project:

- Your **`README.md`** is inlined into the metadata (capped in size) and
  rendered on the Detail Page — so **update `README.md` before you publish**.
- The **tag** (`--tag <tag>`, one of `social`, `chat`, `defi`, `utility`,
  `gaming`, `marketplace`, `irl`) is the category used to filter the grid. If
  you omit the flag the CLI prompts you to pick one.
- With `--moddable`, your fork's public GitHub URL is recorded as the source
  `repository`.

The app's **name is the `<name>.dot` domain** itself; the current publish path
does not take a custom name, description, or icon/cover image, so the Detail
Page shows a generated placeholder image. Re-deploy after editing `README.md`
to refresh the listing.

### Deploying with a mnemonic instead of the phone

If you have a pre-provisioned account (a mnemonic or secret URI) you can
skip the phone flow entirely, including `playground login`:

```sh
playground deploy --no-build --buildDir dist --domain <name> --playground --signer dev --suri "<your secret URI>"
```

Everything (storage, DotNS, playground publish) is then signed by that
account, with no phone approvals. Two things to know:

- **Always pass `--suri`.** Bare `--signer dev` without it falls back to a
  shared, publicly-known development mnemonic, so anyone could control what
  you deploy.
- The account must be funded: PAS for fees and a Bulletin storage allowance.
  Faucets:
  - PAS for fees: <https://faucet.polkadot.io/>
  - Bulletin storage allowance:
    <https://paritytech.github.io/polkadot-bulletin-chain/authorizations?tab=faucet>

## 5. Verify

- Open `https://<name>.dot.li` in a **plain browser**: your app, served from
  Bulletin. The page renders, but Host API login and the product-account
  panel only light up inside a Polkadot host (next bullet) — a plain tab has
  no host to talk to.
- Open `<name>.dot` inside a **Polkadot host** (Mobile, Desktop, or Web). On
  Desktop/Web **hard-refresh** (Cmd+Shift+R / Ctrl+Shift+R) — the browser may
  serve a cached copy of a previous deploy. You should see the app
  connect to the Host API and surface the app-scoped product account's SS58 +
  EVM (H160) addresses, and be able to sign a message end-to-end (the request
  is approved on your Polkadot Mobile — Desktop/Web relay it to the phone).
- If you deployed with `--playground`, open the playground's **Apps** tab
  (inside Polkadot Desktop / Mobile). Your card should appear, newest first.

## Redeploying

Re-running `playground deploy` against a domain **you already own** is fine:
it uploads the new build and repoints the name at it. You don't repeat the
DotNS reservation, so expect fewer approvals on subsequent deploys. Rebuild
first with `npm run build`, or drop `--no-build` from the command to let the
CLI build for you.

## Troubleshooting

| Symptom | Cause / fix |
|---|---|
| `error: unknown command 'login'` or `'init'` | login is `playground login` in current CLI versions; there is no `init` |
| `[cloudStorage] ... DisjointError` after login | observed as harmless when it appears after `✓ setup complete`; proceed |
| `Domain <name>.dot is already registered` | first come, first served; pick a different name (re-deploying a domain you own yourself is fine) |
| `<name>.dot requires ProofOfPersonhoodFull, but this signer is NoStatus` | the name is too short to be open to all accounts; pick a longer one (9+ characters) |
| `--moddable` rejected / preflight shows the upstream repo as the source | `--moddable` needs a public GitHub `origin` that is **your fork**; `git remote set-url origin <your fork URL>` |
| Deploy pauses ~60s after the first phone approval | DotNS's mandatory commit-reveal wait (front-running protection), not a hang |
| No QR code or notification during deploy | expected for `--signer phone`: open the Polkadot App yourself; pending approvals appear inside the app |
| Deploy fails at the upload step with a `Payment` / allowance error | no Bulletin storage allowance; use the Bulletin faucet (see step 4's mnemonic notes), then re-run |
| App loads but shows no product account in a plain desktop browser | expected: Host API access flows through the host. Open it inside Polkadot Desktop/Mobile, or via its `.dot.li` URL |
| `<name>.dot.li` returns a generic Polkadot page to curl/scripts | the gateway serves a client-side resolver shell; only a real browser renders your app |
| Opened `<name>.dot` and saw the old version | hard-refresh (Cmd+Shift+R / Ctrl+Shift+R); the browser cached the previous deploy |
