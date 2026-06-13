import Icon from './Icon.jsx';
import LogoMark from './LogoMark.jsx';
import DictSwitcher from './DictSwitcher.jsx';
import AccountChip from './AccountChip.jsx';
import ThemeToggle from './ThemeToggle.jsx';

export const NAV_ITEMS = [
  { id: 'add', label: 'Add', icon: 'plus' },
  { id: 'list', label: 'All words', icon: 'list' },
  { id: 'quiz', label: 'Quiz', icon: 'zap' },
  { id: 'sentence', label: 'Write', icon: 'pen-line' },
  { id: 'community', label: 'Community', icon: 'message-square-text' },
  { id: 'backup', label: 'Backup', icon: 'database' }
];

/** Left navigation rail: brand · dictionary switcher · sections · theme + account. */
export default function SideNav({
  tab, onTab, theme, onTheme,
  dicts, currentDictId, wordCount, onSelectDict, onCreateDict, onRenameDict, onDeleteDict,
  hosted, address, devAccounts, onSwitchAccount, onAddAccount
}) {
  return (
    <aside className="sidenav">
      <div className="brand">
        <LogoMark size={28} />
        <span className="brand-name">Vocabul<b>a</b>rio</span>
      </div>

      <DictSwitcher
        dicts={dicts}
        currentDictId={currentDictId}
        wordCount={wordCount}
        onSelect={onSelectDict}
        onCreate={onCreateDict}
        onRename={onRenameDict}
        onDelete={onDeleteDict}
      />

      <nav className="sidenav-list">
        {NAV_ITEMS.map((t) => (
          <button key={t.id} type="button" className={tab === t.id ? 'on' : ''} onClick={() => onTab(t.id)}>
            <Icon name={t.icon} size={17} /> {t.label}
          </button>
        ))}
      </nav>

      <div className="sidenav-foot">
        <ThemeToggle theme={theme} onChange={onTheme} />
        <AccountChip
          hosted={hosted}
          address={address}
          devAccounts={devAccounts}
          onSwitchAccount={onSwitchAccount}
          onAddAccount={onAddAccount}
        />
      </div>
    </aside>
  );
}
