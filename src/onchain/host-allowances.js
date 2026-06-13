/**
 * Shared host onboarding — RFC-0010 resource allowances + RFC-0002 JIT permissions.
 *
 * Both on-chain write paths bootstrap through here so the user sees ONE
 * allowance modal, not one per feature:
 *   - Bulletin blob writes   (`preimageManager.submit`  — see bulletin-write.js)
 *   - Statement Store writes  (`statementStore.submit`  — see statements.js)
 *
 * One memoized call grants both RFC-0010 allowances (Bulletin + StatementStore)
 * in a single combined modal and pre-resolves both RFC-0002 permissions
 * (PreimageSubmit + StatementSubmit). Mirrors LocalDOT's
 * apps/web/src/lib/host/allowances.ts.
 *
 * Why the ask-once gate: `requestResourceAllocation` is NOT idempotent — each
 * call re-shows the host modal, consumes another quota slot AND the grant tx
 * churns the account nonce, which races a concurrent submit into a `Stale`
 * validity error. So we request the allowance at most once per product (an
 * "ask-once" localStorage flag + an in-memory single-flight promise). The host
 * itself remembers the grant across sessions; the flag just stops us re-asking.
 *
 * Permissions are pre-resolved best-effort (non-fatal): the host de-dupes and
 * remembers them, and if one is missing the host re-prompts just-in-time at the
 * actual submit, so a denial here only defers the prompt — it never hard-blocks.
 */

const ALLOWANCE_FLAG = 'vocab/host/allowances/v1';
let bootstrapPromise = null;

function allowanceFlagSet() {
  try {
    return localStorage.getItem(ALLOWANCE_FLAG) === '1';
  } catch {
    return false;
  }
}
function setAllowanceFlag() {
  try {
    localStorage.setItem(ALLOWANCE_FLAG, '1');
  } catch {
    /* storage unavailable — fall back to the per-session memo only */
  }
}
function clearAllowanceFlag() {
  try {
    localStorage.removeItem(ALLOWANCE_FLAG);
  } catch {
    /* ignore */
  }
}

/**
 * Ensure both Bulletin + Statement Store allowances and their submit
 * permissions are in place. Memoized (single-flight) per session; the heavy
 * allowance request is additionally skipped once the persisted flag records a
 * grant — see the file header for why re-requesting it causes `Stale`.
 */
export function ensureHostAllowances() {
  if (!bootstrapPromise) {
    bootstrapPromise = doBootstrap().catch((err) => {
      bootstrapPromise = null;
      throw err;
    });
  }
  return bootstrapPromise;
}

/** Drop the bootstrap so the next write re-validates from a fresh grant. */
export function resetHostAllowances() {
  bootstrapPromise = null;
  clearAllowanceFlag();
}

async function doBootstrap() {
  const { hostApi, requestPermission } = await import('@novasamatech/host-api-wrapper');
  const { enumValue } = await import('@novasamatech/host-api');

  // RFC-0010 allowances — Bulletin + StatementStore in one combined modal.
  // Requested only if we have never recorded a grant for this product; the host
  // remembers it across sessions, so re-requesting only re-shows the modal and
  // churns the nonce (→ Stale). Set the flag from the host's synchronous
  // outcome; we do NOT wait on ~40s chain finality.
  if (!allowanceFlagSet()) {
    try {
      await hostApi.requestResourceAllocation(
        enumValue('v1', [
          enumValue('BulletinAllowance', undefined),
          enumValue('StatementStoreAllowance', undefined)
        ])
      );
      setAllowanceFlag();
    } catch {
      /* legacy/standalone host didn't respond — tolerate; a JIT prompt may
         still grant at submit time. Leave the flag unset so we retry next time. */
    }
  }

  // RFC-0002 permissions — cheap JIT gates the host de-dupes and remembers.
  // Pre-resolved here (best-effort) so the first submit doesn't prompt mid-flow.
  // Non-fatal on denial: the host re-prompts just-in-time at submit time.
  for (const tag of ['PreimageSubmit', 'StatementSubmit']) {
    try {
      await requestPermission({ tag, value: undefined }).match(
        () => undefined,
        () => undefined
      );
    } catch {
      /* best-effort */
    }
  }
}
