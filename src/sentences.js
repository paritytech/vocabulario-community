/**
 * Sentences facade — the thin layer the Sentence page talks to. It fills in the
 * author, source language, id and timestamp, then delegates to the Statement
 * Store engine (onchain/statements.js). Keeps api.js (dictionary/word data)
 * untouched, since the board is a separate, on-chain-only concern.
 *
 * `author` is a self-reported display label: the host signs every statement with
 * its own root key, so the author shown on a card is informational, not a
 * cryptographic identity.
 */

import * as board from './onchain/statements.js';
import * as wallet from './wallet.js';

export const boardEnabled = board.boardEnabled;
export const subscribeSentences = board.subscribeSentences;
export const subscribeCorrections = board.subscribeCorrections;
export const subscribeDictionaries = board.subscribeDictionaries;

/** CEFR proficiency levels — the sentence "level" tag + filter. */
export const LEVELS = ['A1', 'A2', 'B1', 'B2', 'C1', 'C2'];

function genId() {
  const rand = Math.random().toString(36).slice(2, 8);
  return `${Date.now().toString(36)}${rand}`;
}

let _author = null;

/** Best-effort display name: the host DotNS username if granted, else a short
 *  local address. Never prompts blockingly — a denial just falls back. */
async function resolveAuthor() {
  if (_author) return _author;
  try {
    const { accounts } = await import('@novasamatech/host-api-wrapper');
    const name = await accounts.getUserId().match(
      (v) => (v && v.primaryUsername) || null,
      () => null
    );
    if (name) {
      _author = name;
      return name;
    }
  } catch {
    /* not hosted / no session — fall through */
  }
  const addr = wallet.currentAddress();
  return addr ? wallet.short(addr) : 'anon';
}

/** Publish a sentence (in the current dictionary's language, at a CEFR level). */
export async function publishSentence(text, lang, level) {
  const t = (text || '').trim();
  if (!t) throw new Error('Write a sentence first.');
  const author = await resolveAuthor();
  await board.publishSentence({
    id: genId(),
    text: t,
    lang: lang || '',
    level: level || '',
    author,
    ts: Date.now()
  });
}

/** Announce a published dictionary so others can search/retrieve it. Best-effort. */
export async function announceDictionary({ shareId, name, lang, cid, words }) {
  if (!shareId || !cid) return;
  const author = await resolveAuthor();
  await board.publishDictAnnounce({
    shareId,
    name: name || 'Dictionary',
    lang: lang || '',
    cid,
    words: Number(words) || 0,
    author,
    ts: Date.now()
  });
}

/** Publish a correction (suggested rewrite + optional note) under a sentence. */
export async function publishCorrection(sentenceId, fix, note) {
  const f = (fix || '').trim();
  if (!f) throw new Error('Enter the corrected sentence.');
  const author = await resolveAuthor();
  await board.publishCorrection({
    id: genId(),
    sid: sentenceId,
    fix: f,
    note: (note || '').trim(),
    author,
    ts: Date.now()
  });
}
