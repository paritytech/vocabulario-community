import { useMemo, useState } from 'react';
import { deleteWord, updateWord } from '../api.js';
import TypeBadge from '../components/TypeBadge.jsx';
import TopicPill from '../components/TopicPill.jsx';
import Select from '../components/Select.jsx';
import Icon from '../components/Icon.jsx';

const NO_TOPIC = 'No topic';

export default function WordList({ words, types, topics, onChanged, onToast }) {
  const [search, setSearch] = useState('');
  const [filterType, setFilterType] = useState('');
  const [filterTopic, setFilterTopic] = useState('');
  const [sort, setSort] = useState('alpha');
  const [errorsOnly, setErrorsOnly] = useState(false);
  const [groupBy, setGroupBy] = useState('none');
  const [editingId, setEditingId] = useState(null);
  const [draft, setDraft] = useState(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState(null);

  const errorsCount = useMemo(
    () => words.filter((w) => (w.wrongCount || 0) > 0).length,
    [words]
  );

  const filtered = useMemo(() => {
    let r = words;
    if (errorsOnly) r = r.filter((w) => (w.wrongCount || 0) > 0);
    if (filterType) r = r.filter((w) => w.type === filterType);
    if (filterTopic) r = r.filter((w) => w.topic === filterTopic);
    if (search.trim()) {
      const s = search.toLowerCase().trim();
      r = r.filter(
        (w) =>
          w.spanish.toLowerCase().includes(s) ||
          w.serbian.toLowerCase().includes(s) ||
          (w.note || '').toLowerCase().includes(s)
      );
    }
    if (sort === 'newest') {
      r = [...r].sort((a, b) =>
        String(b.createdAt || '').localeCompare(String(a.createdAt || ''))
      );
    } else if (sort === 'hardest') {
      r = [...r].sort(
        (a, b) =>
          (b.wrongCount || 0) - (a.wrongCount || 0) ||
          a.spanish.localeCompare(b.spanish, 'es')
      );
    } else {
      r = [...r].sort((a, b) => a.spanish.localeCompare(b.spanish, 'es'));
    }
    return r;
  }, [words, search, filterType, filterTopic, sort, errorsOnly]);

  const grouped = useMemo(() => {
    if (groupBy === 'none') return null;
    const map = new Map();
    for (const w of filtered) {
      const key = groupBy === 'type' ? w.type : w.topic;
      if (!map.has(key)) map.set(key, []);
      map.get(key).push(w);
    }
    const order = groupBy === 'type' ? types : topics;
    return [...map.entries()].sort((a, b) => {
      // "No topic" always at the bottom when grouping by topic
      if (groupBy === 'topic') {
        if (a[0] === NO_TOPIC) return 1;
        if (b[0] === NO_TOPIC) return -1;
      }
      const ai = order.indexOf(a[0]);
      const bi = order.indexOf(b[0]);
      return (ai === -1 ? 999 : ai) - (bi === -1 ? 999 : bi) ||
        a[0].localeCompare(b[0]);
    });
  }, [filtered, groupBy, types, topics]);

  const hasFilters = !!(filterType || filterTopic || search || errorsOnly);

  function clearAll() {
    setSearch('');
    setFilterType('');
    setFilterTopic('');
    setErrorsOnly(false);
  }

  function startEdit(w) {
    setEditingId(w.id);
    setDraft({
      spanish: w.spanish,
      serbian: w.serbian,
      type: w.type,
      topic: w.topic,
      note: w.note || ''
    });
    setError(null);
  }

  function cancelEdit() {
    setEditingId(null);
    setDraft(null);
    setError(null);
  }

  async function saveEdit(id) {
    if (!draft) return;
    if (!draft.spanish.trim() || !draft.serbian.trim() || !draft.type.trim()) {
      setError('Word, translation and type are required.');
      return;
    }
    try {
      setSaving(true);
      await updateWord(id, draft);
      setEditingId(null);
      setDraft(null);
      setError(null);
      onChanged();
      onToast?.(`Saved: ${draft.spanish}`, 'ok');
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id, spanish) {
    await deleteWord(id);
    setConfirmDeleteId(null);
    onChanged();
    onToast?.(`Deleted: ${spanish}`, 'ok');
  }

  function renderRow(w) {
    if (editingId === w.id) {
      return (
        <div key={w.id} className="wrow-edit">
          <div className="edit-grid">
            <div className="field">
              <label className="flabel">Word</label>
              <input
                className="input"
                value={draft.spanish}
                onChange={(e) => setDraft({ ...draft, spanish: e.target.value })}
                autoFocus
              />
            </div>
            <div className="field">
              <label className="flabel">Translation</label>
              <input
                className="input"
                value={draft.serbian}
                onChange={(e) => setDraft({ ...draft, serbian: e.target.value })}
              />
            </div>
            <div className="field">
              <label className="flabel">Type</label>
              <select
                className="select"
                value={draft.type}
                onChange={(e) => setDraft({ ...draft, type: e.target.value })}
              >
                {types.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
                {draft.type && !types.includes(draft.type) && (
                  <option value={draft.type}>{draft.type}</option>
                )}
              </select>
            </div>
            <div className="field">
              <label className="flabel">Topic</label>
              <select
                className="select"
                value={draft.topic}
                onChange={(e) => setDraft({ ...draft, topic: e.target.value })}
              >
                {topics.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
                {draft.topic && !topics.includes(draft.topic) && (
                  <option value={draft.topic}>{draft.topic}</option>
                )}
              </select>
            </div>
            <div className="field field-wide">
              <label className="flabel">Note<span className="opt"> · optional</span></label>
              <input
                className="input"
                value={draft.note}
                onChange={(e) => setDraft({ ...draft, note: e.target.value })}
                placeholder="optional"
              />
            </div>
            <div className="edit-actions">
              <button
                className="btn btn-primary"
                onClick={() => saveEdit(w.id)}
                disabled={saving}
              >
                {saving ? 'Saving...' : 'Save'}
              </button>
              <button className="btn btn-ghost" onClick={cancelEdit} disabled={saving}>
                cancel
              </button>
            </div>
          </div>
        </div>
      );
    }
    return (
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
          {groupBy !== 'type' && <TypeBadge type={w.type} />}
          {groupBy !== 'topic' && <TopicPill topic={w.topic} />}
          {w.wrongCount > 0 && (
            <span className="mistake" title="How many times you got it wrong">
              {w.wrongCount}×
            </span>
          )}
          <span className="acts">
            {confirmDeleteId === w.id ? (
              <span className="confirm-inline">
                <button className="btn-danger-sm" onClick={() => handleDelete(w.id, w.spanish)}>
                  Delete
                </button>
                <button className="btn-ghost link-btn" onClick={() => setConfirmDeleteId(null)}>
                  cancel
                </button>
              </span>
            ) : (
              <>
                <button
                  className="iconbtn accent"
                  onClick={() => startEdit(w)}
                  title="Edit"
                >
                  <Icon name="pencil" size={15} />
                </button>
                <button
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
    );
  }

  return (
    <div className="card card-pad-lg fade-in">
      <div className="searchbar">
        <span className="si"><Icon name="search" size={18} /></span>
        <input
          className="input"
          placeholder="Search word, translation or note…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      <div className="filters">
        <Select value={filterType} onChange={setFilterType}>
          <option value="">All types</option>
          {types.map((t) => (
            <option key={t} value={t}>
              {t}
            </option>
          ))}
        </Select>
        <Select value={filterTopic} onChange={setFilterTopic}>
          <option value="">All topics</option>
          {topics.map((t) => (
            <option key={t} value={t}>
              {t}
            </option>
          ))}
        </Select>
        <Select value={sort} onChange={setSort} title="Sort">
          <option value="alpha">A → Z</option>
          <option value="newest">Newest</option>
          <option value="hardest">Hardest</option>
        </Select>
        {errorsCount > 0 && (
          <button
            type="button"
            className={`chipbtn ${errorsOnly ? 'on' : ''}`}
            onClick={() => setErrorsOnly(!errorsOnly)}
          >
            <Icon name="alert-circle" size={15} /> With mistakes <span className="ct">{errorsCount}</span>
          </button>
        )}
      </div>

      <div className="groupby">
        <span className="lab">Group by</span>
        <div className="seg-mini">
          <button
            type="button"
            className={groupBy === 'none' ? 'on' : ''}
            onClick={() => setGroupBy('none')}
          >
            none
          </button>
          <button
            type="button"
            className={groupBy === 'type' ? 'on' : ''}
            onClick={() => setGroupBy('type')}
          >
            type
          </button>
          <button
            type="button"
            className={groupBy === 'topic' ? 'on' : ''}
            onClick={() => setGroupBy('topic')}
          >
            topic
          </button>
        </div>
      </div>

      <div className="showing">
        Showing <b>{filtered.length}</b> of {words.length}
        {hasFilters && (
          <button type="button" className="link-btn" onClick={clearAll}>
            clear filters
          </button>
        )}
      </div>

      {error && <div className="banner banner-error">{error}</div>}

      {filtered.length === 0 ? (
        <div className="empty">
          <div className="serif">No words match your search.</div>
          <div>Try clearing a filter.</div>
        </div>
      ) : groupBy !== 'none' ? (
        grouped.map(([key, list]) => (
          <div key={key}>
            <div className="group-head">
              <h4>{key}</h4>
              <span className="ct">{list.length}</span>
              <span className="group-rule" />
            </div>
            <div className="rows">{list.map(renderRow)}</div>
          </div>
        ))
      ) : (
        <div className="rows">{filtered.map(renderRow)}</div>
      )}
    </div>
  );
}
