# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

`pm-detect` is a published CLI (also exposes a library API) that detects which Node package manager a project uses (`npm`, `yarn`, `yarnBerry`, `pnpm`, `bun`) and returns the associated command set as JSON. Distributed via npm and intended to be invoked with `npx pm-detect`.

## Commands

- `npm test` — Vitest (interactive). Use `npm test -- --run` for a single non-watch run (this is what CI uses).
- Run a single test file: `npm test -- --run src/lib.test.ts`
- Run by name pattern: `npm test -- --run -t "should detect bun from bun.lock"`
- `npm run typecheck` — `tsc --noEmit` against `tsconfig.json`
- `npm run lint` / `npm run lint:fix` — ESLint flat config in `eslint.config.mjs`
- `npm run format` / `npm run format:check` — Prettier
- `npm run build` — emits to `dist/` via `tsconfig.build.json` (excludes `*.test.ts`, emits `.d.ts` to `dist/types`) and `chmod +x dist/cli.js`
- `npm run dev` — `tsc --watch` for the build config

Node toolchain is pinned exactly for contributors and CI via `.nvmrc` (`24.16.0`) and `packageManager` (`npm@11.13.0`) in `package.json`. CI workflows read `.nvmrc` via setup-node's `node-version-file` input — bump in one place to roll the toolchain. `engines.node` is a minimum range (`>=20`), not an exact pin: it's the *consumer-facing* compatibility floor, set to the lowest Node version that supports the compile target (`es2024` via `@tsconfig/node24`). Exact-pinning `engines` would emit EBADENGINE warnings (and hard-fail consumers with `engine-strict=true`) on every Node patch release.

## Critical constraint: zero runtime dependencies

This package ships with **no runtime dependencies** — only `devDependencies` are allowed in `package.json`. Anything required at runtime must be implemented in-repo or come from Node's stdlib. Do not add anything to `dependencies`. When adding tooling, use `npm install -D <pkg>`.

## Architecture

The detection pipeline lives in three files; understanding how they compose is the key to navigating the codebase.

### Strategies and traversal

`detect()` in `src/lib.ts` is the core. It runs an outer loop over directories (via `lookUp()` in `src/utils.ts`, a generator that walks from `cwd` up to the filesystem root) and an inner loop over strategies. Default strategy order:

1. `packageJson` — read `packageManager` field from `package.json` (most authoritative; gives name + version)
2. `lockFile` — match against `LOCK_FILE_NAMES` in `src/constants.ts` (returns name only, no version)
3. `userAgent` — parse `npm_config_user_agent` env var

**Order matters.** Strategies short-circuit on first hit per directory, but the outer directory loop also short-circuits — meaning a deeper `package.json` with no `packageManager` field will *not* fall through to a lockfile in a parent directory unless `lockFile` runs in the same iteration. Both loops are intentional and tested (see "traverse up directory tree" and "prioritize package.json" cases in `src/lib.test.ts`).

`userAgent` as a fallback is also applied *after* the directory walk completes, in case nothing was found in any directory. This is separate from including `userAgent` in the strategy list.

### Commands resolution

`getCommands()` returns the command map from `PACKAGE_MANAGER_COMMANDS` (in `src/constants.ts`). Yarn ≥ 2 ("Yarn Berry") has a separate command set (`yarn dlx` vs `npx`, `--immutable` vs `--frozen-lockfile`, no `yarn global`, etc.) and is selected by parsing the major version from the detected `version` string. This branching only fires when `detect()` returned a version — lockfile-only detections fall back to classic yarn commands.

### CLI vs library surface

- `src/cli.ts` — argv parsing, `--working-dir`, `--strategies`, `--help`, `--version`. Composes `detect()` + `getCommands()` + `getLockFilePath()` and prints a single JSON blob.
- `src/index.ts` — public library exports: `detect`, `getCommands`, `getLockFilePath`. Keep this surface narrow; it's the published API.
- `src/types.ts` — `PackageManager` and `DetectOptions`. Strategy union lives here.

### Tests and fixtures

Tests are colocated (`src/*.test.ts`). Fixture projects under `test/fixtures/` represent real on-disk layouts (npm, yarn, pnpm, bun lockfiles; bun.lockb; package.json-only; mixed; nested with a `subdir` for traversal tests; empty). When adding a new detection scenario, add a fixture rather than mocking `fs` — the `lib.test.ts` suite reads the real filesystem on purpose. `utils.test.ts` mocks `fs` for unit-level coverage of the parsers.

Note: the "empty-project" fixture has no package-manager files. Tests that use it deliberately exercise the directory-walk fallback — `detect()` walks up and finds *this repo's own* `package.json`. Assert on behavior (e.g. `result?.name === 'npm'`), not on the exact version, so the tests don't break when this repo's toolchain pins change.

## Release flow

Releases use [`release-please`](https://github.com/googleapis/release-please) in manifest mode, driven by [Conventional Commits](https://www.conventionalcommits.org/). Two workflows plus a manual approve step, no direct writes to `main` and no CI-driven publish to npm:

1. `.github/workflows/release.yml` — on push to `main`, runs `release-please-action` which opens or updates a single **Release PR** containing the version bump + regenerated `CHANGELOG.md` entry. CI (`ci.yml`) runs on that PR. Merging it (a human action) is the release gate.
2. `.github/workflows/stage.yml` — fires on the GitHub Release `published` event that release-please creates when the Release PR is merged. Runs [`npm stage publish --provenance --access public`](https://docs.npmjs.com/cli/v11/commands/npm-stage) on Node 24 with OIDC, depositing the tarball in npm's staging area without making it public.
3. **Manual promote** — a maintainer runs `npm stage list` to find the staged version, then `npm stage approve <stage-id>` locally with 2FA to promote it to the public registry (`npm stage reject <stage-id>` to discard).

Version state lives in `.release-please-manifest.json` (currently `0.5.0`). `release-please-config.json` configures:

- `bump-minor-pre-major: true` — breaking changes (`feat!:`, `BREAKING CHANGE:`) bump minor instead of major while pre-1.0, so a single breaking change doesn't accidentally promote the project to 1.0.0.
- `bump-patch-for-minor-pre-major: false` — `feat:` commits still bump minor pre-1.0 (the default). Flip to `true` if you want patch-only bumps until you explicitly cut 1.0.0.
- `include-component-in-tag: false` — release-please looks for `v<version>` tags (matching the existing `v0.5.0` tag from the old `auto` flow) instead of the manifest-mode default `<component>-v<version>`.

The two-workflow split keeps `setup-node` out of the same workflow as `release-please-action`, which is what kept zizmor from flagging the staging path as a cache-poisoning vector.

The stage + approve gate is the supply-chain analogue of the release-please PR gate: CI cannot put a tarball on the public registry without a human present with 2FA, so a compromised CI runner cannot ship a malicious version unilaterally.

A `GH_TOKEN` PAT secret is required so that the Release PR opened by release-please triggers `ci.yml` and `zizmor.yml` (default `GITHUB_TOKEN` does not). `NPM_TOKEN` is the staging credential, paired with OIDC provenance.

### Workflow-hardening pre-flight

Any change under `.github/workflows/` must, before commit, pass both:

- `pinact run --check` — every `uses:` ref pinned to a commit SHA (`# vX.Y.Z` comment trailing the SHA).
- `zizmor .github/workflows/` — no findings at the default `regular` persona.

`.github/workflows/zizmor.yml` enforces the same check in CI on every push and PR.

### Branch protection on `main`

The release-please security model (no direct writes to `main`, human-in-the-loop on Release PR and `npm stage approve`) depends on these branch protection rules being applied in the GitHub UI (Settings → Branches → rule for `main`):

- Disallow direct pushes — all changes go through PRs. No force-pushes, no admin bypass.
- Require at least one approving review.
- Required status checks (must be green to merge):
  - `Node CI` (typecheck + lint + test + build)
  - `Zizmor` (workflow static analysis)
  - `Validate PR title` (Conventional Commit format on the PR title — squash-merge uses the title as the commit message on `main`)
- Require linear history (no merge commits) — keeps the `main` log parseable by release-please.
- Require conversation resolution before merging.
- Allow only squash merges; disable merge commits and rebase merges. With squash merges, the PR title becomes the commit message on `main`, which is exactly what `Validate PR title` is gating.

### Accepted feature loss vs `auto`

The previous `auto`-based flow had an `all-contributors` plugin that updated `.all-contributorsrc` and the README contributors table during releases. release-please has no equivalent; both files remain in the repo as manual artifacts. Future contributor updates are either hand-edits or done via the `@all-contributors` GitHub bot (PR-comment driven, no CI write access).

## Conventions

- Functional and declarative; no classes
- Prefer named exports
- Use the `function` keyword for pure functions rather than arrow assignments
- File names: kebab-case
- Prefer maps over enums
- For documentation, follow the [Grafana writers' toolkit](https://grafana.com/docs/writers-toolkit/write/style-guide/)
