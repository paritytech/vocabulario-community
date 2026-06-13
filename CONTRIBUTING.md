# Contributing to Vocabulario

Thanks for your interest in Vocabulario.

Vocabulario is a **prototype, reference implementation, and proof-of-concept** of
a per-wallet, on-chain dictionary for learning languages, built to run inside the
Polkadot browser host. It is published for research, experimentation, and developer
education. It has **not** been audited, is actively experimental, and may contain
bugs, vulnerabilities, or incomplete features. It is provided with no warranty —
use at your own risk.

The project is licensed under **GPL-3.0-only**; by contributing you agree that your
contributions are licensed under the same terms.

This repository follows the [Parity Technologies Code of Conduct](https://github.com/paritytech/.github/blob/main/CODE_OF_CONDUCT.md).

## Filing issues

- Search the [open issues](https://github.com/paritytech/vocabulario-community/issues)
  first to avoid duplicates.
- Open a new issue with a clear title, what you expected, what actually happened,
  and the steps to reproduce. Include your environment (OS, Node version) where
  relevant.

## Opening a pull request

1. Fork the repository and create a branch from `main`
   (for example `fix/quiz-direction-toggle`).
2. Make your change as a focused, minimal commit. Use short, conventional commit
   messages (`feat:`, `fix:`, `chore:`, `docs:`).
3. Build the app on a fresh checkout before submitting — there is no bundled CI to
   run quality gates for you:

   ```bash
   npm install
   npm run build      # must succeed
   npm run dev        # smoke-test the UI at http://localhost:5173
   ```

4. Push your branch to your fork and open a pull request against `main`,
   describing what changed and why.

## Reporting a vulnerability

Please do **not** open a public issue for security vulnerabilities. For Parity's
security disclosure process and Bug Bounty program, visit
https://parity.io/bug-bounty.
