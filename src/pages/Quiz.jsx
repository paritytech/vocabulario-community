import { useEffect, useMemo, useRef, useState } from 'react';
import { bumpWrong } from '../api.js';
import TypeBadge from '../components/TypeBadge.jsx';
import TopicPill from '../components/TopicPill.jsx';
import Select from '../components/Select.jsx';
import Icon from '../components/Icon.jsx';

function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function weightedSample(pool, n) {
  const items = pool.map((w) => ({ w, weight: 1 + (w.wrongCount || 0) }));
  const out = [];
  for (let i = 0; i < n && items.length; i++) {
    const total = items.reduce((s, it) => s + it.weight, 0);
    let r = Math.random() * total;
    let pickIdx = 0;
    for (let j = 0; j < items.length; j++) {
      r -= items[j].weight;
      if (r <= 0) {
        pickIdx = j;
        break;
      }
    }
    out.push(items[pickIdx].w);
    items.splice(pickIdx, 1);
  }
  return out;
}

function parseTranslations(s) {
  return s.split(/[,/]/).map((x) => x.trim()).filter(Boolean);
}

// "word" side normalization (Spanish-style accents folded; punctuation dropped)
function normalizeEs(s) {
  return s
    .trim()
    .toLowerCase()
    .replace(/[áàâä]/g, 'a')
    .replace(/[éèêë]/g, 'e')
    .replace(/[íìîï]/g, 'i')
    .replace(/[óòôö]/g, 'o')
    .replace(/[úùûü]/g, 'u')
    .replace(/[¿?¡!.,;:'"`]/g, '')
    .replace(/\s+/g, ' ');
}

// "translation" side normalization (Serbian-style diacritics folded)
function normalizeSr(s) {
  return s
    .trim()
    .toLowerCase()
    .replace(/đ/g, 'd')
    .replace(/š/g, 's')
    .replace(/ž/g, 'z')
    .replace(/č/g, 'c')
    .replace(/ć/g, 'c')
    .replace(/dj/g, 'd')
    .replace(/sh/g, 's')
    .replace(/zh/g, 'z')
    .replace(/ch/g, 'c')
    .replace(/cj/g, 'c')
    .replace(/[.,;:'"`]/g, '')
    .replace(/\s+/g, ' ');
}

function pickDir(mode) {
  if (mode === 'es-sr') return 'es-sr';
  if (mode === 'sr-es') return 'sr-es';
  return Math.random() < 0.5 ? 'es-sr' : 'sr-es';
}

export default function Quiz({ words, types, topics, streak, onComplete }) {
  const [count, setCount] = useState(10);
  const [topicFilter, setTopicFilter] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [mode, setMode] = useState('es-sr');
  const [queue, setQueue] = useState(null);
  const [dirs, setDirs] = useState(null);
  const [idx, setIdx] = useState(0);
  const [answer, setAnswer] = useState('');
  const [results, setResults] = useState([]);
  const [finalized, setFinalized] = useState(false);
  const inputRef = useRef(null);

  const pool = useMemo(
    () =>
      words
        .filter((w) => (topicFilter ? w.topic === topicFilter : true))
        .filter((w) => (typeFilter ? w.type === typeFilter : true)),
    [words, topicFilter, typeFilter]
  );

  const current = queue?.[idx] ?? null;
  const currentDir = dirs?.[idx] ?? 'es-sr';
  const currentResult = results[idx];

  function start() {
    const n = Math.min(Math.max(1, Number(count) || 1), pool.length);
    const picked = weightedSample(pool, n);
    const shuffled = shuffle(picked);
    setQueue(shuffled);
    setDirs(shuffled.map(() => pickDir(mode)));
    setIdx(0);
    setAnswer('');
    setResults([]);
    setFinalized(false);
  }

  function submit(e) {
    e.preventDefault();
    if (!current) return;
    const given = answer.trim();
    let correct;
    if (currentDir === 'es-sr') {
      const accepted = parseTranslations(current.serbian).map(normalizeSr);
      correct = accepted.includes(normalizeSr(given));
    } else {
      correct = normalizeEs(given) === normalizeEs(current.spanish);
    }
    const delta = correct ? -1 : 1;
    setResults((r) => {
      const copy = [...r];
      copy[idx] = { word: current, dir: currentDir, given, correct, delta };
      return copy;
    });
    // Pre-fill the next answer if one already exists, otherwise blank
    const next = results[idx + 1];
    setAnswer(next ? next.given : '');
    setIdx(idx + 1);
  }

  function goBack() {
    if (idx === 0) return;
    const prev = results[idx - 1];
    setAnswer(prev ? prev.given : '');
    setIdx(idx - 1);
  }

  function reset() {
    setQueue(null);
    setDirs(null);
    setIdx(0);
    setAnswer('');
    setResults([]);
    setFinalized(false);
  }

  // Focus the input when the question changes
  useEffect(() => {
    if (queue && idx < queue.length) {
      inputRef.current?.focus();
    }
  }, [idx, queue]);

  // Finalize once when we reach the end
  useEffect(() => {
    if (queue && idx >= queue.length && !finalized) {
      setFinalized(true);
      const deltas = new Map();
      for (const r of results) {
        if (r && r.word) {
          deltas.set(r.word.id, (deltas.get(r.word.id) || 0) + r.delta);
        }
      }
      for (const [id, delta] of deltas) {
        if (delta !== 0) bumpWrong(id, delta).catch(() => {});
      }
      onComplete?.();
    }
  }, [queue, idx, results, finalized, onComplete]);

  if (words.length === 0) {
    return <div className="empty-state">Add some words first.</div>;
  }

  if (!queue) {
    return (
      <div className="card card-pad-lg fade-in">
        <h3 style={{ marginBottom: 4 }}>Set up quiz</h3>
        <p className="muted" style={{ marginBottom: 24, fontSize: '14.5px' }}>
          Words you get wrong show up more often.
        </p>

        <div className="field" style={{ marginBottom: 22 }}>
          <label className="flabel">Direction</label>
          <div className="q-dir">
            <button
              type="button"
              className={mode === 'es-sr' ? 'on' : ''}
              onClick={() => setMode('es-sr')}
            >
              <span className="qd-t"><Icon name="eye" size={15} />Word → Translation</span>
              <span className="qd-s">easier · recognition</span>
            </button>
            <button
              type="button"
              className={mode === 'sr-es' ? 'on' : ''}
              onClick={() => setMode('sr-es')}
            >
              <span className="qd-t"><Icon name="pen-line" size={15} />Translation → Word</span>
              <span className="qd-s">harder · production</span>
            </button>
            <button
              type="button"
              className={mode === 'mixed' ? 'on' : ''}
              onClick={() => setMode('mixed')}
            >
              <span className="qd-t"><Icon name="shuffle" size={15} />Mixed</span>
              <span className="qd-s">50 / 50</span>
            </button>
          </div>
        </div>

        <div className="grid-2" style={{ marginBottom: 22 }}>
          <div className="field">
            <label className="flabel">Type<span className="opt"> · optional</span></label>
            <Select value={typeFilter} onChange={setTypeFilter}>
              <option value="">All types</option>
              {types.map((t) => (
                <option key={t} value={t}>{t}</option>
              ))}
            </Select>
          </div>
          <div className="field">
            <label className="flabel">Topic<span className="opt"> · optional</span></label>
            <Select value={topicFilter} onChange={setTopicFilter}>
              <option value="">All topics</option>
              {topics.map((t) => (
                <option key={t} value={t}>{t}</option>
              ))}
            </Select>
          </div>
        </div>

        <div className="field">
          <label className="flabel">How many words</label>
          <input
            className="input"
            type="number"
            min="1"
            max={pool.length}
            value={count}
            onChange={(e) => setCount(e.target.value)}
          />
          <div className="fhint">
            Available: {pool.length} words. Words you get wrong more often show up more often.
          </div>
        </div>

        <button
          className="btn btn-primary btn-block btn-lg"
          onClick={start}
          disabled={pool.length === 0}
          style={{ marginTop: 24 }}
        >
          <Icon name="zap" size={18} /> Start quiz
        </button>
      </div>
    );
  }

  if (idx >= queue.length) {
    const answered = results.filter(Boolean);
    const correct = answered.filter((r) => r.correct).length;
    const pct = answered.length > 0 ? Math.round((correct / answered.length) * 100) : 0;
    return (
      <div className="card card-pad-lg fade-in">
        <div className="qresult">
          <div className="eyebrow" style={{ marginBottom: 10 }}>Quiz complete</div>
          <div className="qscore">{correct}<span className="of"> / {answered.length}</span></div>
          <p className="muted" style={{ marginTop: 8 }}>{pct}% correct</p>
          {streak?.current > 0 && (
            <div className="qstreak">
              <Icon name="flame" size={16} fill="currentColor" strokeWidth={1.4} /> <b>{streak.current}</b>&nbsp;day streak
            </div>
          )}
          <div className="qreview">
            {answered.map((r, i) => {
              const isEsSr = r.dir === 'es-sr';
              return (
                <div className="rrow" key={i}>
                  <span className="rk">
                    {isEsSr ? r.word.spanish : r.word.serbian}
                    {!r.correct && <span className="rk-given"> · you: "{r.given || '—'}"</span>}
                  </span>
                  <span className={`rv ${r.correct ? 'ok' : 'no'}`}>
                    <span className="rdir">{isEsSr ? 'W→T' : 'T→W'}</span>
                    {r.correct ? '✓ ' : '✕ '}
                    {isEsSr ? r.word.serbian : r.word.spanish}
                  </span>
                </div>
              );
            })}
          </div>
          <div className="qnav" style={{ marginTop: 28 }}>
            <button type="button" className="btn btn-secondary" onClick={reset}>
              <Icon name="rotate-ccw" size={16} /> New quiz
            </button>
          </div>
        </div>
      </div>
    );
  }

  const isEsSr = currentDir === 'es-sr';
  const prompt = isEsSr ? current.spanish : current.serbian;

  return (
    <form className="card card-pad-lg fade-in" onSubmit={submit}>
      <div className="qrun">
        <div className="qprog"><i style={{ width: `${(idx / queue.length) * 100}%` }} /></div>
        <div className="qcount">{idx + 1} / {queue.length}</div>
        <div className="qtags">
          <span
            className="pill"
            style={{ background: 'var(--v-accent-soft)', border: '1px solid var(--v-accent-line)', color: 'var(--v-accent)' }}
          >
            {isEsSr ? 'Word → Translation' : 'Translation → Word'}
          </span>
          <TypeBadge type={current.type} />
          <TopicPill topic={current.topic} />
        </div>
        <div className="qword">{prompt}</div>
        {isEsSr && current.note && <div className="qnote">{current.note}</div>}
        <input
          ref={inputRef}
          className="input qanswer"
          value={answer}
          onChange={(e) => setAnswer(e.target.value)}
          placeholder={
            isEsSr
              ? 'translation (diacritics optional)'
              : 'the word (accents optional)'
          }
          autoComplete="off"
          spellCheck="false"
        />
        {currentResult && (
          <div className={`qprev ${currentResult.correct ? 'ok' : 'no'}`}>
            {currentResult.correct ? '✓ Correct (last time)' : '✕ Wrong (last time)'}
          </div>
        )}
        <div className="qnav">
          <button type="button" className="btn btn-secondary" onClick={goBack} disabled={idx === 0}>
            <Icon name="arrow-left" size={16} /> Previous
          </button>
          <button type="submit" className="btn btn-primary">
            Next <Icon name="arrow-right" size={16} />
          </button>
        </div>
        <button type="button" className="qcancel" onClick={reset}>cancel</button>
      </div>
    </form>
  );
}
