/**
 * Per-wallet, multi-dictionary storage.
 *
 * Every key is namespaced under the wallet address, so switching addresses
 * yields a fully isolated dataset with zero leakage. Each address owns an
 * `index` (list of its dictionaries) plus one record per dictionary.
 *
 * Key scheme:
 *   vocab/<addr>/index            -> [{ dictId, name, createdAt }]
 *   vocab/<addr>/current          -> dictId  (last selected)
 *   vocab/<addr>/dict/<dictId>    -> { meta: { lastLesson }, words: [ ...word ] }
 *
 * The actual bytes live in `localStorage` today. The `kv` object below is the
 * single swap point: Phase 2 routes these reads/writes through host storage and
 * snapshots each dictionary to the Bulletin chain (see src/onchain/bulletin.js
 * and ONCHAIN.md). Nothing else in the app needs to change.
 */

import { slug } from './labels.js';
import { DEMO_DICTS } from './seed.js';

const PREFIX = 'vocab';

const kv = {
  get(key) {
    try {
      const raw = localStorage.getItem(key);
      return raw == null ? null : JSON.parse(raw);
    } catch {
      return null;
    }
  },
  set(key, value) {
    localStorage.setItem(key, JSON.stringify(value));
  },
  del(key) {
    localStorage.removeItem(key);
  }
};

const indexKey = (addr) => `${PREFIX}/${addr}/index`;
const currentKey = (addr) => `${PREFIX}/${addr}/current`;
const dictKey = (addr, dictId) => `${PREFIX}/${addr}/dict/${dictId}`;
const cidKey = (addr, dictId) => `${PREFIX}/${addr}/cid/${dictId}`;
const streakKey = (addr) => `${PREFIX}/${addr}/streak`;
const seededKey = (addr) => `${PREFIX}/${addr}/seeded`;

const emptyDict = () => ({ meta: { lastLesson: null }, words: [] });

/* ------------------------------ dictionaries ------------------------------ */

/** List a wallet's dictionaries: [{ dictId, name, createdAt }]. */
export function listDicts(addr) {
  return kv.get(indexKey(addr)) || [];
}

function saveIndex(addr, list) {
  kv.set(indexKey(addr), list);
}

function genDictId(addr, name) {
  const base = slug(name) || 'dictionary';
  const taken = new Set(listDicts(addr).map((d) => d.dictId));
  if (!taken.has(base)) return base;
  let n = 2;
  while (taken.has(`${base}_${n}`)) n++;
  return `${base}_${n}`;
}

/**
 * A globally-unique, opaque, stable identity for a dictionary's shared lineage.
 * Deliberately NOT derived from the name (two people naming a dictionary the same
 * must not collide) — this is what a re-retrieve matches on.
 */
export function genShareId() {
  try {
    if (globalThis.crypto?.randomUUID) return globalThis.crypto.randomUUID();
  } catch {
    /* fall through */
  }
  return `sh-${Math.random().toString(36).slice(2, 10)}${Math.random().toString(36).slice(2, 10)}`;
}

/** Create a new (empty) dictionary and append it to the wallet's index. */
export function createDict(addr, name) {
  const list = listDicts(addr);
  const entry = {
    dictId: genDictId(addr, name),
    name: (name && name.trim()) || 'Dictionary',
    shareId: genShareId(),
    createdAt: new Date().toISOString()
  };
  list.push(entry);
  saveIndex(addr, list);
  kv.set(dictKey(addr, entry.dictId), emptyDict());
  return entry;
}

/** Rename a dictionary (index label only; words untouched). */
export function renameDict(addr, dictId, name) {
  const list = listDicts(addr);
  const entry = list.find((d) => d.dictId === dictId);
  if (!entry) return null;
  entry.name = (name && name.trim()) || entry.name;
  saveIndex(addr, list);
  return entry;
}

/** Merge fields into a dictionary's index entry (e.g. mark it as imported). */
export function tagDict(addr, dictId, patch) {
  const list = listDicts(addr);
  const entry = list.find((d) => d.dictId === dictId);
  if (!entry) return null;
  Object.assign(entry, patch);
  saveIndex(addr, list);
  return entry;
}

/** Delete a dictionary and all its words. Fixes the `current` pointer. */
export function deleteDict(addr, dictId) {
  const list = listDicts(addr).filter((d) => d.dictId !== dictId);
  saveIndex(addr, list);
  kv.del(dictKey(addr, dictId));
  if (getCurrentDictId(addr) === dictId) {
    setCurrentDictId(addr, list.length ? list[0].dictId : null);
  }
}

/** The wallet's currently-selected dictionary id (validated against index). */
export function getCurrentDictId(addr) {
  const cur = kv.get(currentKey(addr));
  const list = listDicts(addr);
  if (cur && list.some((d) => d.dictId === cur)) return cur;
  if (list.length) {
    setCurrentDictId(addr, list[0].dictId);
    return list[0].dictId;
  }
  return null;
}

export function setCurrentDictId(addr, dictId) {
  if (dictId == null) kv.del(currentKey(addr));
  else kv.set(currentKey(addr), dictId);
}

/**
 * Guarantee the wallet has at least one dictionary and a valid current pointer.
 * New wallets start with a single empty "My dictionary". Returns the current id.
 */
export function ensureDefault(addr) {
  if (listDicts(addr).length === 0) {
    const entry = createDict(addr, 'My dictionary');
    setCurrentDictId(addr, entry.dictId);
  }
  return getCurrentDictId(addr);
}

/**
 * Seed a fresh wallet with the curated demo dictionaries (Español / Deutsch /
 * Français / Italiano — see src/seed.js) so a first-time visitor lands on a
 * playable app instead of an empty one. They're ordinary dictionaries: rename,
 * quiz on, or delete any you don't want.
 *
 * Guarded by a per-wallet `seeded` flag so it runs exactly once per wallet —
 * deleting the demo dictionaries does NOT bring them back, and a wallet that
 * already owns data (e.g. an existing user) is left untouched.
 */
export function maybeSeedDemo(addr) {
  try {
    if (!addr) return;
    if (kv.get(seededKey(addr))) return; // already seeded this wallet once
    if (listDicts(addr).length === 0) {
      let first = null;
      for (const d of DEMO_DICTS) {
        const entry = createDict(addr, d.name);
        writeDict(addr, entry.dictId, d.record);
        if (!first) first = entry;
      }
      if (first) setCurrentDictId(addr, first.dictId);
    }
    kv.set(seededKey(addr), 1);
  } catch {
    /* seeding is best-effort */
  }
}

/* --------------------------------- words ---------------------------------- */

/** Read a dictionary record: { meta, words }. */
export function readDict(addr, dictId) {
  return kv.get(dictKey(addr, dictId)) || emptyDict();
}

/** Write a dictionary record back. */
export function writeDict(addr, dictId, data) {
  kv.set(dictKey(addr, dictId), data);
}

/* ----------------------- Bulletin publish pointer ------------------------- */

/** Last Bulletin publish record for a dictionary: { cid, blockHash, publishedAt }. */
export function getCid(addr, dictId) {
  return kv.get(cidKey(addr, dictId));
}

export function setCid(addr, dictId, rec) {
  kv.set(cidKey(addr, dictId), rec);
}

/* ------------------------------ quiz streak ------------------------------- */

const emptyStreak = () => ({ current: 0, longest: 0, lastDay: null });

/** Local YYYY-MM-DD for a Date (defaults to now). */
function dayStr(d = new Date()) {
  const z = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${z(d.getMonth() + 1)}-${z(d.getDate())}`;
}

/** The day before a YYYY-MM-DD string (DST-safe via the local Date constructor). */
function prevDay(today) {
  const [y, m, d] = today.split('-').map(Number);
  const date = new Date(y, m - 1, d);
  date.setDate(date.getDate() - 1);
  return dayStr(date);
}

/** Daily practice streak for a wallet: { current, longest, lastDay }. */
export function getStreak(addr) {
  return kv.get(streakKey(addr)) || emptyStreak();
}

/**
 * Record that the wallet practiced today. Same day → unchanged; the day after
 * `lastDay` → +1; any longer gap → reset to 1. Returns the updated streak.
 */
export function recordPractice(addr) {
  const s = getStreak(addr);
  const today = dayStr();
  if (s.lastDay === today) return s; // already counted today
  const current = s.lastDay === prevDay(today) ? (s.current || 0) + 1 : 1;
  const updated = { current, longest: Math.max(s.longest || 0, current), lastDay: today };
  kv.set(streakKey(addr), updated);
  return updated;
}
