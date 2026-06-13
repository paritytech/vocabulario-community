import { useEffect, useRef, useState } from 'react';
import {
  exportCurrentDictionary,
  parseBackup,
  importDictionary,
  publishCurrentDictionary,
  getPublishedCid,
  retrieveDictionary
} from '../api.js';
import { publishEnabled, IPFS_GATEWAY } from '../onchain/bulletin.js';
import { announceDictionary, subscribeDictionaries, boardEnabled } from '../sentences.js';
import Icon from '../components/Icon.jsx';

function shortCid(cid) {
  return cid && cid.length > 18 ? `${cid.slice(0, 10)}…${cid.slice(-6)}` : cid;
}

function ago(ts) {
  const s = Math.floor((Date.now() - ts) / 1000);
  if (s < 60) return 'just now';
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

export default function Backup({ currentName, wordCount, currentDictId, onChanged, onToast }) {
  const fileRef = useRef(null);
  const [busy, setBusy] = useState(false);
  const [published, setPublished] = useState(null);
  const [publishing, setPublishing] = useState(false);
  const [cidInput, setCidInput] = useState('');
  const [retrieving, setRetrieving] = useState(false);
  const [shared, setShared] = useState([]);
  const [dictQ, setDictQ] = useState('');
  const canPublish = publishEnabled();
  const canBrowse = boardEnabled();

  useEffect(() => {
    let alive = true;
    getPublishedCid().then((rec) => {
      if (!alive) return;
      setPublished(rec || null);
      if (rec?.cid) setCidInput((c) => c || rec.cid);
    });
    return () => {
      alive = false;
    };
  }, [currentDictId]);

  // Live list of dictionaries others have announced on-chain (host-only).
  useEffect(() => {
    const stop = subscribeDictionaries(setShared);
    return stop;
  }, []);

  async function handleDownload() {
    const data = await exportCurrentDictionary();
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const safe =
      (data.name || 'vocabulario').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '') ||
      'vocabulario';
    const a = document.createElement('a');
    a.href = url;
    a.download = `${safe}.json`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
    onToast?.(`Downloaded ${data.words.length} words`, 'ok');
  }

  async function handleFile(e) {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    try {
      setBusy(true);
      const parsed = parseBackup(await file.text());
      const entry = await importDictionary(parsed);
      onToast?.(`Imported ${parsed.words.length} words into "${entry.name}"`, 'ok');
      onChanged?.();
    } catch (err) {
      onToast?.(`Import failed: ${err.message}`, 'error');
    } finally {
      setBusy(false);
    }
  }

  async function handlePublish() {
    try {
      setPublishing(true);
      onToast?.('Publishing to Bulletin…', 'ok');
      const rec = await publishCurrentDictionary();
      setPublished(rec);
      setCidInput(rec.cid);
      onToast?.('Published on Bulletin', 'ok');
      // Announce it on-chain so others can find it in "Browse shared dictionaries".
      // Best-effort: discovery is a bonus, never fail the publish over it.
      announceDictionary({
        shareId: rec.shareId,
        name: rec.name || currentName,
        lang: rec.name || currentName,
        cid: rec.cid,
        words: rec.words
      }).catch(() => {});
    } catch (err) {
      onToast?.(`Publish failed: ${err.message}`, 'error');
    } finally {
      setPublishing(false);
    }
  }

  async function retrieveCid(cid) {
    const id = (cid || '').trim();
    if (!id) return;
    try {
      setRetrieving(true);
      const { entry, count, updated } = await retrieveDictionary(id);
      onToast?.(
        updated
          ? `Updated "${entry.name}" to the latest (${count} words)`
          : `Retrieved ${count} words into "${entry.name}"`,
        'ok'
      );
      onChanged?.();
    } catch (err) {
      onToast?.(`Retrieve failed: ${err.message}`, 'error');
    } finally {
      setRetrieving(false);
    }
  }

  const sharedFiltered = shared.filter((d) => {
    const needle = dictQ.trim().toLowerCase();
    return !needle || (d.name || '').toLowerCase().includes(needle);
  });

  function copy(text) {
    navigator.clipboard?.writeText(text).then(() => onToast?.('CID copied', 'ok'));
  }

  return (
    <div className="card card-pad-lg fade-in">
      {/* On-chain sharing leads — it's the showcase feature. */}
      <div className="bk-section">
        <div className="bk-head">
          <span className="halo"><Icon name="upload-cloud" size={19} /></span>
          <h3>Share · on-chain</h3>
        </div>
        <p className="bk-desc">
          Publish <b>{currentName}</b> ({wordCount} words) to the Polkadot <b>Bulletin chain</b> and
          share its reference (CID) — anyone can paste it below to get a copy. Retrieving a newer CID
          of the same dictionary updates that copy in place instead of duplicating it.
        </p>
        <div className="bk-actions">
          <button
            type="button"
            className="btn btn-primary"
            onClick={handlePublish}
            disabled={!canPublish || publishing}
          >
            {publishing ? (
              <><Icon name="loader" size={17} /> Publishing…</>
            ) : (
              <><Icon name="upload-cloud" size={17} /> Publish &amp; share</>
            )}
          </button>
        </div>
        {!canPublish && (
          <p className="bk-hint">
            Publishing is available inside the Polkadot host — it writes under your wallet's Bulletin
            allowance. Open Vocabulario from Polkadot Desktop or dot.li to publish.
          </p>
        )}
        {published?.cid && (
          <div className="cid-box">
            <span className="cid-label">Share this CID</span>
            <code className="cid-val" title={published.cid}>{shortCid(published.cid)}</code>
            <button type="button" className="link-btn" onClick={() => copy(published.cid)}>copy</button>
            <a
              className="link-btn"
              href={published.gatewayUrl || `${IPFS_GATEWAY}${published.cid}`}
              target="_blank"
              rel="noreferrer"
            >
              open
            </a>
          </div>
        )}
        <div className="cid-row">
          <input
            className="input"
            value={cidInput}
            onChange={(e) => setCidInput(e.target.value)}
            placeholder="Paste a CID to retrieve a shared dictionary…"
            spellCheck="false"
            autoComplete="off"
          />
          <button
            type="button"
            className="btn btn-secondary"
            onClick={() => retrieveCid(cidInput)}
            disabled={retrieving || !cidInput.trim()}
          >
            <Icon name="search" size={16} /> {retrieving ? 'Retrieving…' : 'Retrieve'}
          </button>
        </div>
        <p className="bk-note">
          Note · Bulletin storage is temporary (data expires after a retention period). Keep the
          local JSON below as your durable backup.
        </p>
      </div>

      {/* Discover dictionaries others have shared (on-chain announcements). */}
      <div className="bk-section">
        <div className="bk-head">
          <span className="halo"><Icon name="search" size={19} /></span>
          <h3>Browse shared dictionaries</h3>
        </div>
        <p className="bk-desc">
          Dictionaries other people have published show up here — search and retrieve any of them in
          one click. No CID to copy around.
        </p>
        {!canBrowse ? (
          <p className="bk-hint">
            Discovery is on-chain (Polkadot Statement Store) and works inside the Polkadot host. Open
            Vocabulario from Polkadot Desktop or dot.li to browse shared dictionaries.
          </p>
        ) : (
          <>
            <input
              className="input"
              value={dictQ}
              onChange={(e) => setDictQ(e.target.value)}
              placeholder="Search shared dictionaries by name…"
              spellCheck="false"
              autoComplete="off"
            />
            {shared.length === 0 ? (
              <p className="bk-hint">No shared dictionaries yet — publish one above to be the first.</p>
            ) : sharedFiltered.length === 0 ? (
              <p className="bk-hint">No shared dictionaries match “{dictQ}”.</p>
            ) : (
              <div className="dict-list">
                {sharedFiltered.map((d) => (
                  <div key={d.shareId} className="dict-row">
                    <div className="dict-info">
                      <span className="dict-name">{d.name}</span>
                      <span className="dict-sub">
                        {d.words} word{d.words === 1 ? '' : 's'} · {d.author || 'anon'} · {ago(d.ts)}
                      </span>
                    </div>
                    <button
                      type="button"
                      className="btn btn-secondary btn-sm"
                      onClick={() => retrieveCid(d.cid)}
                      disabled={retrieving}
                    >
                      <Icon name="download" size={15} /> Retrieve
                    </button>
                  </div>
                ))}
              </div>
            )}
          </>
        )}
        <p className="bk-note">
          Note · Listings are on-chain and temporary (they expire after a retention period), so this
          shows recently-shared dictionaries.
        </p>
      </div>

      <div className="bk-section">
        <div className="bk-head">
          <span className="halo"><Icon name="hard-drive-download" size={19} /></span>
          <h3>Local backup</h3>
        </div>
        <p className="bk-desc">
          Download <b>{currentName}</b> ({wordCount} words) as a JSON file, or import a backup as a
          new dictionary. Works across accounts — download on one wallet, switch, import on another.
        </p>
        <div className="bk-actions">
          <button type="button" className="btn btn-primary" onClick={handleDownload}>
            <Icon name="download" size={17} /> Download backup (.json)
          </button>
          <button
            type="button"
            className="btn btn-secondary"
            onClick={() => fileRef.current?.click()}
            disabled={busy}
          >
            <Icon name="upload" size={17} /> {busy ? 'Importing…' : 'Import backup'}
          </button>
          <input ref={fileRef} type="file" accept="application/json,.json" hidden onChange={handleFile} />
        </div>
      </div>
    </div>
  );
}
