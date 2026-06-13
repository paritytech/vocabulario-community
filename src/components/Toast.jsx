import { useEffect } from 'react';
import Icon from './Icon.jsx';

const ICON = { ok: 'check-circle-2', error: 'alert-circle', warn: 'alert-circle' };

/** Bottom-center toast with an accent check icon; auto-dismisses. */
export default function Toast({ toast, onClose }) {
  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(onClose, 2800);
    return () => clearTimeout(t);
  }, [toast, onClose]);

  if (!toast) return null;
  const type = toast.type || 'ok';
  return (
    <div className={`toast ${type}`} onClick={onClose} role="status">
      <Icon name={ICON[type] || 'check-circle-2'} size={18} />
      {toast.text}
    </div>
  );
}
