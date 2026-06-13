import { useState } from 'react';
import Icon from './Icon.jsx';

/**
 * A styled native <select> plus a "+" that reveals an inline input for adding a
 * new value. Mobile-friendly and compact. Used for Type / Topic on the Add form.
 */
export default function CompactPicker({
  value,
  options,
  onChange,
  allowEmpty = false,
  emptyLabel = '—',
  addLabel = 'new'
}) {
  const [adding, setAdding] = useState(false);
  const [draft, setDraft] = useState('');

  // keep a custom (previously-typed) value visible in the list
  const opts = value && !options.includes(value) ? [...options, value] : options;

  function commit() {
    const v = draft.trim();
    if (v) onChange(v);
    setDraft('');
    setAdding(false);
  }
  function cancel() {
    setDraft('');
    setAdding(false);
  }

  if (adding) {
    return (
      <div className="with-add">
        <input
          autoFocus
          className="input"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') { e.preventDefault(); commit(); }
            else if (e.key === 'Escape') { e.preventDefault(); cancel(); }
          }}
          placeholder={addLabel}
        />
        <div style={{ display: 'flex', gap: 6 }}>
          <button type="button" className="iconadd" onClick={commit} title="Add" style={{ width: 44 }}>
            <Icon name="check" size={17} />
          </button>
          <button type="button" className="iconadd" onClick={cancel} title="Cancel" style={{ width: 44 }}>
            <Icon name="x" size={17} />
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="with-add">
      <span className="select-wrap">
        <select className="select" value={value || ''} onChange={(e) => onChange(e.target.value)}>
          {allowEmpty && <option value="">{emptyLabel}</option>}
          {opts.map((o) => (
            <option key={o} value={o}>{o}</option>
          ))}
        </select>
        <span className="chev"><Icon name="chevron-down" size={16} /></span>
      </span>
      <button type="button" className="iconadd" onClick={() => setAdding(true)} title={`Add ${addLabel}`}>
        <Icon name="plus" size={17} />
      </button>
    </div>
  );
}
