import { useState } from 'react';
import Icon from './Icon.jsx';

/** Editable "lesson N" metapill shown in the topbar. Click to edit inline. */
export default function LessonPill({ lastLesson, onChange }) {
  const [editing, setEditing] = useState(false);
  const [val, setVal] = useState(lastLesson ?? '');

  function start() {
    setVal(lastLesson ?? '');
    setEditing(true);
  }
  async function save() {
    await onChange(val.trim() === '' ? null : val.trim());
    setEditing(false);
  }

  if (editing) {
    return (
      <span className="metapill editing">
        <span>lesson</span>
        <input
          autoFocus
          className="lesson-input"
          value={val}
          onChange={(e) => setVal(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') save();
            if (e.key === 'Escape') setEditing(false);
          }}
          placeholder="27"
        />
        <button type="button" className="iconbtn ok sm" onClick={save} title="Save"><Icon name="check" size={14} /></button>
        <button type="button" className="iconbtn sm" onClick={() => setEditing(false)} title="Cancel"><Icon name="x" size={14} /></button>
      </span>
    );
  }

  return (
    <button type="button" className="metapill lesson" onClick={start} title="Set the lesson">
      lesson <b>{lastLesson ?? '—'}</b>
      <span className="ed"><Icon name="pencil" size={13} /></span>
    </button>
  );
}
