# Vocabulario → Triangle / Polkadot

How this app becomes a per-wallet, on-chain "product" inside the Polkadot
browser host (the **Triangle** ecosystem), modelled on **LocalDOT**
([`paritytech/localdot-community`](https://github.com/paritytech/localdot-community)).

## The model (what LocalDOT taught us)

A Triangle "product" is a normal **React + Vite SPA** served as a static build
and embedded in the host as an iframe (`display.mode: "spa"`). It is **not** a
sandboxed worker with custom widgets — our existing JSX/CSS UI ports as-is.

- The host hands the product **one deterministic account per product** via
  `accounts.getProductAccount(window.location.host, 0)`
  (`@novasamatech/host-api-wrapper`). That address is the user's identity for
  this app — there is no manual "connect / switch wallet".
- App data is **not** all on a smart contract. LocalDOT keeps only financial
  state in a contract and stores blob data on the **Bulletin chain** (CIDs),
  messaging on the Statement Store. A vocabulary has no financial state, so it
  belongs on Bulletin, not in contract storage.
- Built with `base: './'` (relative paths) and deployed via `polkadot-app-deploy`
  to `https://<name>.dot.li/` — no servers.

## Architecture of this app

```
 UI pages (unchanged)        AddWord · WordList · Quiz · Sentence
        │  (7 functions, same signatures as before)
        ▼
 src/api.js                  scopes every call to (wallet address, current dictionary)
        │
        ├── src/wallet.js    who is the current wallet  (dev accounts now; host account Phase 2)
        └── src/store.js     per-wallet, multi-dictionary key/value store
                 │
                 ├── localStorage         ← today (MVP, instant, offline)
                 └── src/onchain/bulletin.js  ← Phase 2 (snapshot each dictionary on-chain)
```

Key scheme (address-namespaced, so wallets are fully isolated):

```
vocab/<addr>/index           [{ dictId, name, createdAt }]
vocab/<addr>/current         dictId
vocab/<addr>/dict/<dictId>   { meta: { lastLesson }, words: [ ...word ] }
```

A new wallet starts empty with one default dictionary ("Moj rečnik"). Each
account can hold multiple named dictionaries.

## Status

**Phase 1 — done (local).** Server + single JSON removed. Data is per-wallet and
multi-dictionary in localStorage. In standalone `vite` you get a **dev-wallet
switcher** to demo per-wallet isolation. All four pages work unchanged.

**Backup & Bulletin — done (Backup tab).**
- **Local backup**: download the current dictionary as JSON / import a backup as
  a new dictionary (works across accounts). The real backup of record.
- **Retrieve from Bulletin**: paste a CID → fetched from the IPFS gateway
  (`fetchDictionaryByCid`, zero deps) → imported as a new dictionary.
- **Publish on Bulletin**: host-only, mirroring LocalDOT's
  `apps/web/src/lib/host/storage.ts` (`src/onchain/bulletin-write.js`, lazy-loaded;
  CID shown copy/open + persisted at `vocab/<addr>/cid/<dictId>`). The user's own
  account writes under an **RFC-0010 BulletinAllowance** + `PreimageSubmit`
  permission → `preimageManager.submit`. No dev key, no standalone fallback:
  `publishEnabled()` ⇒ `isHosted()`, and `publish()` throws outside the host.
  Deps: `@novasamatech/host-api-wrapper` + `@novasamatech/host-api` (lazy);
  `polkadot-api`/`hdkd` were removed with the `//Alice` path. Caveat: Bulletin
  data is temporary (retention) — local JSON stays durable.

**Phase 2 — remaining host wiring.**
- The publish allowance/preimage branch is in place; what's left is the rest of
  host integration: resolve the host product account (`accounts.getProductAccount`)
  in `src/wallet.js#initWallet`, an onboarding gate that grants the allowance up
  front (instead of on first publish), and proper async host detection
  (`sandboxProvider.isCorrectEnvironment`) in `isHosted()`.

Reference for the remaining host bits: LocalDOT's `apps/web/src/lib/host/`
(`signer.ts`, `detect.ts`, `allowances.ts`, `storage.ts`) +
`apps/web/src/components/onboarding/OnboardingGate.tsx` in
[`paritytech/localdot-community`](https://github.com/paritytech/localdot-community).
Deploy is one command: `npm run deploy` ([scripts/deploy.mjs](scripts/deploy.mjs)
→ `polkadot-app-deploy --env paseo-next-v2 ./dist <name>.dot` →
`https://<name>.dot.li/`), mirroring LocalDOT's `scripts/deploy.ts`.

**Community sentences + dictionary discovery — done.** A live, multi-user board
on the **Statement Store** (People chain), no custom contract — mirrors
LocalDOT's `apps/web/src/lib/statement-store.ts`.
- **Write** tab: compose a sentence, tag a **CEFR level** (A1–C2), publish it.
- **Community** tab (separate): the searchable feed — filter by level / language /
  text — where others publish **corrections** (a suggested rewrite + optional
  note) under each sentence.
- **Dictionary discovery:** publishing a dictionary (Backup → Share) also posts a
  small **announcement** statement (`k:'d'` — name, lang, CID, words) to a
  `vocabulario:dictionaries` topic, keyed by the dictionary's stable `shareId`
  (LWW). The Backup tab's "Browse shared dictionaries" subscribes to that topic
  so others can search + one-click retrieve — no out-of-band CID needed.
- Engine: `src/onchain/statements.js`. Write = `createStatementStore()` →
  `createProof([productId,0], stmt)` → `submit(stmt)`. Read = `store.subscribe`
  on a topic filter, re-collected on a poll (live push is unreliable). Topics are
  Blake2b-256 of stable strings (`vocabulario`, `vocabulario:sentences`,
  `vocabulario:thread:<id>`) — Vocabulario is the only reader/writer of its board,
  so internal consistency is all that's needed. `expiry: undefined` → network
  default retention. Payloads are versioned cleartext JSON, validated on read.
- Onboarding: the shared `src/onchain/host-allowances.js` now grants **both**
  RFC-0010 allowances (Bulletin + StatementStore) in one modal and pre-resolves
  both RFC-0002 permissions (PreimageSubmit + StatementSubmit). `bulletin-write.js`
  uses the same bootstrap, so a user sees one allowance prompt, not two.
- **Host-only + ephemeral**, same shape as Bulletin publish: writes need the host
  allowance, reads are host-routed, and statements expire after a retention
  window (surfaced in the UI). Self-reported `author` (the host signs every
  statement with its root key) — informational, not a cryptographic identity.
- No new dependencies: topics reuse the `@noble/hashes` Blake2b already shipped
  for the CID, reads use the host's own `store.subscribe`.

Host round-trip test (can't be driven outside the host — do this in Polkadot
Desktop/dot.li or on `https://vocabulario.dot.li/`):
1. Open the app in the host on account A → Sentences tab → write a sentence →
   **Publish to community** (approve the one-time allowance modal). It appears in
   the feed.
2. Open on a second account B (or another device) → the sentence shows in the
   feed → **Suggest a correction** → it appears threaded under the sentence for
   both A and B within a poll cycle (~7s).
3. Backup → Share: publish a dictionary on A (shared bootstrap shouldn't regress
   the Bulletin path) → on B it appears under **Browse shared dictionaries** →
   one-click **Retrieve** imports it.

**Future (beyond MVP):** download + merge others' dictionaries, ratings, tips in
DOT (no clean host primitive yet — see the repo discussion), a discovery
registry. Bulletin already makes "publish" small: a published dictionary is just
a discoverable CID.

## Legacy

`data/vocabulary.json` (the original 683-word Spanish set) is kept on disk for
reference but no longer auto-loaded. To seed it into a wallet's dictionary later,
read that JSON and feed each word through `addWord()`.
