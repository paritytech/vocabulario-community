/**
 * Lazy-loaded Bulletin WRITE path. Imported only when the user publishes.
 *
 * Host-only, mirroring LocalDOT's apps/web/src/lib/host/{storage,allowances,detect}.ts:
 * the user's OWN account writes the blob via `preimageManager.submit(bytes)`.
 * The host (Polkadot Desktop / dot.li) builds, signs (nonce + mortality) and
 * submits the extrinsic — we never set the nonce. Two host-side gates must be
 * satisfied first (RFC-0010 BulletinAllowance + RFC-0002 PreimageSubmit) —
 * both are granted up front by the shared `ensureHostAllowances()` bootstrap in
 * ./host-allowances.js (ask-once, single-flight; see that file for why
 * re-requesting the allowance causes `Stale`).
 *
 * Two further `Stale` guards live here, where the submit happens:
 *   - We single-flight `publish` itself so a double-click / retry can't fire two
 *     submits on the same nonce.
 *   - We wait for the host session to report "connected" before submitting
 *     (mirrors detect.ts), so we never submit against a half-initialised host.
 *
 * CID is computed client-side (Blake2b-256 → CIDv1). Host deps are dynamically
 * imported here so they stay out of the default bundle.
 */

import { blake2b } from '@noble/hashes/blake2.js';
import { CID } from 'multiformats/cid';
import * as raw from 'multiformats/codecs/raw';

import { ensureHostAllowances, resetHostAllowances } from './host-allowances.js';

const BLAKE2B_256_CODE = 0xb220;

function encodeVarint(value) {
  const bytes = [];
  let num = value;
  while (num >= 0x80) {
    bytes.push((num & 0x7f) | 0x80);
    num >>= 7;
  }
  bytes.push(num & 0x7f);
  return new Uint8Array(bytes);
}

/** CIDv1 (raw codec, Blake2b-256) — computed client-side, no network. */
export function calculateCID(fileBytes) {
  const hash = blake2b(fileBytes, { dkLen: 32 });
  const codeBytes = encodeVarint(BLAKE2B_256_CODE);
  const lengthBytes = encodeVarint(hash.length);
  const multihashBytes = new Uint8Array(codeBytes.length + lengthBytes.length + hash.length);
  multihashBytes.set(codeBytes, 0);
  multihashBytes.set(lengthBytes, codeBytes.length);
  multihashBytes.set(hash, codeBytes.length + lengthBytes.length);
  const digest = { code: BLAKE2B_256_CODE, size: hash.length, bytes: multihashBytes, digest: hash };
  return CID.createV1(raw.code, digest).toString();
}

const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

/* ------------------------------ host readiness ---------------------------- */

/**
 * Resolve once the host reports a "connected" account session (mirrors
 * detect.ts). Submitting before this races a half-initialised host. Best-effort:
 * resolves anyway after `timeoutMs` so a quiet host never hard-blocks publish.
 */
async function awaitHostConnected(timeoutMs = 8000) {
  const { accounts } = await import('@novasamatech/host-api-wrapper');
  await new Promise((resolve) => {
    let settled = false;
    let sub;
    const finish = () => {
      if (settled) return;
      settled = true;
      try {
        sub?.unsubscribe?.();
      } catch {
        /* no-op */
      }
      resolve();
    };
    try {
      sub = accounts.subscribeAccountConnectionStatus((status) => {
        if (status === 'connected') finish();
      });
    } catch {
      finish();
      return;
    }
    setTimeout(finish, timeoutMs);
  });
}

/* --------------------------------- publish -------------------------------- */

/** Is this a runtime "Stale" validity error (nonce already used)? */
function isStale(err) {
  try {
    if (err?.value?.type === 'Stale') return true;
    const s = typeof err === 'string' ? err : err?.message ?? JSON.stringify(err);
    return /stale/i.test(s);
  } catch {
    return false;
  }
}

function friendlyError(err) {
  if (isStale(err)) {
    return new Error(
      'Bulletin rejected the transaction as Stale: the host signed with an ' +
        'out-of-date nonce. Wait a few seconds and publish again. If it persists, ' +
        'the write allowance may still be settling on-chain (~40s after the first grant).'
    );
  }
  const msg = err instanceof Error ? err.message : String(err);
  return new Error(`Publish failed: ${msg}`);
}

async function submitOnce(bytes) {
  const { preimageManager } = await import('@novasamatech/host-api-wrapper');
  await preimageManager.submit(bytes);
}

let publishInFlight = null;

/**
 * Publish bytes to Bulletin under the user's host allowance. Requires the
 * Polkadot host. Single-flighted: concurrent calls share one submit. Returns
 * { cid, blockHash, gatewayUrl }.
 */
export async function publish(bytes, { hosted, ipfsGateway } = {}) {
  if (!hosted) {
    throw new Error('Publishing requires the Polkadot host (open Vocabulario in Polkadot Desktop or dot.li).');
  }
  // Single-flight: a second click while a publish is in flight reuses it rather
  // than firing a second submit on the same nonce.
  if (publishInFlight) return publishInFlight;
  publishInFlight = doPublish(bytes, ipfsGateway).finally(() => {
    publishInFlight = null;
  });
  return publishInFlight;
}

async function doPublish(bytes, ipfsGateway) {
  const cid = calculateCID(bytes);
  const result = () => ({ cid, blockHash: null, gatewayUrl: `${ipfsGateway}${cid}` });

  await awaitHostConnected();
  await ensureHostAllowances();

  try {
    await submitOnce(bytes);
    return result();
  } catch (err) {
    if (isStale(err)) {
      // Stale = the host signed against a nonce the chain already advanced
      // (commonly the allowance grant tx, or a prior submit). The host re-reads
      // the nonce on a fresh submit, so one retry after a short pause clears the
      // common case. Submitting the same bytes again is safe — same CID.
      await delay(2500);
      try {
        await submitOnce(bytes);
        return result();
      } catch (retryErr) {
        throw friendlyError(retryErr);
      }
    }
    // Non-Stale failure is likely an allowance/permission problem — drop the
    // ask-once flag so the next publish re-bootstraps from a fresh grant.
    resetHostAllowances();
    throw friendlyError(err);
  }
}
