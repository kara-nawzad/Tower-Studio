# Contributing to Tower Studio

Thank you for your interest in contributing to **Tower Studio**! Whether you are fixing a bug, refining documentation, or expanding telecom engineering models, this guide walks you through the process step by step.

---

## How to Contribute

### 1. Fork and Clone

1. Click **Fork** in the top-right corner of the [Tower-Studio repository](https://github.com/kara-nawzad/Tower-Studio).
2. Clone your fork locally:
   ```bash
   git clone https://github.com/<your-username>/Tower-Studio.git
   cd Tower-Studio
   ```

### 2. Create a Branch

Create a descriptive branch for your work:

```bash
git checkout -b feat/your-feature-name
# or for bug fixes:
git checkout -b fix/your-bug-fix
```

### 3. Install Tools and Run Locally

Requires **Node.js 20 or newer** for linting, formatting, and automated tests:

```bash
npm install
npm run dev
```

Open `http://localhost:3000` in your browser to preview your changes live.

### 4. Format, Lint, Test, and Build

Before committing, verify that code formatting, linting, tests, and the static build all pass:

```bash
npm run format
npm run lint
npm test
npm run build
```

### 5. Commit Your Changes

Write small, clear commit messages following [Conventional Commits](https://www.conventionalcommits.org/):

- `feat: ...` — new capability or simulation feature
- `fix: ...` — bug fix
- `docs: ...` — documentation updates
- `chore: ...` — tooling, config, or maintenance
- `refactor: ...` — code organization without behavior changes
- `ci: ...` — GitHub Actions or workflow updates

### 6. Open a Pull Request

Push your branch to your fork and open a Pull Request against `main` using the repository's [Pull Request Template](./.github/PULL_REQUEST_TEMPLATE.md).

---

## Project Guidelines

- **Keep it zero-key & client-side:** All simulation, CLI, and Phase 07 AI features must run locally in browser JavaScript with zero paid APIs, external servers, or hardcoded secrets.
- **Preserve engineering constraints:** Environment/tower rules, rectifier N+1 math, microwave link-budget formulas, and the 6-gate Carrier Acceptance guard should remain deterministic and physically grounded (see [`docs/technical-reference.md`](./docs/technical-reference.md)).
- **Respect ergonomics & accessibility:** Maintain ≥ 44 × 44 px touch targets on mobile (390–430 px viewports), keep mobile drawers ≤ 44vh, and honor `prefers-reduced-motion`.
- **Naming conventions:** Use lowercase `kebab-case` with no spaces for new files and folders inside `src/`, `docs/`, `assets/`, `scripts/`, and `tests/`.

---

## Reporting Bugs or Suggesting Features

Found a bug or have an idea? Open an issue using our [Bug Report](./.github/ISSUE_TEMPLATE/bug_report.md) or [Feature Request](./.github/ISSUE_TEMPLATE/feature_request.md) template.
