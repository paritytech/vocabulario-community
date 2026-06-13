import { useMemo, useState } from 'react';
import { boardEnabled, publishSentence, LEVELS } from '../sentences.js';
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

function pickN(pool, n) {
  return shuffle(pool).slice(0, n);
}

function distribute(n) {
  const verbs = Math.max(n >= 2 ? 1 : 0, Math.round(n * 0.3));
  const nouns = Math.max(n >= 2 ? 1 : 0, Math.round(n * 0.3));
  let other = n - verbs - nouns;
  if (other < 0) other = 0;
  return { verbs, nouns, other };
}

export default function Sentence({ words, topics, currentName, onToast, onBrowseCommunity }) {
  const [count, setCount] = useState(5);
  const [topicFilter, setTopicFilter] = useState('');
  const [picked, setPicked] = useState(null);
  const [warning, setWarning] = useState(null);

  // Compose + publish to the on-chain board
  const [text, setText] = useState('');
  const [level, setLevel] = useState('A1');
  const [publishing, setPublishing] = useState(false);
  const hosted = boardEnabled();

  const pool = useMemo(
    () => (topicFilter ? words.filter((w) => w.topic === topicFilter) : words),
    [words, topicFilter]
  );

  function generate() {
    const n = Math.min(Math.max(1, Number(count) || 1), pool.length);
    const verbsPool = pool.filter((w) => w.type === 'Verb');
    const nounsPool = pool.filter((w) => w.type === 'Noun');
    const otherPool = pool.filter((w) => w.type !== 'Verb' && w.type !== 'Noun');

    const target = distribute(n);
    let chosen = [
      ...pickN(verbsPool, Math.min(target.verbs, verbsPool.length)),
      ...pickN(nounsPool, Math.min(target.nouns, nounsPool.length)),
      ...pickN(otherPool, Math.min(target.other, otherPool.length))
    ];

    if (chosen.length < n) {
      const usedIds = new Set(chosen.map((w) => w.id));
      const rest = pool.filter((w) => !usedIds.has(w.id));
      chosen = [...chosen, ...pickN(rest, n - chosen.length)];
    }

    chosen = shuffle(chosen).slice(0, n);
    setPicked(chosen);
    setWarning(chosen.length < n ? `Only ${chosen.length} words in this selection.` : null);
  }

  async function handlePublish() {
    if (!text.trim()) {
      onToast?.('Write a sentence first.', 'error');
      return;
    }
    try {
      setPublishing(true);
      onToast?.('Publishing to the chain…', 'ok');
      await publishSentence(text, currentName, level);
      onToast?.('Sentence published on-chain', 'ok');
      setText('');
    } catch (err) {
      onToast?.(err.message, 'error');
    } finally {
      setPublishing(false);
    }
  }

  if (words.length === 0) {
    return <div className="empty-state">Add some words first.</div>;
  }

  return (
    <div className="fade-in">
      {/* 1 — practice helper: a balanced batch of random words to write with */}
      <div className="card card-pad-lg">
        <div className="sent-controls">
          <div className="field">
            <label className="flabel">Topic<span className="opt"> · optional</span></label>
            <Select value={topicFilter} onChange={setTopicFilter}>
              <option value="">All topics</option>
              {topics.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </Select>
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
          </div>
          <button type="button" className="btn btn-primary" onClick={generate}>
            <Icon name="dice-5" size={17} /> Give me words
          </button>
        </div>

        {warning && (
          <div className="banner banner-warn" style={{ marginTop: 16 }}>
            {warning}
          </div>
        )}

        {picked && (
          <>
            <div className="picked-words" style={{ marginTop: 18 }}>
              {picked.map((w) => (
                <div key={w.id} className="word-card">
                  <div className="wc-term">{w.spanish}</div>
                  <div className="wc-trans">{w.serbian}</div>
                  {w.note && <div className="wc-note">{w.note}</div>}
                  <div className="wc-badges">
                    <TypeBadge type={w.type} />
                    <TopicPill topic={w.topic} />
                  </div>
                </div>
              ))}
            </div>
            <p className="sent-hint">Build a sentence using these words, then publish it for the community to correct.</p>
          </>
        )}

        {/* 2 — compose + publish to the on-chain board */}
        <div className="field" style={{ marginTop: 20 }}>
          <label className="flabel">
            Your sentence{currentName ? <span className="opt"> · {currentName}</span> : null}
          </label>
          <textarea
            className="input sent-compose"
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder={hosted ? 'Write a sentence in the language you are learning…' : 'Write a sentence…'}
            rows={3}
            spellCheck="false"
          />
        </div>
        <div className="field" style={{ marginTop: 12 }}>
          <label className="flabel">Level</label>
          <Select value={level} onChange={setLevel}>
            {LEVELS.map((l) => (
              <option key={l} value={l}>{l}</option>
            ))}
          </Select>
          <div className="fhint">CEFR — A1 (beginner) to C2 (mastery). Others can filter the feed by it.</div>
        </div>
        <button
          type="button"
          className="btn btn-primary btn-block"
          onClick={handlePublish}
          disabled={!hosted || publishing || !text.trim()}
          style={{ marginTop: 6 }}
        >
          {publishing ? (
            <><Icon name="loader" size={17} /> Publishing…</>
          ) : (
            <><Icon name="send" size={17} /> Publish to community</>
          )}
        </button>
        {!hosted && (
          <p className="bk-hint">
            The community board is on-chain (Polkadot Statement Store) and works inside the Polkadot
            host. Open Vocabulario from Polkadot Desktop or dot.li to publish sentences and get
            corrections.
          </p>
        )}
        {hosted && (
          <p className="bk-note" style={{ marginTop: 12 }}>
            Note · Sentences are published publicly on-chain and are temporary (they expire after a
            retention period).
          </p>
        )}

        <button type="button" className="btn btn-ghost btn-block community-link" onClick={() => onBrowseCommunity?.()}>
          <Icon name="message-square-text" size={16} /> Browse community sentences
          <Icon name="arrow-right" size={15} />
        </button>
      </div>
    </div>
  );
}
