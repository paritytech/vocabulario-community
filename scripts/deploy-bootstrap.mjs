#!/usr/bin/env node
/**
 * Zero-prerequisite entry point for `npm run deploy`.
 *
 * deploy.mjs imports @polkadot/util-crypto (wallet generation + address
 * derivation), which only exists after `npm install`. This bootstrap uses
 * nothing but Node built-ins, so it runs even on a freshly cloned repo with no
 * node_modules: it installs dependencies if they're missing, then hands off to
 * the real interactive deploy.
 *
 * The mnemonic is never touched here — it's only ever entered inside deploy.mjs
 * and passed in-memory to polkadot-app-deploy. Nothing secret is written to disk.
 */
import { spawnSync } from "node:child_process";
import { existsSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const SCRIPT_DIR = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = resolve(SCRIPT_DIR, "..");

function run(command, args, options = {}) {
  const result = spawnSync(command, args, { stdio: "inherit", ...options });
  if (result.error) throw result.error;
  if (result.status !== 0) {
    throw new Error(`\`${command} ${args.join(" ")}\` exited with ${result.status}.`);
  }
}

// @polkadot/util-crypto is the marker dependency deploy.mjs needs; if it isn't
// resolvable, `npm install` hasn't run yet.
const depReady = () =>
  existsSync(resolve(REPO_ROOT, "node_modules", "@polkadot", "util-crypto"));

// Inline ANSI (can't import scripts/lib/style.mjs before install on a bare
// clone). Same TTY/NO_COLOR/dumb gate as the styled CLI it hands to.
const COLOR =
  !!process.stdout.isTTY && !process.env.NO_COLOR && process.env.TERM !== "dumb";
const paint = (open) => (s) => (COLOR ? `${open}${s}\x1b[0m` : s);
const dim = paint("\x1b[2m");
const bold = paint("\x1b[1m");
const green = paint("\x1b[32m");
const red = paint("\x1b[31m");

try {
  if (depReady()) {
    console.log(dim("• prerequisites ready"));
  } else {
    console.log(bold("• installing dependencies (first run)…"));
    run("npm", ["install"], { cwd: REPO_ROOT });
    console.log(`${green("✓")} dependencies installed`);
  }

  if (!depReady()) {
    throw new Error("Dependencies are still missing after `npm install`. Check the install output above.");
  }

  run(process.execPath, [resolve(SCRIPT_DIR, "deploy.mjs")], { cwd: REPO_ROOT });
} catch (error) {
  console.error(
    `${red("✗")} deploy bootstrap failed: ${error instanceof Error ? error.message : error}`,
  );
  process.exit(1);
}
