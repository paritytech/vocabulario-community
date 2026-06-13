import Icon from './Icon.jsx';

/**
 * Daily quiz streak — a flame + day count. Always shown (a dim "0" placeholder
 * before the first quiz) so the feature is discoverable; lights up once active.
 */
export default function StreakPill({ streak }) {
  const current = streak?.current || 0;
  const longest = streak?.longest || 0;
  const title =
    current > 0
      ? `Quiz done ${current} day${current > 1 ? 's' : ''} in a row` +
        (longest > current ? ` · best ${longest}` : '')
      : 'No quiz streak yet — do a quiz today to start one 🔥';
  return (
    <span className={`metapill streak ${current ? '' : 'streak-zero'}`} title={title}>
      <Icon name="flame" size={14} fill="currentColor" strokeWidth={1.4} /> <b>{current}</b>
    </span>
  );
}
