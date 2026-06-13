/**
 * Data API.
 *
 * The four pages (AddWord, WordList, Quiz, Sentence) talk ONLY to the seven
 * word/meta functions below — their signatures are identical to the old
 * Express-backed version, so the UI is untouched. What changed is where the
 * data lives: instead of one shared `data/vocabulary.json` on a server, every
 * call is scoped to the connected wallet's currently-selected dictionary.
 *
 * The duplicate-slug check, wrongDelta accumulation and lastLesson
 * normalization that used to live in `server.js` are reimplemented here (they
 * are pure and tiny). Functions stay async so the future on-chain backend can
 * drop in without touching callers.
 */

import * as store from './store.js';
import * as wallet from './wallet.js';
import { slug } from './labels.js';
import { fetchDictionaryByCid, publishBytes } from './onchain/bulletin.js';

function err(message, status, payload) {
  const e = new Error(message);
  e.status = status;
  if (payload) e.payload = payload;
  return e;
}

/** Resolve the active { addr, dictId }, creating a default dict if needed. */
function ctx() {
  const addr = wallet.currentAddress();
  if (!addr) throw err('No wallet connected', 401);
  let dictId = store.getCurrentDictId(addr);
  if (!dictId) dictId = store.ensureDefault(addr);
  return { addr, dictId };
}

/* ------------------------------ words / meta ------------------------------ */

export async function fetchWords() {
  const { addr, dictId } = ctx();
  return store.readDict(addr, dictId).words;
}

export async function addWord({ spanish, serbian, type, topic, note }) {
  const { addr, dictId } = ctx();
  if (!spanish || !serbian || !type) {
    throw err('Word, translation and type are required', 400);
  }
  const id = slug(spanish);
  if (!id) throw err('The word cannot be only special characters', 400);

  const data = store.readDict(addr, dictId);
  const existing = data.words.find((w) => w.id === id);
  if (existing) throw err('Word already exists', 409, { error: 'Word already exists', existing });

  const word = {
    id,
    spanish: spanish.trim(),
    serbian: serbian.trim(),
    type: type.trim(),
    topic: (topic || 'No topic').trim(),
    note: note ? note.trim() : '',
    wrongCount: 0,
    createdAt: new Date().toISOString()
  };
  data.words.push(word);
  store.writeDict(addr, dictId, data);
  return word;
}

export async function updateWord(id, patch) {
  const { addr, dictId } = ctx();
  const data = store.readDict(addr, dictId);
  const word = data.words.find((w) => w.id === id);
  if (!word) throw err('Not found', 404);

  const { spanish, serbian, type, topic, note, wrongCount, wrongDelta } = patch ?? {};
  if (spanish !== undefined) {
    const newId = slug(spanish);
    if (!newId) throw err('The word is not valid', 400);
    if (newId !== word.id && data.words.some((w) => w.id === newId)) {
      throw err('Another word already uses that name', 409);
    }
    word.spanish = spanish.trim();
    word.id = newId;
  }
  if (serbian !== undefined) word.serbian = serbian.trim();
  if (type !== undefined) word.type = type.trim();
  if (topic !== undefined) word.topic = topic.trim();
  if (note !== undefined) word.note = note.trim();
  if (typeof wrongCount === 'number') word.wrongCount = Math.max(0, wrongCount);
  if (typeof wrongDelta === 'number') {
    word.wrongCount = Math.max(0, (word.wrongCount || 0) + wrongDelta);
  }
  store.writeDict(addr, dictId, data);
  return word;
}

export async function bumpWrong(id, delta) {
  return updateWord(id, { wrongDelta: delta });
}

export async function deleteWord(id) {
  const { addr, dictId } = ctx();
  const data = store.readDict(addr, dictId);
  const before = data.words.length;
  data.words = data.words.filter((w) => w.id !== id);
  if (data.words.length === before) throw err('Not found', 404);
  store.writeDict(addr, dictId, data);
  return { ok: true };
}

export async function fetchMeta() {
  const { addr, dictId } = ctx();
  return store.readDict(addr, dictId).meta;
}

export async function updateMeta(patch) {
  const { addr, dictId } = ctx();
  const data = store.readDict(addr, dictId);
  const { lastLesson } = patch ?? {};
  if (lastLesson !== undefined) {
    data.meta.lastLesson =
      lastLesson === null || lastLesson === '' ? null : String(lastLesson).trim();
  }
  store.writeDict(addr, dictId, data);
  return data.meta;
}

/* -------------------------------- streak ---------------------------------- */

/** The wallet's daily practice streak: { current, longest, lastDay }. */
export async function fetchStreak() {
  const addr = wallet.currentAddress();
  return addr ? store.getStreak(addr) : { current: 0, longest: 0, lastDay: null };
}

/** Mark today as practiced (call when a quiz is completed). Returns the streak. */
export async function recordQuizCompleted() {
  const addr = wallet.currentAddress();
  if (!addr) throw err('No wallet connected', 401);
  return store.recordPractice(addr);
}

/* --------------------------- dictionary management ------------------------ */

/** Boot the wallet and guarantee a default dictionary. Call once on app load. */
export async function ensureReady() {
  await wallet.initWallet();
  const addr = wallet.currentAddress();
  store.maybeSeedDemo(addr); // first-time wallets get the curated demo dictionaries
  store.ensureDefault(addr);
  return { address: addr, dictId: store.getCurrentDictId(addr) };
}

export async function listDictionaries() {
  return store.listDicts(wallet.currentAddress());
}

export async function getCurrentDictionaryId() {
  return store.getCurrentDictId(wallet.currentAddress());
}

export async function selectDictionary(dictId) {
  store.setCurrentDictId(wallet.currentAddress(), dictId);
  return dictId;
}

export async function createDictionary(name) {
  const addr = wallet.currentAddress();
  const entry = store.createDict(addr, name);
  store.setCurrentDictId(addr, entry.dictId);
  return entry;
}

export async function renameDictionary(dictId, name) {
  return store.renameDict(wallet.currentAddress(), dictId, name);
}

export async function deleteDictionary(dictId) {
  const addr = wallet.currentAddress();
  store.deleteDict(addr, dictId);
  store.ensureDefault(addr); // a wallet always has at least one dictionary
  return store.getCurrentDictId(addr);
}

/* --------------------------------- backup --------------------------------- */

/** The current dictionary as a portable, re-importable object. */
export async function exportCurrentDictionary() {
  const { addr, dictId } = ctx();
  const data = store.readDict(addr, dictId);
  let entry = store.listDicts(addr).find((d) => d.dictId === dictId);
  // Ensure a stable shared identity exists (backfill for dictionaries created
  // before shareId) so a re-retrieve can update the same dictionary in place.
  if (entry && !entry.shareId) {
    entry = store.tagDict(addr, dictId, { shareId: store.genShareId() }) || entry;
  }
  return {
    vocabulario: 1,
    name: entry?.name || 'Vocabulario',
    shareId: entry?.shareId || null,
    exportedAt: new Date().toISOString(),
    meta: data.meta,
    words: data.words
  };
}

function normalizeWord(w) {
  const spanish = (w.spanish ?? '').toString();
  const id = w.id || slug(spanish);
  if (!id) return null;
  return {
    id,
    spanish: spanish.trim(),
    serbian: (w.serbian ?? '').toString().trim(),
    type: (w.type || 'Other').toString().trim(),
    topic: (w.topic || 'No topic').toString().trim(),
    note: (w.note ?? '').toString().trim(),
    wrongCount: Number(w.wrongCount) || 0,
    createdAt: w.createdAt || new Date().toISOString()
  };
}

/**
 * Parse a backup file's text into a normalized { name, meta, words }. Lenient —
 * accepts our export shape, the legacy { meta, words }, or a bare words array.
 */
export function parseBackup(text) {
  const raw = JSON.parse(text);
  const wordsRaw = Array.isArray(raw) ? raw : raw.words;
  if (!Array.isArray(wordsRaw)) throw new Error('no "words" array found');
  const words = wordsRaw.map(normalizeWord).filter(Boolean);
  if (words.length === 0) throw new Error('no valid words');
  const name = (!Array.isArray(raw) && raw.name) || 'Imported';
  // `shareId` is the opaque shared-lineage id; accept the older `sourceId` alias.
  const shareId = (!Array.isArray(raw) && (raw.shareId || raw.sourceId)) || null;
  const lastLesson = (!Array.isArray(raw) && raw.meta && raw.meta.lastLesson) || null;
  return { name, shareId, meta: { lastLesson }, words };
}

/** Import a parsed backup as a NEW dictionary (never clobbers existing data). */
export async function importDictionary(parsed) {
  const addr = wallet.currentAddress();
  const entry = store.createDict(addr, parsed.name || 'Imported');
  store.writeDict(addr, entry.dictId, {
    meta: parsed.meta || { lastLesson: null },
    words: parsed.words || []
  });
  // Adopt the publisher's shareId so a later retrieve of a newer snapshot updates
  // THIS copy in place, and a re-publish keeps the same lineage downstream.
  if (parsed.shareId) store.tagDict(addr, entry.dictId, { shareId: parsed.shareId });
  store.setCurrentDictId(addr, entry.dictId);
  return entry;
}

/* -------------------------------- Bulletin -------------------------------- */

/** Publish the current dictionary to Bulletin; persist + return the pointer. */
export async function publishCurrentDictionary() {
  const { addr, dictId } = ctx();
  const data = await exportCurrentDictionary();
  const bytes = new TextEncoder().encode(JSON.stringify(data));
  const res = await publishBytes(bytes);
  const rec = {
    cid: res.cid,
    blockHash: res.blockHash || null,
    gatewayUrl: res.gatewayUrl,
    publishedAt: new Date().toISOString(),
    words: data.words.length,
    // carried for the on-chain discovery announcement (see Backup → announceDictionary)
    shareId: data.shareId || null,
    name: data.name || null
  };
  store.setCid(addr, dictId, rec);
  return rec;
}

/** The last Bulletin publish record for the current dictionary (or null). */
export async function getPublishedCid() {
  const { addr, dictId } = ctx();
  return store.getCid(addr, dictId);
}

/**
 * Retrieve a dictionary from Bulletin by CID. If the wallet already has this shared
 * dictionary (matched by its opaque `shareId`), its content is updated in place —
 * keeping the retriever's own progress (per-word wrongCount + lesson) — so a newer
 * CID just pulls "the latest version" instead of piling up duplicates. Otherwise it
 * imports as a new dictionary.
 */
export async function retrieveDictionary(cid) {
  const addr = wallet.currentAddress();
  if (!addr) throw err('No wallet connected', 401);
  const json = await fetchDictionaryByCid(cid);
  const parsed = parseBackup(JSON.stringify(json));

  // Same shared dictionary already here? Match ONLY on the opaque shareId — never
  // on name, which can collide between unrelated dictionaries.
  const existing = parsed.shareId
    ? store.listDicts(addr).find((d) => d.shareId === parsed.shareId)
    : null;

  if (existing) {
    // Replace the shared CONTENT but keep the retriever's own learning progress:
    // per-word wrongCount and their lesson position are local, not shared.
    const cur = store.readDict(addr, existing.dictId);
    const prevWrong = new Map(cur.words.map((w) => [w.id, w.wrongCount || 0]));
    const words = parsed.words.map((w) =>
      prevWrong.has(w.id) ? { ...w, wrongCount: prevWrong.get(w.id) } : w
    );
    store.writeDict(addr, existing.dictId, {
      meta: { lastLesson: cur.meta?.lastLesson ?? parsed.meta?.lastLesson ?? null },
      words
    });
    store.setCurrentDictId(addr, existing.dictId);
    return { entry: existing, count: words.length, updated: true };
  }

  const entry = await importDictionary(parsed);
  return { entry, count: parsed.words.length, updated: false };
}
