/**
 * Interactive, (almost) no-skill deploy for Vocabulario.
 *
 * One command takes you from nothing to a live .dot product:
 *   1. generate a fresh wallet or paste an existing 12/24-word mnemonic,
 *   2. fund the printed address (faucet link, then press Enter),
 *   3. build the web app (Vite static export), and
 *   4. publish it to a .dot domain via polkadot-app-deploy.
 *
 * The mnemonic only ever lives in memory — it is handed to polkadot-app-deploy
 * via the MNEMONIC env var for the publish, never written to disk.
 *
 * Usage:  npm run deploy    (from the repo root)
 */
import { spawnSync } from "node:child_process";
import { existsSync, readdirSync } from "node:fs";
import { homedir } from "node:os";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { createInterface } from "node:readline/promises";
import {
  cryptoWaitReady,
  mnemonicGenerate,
  mnemonicToMiniSecret,
  sr25519PairFromSeed,
  encodeAddress,
} from "@polkadot/util-crypto";

import * as ui from "./lib/style.mjs";

const SCRIPT_DIR = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = resolve(SCRIPT_DIR, "..");
const DIST = resolve(REPO_ROOT, "dist");

// polkadot-app-deploy --env id for the Paseo Next v2 Bulletin chain.
const BULLETIN_ENV = "paseo-next-v2";
// Where the published product is reachable; override with DOTNS_GATEWAY_BASE.
const GATEWAY_BASE = process.env.DOTNS_GATEWAY_BASE ?? "dot.li";
// Generic Substrate SS58 prefix — for display + faucet only (the chain keys on
// the public key, not the address encoding).
const SS58_PREFIX = 42;

// polkadot-app-deploy stores a paired mobile (QR `login`) session under this dir;
// the filename is version-suffixed (…_SsoSessions[V2].json), so we match by
// prefix (mirroring the tool). It may prefer such a session over the MNEMONIC we
// pass, so we detect it before publishing.
const SSO_SESSION_DIR = resolve(homedir(), ".polkadot-apps");
const SSO_SESSION_PREFIX = "polkadot-app-deploy_SsoSessions";

function normalizeMnemonic(raw) {
  return raw.replace(/\s+/g, " ").trim();
}

function assertWordCount(mnemonic) {
  const words = mnemonic.split(" ").filter(Boolean).length;
  if (words !== 12 && words !== 24) {
    throw new Error(`Mnemonic has ${words} words; expected 12 or 24. Re-check the phrase.`);
  }
}

function parseSemver(value) {
  const m = value.match(/(\d+)\.(\d+)\.(\d+)/);
  return m ? [Number(m[1]), Number(m[2]), Number(m[3])] : null;
}

/** Probe the installed polkadot-app-deploy. Returns its version string, or null if it isn't on PATH. */
function probePolkadotAppDeployVersion() {
  const probe = spawnSync("polkadot-app-deploy", ["--version"], { encoding: "utf8" });
  if (probe.error || probe.status !== 0) return null;
  return `${probe.stdout ?? ""}${probe.stderr ?? ""}`.trim();
}

function isUsableVersion(version) {
  return !!version && !!parseSemver(version);
}

/**
 * Ensure a recent polkadot-app-deploy is available. If a good one is already on
 * the machine, use it. If it's missing, install the latest globally
 * (`npm i -g @parity/polkadot-app-deploy@latest`) so this and future deploys
 * reuse it. Only if that isn't possible do we fall back to a throwaway `npx`
 * fetch. Returns the argv prefix to spawn.
 */
function resolvePolkadotAppDeployCommand() {
  const installed = probePolkadotAppDeployVersion();
  if (isUsableVersion(installed)) {
    ui.success(`${installed} (installed)`);
    return ["polkadot-app-deploy"];
  }

  if (installed) {
    ui.warn(`${installed} reported an unparseable version — installing latest globally…`);
  } else {
    ui.info("polkadot-app-deploy not found — installing latest globally (npm i -g)…");
  }

  const install = spawnSync("npm", ["install", "-g", "@parity/polkadot-app-deploy@latest"], { stdio: "inherit" });
  if (install.status === 0) {
    const after = probePolkadotAppDeployVersion();
    if (isUsableVersion(after)) {
      ui.success(`${after} (installed)`);
      return ["polkadot-app-deploy"];
    }
    ui.warn("Global install completed but polkadot-app-deploy still isn't usable — falling back to npx.");
  } else {
    ui.warn("Global install failed (npm i -g) — falling back to npx latest for this run.");
  }
  return ["npx", "-y", "@parity/polkadot-app-deploy@latest"];
}

async function resolveWallet(rl) {
  ui.section("Wallet");
  ui.choice(1, "Generate a new wallet");
  ui.choice(2, "Paste an existing mnemonic");
  const choice = (await rl.question(ui.ask("Choose [1]: "))).trim() || "1";

  if (choice === "2") {
    const pasted = normalizeMnemonic(
      await rl.question(ui.ask("Paste your 12/24-word mnemonic: ")),
    );
    assertWordCount(pasted);
    return pasted;
  }

  const seed = mnemonicGenerate(12);
  ui.notice(
    "NEW WALLET MNEMONIC — write this down now",
    [
      ui.bold(ui.cyan(seed)),
      "",
      ui.dim("Anyone with these words controls the wallet. Never commit it."),
    ],
    "yellow",
  );
  await rl.question(ui.ask("Press Enter once you've saved it… "));
  return seed;
}

/** Derive the SS58 address from a mnemonic (sr25519), for funding + display. */
function deriveAddress(mnemonic) {
  const pair = sr25519PairFromSeed(mnemonicToMiniSecret(mnemonic));
  return encodeAddress(pair.publicKey, SS58_PREFIX);
}

function normalizeDomain(raw) {
  let domain = raw.trim().toLowerCase();
  if (!domain) throw new Error("A domain is required.");
  if (!domain.endsWith(".dot")) domain += ".dot";
  return domain;
}

function runBuild() {
  ui.section("Build");
  ui.step("Building the web app (vite)…");
  const result = spawnSync("npm", ["run", "build"], { cwd: REPO_ROOT, stdio: "inherit" });
  if (result.status !== 0) throw new Error("web build failed (npm run build).");
  if (!existsSync(resolve(DIST, "index.html"))) {
    throw new Error(`Build did not produce ${DIST}/index.html.`);
  }
  ui.success("Static export ready (dist/).");
}

function publishDapp(command, domain, seed) {
  ui.section("Publish");
  ui.step(`polkadot-app-deploy --env ${BULLETIN_ENV} → ${domain}…`);
  const [bin, ...prefixArgs] = command;
  const args = [...prefixArgs, "--env", BULLETIN_ENV, DIST, domain];
  // polkadot-app-deploy merkleizes via a local IPFS (kubo); if it isn't usable,
  // fall back to its pure-JS merkleizer so no kubo install/init is required.
  // Probe a repo-bound command (`ipfs repo stat`) rather than `--version`: the
  // binary can be present while the repo is uninitialized.
  const kuboReady = spawnSync("ipfs", ["repo", "stat"], { encoding: "utf8" }).status === 0;
  if (!kuboReady) {
    ui.info("ipfs (kubo) not available or not initialized — using --js-merkle (pure-JS merkleization).");
    args.push("--js-merkle");
  }
  const result = spawnSync(bin, args, {
    cwd: REPO_ROOT,
    stdio: "inherit",
    // MNEMONIC stays in-memory only — never written to disk. NODE_OPTIONS mirrors
    // CI so the publish doesn't OOM on the bundle.
    env: {
      ...process.env,
      MNEMONIC: seed,
      NODE_OPTIONS: "--max-old-space-size=8192",
    },
  });
  if (result.status !== 0) throw new Error("polkadot-app-deploy failed.");
}

/**
 * polkadot-app-deploy may prefer a paired mobile (QR `login`) session over the
 * MNEMONIC we pass — so a leftover session would publish and register the .dot
 * as a DIFFERENT account than the wallet we deployed from. If one exists, offer
 * to clear it so the publish uses the mnemonic (the single-secret design).
 */
async function ensureMnemonicSigner(rl, command) {
  if (!existsSync(SSO_SESSION_DIR)) return;
  const hasSession = readdirSync(SSO_SESSION_DIR).some(
    (f) => f.startsWith(SSO_SESSION_PREFIX) && f.endsWith(".json"),
  );
  if (!hasSession) return;
  ui.section("Signer");
  ui.warn(
    "A saved polkadot-app-deploy mobile session exists; it may use it to publish " +
      "(and register the .dot) instead of your deploy mnemonic.",
  );
  ui.choice(1, "Log out and publish with the mnemonic (recommended; clears the saved login)");
  ui.choice(2, "Keep the session and approve the publish on your phone");
  const choice = (await rl.question(ui.ask("Choose [1]: "))).trim() || "1";
  if (choice !== "1") return;
  const [bin, ...prefixArgs] = command;
  const result = spawnSync(bin, [...prefixArgs, "logout"], { cwd: REPO_ROOT, stdio: "inherit" });
  if (result.status !== 0) ui.warn("`polkadot-app-deploy logout` failed — the session may still be used.");
  else ui.success("Session cleared — publishing with the mnemonic.");
}

async function main() {
  await cryptoWaitReady();
  ui.banner("VOCABULARIO", "one-shot deploy · frontend → .dot");
  const polkadotAppDeploy = resolvePolkadotAppDeployCommand();

  const rl = createInterface({ input: process.stdin, output: process.stdout });
  try {
    const seed = await resolveWallet(rl);
    const ss58 = deriveAddress(seed);

    ui.section("Funding");
    ui.info("Send testnet PAS to this address (needed for the .dot registration):");
    ui.kvBlock([
      ["SS58", ss58],
      ["Faucet", "https://faucet.polkadot.io/?parachain=1500"],
    ]);
    ui.info("A clean (no trailing-digits) label also needs Personhood (PoP) set on the account.");
    await rl.question(ui.ask("Press Enter once the address is funded… "));

    ui.section("Domain");
    // DotNS naming policy, framed for a NoStatus signer (no personhood — the
    // common case): 9+ chars, ending in zero or exactly two digits.
    ui.info("Naming rules:");
    ui.info("• 9+ characters");
    ui.info("• end with zero or exactly two digits (e.g. mydappname or mydappname42)");
    let domain = "";
    while (!domain) {
      const answer = (await rl.question(ui.ask("Domain to publish to (.dot): "))).trim();
      if (!answer) {
        ui.warn("A domain is required — enter a .dot name to publish to.");
        continue;
      }
      domain = normalizeDomain(answer);
    }

    runBuild();
    await ensureMnemonicSigner(rl, polkadotAppDeploy);
    publishDapp(polkadotAppDeploy, domain, seed);

    const name = domain.replace(/\.dot$/, "");
    ui.notice(
      "Deployment complete",
      [`${ui.dim("Live at ")}  ${ui.bold(ui.cyan(`https://${name}.${GATEWAY_BASE}`))}`],
      "green",
    );
  } finally {
    rl.close();
  }
}

main().catch((error) => {
  ui.fail(`Deploy failed: ${error instanceof Error ? error.message : error}`);
  process.exit(1);
});
