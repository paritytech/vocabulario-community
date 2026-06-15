#!/usr/bin/env bash
#
# setup.sh — prepare a fresh checkout of this template for development.
#
#   1. installs npm dependencies (if missing)
#   2. fetches the @parity/product-sdk skills into .claude/skills/ so AI
#      coding assistants (Claude Code, Cursor, Windsurf, Copilot, Gemini)
#      have Polkadot Product SDK guidance on hand while you build.
#
# The skills live in github.com/paritytech/product-sdk and are NOT committed
# to this template (.claude/skills/ is gitignored) — they're fetched fresh so
# they never go stale. Safe to re-run. Pass --refresh to re-pull the skills
# even if they're already present.
#
#   ./setup.sh            # install deps + fetch skills if missing
#   ./setup.sh --refresh  # also re-pull the latest skills
#
# Overridable via env: PRODUCT_SDK_REPO, PRODUCT_SDK_REF (default: main).

set -euo pipefail
cd "$(dirname "$0")"

SKILLS_REPO="${PRODUCT_SDK_REPO:-https://github.com/paritytech/product-sdk.git}"
SKILLS_REF="${PRODUCT_SDK_REF:-main}"
SKILLS_SUBDIR="product-sdk/skills"
SKILLS_DEST=".claude/skills"

# --- 1. dependencies ---------------------------------------------------------
if [ ! -d node_modules ]; then
  if ! command -v npm >/dev/null 2>&1; then
    echo "    npm not found — install Node.js (>= 20) and re-run." >&2
    exit 1
  fi
  echo "==> Installing npm dependencies..."
  npm install --no-audit --no-fund
else
  echo "==> node_modules present; skipping npm install (delete it to reinstall)."
fi

# --- 2. @parity/product-sdk skills ------------------------------------------
if [ -n "$(ls -A "$SKILLS_DEST" 2>/dev/null || true)" ] && [ "${1:-}" != "--refresh" ]; then
  echo "==> ${SKILLS_DEST}/ already populated; pass --refresh to re-pull."
  exit 0
fi

if ! command -v git >/dev/null 2>&1; then
  echo "    git not found — skipping skills fetch." >&2
  exit 0
fi

echo "==> Fetching @parity/product-sdk skills into ${SKILLS_DEST}/ ..."
tmp="$(mktemp -d)"
trap 'rm -rf "$tmp"' EXIT

if ! git clone --quiet --depth 1 --branch "$SKILLS_REF" \
      --filter=blob:none --sparse "$SKILLS_REPO" "$tmp" 2>/dev/null; then
  echo "    Could not clone ${SKILLS_REPO}@${SKILLS_REF} (offline?) — skipping." >&2
  exit 0
fi
git -C "$tmp" sparse-checkout set "$SKILLS_SUBDIR" >/dev/null 2>&1

if [ ! -d "$tmp/$SKILLS_SUBDIR" ]; then
  echo "    No ${SKILLS_SUBDIR} found in the repo — skipping." >&2
  exit 0
fi

mkdir -p "$SKILLS_DEST"
rm -rf "${SKILLS_DEST:?}"/*
cp -R "$tmp/$SKILLS_SUBDIR/." "$SKILLS_DEST/"

echo "==> Done. Skills now in ${SKILLS_DEST}/:"
find "$SKILLS_DEST" -mindepth 1 -maxdepth 1 -type d -exec basename {} \; | sort | sed 's/^/      - /'
