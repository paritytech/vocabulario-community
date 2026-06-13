# Roadmap (V1 / V2)

Where the app is today vs. where it's going. V1 is what ships now; V2 is the
planned set, grouped by theme with the design notes that matter.

## V1 — shipped (today)

- **Per-wallet dictionaries** — create / rename / delete / switch; many named
  dictionaries per wallet, fully isolated.
- **Words** — add (type / topic / note, with duplicate detection), edit, delete.
- **All words** — search, filter by type/topic, sort (A→Z / newest / hardest),
  group by type/topic, "with mistakes" filter.
- **Quiz** — direction Word→Translation / Translation→Word / Mixed, weighted by
  past mistakes, diacritic-insensitive ES/SR answer matching, results review,
  mistake counters fed back into the deck.
- **Sentence builder + community board** — pulls a balanced set of random words
  to write with, then publish your sentence **on-chain** (Polkadot Statement
  Store) with a CEFR level for others to **correct**. The separate **Community**
  tab is a searchable feed (filter by level / language / text); corrections stream
  back live. Host-only and ephemeral, like publishing.
- **Dictionary discovery** — publishing a dictionary also announces it on-chain,
  so the Backup tab can **search & retrieve** dictionaries others have shared (no
  CID to copy around).
- **Backup & Bulletin** — local JSON export/import; publish the current
  dictionary to the Polkadot **Bulletin chain** and retrieve any dictionary by
  its CID (publish is host-only, under the wallet's RFC-0010 allowance).
- **Lesson tracker**, **dark / light themes** (one gilt accent), responsive
  sidebar shell.

## V2 — planned

**Shared / collaborative dictionaries** (the couple/group use-case)
- Goal: invite a partner (e.g. spouse) into the **same** dictionary — both add
  words and quiz on one shared set, not two diverging copies.
- Design: a small contract per shared dictionary holds the **head CID** + a
  **member list** (owner / editors). Editing = publish a fresh snapshot to
  Bulletin → `set_head(cid)`; reading = head CID → load from Bulletin. The split:
  the critical pointer lives in the contract, the blob on Bulletin.
- Merge: union words by `id`, field-level last-writer-wins via a per-word
  `updatedAt`, plus `addedBy` attribution — so two people adding different words
  never clobber each other.
- Invite: owner adds the partner's product-account address (shared via link/QR).
- Interim that works **today**: one person publishes, the other retrieves the
  CID — but those copies diverge. The contract pointer is what turns it into one
  *living* dictionary; until then, treat it as periodic re-sharing.

**Streaks & gamification** (Duolingo-style 🔥)
- Daily quiz **streak** (current + longest), stored per wallet; increments on a
  completed quiz on a new day, breaks on a missed day (optional 1-day freeze).
- Daily goal (e.g. 20 words / 1 quiz), lightweight XP, "due today" count.
- Low-effort, high-delight — a good first V2 win, no on-chain work required.

**Grammar library** (new "Grammar" tab)
- Grammar sets (e.g. *Español → Srpski grammar*) → folders → **PDF** documents.
- Each PDF → Bulletin (content-addressed CID); a small **index manifest**
  (folder tree + file CIDs) describes the library and can itself be published /
  anchored.
- Sharing: publish the index CID (or a DotNS name). Use a contract **only** if
  several people co-maintain the library (same mutable-pointer + membership
  pattern as shared dictionaries).
- ⚠️ **Durability caveat:** Bulletin storage is *temporary* (retention GC). For
  grammar you want to keep, pin the same CID on a permanent IPFS service
  (Crust / Filecoin / a pinning provider) — a contract stores a durable
  *pointer*, not durable *bytes*. Local copies stay the backup of record.

**Community sentences** (publish → answer / correct / rate)
- Publish a sentence using a target word; others type a translation, rate it
  (stars) and suggest corrections; your own submissions show "awaiting review".
- Transport: Statement Store (Polkadot's decentralized messaging) or Bulletin
  docs + a registry. (The redesign already includes the visual feed for this.)

**Dictionary marketplace / registry**
- Browse and download highly-rated dictionaries others publish; rate + tip. A
  registry contract (or DotNS index) lists published dictionaries with their
  head CIDs and ratings — fulfilling the "download a great dictionary" vision.

**Tutor / private lessons**
- Listings for tutors; book and pay in DOT. This needs an escrow/payment layer —
  a small contract that holds funds until a lesson is confirmed.

**Learning depth**
- **Spaced repetition** (SM-2 / Leitner) replacing the simple mistake-weighting,
  with per-word due dates and a "due today" queue.
- **Pronunciation** via the Web Speech API (TTS, no backend) + a listening quiz
  (hear → type).
- **Multi-language** — generalize source/target per dictionary (answer
  normalization is currently ES/SR-specific).
- **Import / export** Anki, CSV, Quizlet.

## On-chain anchoring — when to use a contract (opinion)

The recurring question across the V2 items ("should the CID live on a
contract?") comes down to *what the pointer needs to do*:

- A **bare CID** already shares an immutable snapshot for free — copy/paste, QR,
  or a DotNS name. Don't add a contract just to share a static file.
- Reach for a **contract pointer** only when you need one of: **mutability** (a
  stable address whose target CID changes over time — a shared dictionary's
  "head"), **membership / permissions** (who may update — collaborators), or a
  **registry** (a discoverable, rateable list). Shared dictionaries and the
  marketplace qualify; a one-off grammar PDF share does not.
- Keep contract state **minimal** — pointer + members + (optional) ratings. Blobs
  stay on Bulletin / IPFS. This split keeps gas + storage small.
- **Pointer durability ≠ data durability.** A contract CID is permanent; the
  Bulletin blob it points to is not (retention GC). For anything meant to last,
  pin the CID on a permanent IPFS service or re-publish periodically — and keep
  the local export as the true backup.
