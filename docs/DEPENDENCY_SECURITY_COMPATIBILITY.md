# Scoped dependency compatibility (Step 8Q)

This change leaves INOP business logic and security gates unchanged. Backend and frontend full and production audits must all succeed. No advisory ignores or global `glob`/`minimatch` overrides are used.

## Selected boundaries

- `swagger-jsdoc@6.3.0` keeps its public API. Its `glob.sync` consumer uses scoped `glob@14.0.3` (GHSA-3g3m-2fjr-6pw4). The application currently serves a static Swagger specification; both that contract and JSDoc discovery are tested.
- `exceljs@4.4.0`, `archiver@5.3.2`, `unzipper@0.10.14`, and their legacy `glob@7.2.3` callback/traversal API remain unchanged. Only `glob@7.2.3` within ExcelJS receives the local matcher representation adapter. `readdir-glob@1.1.3` receives scoped `minimatch@11.0.4` directly.
- ESLint, config-array and TypeScript-ESTree receive scoped `minimatch@11.0.4` (GHSA-g3hv-75wg-m249). Direct tooling versions remain locked; lint inclusion/exclusion and checked TypeScript project discovery were exercised.
- Axios remains `1.20.0`; its existing `^1.16.0` dependency resolves to `follow-redirects@1.16.2` (GHSA-mrwp-f3q8-3g9p).

## Why a legacy adapter is necessary

A direct `glob@7 -> minimatch@11` replacement failed the globstar/brace regression with `Cannot read properties of undefined (reading 'charAt')`. Legacy glob reads `_glob` and uses `String.match` on entries of `Minimatch.set`. Modern minimatch emits nonrecursive Matcher objects instead of those RegExp entries.

The local `@inop/minimatch-glob7-compat` exposes those two legacy representations while delegating every match to the patched nonrecursive engine through `minimatch-modern` (an npm alias for the genuine `minimatch@11.0.4`). It does not recreate the old matching regex, change filesystem traversal, wrap HTTP endpoints, or grant permissions. Unsupported matcher representations throw rather than silently matching.

This is a narrow compatibility boundary for the locked consumers, not a promise of general compatibility for every minimatch major API or future upstream release. Parent upgrades require another review. Existing deprecation warnings for legacy archive dependencies remain; zero known audit findings is not proof of universal safety.

## Reviewed package delivery

Source lives in `Backend/vendor/minimatch-glob7-compat`. The tiny local tarball is committed alongside it so npm can resolve the scoped replacement reproducibly without publishing a package or relying on machine-specific symlinks. The lockfile pins its integrity. The regression test verifies the tarball contains exactly the reviewed source and manifest, with no extra entries.

To rebuild from repository root after reviewing and bumping the adapter version:

```sh
npm pack ./Backend/vendor/minimatch-glob7-compat --pack-destination ./Backend/vendor --ignore-scripts
```

Update the exact override tarball filename and regenerate the lockfile. Do not reuse a package version for changed bytes. Run clean installation, dependency-tree validation, four audits, compatibility tests, lint/build and the affected integration regressions. Do not introduce global overrides as a substitute.

## Focused acceptance evidence

- Callback and synchronous discovery for all three legacy glob consumers: globstar, braces, extglob, exclusions, dotfiles and nonull.
- Archiver filtered ZIP creation and independent Unzipper readback; owned wildcard cleanup through Fstream/Rimraf.
- ExcelJS buffered and streaming XLSX write/readback: Unicode, numbers, formulas, dates and formatting.
- Existing spreadsheet migration/Audit workbook safety, Audit report/export/security and HR resource-scope regressions.
- Handoff authorization/privacy and actual UI draft/revocation/401/403/404/request/31-second idle regressions.
- Tooling include/exclude, unused-variable errors, glob-based TypeScript program creation and semantic diagnostic preservation.
- Synthetic loopback-only HTTP checks: redirect, 401, timeout and cross-realm sensitive-header stripping. The last check fails with `follow-redirects@1.16.1` and passes with `1.16.2`.

An initial local Audit run on standalone Mongo returned the expected transaction-required 503. Those five tests were rerun successfully on an owned replica set matching CI. No production database was involved. Full hosted CI remains a separate release gate; local success does not establish deployment or production readiness.
