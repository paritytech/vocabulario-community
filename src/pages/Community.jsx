import { useEffect, useMemo, useState } from 'react';
import {
  boardEnabled,
  subscribeSentences,
  subscribeCorrections,
  publishCorrection,
  LEVELS
} from '../sentences.js';
import Select from '../components/Select.jsx';
import Icon from '../components/Icon.jsx';

/** Compact relative time. */
function ago(ts) {
  const s = Math.floor((Date.now() - ts) / 1000);
  if (s < 60) return 'just now';
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

export default function Community({ onToast }) {
  const [sentences, setSentences] = useState([]);
  const [q, setQ] = useState('');
  const [level, setLevel] = useState('');
  const [lang, setLang] = useState('');
  const hosted = boardEnabled();

  useEffect(() => {
    const stop = subscribeSentences(setSentences);
    return stop;
  }, []);

  // Languages present in the feed, for the language filter.
  const langs = useMemo(() => {
    const set = new Set();
    for (const s of sentences) if (s.lang) set.add(s.lang);
    return [...set].sort();
  }, [sentences]);

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return sentences.filter(
      (s) =>
        (!level || s.level === level) &&
        (!lang || s.lang === lang) &&
        (!needle || s.text.toLowerCase().includes(needle))
    );
  }, [sentences, q, level, lang]);

  if (!hosted) {
    return (
      <div className="empty-state">
        The community board is on-chain (Polkadot Statement Store). Open Vocabulario in the Polkadot
        host (Polkadot Desktop or dot.li) to read and correct community sentences.
      </div>
    );
  }

  return (
    <div className="fade-in">
      <div className="card card-pad-lg">
        <div className="feed-filters">
          <div className="field feed-search">
            <label className="flabel">Search</label>
            <input
              className="input"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Find a sentence…"
              spellCheck="false"
            />
          </div>
          <div className="field">
            <label className="flabel">Level</label>
            <Select value={level} onChange={setLevel}>
              <option value="">All levels</option>
              {LEVELS.map((l) => (
                <option key={l} value={l}>{l}</option>
              ))}
            </Select>
          </div>
          <div className="field">
            <label className="flabel">Language</label>
            <Select value={lang} onChange={setLang}>
              <option value="">All languages</option>
              {langs.map((l) => (
                <option key={l} value={l}>{l}</option>
              ))}
            </Select>
          </div>
        </div>
        <div className="fhint" style={{ marginTop: 4 }}>
          {filtered.length} of {sentences.length} sentence{sentences.length === 1 ? '' : 's'} · published
          on-chain, temporary (they expire after a retention period).
        </div>
      </div>

      <div style={{ marginTop: 20 }}>
        {sentences.length === 0 ? (
          <div className="empty-state">No sentences yet — publish one from the Write tab.</div>
        ) : filtered.length === 0 ? (
          <div className="empty-state">No sentences match these filters.</div>
        ) : (
          <div className="feed">
            {filtered.map((s) => (
              <SentenceCard key={s.id} s={s} onToast={onToast} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function SentenceCard({ s, onToast }) {
  const [corrections, setCorrections] = useState([]);
  const [open, setOpen] = useState(false);
  const [fix, setFix] = useState('');
  const [note, setNote] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    const stop = subscribeCorrections(s.id, setCorrections);
    return stop;
  }, [s.id]);

  function startCorrection() {
    setFix((f) => f || s.text); // prefill with the original so the corrector edits it
    setOpen(true);
  }

  async function submit(e) {
    e.preventDefault();
    if (!fix.trim()) {
      onToast?.('Enter the corrected sentence.', 'error');
      return;
    }
    try {
      setSubmitting(true);
      await publishCorrection(s.id, fix, note);
      onToast?.('Correction published on-chain', 'ok');
      setNote('');
      setOpen(false);
    } catch (err) {
      onToast?.(err.message, 'error');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="feed-card">
      <div className="feed-sentence">{s.text}</div>
      <div className="feed-meta">
        {s.level && <span className="feed-level">{s.level}</span>}
        {s.lang && <span className="feed-lang">{s.lang}</span>}
        <span className="feed-author">{s.author || 'anon'}</span>
        <span className="feed-time">{ago(s.ts)}</span>
      </div>

      {corrections.length > 0 && (
        <div className="feed-corrections">
          {corrections.map((c) => (
            <div key={c.id} className="correction">
              <span className="corr-mark"><Icon name="check-circle-2" size={14} /></span>
              <div className="corr-body">
                <div className="corr-fix">{c.fix}</div>
                {c.note && <div className="corr-note">{c.note}</div>}
                <div className="corr-author">{c.author || 'anon'} · {ago(c.ts)}</div>
              </div>
            </div>
          ))}
        </div>
      )}

      {open ? (
        <form className="corr-form" onSubmit={submit}>
          <textarea
            className="input"
            value={fix}
            onChange={(e) => setFix(e.target.value)}
            rows={2}
            placeholder="Corrected sentence…"
            spellCheck="false"
            autoFocus
          />
          <input
            className="input"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="Note · optional (why?)"
          />
          <div className="corr-actions">
            <button type="submit" className="btn btn-primary" disabled={submitting || !fix.trim()}>
              {submitting ? 'Publishing…' : 'Publish correction'}
            </button>
            <button type="button" className="btn btn-ghost" onClick={() => setOpen(false)} disabled={submitting}>
              cancel
            </button>
          </div>
        </form>
      ) : (
        <button type="button" className="btn btn-ghost btn-sm corr-toggle" onClick={startCorrection}>
          <Icon name="pen-line" size={14} /> Suggest a correction
        </button>
      )}
    </div>
  );
}
