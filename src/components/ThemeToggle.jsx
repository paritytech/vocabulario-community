import Icon from './Icon.jsx';

/** Dark/light switch: Lexikon (dark, moon) ↔ Papel (light, sun). */
export default function ThemeToggle({ theme, onChange }) {
  return (
    <div className="dirswitch" role="group" aria-label="Theme">
      <button
        type="button"
        className={theme === 'lexikon' ? 'on' : ''}
        onClick={() => onChange('lexikon')}
        aria-pressed={theme === 'lexikon'}
      >
        <Icon name="moon" size={14} /> Dark
      </button>
      <button
        type="button"
        className={theme === 'papel' ? 'on' : ''}
        onClick={() => onChange('papel')}
        aria-pressed={theme === 'papel'}
      >
        <Icon name="sun" size={14} /> Light
      </button>
    </div>
  );
}
