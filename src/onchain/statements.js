/**
 * Statement Store engine — the community sentences board.
 *
 * Sentences and corrections are published to the Polkadot People-chain Statement
 * Store through the host (`createProof` + `submit`) and read back through the
 * host's topic-filtered subscription. No custom contract — this mirrors
 * LocalDOT's apps/web/src/lib/statement-store.ts, trimmed to two payload kinds.
 *
 * HOST-ONLY: both writes and reads go through the Polkadot host transport, so
 * nothing here works in a plain browser tab (see `boardEnabled`) — exactly like
 * the existing Bulletin publish path.
 *
 * EPHEMERAL: statements are gossip with a retention window, so the board decays
 * over time. Honest for a sample app; surfaced in the UI.
 *
 * No encryption (V1): payloads are cleartext JSON. Anyone can write any topic,
 * so reads are validated defensively (`decode`).
 *
 * Topics are opaque 32-byte tags; we derive them with Blake2b-256 of a stable
 * string (no new dep — Blake2b already ships for the Bulletin CID). Vocabulario
 * is the only reader/writer of its own board, so internal consistency is all
 * that matters; there is no cross-app topic interop to match.
 */

import { blake2b } from '@noble/hashes/blake2.js';

import { isHosted } from '../wallet.js';
import { ensureHostAllowances } from './host-allowances.js';

const enc = new TextEncoder();
const dec = new TextDecoder();
const WIRE_VERSION = 1;

// How long a published statement lives before the network drops it. The board
// is ephemeral by design (see header), so a week is plenty; re-publishing to a
// channel (an edit) always carries a fresh, larger expiry, so last-write-wins
// keeps working.
const TTL_SECONDS = 7 * 24 * 60 * 60;

/**
 * Build the Statement Store `expiry` value: a u64 packing an absolute Unix
 * expiry timestamp (seconds) in the high 32 bits and a sequence number (0) in
 * the low 32 bits — `(timestamp << 32) | seq`. The node rejects a missing or
 * past expiry as "statement already expired", so this must be a future time.
 * Mirrors `@novasamatech/sdk-statement`'s `createExpiryFromDuration`; inlined to
 * avoid a new dependency (Blake2b is already the only crypto import here).
 */
function expiryFromNow(ttlSeconds = TTL_SECONDS) {
  const timestamp = Math.floor(Date.now() / 1000) + ttlSeconds;
  return BigInt(timestamp) << 32n;
}

/** 32-byte topic from a stable string (Blake2b-256). */
function topic(s) {
  return blake2b(enc.encode(s), { dkLen: 32 });
}

const APP_TOPIC = topic('vocabulario');
const SENTENCES_TOPIC = topic('vocabulario:sentences');
const DICTS_TOPIC = topic('vocabulario:dictionaries');
const threadTopic = (sid) => topic(`vocabulario:thread:${sid}`);

/** Product identifier the host signs against. The host ignores the tuple and
 *  signs with the visitor's root session key, so the exact value only needs to
 *  be stable; we use the deploy domain when available. */
function productId() {
  try {
    if (import.meta.env && import.meta.env.VITE_DOTNS_ID) return import.meta.env.VITE_DOTNS_ID;
    if (typeof window !== 'undefined' && window.location && window.location.host) {
      return window.location.host;
    }
  } catch {
    /* ignore */
  }
  return 'vocabulario';
}

/** Writes AND reads both flow through the host transport. */
export function boardEnabled() {
  return isHosted();
}

/* -------------------------------- payloads -------------------------------- */
// Wire bytes are `JSON.stringify({ v:1, p: payload })`. Decoding the envelope
// first lets a future schema bump degrade gracefully instead of throwing.

function encode(payload) {
  return enc.encode(JSON.stringify({ v: WIRE_VERSION, p: payload }));
}

/** Strict decode + validate. Returns the payload or null for anything we don't
 *  recognise (an attacker — or a buggy client — controls the statement bytes). */
function decode(bytes) {
  let outer;
  try {
    outer = JSON.parse(dec.decode(bytes));
  } catch {
    return null;
  }
  if (!outer || typeof outer !== 'object') return null;
  // New format { v:1, p }; tolerate a legacy bare payload too.
  const p = outer.v === WIRE_VERSION && outer.p ? outer.p : outer;
  if (!p || typeof p !== 'object' || typeof p.ts !== 'number') return null;

  if (p.k === 's') {
    if (typeof p.id !== 'string' || typeof p.text !== 'string') return null;
    return {
      k: 's',
      id: p.id,
      text: p.text,
      lang: typeof p.lang === 'string' ? p.lang : '',
      level: typeof p.level === 'string' ? p.level : '',
      author: typeof p.author === 'string' ? p.author : '',
      ts: p.ts
    };
  }
  if (p.k === 'c') {
    if (typeof p.id !== 'string' || typeof p.sid !== 'string' || typeof p.fix !== 'string') return null;
    return {
      k: 'c',
      id: p.id,
      sid: p.sid,
      fix: p.fix,
      note: typeof p.note === 'string' ? p.note : '',
      author: typeof p.author === 'string' ? p.author : '',
      ts: p.ts
    };
  }
  if (p.k === 'd') {
    // dictionary announcement (for discovery/search)
    if (typeof p.shareId !== 'string' || typeof p.name !== 'string' || typeof p.cid !== 'string') {
      return null;
    }
    return {
      k: 'd',
      shareId: p.shareId,
      name: p.name,
      cid: p.cid,
      lang: typeof p.lang === 'string' ? p.lang : '',
      words: typeof p.words === 'number' ? p.words : 0,
      author: typeof p.author === 'string' ? p.author : '',
      ts: p.ts
    };
  }
  return null;
}

/* --------------------------------- write ---------------------------------- */

let _store = null;
async function getStore() {
  if (_store) return _store;
  const { createStatementStore } = await import('@novasamatech/host-api-wrapper');
  _store = createStatementStore();
  return _store;
}

async function publish(topics, channelKey, payload) {
  if (!isHosted()) {
    throw new Error(
      'The community board is available inside the Polkadot host. Open Vocabulario in Polkadot Desktop or dot.li.'
    );
  }
  await ensureHostAllowances();
  const store = await getStore();
  const stmt = {
    proof: undefined,
    decryptionKey: undefined,
    expiry: expiryFromNow(), // required: the node rejects a missing/past expiry
    channel: topic(channelKey),
    topics,
    data: encode(payload)
  };
  const proof = await store.createProof([productId(), 0], stmt);
  await store.submit({ ...stmt, proof });
}

/** Publish a sentence to the shared board. `payload`: { id, text, lang, author, ts }. */
export async function publishSentence(payload) {
  // channel = sentence id → last-write-wins per signer, so the author can edit.
  await publish([APP_TOPIC, SENTENCES_TOPIC], `s:${payload.id}`, { k: 's', ...payload });
}

/** Publish a correction under a sentence. `payload`: { id, sid, fix, note, author, ts }. */
export async function publishCorrection(payload) {
  await publish([APP_TOPIC, threadTopic(payload.sid)], `c:${payload.id}`, { k: 'c', ...payload });
}

/**
 * Announce a published dictionary so others can discover it. `payload`:
 * { shareId, name, lang, cid, words, author, ts }. Channel = the dictionary's
 * stable shareId → last-write-wins, so re-publishing updates the listing
 * (newer CID / word count) instead of stacking duplicates.
 */
export async function publishDictAnnounce(payload) {
  await publish([APP_TOPIC, DICTS_TOPIC], `d:${payload.shareId}`, { k: 'd', ...payload });
}

/* ---------------------------------- read ---------------------------------- */
// We collect the host's topic-filtered pages into a fresh set, then re-collect
// on an interval. Re-collecting (rather than holding one long-lived
// subscription) means expired statements drop out on their own and a missed
// live push is caught on the next tick — LocalDOT notes live push is unreliable,
// hence the poll.

const POLL_MS = 7000;
const COLLECT_TIMEOUT_MS = 6000;

async function collect(filter, kind) {
  let store;
  try {
    store = await getStore();
  } catch {
    return [];
  }
  return new Promise((resolve) => {
    const map = new Map();
    let done = false;
    let sub = null;
    const finish = () => {
      if (done) return;
      done = true;
      try {
        sub?.unsubscribe?.();
      } catch {
        /* ignore */
      }
      resolve([...map.values()]);
    };
    try {
      sub = store.subscribe(filter, (page) => {
        for (const signed of page?.statements || []) {
          const p = decode(signed?.data);
          if (p && p.k === kind) map.set(p.id, p);
        }
        if (page?.isComplete) finish();
      });
    } catch {
      resolve([]);
      return;
    }
    setTimeout(finish, COLLECT_TIMEOUT_MS); // resolve with whatever arrived
  });
}

function poll(filter, kind, onList) {
  let stopped = false;
  let timer = null;
  const tick = async () => {
    if (stopped) return;
    try {
      const list = await collect(filter, kind);
      if (!stopped) onList(list);
    } catch {
      /* skip one bad cycle */
    }
    if (!stopped) timer = setTimeout(tick, POLL_MS);
  };
  tick();
  return () => {
    stopped = true;
    if (timer) clearTimeout(timer);
  };
}

/** Subscribe to the sentence feed (newest first). Returns an unsubscribe fn. */
export function subscribeSentences(onList) {
  if (!isHosted()) {
    onList([]);
    return () => {};
  }
  return poll({ matchAll: [APP_TOPIC, SENTENCES_TOPIC] }, 's', (list) =>
    onList([...list].sort((a, b) => b.ts - a.ts))
  );
}

/** Subscribe to corrections for one sentence (oldest first). Returns unsubscribe. */
export function subscribeCorrections(sid, onList) {
  if (!isHosted()) {
    onList([]);
    return () => {};
  }
  return poll({ matchAll: [APP_TOPIC, threadTopic(sid)] }, 'c', (list) =>
    onList([...list].sort((a, b) => a.ts - b.ts))
  );
}

/** Subscribe to announced (shared) dictionaries, newest first. Returns unsubscribe. */
export function subscribeDictionaries(onList) {
  if (!isHosted()) {
    onList([]);
    return () => {};
  }
  return poll({ matchAll: [APP_TOPIC, DICTS_TOPIC] }, 'd', (list) =>
    onList([...list].sort((a, b) => b.ts - a.ts))
  );
}
