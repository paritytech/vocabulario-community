/**
 * Starter dictionary — the original 683-word Spanish set (data/vocabulary.json).
 * It seeds a fresh wallet once on first load so existing data isn't lost.
 *
 * The old data used Serbian type/topic labels; we map them to the app's English
 * taxonomy so everything stays consistent. The translation text itself (the
 * `serbian` field) is the user's content and is kept as-is.
 */

import raw from '../data/vocabulary.json';

export const STARTER_NAME = 'Español';

const TYPE_MAP = {
  Glagol: 'Verb',
  Imenica: 'Noun',
  Prilog: 'Adverb',
  Pridev: 'Adjective',
  Fraza: 'Phrase',
  Veznik: 'Conjunction',
  Predlog: 'Preposition',
  Zamenica: 'Pronoun',
  Pitanje: 'Question'
};

const TOPIC_MAP = {
  'Bez teme': 'No topic',
  Hrana: 'Food',
  Putovanje: 'Travel',
  Priroda: 'Nature',
  Porodica: 'Family',
  Kupovina: 'Shopping',
  Vreme: 'Time',
  Telo: 'Body',
  'Ljudi i životinje': 'People & animals',
  Kuća: 'House',
  Mesta: 'Places',
  Odeća: 'Clothes',
  Konverzacija: 'Conversation',
  Restoran: 'Restaurant',
  Osecanja: 'Feelings'
};

/** The starter dictionary as a { meta, words } record, ready to write. */
export function starterDict() {
  const words = (raw.words || []).map((w) => ({
    id: w.id,
    spanish: w.spanish,
    serbian: w.serbian,
    type: TYPE_MAP[w.type] || w.type,
    topic: TOPIC_MAP[w.topic] || w.topic || 'No topic',
    note: w.note || '',
    wrongCount: w.wrongCount || 0,
    createdAt: w.createdAt || '2026-05-20T19:30:00.000Z'
  }));
  return { meta: { lastLesson: raw.meta?.lastLesson ?? null }, words };
}
