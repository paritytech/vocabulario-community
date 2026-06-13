export const DEFAULT_TYPES = [
  'Noun',
  'Verb',
  'Adjective',
  'Adverb',
  'Pronoun',
  'Preposition',
  'Conjunction',
  'Question',
  'Phrase',
  'Other'
];

export const DEFAULT_TOPICS = [
  'No topic',
  'Time',
  'Body',
  'Restaurant',
  'Travel',
  'Clothes',
  'House',
  'Family',
  'Shopping',
  'People & animals',
  'Nature',
  'Food',
  'Places',
  'Conversation'
];

/**
 * Part-of-speech hues — the editorial palette from the design system. The pill
 * itself is rendered with `color-mix` (see `.pill-pos` in styles.css); we only
 * need a single base hue per type. Custom user types get a stable hue by hash so
 * they stay color-coded too.
 */
const HUE_CYCLE = [
  '#5fce86', // noun (green)
  '#5ea8f0', // verb (blue)
  '#c08cf2', // adjective (purple)
  '#e0a649', // adverb (amber)
  '#34cbb8', // phrase (teal)
  '#f0768f', // pronoun (pink-red)
  '#8b9bf0', // periwinkle
  '#f0a35e', // orange
  '#9bb06a', // olive
  '#cf9ad6'  // mauve
];

const KNOWN_HUE = {
  Noun:        '#5fce86',
  Verb:        '#5ea8f0',
  Adjective:   '#c08cf2',
  Adverb:      '#e0a649',
  Phrase:      '#34cbb8',
  Pronoun:     '#f0768f',
  Preposition: '#8b9bf0',
  Conjunction: '#9bb06a',
  Question:    '#f0a35e',
  Other:       '#a99e92'
};

/** Base hue (hex) for a part-of-speech type — drives the `.pill-pos` color-mix. */
export function hueFor(type) {
  if (KNOWN_HUE[type]) return KNOWN_HUE[type];
  let h = 0;
  for (const ch of String(type)) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  return HUE_CYCLE[h % HUE_CYCLE.length];
}

export function slug(s) {
  return String(s)
    .trim()
    .toLowerCase()
    .replace(/[¿?¡!.,;:'"`]/g, '')
    .replace(/[\s/]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .replace(/_+/g, '_');
}

export function uniqueSorted(list, ...prependDefaults) {
  const seen = new Set();
  const result = [];
  for (const arr of [...prependDefaults, list]) {
    for (const v of arr) {
      if (v && !seen.has(v)) {
        seen.add(v);
        result.push(v);
      }
    }
  }
  return result;
}
