import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  fetchWords,
  fetchMeta,
  updateMeta,
  ensureReady,
  listDictionaries,
  getCurrentDictionaryId,
  selectDictionary,
  createDictionary,
  renameDictionary,
  deleteDictionary,
  fetchStreak,
  recordQuizCompleted
} from './api.js';
import * as wallet from './wallet.js';
import { DEFAULT_TYPES, DEFAULT_TOPICS, uniqueSorted } from './labels.js';
import AddWord from './pages/AddWord.jsx';
import WordList from './pages/WordList.jsx';
import Quiz from './pages/Quiz.jsx';
import Sentence from './pages/Sentence.jsx';
import Community from './pages/Community.jsx';
import Backup from './pages/Backup.jsx';
import SideNav from './components/SideNav.jsx';
import LessonPill from './components/LessonPill.jsx';
import StreakPill from './components/StreakPill.jsx';
import Toast from './components/Toast.jsx';

const SECTION_TITLE = {
  add: 'Add a word',
  list: 'All words',
  quiz: 'Quiz',
  sentence: 'Write a sentence',
  community: 'Community sentences',
  backup: 'Backup'
};

const THEME_KEY = 'vocab/theme';

function initialTheme() {
  try {
    const t = localStorage.getItem(THEME_KEY);
    if (t === 'lexikon' || t === 'papel') return t;
  } catch {
    /* ignore */
  }
  return 'lexikon';
}

export default function App() {
  const [tab, setTab] = useState('add');
  const [theme, setTheme] = useState(initialTheme);
  const [words, setWords] = useState([]);
  const [meta, setMeta] = useState({ lastLesson: null });
  const [streak, setStreak] = useState({ current: 0, longest: 0, lastDay: null });
  const [dicts, setDicts] = useState([]);
  const [currentDictId, setCurrentDictId] = useState(null);
  const [address, setAddress] = useState(null);
  const [devAccounts, setDevAccounts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [toast, setToast] = useState(null);
  const hosted = wallet.isHosted();
  const showToast = useCallback((text, type = 'ok') => setToast({ text, type }), []);

  // Apply + persist the theme.
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    try {
      localStorage.setItem(THEME_KEY, theme);
    } catch {
      /* ignore */
    }
  }, [theme]);

  // Reload everything for the current wallet + dictionary.
  const reload = useCallback(async () => {
    try {
      setLoading(true);
      const [w, m, ds, cur, st] = await Promise.all([
        fetchWords(),
        fetchMeta(),
        listDictionaries(),
        getCurrentDictionaryId(),
        fetchStreak()
      ]);
      setWords(w);
      setMeta(m);
      setStreak(st);
      setDicts(ds);
      setCurrentDictId(cur);
      setDevAccounts(wallet.listDevAccounts());
      setError(null);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, []);

  // Boot: resolve wallet + ensure a default dictionary, then load.
  useEffect(() => {
    (async () => {
      try {
        const { address: addr } = await ensureReady();
        setAddress(addr);
        await reload();
      } catch (e) {
        setError(e.message);
        setLoading(false);
      }
    })();
  }, [reload]);

  async function setLastLesson(value) {
    const updated = await updateMeta({ lastLesson: value });
    setMeta(updated);
  }

  // Bump the daily streak when a quiz finishes. Updates only the streak (no full
  // reload), so the quiz's result screen stays mounted.
  const handleQuizComplete = useCallback(async () => {
    try {
      setStreak(await recordQuizCompleted());
    } catch {
      /* streak is best-effort */
    }
  }, []);

  async function handleSelectDict(dictId) {
    await selectDictionary(dictId);
    await reload();
  }

  async function handleCreateDict(name) {
    const entry = await createDictionary(name);
    showToast(`Dictionary created: ${entry.name}`, 'ok');
    await reload();
  }

  async function handleRenameDict(dictId, name) {
    await renameDictionary(dictId, name);
    await reload();
  }

  async function handleDeleteDict(dictId) {
    const removed = dicts.find((d) => d.dictId === dictId);
    await deleteDictionary(dictId);
    showToast(`Dictionary deleted: ${removed?.name ?? ''}`, 'ok');
    await reload();
  }

  async function handleSwitchAccount(addr) {
    await wallet.switchDevAccount(addr);
    await ensureReady();
    setAddress(wallet.currentAddress());
    setTab('add');
    await reload();
  }

  async function handleAddAccount(label) {
    const acc = wallet.addDevAccount(label);
    await handleSwitchAccount(acc.address);
    showToast(`New account: ${acc.label}`, 'ok');
  }

  const availableTypes = useMemo(
    () => uniqueSorted(words.map((w) => w.type), DEFAULT_TYPES),
    [words]
  );
  const availableTopics = useMemo(
    () => uniqueSorted(words.map((w) => w.topic), DEFAULT_TOPICS),
    [words]
  );

  return (
    <div className="vocab-root no-mistakes">
      <div className="shell-sidebar">
        <SideNav
          tab={tab}
          onTab={setTab}
          theme={theme}
          onTheme={setTheme}
          dicts={dicts}
          currentDictId={currentDictId}
          wordCount={words.length}
          onSelectDict={handleSelectDict}
          onCreateDict={handleCreateDict}
          onRenameDict={handleRenameDict}
          onDeleteDict={handleDeleteDict}
          hosted={hosted}
          address={address}
          devAccounts={devAccounts}
          onSwitchAccount={handleSwitchAccount}
          onAddAccount={handleAddAccount}
        />

        <main className="main-pane">
          <div className="main-topbar">
            <div className="main-topbar-in">
              <h2 className="topbar-title serif">{SECTION_TITLE[tab]}</h2>
              <div className="topbar-meta">
                <StreakPill streak={streak} />
                <LessonPill lastLesson={meta.lastLesson} onChange={setLastLesson} />
                <span className="metapill"><b>{words.length}</b> words</span>
              </div>
            </div>
          </div>

          {error && (
            <div className="banner-slot">
              <div className="banner banner-error">Error: {error}</div>
            </div>
          )}

          <div className="main-body">
            {loading ? (
              <div className="app-loading">Loading…</div>
            ) : (
              <>
                {tab === 'add' && (
                  <AddWord
                    words={words}
                    types={availableTypes}
                    topics={availableTopics}
                    onAdded={reload}
                    onToast={showToast}
                  />
                )}
                {tab === 'list' && (
                  <WordList
                    words={words}
                    types={availableTypes}
                    topics={availableTopics}
                    onChanged={reload}
                    onToast={showToast}
                  />
                )}
                {tab === 'quiz' && (
                  <Quiz
                    words={words}
                    types={availableTypes}
                    topics={availableTopics}
                    streak={streak}
                    onComplete={handleQuizComplete}
                  />
                )}
                {tab === 'sentence' && (
                  <Sentence
                    words={words}
                    topics={availableTopics}
                    currentName={dicts.find((d) => d.dictId === currentDictId)?.name || ''}
                    onToast={showToast}
                    onBrowseCommunity={() => setTab('community')}
                  />
                )}
                {tab === 'community' && <Community onToast={showToast} />}
                {tab === 'backup' && (
                  <Backup
                    currentName={dicts.find((d) => d.dictId === currentDictId)?.name || 'dictionary'}
                    wordCount={words.length}
                    currentDictId={currentDictId}
                    onChanged={reload}
                    onToast={showToast}
                  />
                )}
              </>
            )}
          </div>
        </main>
      </div>

      <Toast toast={toast} onClose={() => setToast(null)} />
    </div>
  );
}
