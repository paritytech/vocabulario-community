/**
 * Curated starter dictionaries — four small decks (Español, Deutsch, Français,
 * Italiano), all translating into English and built from the same concept list,
 * so they line up side by side.
 *
 * A fresh wallet is seeded with these on first load (see `store.maybeSeedDemo`)
 * so a first-time visitor lands on a playable app instead of an empty one. They
 * are ordinary dictionaries — rename them, quiz on them, or delete the ones you
 * don't want; a deleted demo dictionary is NOT re-seeded.
 *
 * Each row is a compact tuple: [term, english, type, topic, note].
 *   term    — the foreign word in dictionary form (bare noun / verb infinitive)
 *   english — comma-separated acceptable answers (the quiz accepts any of them)
 *   note    — a short hint; for nouns, the gender + definite article
 *
 * Inlined on purpose: the seed must work offline and instantly, with no network
 * or chain dependency. Generated and verified once via a translation workflow.
 */
import { slug } from './labels.js';

const SEED_TS = '2026-01-01T00:00:00.000Z';

const RAW = [
  ['Español', [
    ['hola', 'hello, hi', 'Phrase', 'Conversation', ''],
    ['gracias', 'thank you, thanks', 'Phrase', 'Conversation', ''],
    ['por favor', 'please', 'Phrase', 'Conversation', ''],
    ['adiós', 'goodbye, bye', 'Phrase', 'Conversation', ''],
    ['sí', 'yes', 'Other', 'Conversation', 'with accent; \'si\' without accent means \'if\''],
    ['no', 'no, not', 'Other', 'Conversation', ''],
    ['agua', 'water', 'Noun', 'Food', 'f · el; feminine but takes \'el agua\' in singular for euphony (las aguas)'],
    ['pan', 'bread', 'Noun', 'Food', 'm · el'],
    ['café', 'coffee', 'Noun', 'Food', 'm · el'],
    ['manzana', 'apple', 'Noun', 'Food', 'f · la'],
    ['vino', 'wine', 'Noun', 'Restaurant', 'm · el'],
    ['casa', 'house, home', 'Noun', 'House', 'f · la'],
    ['puerta', 'door', 'Noun', 'House', 'f · la'],
    ['mesa', 'table', 'Noun', 'House', 'f · la'],
    ['madre', 'mother, mom', 'Noun', 'Family', 'f · la'],
    ['padre', 'father, dad', 'Noun', 'Family', 'm · el'],
    ['amigo', 'friend', 'Noun', 'People & animals', 'm · el; feminine: amiga (la)'],
    ['perro', 'dog', 'Noun', 'People & animals', 'm · el; feminine: perra (la)'],
    ['gato', 'cat', 'Noun', 'People & animals', 'm · el; feminine: gata (la)'],
    ['ciudad', 'city, town', 'Noun', 'Places', 'f · la'],
    ['calle', 'street, road', 'Noun', 'Travel', 'f · la'],
    ['día', 'day', 'Noun', 'Time', 'm · el; masculine despite the -a ending'],
    ['noche', 'night', 'Noun', 'Time', 'f · la'],
    ['mano', 'hand', 'Noun', 'Body', 'f · la; feminine despite the -o ending'],
    ['sol', 'sun', 'Noun', 'Nature', 'm · el'],
    ['ser', 'to be, be', 'Verb', 'No topic', 'Spanish has two copulas: \'ser\' for permanent/essential traits and identity; \'estar\' for states/location'],
    ['tener', 'to have, have', 'Verb', 'No topic', 'possession; \'haber\' is the auxiliary \'to have\' for compound tenses'],
    ['comer', 'to eat, eat', 'Verb', 'Food', ''],
    ['beber', 'to drink, drink', 'Verb', 'Food', ''],
    ['ir', 'to go, go', 'Verb', 'Travel', ''],
    ['hablar', 'to speak, speak, to talk, talk', 'Verb', 'Conversation', ''],
    ['grande', 'big, large, great', 'Adjective', 'No topic', 'same form for m/f'],
    ['pequeño', 'small, little', 'Adjective', 'No topic', 'feminine: pequeña'],
    ['bueno', 'good', 'Adjective', 'No topic', 'feminine: buena; shortens to \'buen\' before a masculine singular noun'],
    ['y', 'and', 'Conjunction', 'No topic', 'becomes \'e\' before words starting with i-/hi- sound'],
    ['dónde', 'where', 'Question', 'Conversation', 'with accent in questions; \'donde\' without accent is the relative pronoun'],
  ]],
  ['Deutsch', [
    ['Hallo', 'hello, hi', 'Phrase', 'Conversation', 'everyday greeting; "Guten Tag" is more formal'],
    ['Danke', 'thank you, thanks', 'Phrase', 'Conversation', '"Danke schön" / "Vielen Dank" are fuller forms'],
    ['Bitte', 'please', 'Phrase', 'Conversation', 'also means "you\'re welcome"'],
    ['Auf Wiedersehen', 'goodbye, bye', 'Phrase', 'Conversation', 'casual: "Tschüss"'],
    ['Ja', 'yes', 'Other', 'Conversation', ''],
    ['Nein', 'no', 'Other', 'Conversation', ''],
    ['Wasser', 'water', 'Noun', 'Food', 'n · das'],
    ['Brot', 'bread', 'Noun', 'Food', 'n · das'],
    ['Kaffee', 'coffee', 'Noun', 'Food', 'm · der'],
    ['Apfel', 'apple', 'Noun', 'Food', 'm · der'],
    ['Wein', 'wine', 'Noun', 'Restaurant', 'm · der'],
    ['Haus', 'house', 'Noun', 'House', 'n · das'],
    ['Tür', 'door', 'Noun', 'House', 'f · die'],
    ['Tisch', 'table', 'Noun', 'House', 'm · der'],
    ['Mutter', 'mother, mom, mum', 'Noun', 'Family', 'f · die'],
    ['Vater', 'father, dad', 'Noun', 'Family', 'm · der'],
    ['Freund', 'friend', 'Noun', 'People & animals', 'm · der; female: die Freundin'],
    ['Hund', 'dog', 'Noun', 'People & animals', 'm · der'],
    ['Katze', 'cat', 'Noun', 'People & animals', 'f · die'],
    ['Stadt', 'city, town', 'Noun', 'Places', 'f · die'],
    ['Straße', 'street, road', 'Noun', 'Travel', 'f · die'],
    ['Tag', 'day', 'Noun', 'Time', 'm · der'],
    ['Nacht', 'night', 'Noun', 'Time', 'f · die'],
    ['Hand', 'hand', 'Noun', 'Body', 'f · die'],
    ['Sonne', 'sun', 'Noun', 'Nature', 'f · die'],
    ['sein', 'to be, be', 'Verb', 'No topic', 'German has one copula "sein"; irregular (ich bin, du bist, er ist)'],
    ['haben', 'to have, have', 'Verb', 'No topic', 'ich habe, du hast, er hat'],
    ['essen', 'to eat, eat', 'Verb', 'Food', 'ich esse, du isst, er isst'],
    ['trinken', 'to drink, drink', 'Verb', 'Food', 'ich trinke, du trinkst, er trinkt'],
    ['gehen', 'to go, go', 'Verb', 'Travel', 'go on foot; "fahren" for going by vehicle'],
    ['sprechen', 'to speak, speak, to talk, talk', 'Verb', 'Conversation', 'ich spreche, du sprichst, er spricht'],
    ['groß', 'big, large, tall', 'Adjective', 'No topic', ''],
    ['klein', 'small, little', 'Adjective', 'No topic', ''],
    ['gut', 'good, well', 'Adjective', 'No topic', ''],
    ['und', 'and', 'Conjunction', 'No topic', ''],
    ['wo', 'where', 'Question', 'Conversation', 'location; "wohin" = to where, "woher" = from where'],
  ]],
  ['Français', [
    ['bonjour', 'hello, good morning, good day', 'Phrase', 'Conversation', 'standard daytime greeting'],
    ['merci', 'thank you, thanks', 'Phrase', 'Conversation', ''],
    ['s\'il vous plaît', 'please', 'Phrase', 'Conversation', 'formal/plural; informal is s\'il te plaît'],
    ['au revoir', 'goodbye, bye', 'Phrase', 'Conversation', ''],
    ['oui', 'yes', 'Other', 'Conversation', ''],
    ['non', 'no', 'Other', 'Conversation', ''],
    ['eau', 'water', 'Noun', 'Food', 'f · la (l\'eau)'],
    ['pain', 'bread', 'Noun', 'Food', 'm · le'],
    ['café', 'coffee, cafe', 'Noun', 'Food', 'm · le'],
    ['pomme', 'apple', 'Noun', 'Food', 'f · la'],
    ['vin', 'wine', 'Noun', 'Restaurant', 'm · le'],
    ['maison', 'house, home', 'Noun', 'House', 'f · la'],
    ['porte', 'door', 'Noun', 'House', 'f · la'],
    ['table', 'table', 'Noun', 'House', 'f · la'],
    ['mère', 'mother, mom, mum', 'Noun', 'Family', 'f · la'],
    ['père', 'father, dad', 'Noun', 'Family', 'm · le'],
    ['ami', 'friend', 'Noun', 'People & animals', 'm · l\' (fem. amie, l\'amie)'],
    ['chien', 'dog', 'Noun', 'People & animals', 'm · le (fem. chienne)'],
    ['chat', 'cat', 'Noun', 'People & animals', 'm · le (fem. chatte)'],
    ['ville', 'city, town', 'Noun', 'Places', 'f · la'],
    ['rue', 'street', 'Noun', 'Travel', 'f · la'],
    ['jour', 'day', 'Noun', 'Time', 'm · le'],
    ['nuit', 'night', 'Noun', 'Time', 'f · la'],
    ['main', 'hand', 'Noun', 'Body', 'f · la'],
    ['soleil', 'sun', 'Noun', 'Nature', 'm · le'],
    ['être', 'to be, be', 'Verb', 'No topic', 'the single French copula; no ser/estar split, être covers both'],
    ['avoir', 'to have, have', 'Verb', 'No topic', ''],
    ['manger', 'to eat, eat', 'Verb', 'Food', ''],
    ['boire', 'to drink, drink', 'Verb', 'Food', ''],
    ['aller', 'to go, go', 'Verb', 'Travel', ''],
    ['parler', 'to speak, speak, to talk, talk', 'Verb', 'Conversation', ''],
    ['grand', 'big, large, tall', 'Adjective', 'No topic', 'fem. grande'],
    ['petit', 'small, little', 'Adjective', 'No topic', 'fem. petite'],
    ['bon', 'good', 'Adjective', 'No topic', 'fem. bonne'],
    ['et', 'and', 'Conjunction', 'No topic', ''],
    ['où', 'where', 'Question', 'Conversation', 'note the accent: où (where) vs ou (or)'],
  ]],
  ['Italiano', [
    ['ciao', 'hello, hi', 'Phrase', 'Conversation', 'informal greeting; \'salve\' is neutral, \'buongiorno\' is formal'],
    ['grazie', 'thank you, thanks', 'Phrase', 'Conversation', ''],
    ['per favore', 'please', 'Phrase', 'Conversation', 'also \'per piacere\' or \'per cortesia\''],
    ['arrivederci', 'goodbye, bye', 'Phrase', 'Conversation', 'neutral/polite; \'ciao\' is the informal bye'],
    ['sì', 'yes', 'Other', 'Conversation', 'with accent to distinguish from \'si\' (reflexive)'],
    ['no', 'no', 'Other', 'Conversation', ''],
    ['acqua', 'water', 'Noun', 'Food', 'f · l\' (la)'],
    ['pane', 'bread', 'Noun', 'Food', 'm · il'],
    ['caffè', 'coffee', 'Noun', 'Food', 'm · il'],
    ['mela', 'apple', 'Noun', 'Food', 'f · la'],
    ['vino', 'wine', 'Noun', 'Restaurant', 'm · il'],
    ['casa', 'house, home', 'Noun', 'House', 'f · la'],
    ['porta', 'door', 'Noun', 'House', 'f · la'],
    ['tavolo', 'table', 'Noun', 'House', 'm · il'],
    ['madre', 'mother, mom, mum', 'Noun', 'Family', 'f · la'],
    ['padre', 'father, dad', 'Noun', 'Family', 'm · il'],
    ['amico', 'friend', 'Noun', 'People & animals', 'm · l\' (lo); f form \'amica\' · l\' (la)'],
    ['cane', 'dog', 'Noun', 'People & animals', 'm · il'],
    ['gatto', 'cat', 'Noun', 'People & animals', 'm · il'],
    ['città', 'city, town', 'Noun', 'Places', 'f · la'],
    ['strada', 'street, road', 'Noun', 'Travel', 'f · la; \'via\' also common'],
    ['giorno', 'day', 'Noun', 'Time', 'm · il'],
    ['notte', 'night', 'Noun', 'Time', 'f · la'],
    ['mano', 'hand', 'Noun', 'Body', 'f · la (irregular: feminine despite -o ending)'],
    ['sole', 'sun', 'Noun', 'Nature', 'm · il'],
    ['essere', 'to be, be', 'Verb', 'No topic', 'everyday copula for identity/qualities; \'stare\' is used for states/location'],
    ['avere', 'to have, have', 'Verb', 'No topic', ''],
    ['mangiare', 'to eat, eat', 'Verb', 'Food', ''],
    ['bere', 'to drink, drink', 'Verb', 'Food', ''],
    ['andare', 'to go, go', 'Verb', 'Travel', ''],
    ['parlare', 'to speak, speak, to talk, talk', 'Verb', 'Conversation', ''],
    ['grande', 'big, large, great', 'Adjective', 'No topic', ''],
    ['piccolo', 'small, little', 'Adjective', 'No topic', ''],
    ['buono', 'good, tasty', 'Adjective', 'No topic', 'for food often means \'tasty/good\''],
    ['e', 'and', 'Conjunction', 'No topic', 'becomes \'ed\' before a vowel'],
    ['dove', 'where', 'Question', 'Conversation', ''],
  ]],
];

function toWord([term, english, type, topic, note]) {
  return {
    id: slug(term),
    spanish: term,
    serbian: english,
    type,
    topic,
    note: note || '',
    wrongCount: 0,
    createdAt: SEED_TS
  };
}

/** The seedable demo dictionaries: [{ name, record: { meta, words } }]. */
export const DEMO_DICTS = RAW.map(([name, rows]) => {
  const seen = new Set();
  const words = [];
  for (const row of rows) {
    const w = toWord(row);
    if (seen.has(w.id)) continue; // guard against slug collisions within a deck
    seen.add(w.id);
    words.push(w);
  }
  return { name, record: { meta: { lastLesson: null }, words } };
});
