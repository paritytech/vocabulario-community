import { useEffect, useRef, useState } from 'react';
import Icon from './Icon.jsx';

/**
 * Sidebar dictionary switcher: a flag-chip button that opens a popover for
 * selecting, creating, renaming and deleting dictionaries. Replaces the old
 * top-bar DictionaryBar while preserving all of its CRUD — all prompts inline
 * (no native window.prompt/confirm, which embedded webviews block).
 */
function initials(name) {
  const parts = String(name || '').trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '··';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[1][0]).toUpperCase();
}

export default function DictSwitcher({ dicts, currentDictId, wordCount, onSelect, onCreate, onRename, onDelete }) {
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState('idle');   // idle | create | rename
  const [renameId, setRenameId] = useState(null);
  const [name, setName] = useState('');
  const [confirmDeleteId, setConfirmDeleteId] = useState(null);
  const ref = useRef(null);

  const current = dicts.find((d) => d.dictId === currentDictId);

  useEffect(() => {
    if (!open) return;
    function onDoc(e) {
      if (ref.current && !ref.current.contains(e.target)) close();
    }
    function onKey(e) {
      if (e.key === 'Escape') (mode === 'idle' ? close() : resetEdit());
    }
    document.addEventListener('mousedown', onDoc);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDoc);
      document.removeEventListener('keydown', onKey);
    };
  }, [open, mode]);

  function close() {
    setOpen(false);
    resetEdit();
    setConfirmDeleteId(null);
  }
  function resetEdit() {
    setMode('idle');
    setRenameId(null);
    setName('');
  }

  function startCreate() {
    setConfirmDeleteId(null);
    setName('');
    setMode('create');
  }
  function startRename(d) {
    setConfirmDeleteId(null);
    setRenameId(d.dictId);
    setName(d.name);
    setMode('rename');
  }
  function commit() {
    const v = name.trim();
    if (!v) return resetEdit();
    if (mode === 'create') onCreate(v);
    else if (mode === 'rename' && renameId) onRename(renameId, v);
    resetEdit();
  }
  function onEditKey(e) {
    if (e.key === 'Enter') { e.preventDefault(); commit(); }
    else if (e.key === 'Escape') { e.preventDefault(); resetEdit(); }
  }

  return (
    <div className="dict-anchor" ref={ref}>
      <button type="button" className="side-dict" onClick={() => (open ? close() : setOpen(true))} title="Switch dictionary">
        <span className="flag">{initials(current?.name)}</span>
        <span className="sd-name">{current?.name || 'Dictionary'}</span>
        <span className="mono sd-count">{wordCount}</span>
        <span className="chev-ud"><Icon name="chevrons-up-down" size={15} /></span>
      </button>

      {open && (
        <div className="dictpop" role="menu">
          {mode === 'rename' || mode === 'create' ? (
            <div className="dictpop-edit">
              <Icon name="book" size={15} />
              <input
                autoFocus
                className="input"
                value={name}
                onChange={(e) => setName(e.target.value)}
                onKeyDown={onEditKey}
                placeholder={mode === 'create' ? 'New dictionary name…' : 'Rename dictionary…'}
              />
              <button type="button" className="iconbtn ok sm" onClick={commit} title="Save"><Icon name="check" size={15} /></button>
              <button type="button" className="iconbtn sm" onClick={resetEdit} title="Cancel"><Icon name="x" size={15} /></button>
            </div>
          ) : (
            <>
              <div className="dictpop-cap">Dictionaries</div>
              {dicts.map((d) => (
                <div
                  key={d.dictId}
                  className={`dictpop-item ${d.dictId === currentDictId ? 'on' : ''}`}
                  role="menuitem"
                  onClick={() => { onSelect(d.dictId); close(); }}
                >
                  <span className="flag">{initials(d.name)}</span>
                  <span className="di-name">{d.name}</span>
                  {confirmDeleteId === d.dictId ? (
                    <span className="confirm-inline" onClick={(e) => e.stopPropagation()}>
                      <button type="button" className="btn-danger-sm" onClick={() => { onDelete(d.dictId); setConfirmDeleteId(null); }}>Delete</button>
                      <button type="button" className="iconbtn sm" onClick={() => setConfirmDeleteId(null)} title="Cancel"><Icon name="x" size={14} /></button>
                    </span>
                  ) : (
                    <span className="di-acts" onClick={(e) => e.stopPropagation()}>
                      <button type="button" className="iconbtn accent sm" onClick={() => startRename(d)} title="Rename"><Icon name="pencil" size={14} /></button>
                      {dicts.length > 1 && (
                        <button type="button" className="iconbtn danger sm" onClick={() => setConfirmDeleteId(d.dictId)} title="Delete"><Icon name="trash-2" size={14} /></button>
                      )}
                    </span>
                  )}
                </div>
              ))}
              <div className="dictpop-sep" />
              <button type="button" className="dictpop-new" onClick={startCreate}>
                <Icon name="plus" size={16} /> New dictionary
              </button>
            </>
          )}
        </div>
      )}
    </div>
  );
}
