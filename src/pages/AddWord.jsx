import { useMemo, useState } from 'react';
import { addWord, updateWord, deleteWord } from '../api.js';
import { slug } from '../labels.js';
import TypeBadge from '../components/TypeBadge.jsx';
import TopicPill from '../components/TopicPill.jsx';
import CompactPicker from '../components/CompactPicker.jsx';
import Icon from '../components/Icon.jsx';

const NO_TOPIC = 'No topic';

export default function AddWord({ words, types, topics, onAdded, onToast }) {
  const [spanish, setSpanish] = useState('');
  const [serbian, setSerbian] = useState('');
  const [type, setType] = useState('Noun');
  const [topic, setTopic] = useState('');
  const [note, setNote] = useState('');
  const [message, setMessage] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [editDraft, setEditDraft] = useState(null);
  const [savingEdit, setSavingEdit] = useState(false);
  const [confirmDeleteId, setConfirmDeleteId] = useState(null);

  const topicOptions = useMemo(() => topics.filter((t) => t !== NO_TOPIC), [topics]);

  const existing = useMemo(() => {
    const s = slug(spanish);
    if (!s) return null;
    return words.find((w) => w.id === s) || null;
  }, [spanish, words]);

  const recent = useMemo(() => {
    return [...words]
      .sort((a, b) => String(b.createdAt || '').localeCompare(String(a.createdAt || '')))
      .slice(0, 3);
  }, [words]);

  async function handleSubmit(e) {
    e.preventDefault();
    if (existing) {
      setMessage({ type: 'warn', text: `"${existing.spanish}" already exists — ${existing.serbian}` });
      return;
    }
    if (!spanish.trim() || !serbian.trim() || !type.trim()) {
      setMessage({ type: 'error', text: 'Fill in the word, translation and type.' });
      return;
    }
    try {
      setSubmitting(true);
      await addWord({
        spanish: spanish.trim(),
        serbian: serbian.trim(),
        type: type.trim(),
        topic: topic.trim(),
        note: note.trim()
      });
      onToast?.(`Added: ${spanish.trim()} → ${serbian.trim()}`, 'ok');
      setMessage(null);
      setSpanish('');
      setSerbian('');
      setNote('');
      onAdded();
    } catch (err) {
      setMessage({ type: 'error', text: err.message });
    } finally {
      setSubmitting(false);
    }
  }

  function startEdit(w) {
    setEditingId(w.id);
    setEditDraft({ spanish: w.spanish, serbian: w.serbian, type: w.type, topic: w.topic, note: w.note || '' });
  }
  function cancelEdit() {
    setEditingId(null);
    setEditDraft(null);
  }

  async function saveEdit(id) {
    if (!editDraft) return;
    if (!editDraft.spanish.trim() || !editDraft.serbian.trim() || !editDraft.type.trim()) {
      onToast?.('Word, translation and type are required.', 'error');
      return;
    }
    try {
      setSavingEdit(true);
      await updateWord(id, editDraft);
      onToast?.(`Saved: ${editDraft.spanish}`, 'ok');
      setEditingId(null);
      setEditDraft(null);
      onAdded();
    } catch (err) {
      onToast?.(err.message, 'error');
    } finally {
      setSavingEdit(false);
    }
  }

  async function handleDelete(id, sp) {
    try {
      await deleteWord(id);
      setConfirmDeleteId(null);
      onToast?.(`Deleted: ${sp}`, 'ok');
      onAdded();
    } catch (err) {
      onToast?.(err.message, 'error');
    }
  }

  return (
    <div className="fade-in">
      <form className="card card-pad-lg" onSubmit={handleSubmit}>
        <div className="grid-2">
          <div className="field">
            <label className="flabel">Word</label>
            <input
              autoFocus
              className={`input ${existing ? 'invalid' : ''}`}
              value={spanish}
              onChange={(e) => setSpanish(e.target.value)}
              placeholder="e.g. hablar"
              autoComplete="off"
              spellCheck="false"
            />
          </div>
          <div className="field">
            <label className="flabel">Translation</label>
            <input
              className="input"
              value={serbian}
              onChange={(e) => setSerbian(e.target.value)}
              placeholder="e.g. to speak, talk"
              disabled={!!existing}
            />
            <div className="fhint">Separate multiple translations with a comma.</div>
          </div>
        </div>

        {existing && (
          <div className="banner banner-warn banner-loud" style={{ marginTop: 18 }}>
            <div className="banner-loud-title">⚠ You already have this word</div>
            <div className="banner-loud-detail">
              <strong>{existing.spanish}</strong> → {existing.serbian} <TypeBadge type={existing.type} />{' '}
              <TopicPill topic={existing.topic} />
            </div>
          </div>
        )}

        <div className="grid-2" style={{ marginTop: 8 }}>
          <div className="field">
            <label className="flabel">Type</label>
            <CompactPicker value={type} options={types} onChange={setType} addLabel="new type" />
          </div>
          <div className="field">
            <label className="flabel">Topic<span className="opt"> · optional</span></label>
            <CompactPicker
              value={topic}
              options={topicOptions}
              onChange={setTopic}
              allowEmpty
              emptyLabel="No topic"
              addLabel="new topic"
            />
          </div>
        </div>

        <div className="field" style={{ marginTop: 8 }}>
          <label className="flabel">Note<span className="opt"> · optional</span></label>
          <input
            className="input"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder='e.g. "celestial body" for luna'
          />
        </div>

        <button
          type="submit"
          className="btn btn-primary btn-block btn-lg"
          disabled={submitting || !!existing}
          style={{ marginTop: 24 }}
        >
          <Icon name="plus" size={18} /> {submitting ? 'Adding…' : 'Add word'}
        </button>

        {message && <div className={`banner banner-${message.type}`}>{message.text}</div>}
      </form>

      {recent.length > 0 && (
        <div style={{ marginTop: 34 }}>
          <div className="section-label">
            <span className="eyebrow">Recently added</span>
            <span className="group-rule" />
          </div>
          <div className="card" style={{ paddingTop: 8, paddingBottom: 8 }}>
            <div className="rows">
              {recent.map((w) =>
                editingId === w.id ? (
                  <div key={w.id} className="wrow-edit">
                    <div className="edit-grid">
                      <div className="field">
                        <label className="flabel">Word</label>
                        <input
                          autoFocus
                          className="input"
                          value={editDraft.spanish}
                          onChange={(e) => setEditDraft({ ...editDraft, spanish: e.target.value })}
                        />
                      </div>
                      <div className="field">
                        <label className="flabel">Translation</label>
                        <input
                          className="input"
                          value={editDraft.serbian}
                          onChange={(e) => setEditDraft({ ...editDraft, serbian: e.target.value })}
                        />
                      </div>
                      <div className="field">
                        <label className="flabel">Type</label>
                        <select
                          className="select"
                          value={editDraft.type}
                          onChange={(e) => setEditDraft({ ...editDraft, type: e.target.value })}
                        >
                          {types.map((t) => (
                            <option key={t} value={t}>{t}</option>
                          ))}
                          {editDraft.type && !types.includes(editDraft.type) && (
                            <option value={editDraft.type}>{editDraft.type}</option>
                          )}
                        </select>
                      </div>
                      <div className="field">
                        <label className="flabel">Topic</label>
                        <select
                          className="select"
                          value={editDraft.topic}
                          onChange={(e) => setEditDraft({ ...editDraft, topic: e.target.value })}
                        >
                          {topics.map((t) => (
                            <option key={t} value={t}>{t}</option>
                          ))}
                          {editDraft.topic && !topics.includes(editDraft.topic) && (
                            <option value={editDraft.topic}>{editDraft.topic}</option>
                          )}
                        </select>
                      </div>
                      <div className="field field-wide">
                        <label className="flabel">Note</label>
                        <input
                          className="input"
                          value={editDraft.note}
                          onChange={(e) => setEditDraft({ ...editDraft, note: e.target.value })}
                          placeholder="optional"
                        />
                      </div>
                      <div className="edit-actions">
                        <button
                          type="button"
                          className="btn btn-primary"
                          onClick={() => saveEdit(w.id)}
                          disabled={savingEdit}
                        >
                          {savingEdit ? 'Saving…' : 'Save'}
                        </button>
                        <button type="button" className="btn btn-ghost" onClick={cancelEdit} disabled={savingEdit}>
                          cancel
                        </button>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div key={w.id} className="wrow">
                    <div className="term">
                      {w.spanish}
                      {w.note && <span className="note-inline"> · {w.note}</span>}
                    </div>
                    <div className="trans">
                      <span className="arr"><Icon name="arrow-right" size={15} /></span>
                      <span>{w.serbian}</span>
                    </div>
                    <div className="meta">
                      <TypeBadge type={w.type} />
                      <TopicPill topic={w.topic} />
                      <span className="acts">
                        {confirmDeleteId === w.id ? (
                          <span className="confirm-inline">
                            <button
                              type="button"
                              className="btn-danger-sm"
                              onClick={() => handleDelete(w.id, w.spanish)}
                            >
                              Delete
                            </button>
                            <button
                              type="button"
                              className="btn-ghost link-btn"
                              onClick={() => setConfirmDeleteId(null)}
                            >
                              cancel
                            </button>
                          </span>
                        ) : (
                          <>
                            <button
                              type="button"
                              className="iconbtn accent"
                              onClick={() => startEdit(w)}
                              title="Edit"
                            >
                              <Icon name="pencil" size={15} />
                            </button>
                            <button
                              type="button"
                              className="iconbtn danger"
                              onClick={() => setConfirmDeleteId(w.id)}
                              title="Delete"
                            >
                              <Icon name="trash-2" size={15} />
                            </button>
                          </>
                        )}
                      </span>
                    </div>
                  </div>
                )
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
