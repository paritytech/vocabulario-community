import { useEffect, useRef, useState } from 'react';
import Icon from './Icon.jsx';
import { short } from '../wallet.js';

/**
 * Sidebar account chip. In the Triangle host it's a read-only address pill; in
 * standalone dev it opens a popover to switch between local dev wallets (each an
 * isolated set of dictionaries) or create a new one.
 */
export default function AccountChip({ hosted, address, devAccounts, onSwitchAccount, onAddAccount }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  const active = devAccounts.find((a) => a.address === address);
  const avatar = (active?.label?.trim()?.[0] || address?.[1] || 'D').toUpperCase();

  useEffect(() => {
    if (!open) return;
    function onDoc(e) { if (ref.current && !ref.current.contains(e.target)) setOpen(false); }
    function onKey(e) { if (e.key === 'Escape') setOpen(false); }
    document.addEventListener('mousedown', onDoc);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDoc);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  if (hosted) {
    return (
      <span className="acct" title={address}>
        <span className="dot">{avatar}</span>
        <span className="acct-addr">{short(address)}</span>
      </span>
    );
  }

  return (
    <div className="dict-anchor" ref={ref} style={{ position: 'relative' }}>
      <button
        type="button"
        className="acct dashed"
        onClick={() => setOpen((v) => !v)}
        title="Dev wallet — each account keeps its own dictionaries"
      >
        <span className="dot">{avatar}</span>
        <span className="acct-addr">{active?.label || short(address)}</span>
        <span className="chev-r"><Icon name="chevron-right" size={15} /></span>
      </button>

      {open && (
        <div className="acctpop" role="menu">
          <div className="dictpop-cap">Dev accounts</div>
          {devAccounts.map((a) => (
            <button
              key={a.address}
              type="button"
              className={`dictpop-item ${a.address === address ? 'on' : ''}`}
              role="menuitem"
              onClick={() => { onSwitchAccount(a.address); setOpen(false); }}
            >
              <span className="dot" style={{ width: 22, height: 22, fontSize: 11 }}>{(a.label?.[0] || '?').toUpperCase()}</span>
              <span className="di-name">{a.label}</span>
              <span className="di-count">{short(a.address)}</span>
            </button>
          ))}
          <div className="dictpop-sep" />
          <button type="button" className="dictpop-new" onClick={() => { onAddAccount(''); setOpen(false); }}>
            <Icon name="plus" size={16} /> New account
          </button>
        </div>
      )}
    </div>
  );
}
