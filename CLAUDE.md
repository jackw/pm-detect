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
- `npm run release` — `auto shipit` (release tooling, normally only run in CI)

Node ≥ 20 required. CI matrix tests on Node 20; release publishes on Node 24 (needed for npm OIDC provenance).

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

Note: the "empty-project" fixture resolves to `npm` because the test walks up and finds *this repo's own* `package-lock.json`. This is expected behavior, not a bug.

## Release flow

Releases use [`auto`](https://intuit.github.io/auto/) (config inline in `package.json` under `auto`). `onlyPublishWithReleaseLabel: true` means a PR must carry a release label (e.g. `minor`, `patch`) for `auto shipit` to publish. The `released` plugin comments on shipped PRs; `all-contributors` updates the contributors list on merge. Publishing uses npm provenance (OIDC) — that's why the release job runs on Node 24.

## Conventions

- Functional and declarative; no classes
- Prefer named exports
- Use the `function` keyword for pure functions rather than arrow assignments
- File names: kebab-case
- Prefer maps over enums
- For documentation, follow the [Grafana writers' toolkit](https://grafana.com/docs/writers-toolkit/write/style-guide/)
