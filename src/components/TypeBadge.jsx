import { hueFor } from '../labels.js';

/** Part-of-speech pill — editorial tinted chip, hue keyed to the type. */
export default function TypeBadge({ type }) {
  if (!type) return null;
  return (
    <span className="pill pill-pos" style={{ '--hue': hueFor(type) }}>
      {type}
    </span>
  );
}
