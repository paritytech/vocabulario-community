/**
 * Wallet / identity layer.
 *
 * Every piece of vocab data is scoped to a wallet address. This module is the
 * single source for "who is the current wallet" — the rest of the app never
 * cares how the address was obtained.
 *
 * Two modes:
 *  - HOSTED (Triangle / Polkadot browser host): the host hands the product a
 *    deterministic, per-product account. Real wiring is Phase 2 (see the
 *    `initWallet` TODO and ONCHAIN.md) and mirrors LocalDOT's
 *    `apps/web/src/lib/host/signer.ts` → `accounts.getProductAccount(host, 0)`.
 *  - STANDALONE DEV (plain `vite` tab): there is no host, so we keep a list of
 *    local "dev wallets" in localStorage and let the user switch between them.
 *    This lets us demo per-wallet isolation locally before the host is wired.
 */

const HOST_MARK = '__HOST_WEBVIEW_MARK__';
const DEV_ACCOUNTS_KEY = 'vocab/dev/accounts';
const DEV_ACTIVE_KEY = 'vocab/dev/active';

const B58 = '123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz';

let _address = null;
const listeners = new Set();

function emit() {
  for (const fn of listeners) fn(_address);
}

/** Subscribe to address changes (account switch). Returns an unsubscribe fn. */
export function subscribe(fn) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

/** Synchronous getter for the currently active address (cached after init). */
export function currentAddress() {
  return _address;
}

/** True when running embedded inside the Triangle / Polkadot host. */
export function isHosted() {
  try {
    if (typeof window === 'undefined') return false;
    if (window[HOST_MARK]) return true;
    // Embedded in an iframe whose parent we can't read → almost certainly hosted.
    return window.parent && window.parent !== window;
  } catch {
    // Cross-origin parent access throws → we are inside a host iframe.
    return true;
  }
}

/**
 * Resolve and cache the active address. Call once on app boot (and again after
 * switching dev accounts). Returns the resolved address.
 */
export async function initWallet() {
  // --- Phase 2 (hosted): real product account from the Triangle host ---
  // if (isHosted()) {
  //   const { accounts } = await import('@novasamatech/host-api-wrapper');
  //   const res = await accounts.getProductAccount(window.location.host, 0);
  //   _address = AccountId().dec(res._unsafeUnwrap().publicKey);
  //   emit();
  //   return _address;
  // }
  _address = getActiveDevAccount();
  emit();
  return _address;
}

/* --------------------------- dev-wallet helpers --------------------------- */

function loadDevAccounts() {
  try {
    const raw = localStorage.getItem(DEV_ACCOUNTS_KEY);
    const list = raw ? JSON.parse(raw) : [];
    return Array.isArray(list) ? list : [];
  } catch {
    return [];
  }
}

function saveDevAccounts(list) {
  localStorage.setItem(DEV_ACCOUNTS_KEY, JSON.stringify(list));
}

function randomAddress() {
  const bytes = new Uint8Array(47);
  if (typeof crypto !== 'undefined' && crypto.getRandomValues) {
    crypto.getRandomValues(bytes);
  } else {
    for (let i = 0; i < bytes.length; i++) bytes[i] = Math.floor(Math.random() * 256);
  }
  let s = '5';
  for (let i = 0; i < bytes.length; i++) s += B58[bytes[i] % 58];
  return s;
}

function getActiveDevAccount() {
  let list = loadDevAccounts();
  if (list.length === 0) {
    const acc = { address: randomAddress(), label: 'Account 1' };
    list = [acc];
    saveDevAccounts(list);
    localStorage.setItem(DEV_ACTIVE_KEY, acc.address);
  }
  let active = localStorage.getItem(DEV_ACTIVE_KEY);
  if (!active || !list.some((a) => a.address === active)) {
    active = list[0].address;
    localStorage.setItem(DEV_ACTIVE_KEY, active);
  }
  return active;
}

/** List local dev wallets (standalone mode only). */
export function listDevAccounts() {
  return loadDevAccounts();
}

/** Create a new local dev wallet (a fresh, empty address). */
export function addDevAccount(label) {
  const list = loadDevAccounts();
  const acc = {
    address: randomAddress(),
    label: (label && label.trim()) || `Account ${list.length + 1}`
  };
  list.push(acc);
  saveDevAccounts(list);
  return acc;
}

/** Switch the active dev wallet and re-cache the address. */
export async function switchDevAccount(address) {
  const list = loadDevAccounts();
  if (!list.some((a) => a.address === address)) return _address;
  localStorage.setItem(DEV_ACTIVE_KEY, address);
  _address = address;
  emit();
  return _address;
}

/** Human label for an address (dev label if known, else shortened). */
export function labelFor(address) {
  const acc = loadDevAccounts().find((a) => a.address === address);
  return acc ? acc.label : short(address);
}

/** Shorten an address for display: 5GrwvaEF…aZL. */
export function short(address) {
  if (!address) return '';
  return address.length > 14 ? `${address.slice(0, 6)}…${address.slice(-4)}` : address;
}
