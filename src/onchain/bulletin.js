/**
 * Bulletin chain integration for Vocabulario.
 *
 * READ (retrieve by CID): pure unauthenticated HTTP GET against IPFS gateways —
 * zero deps, works standalone or hosted. This is the supported read path that
 * LocalDOT itself uses (the Bulletin SDK has no read API yet).
 *
 * WRITE (publish): host-only, like LocalDOT in the host — the user's own account
 * under an RFC-0010 Bulletin allowance (`preimageManager.submit`). No dev key,
 * no standalone fallback: publishing outside the Polkadot host is unavailable.
 *
 * NOTE: Bulletin storage is NOT permanent — data is evicted after a retention
 * period unless renewed. Local JSON download remains the backup of record.
 */

import { isHosted } from '../wallet.js';

export const IPFS_GATEWAY = (
  import.meta.env.VITE_IPFS_GATEWAY || 'https://paseo-bulletin-next-ipfs.polkadot.io/ipfs/'
).replace(/\/?$/, '/');

/** Publishing is available only inside the Polkadot host (allowance path). */
export function publishEnabled() {
  return isHosted();
}

const GATEWAYS = [
  import.meta.env.VITE_IPFS_GATEWAY,
  'https://paseo-bulletin-next-ipfs.polkadot.io/ipfs/',
  'https://dweb.link/ipfs/',
  'https://ipfs.io/ipfs/'
]
  .filter(Boolean)
  .map((g) => g.replace(/\/?$/, '/'));

/** Fetch a JSON blob from Bulletin/IPFS by CID, trying gateways in cascade. */
export async function fetchDictionaryByCid(cid) {
  const id = (cid || '').trim();
  if (!id) throw new Error('Enter a CID');
  let lastErr;
  for (const gw of GATEWAYS) {
    try {
      const res = await fetch(gw + id, { signal: AbortSignal.timeout(15000) });
      if (!res.ok) {
        lastErr = new Error(`HTTP ${res.status}`);
        continue;
      }
      return await res.json();
    } catch (e) {
      lastErr = e;
    }
  }
  throw new Error(`Could not fetch ${id}: ${lastErr?.message || 'all gateways failed'}`);
}

/** Publish bytes to Bulletin under the user's host allowance. Heavy deps lazy. */
export async function publishBytes(bytes) {
  const { publish } = await import('./bulletin-write.js');
  return publish(bytes, { hosted: isHosted(), ipfsGateway: IPFS_GATEWAY });
}
