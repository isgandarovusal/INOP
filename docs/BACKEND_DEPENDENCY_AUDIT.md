# Backend dependency security audit — 2026-10-14

`npm audit --json` reproduced 7 package findings: 3 moderate, 4 high, no critical. These are seven affected package entries, not seven independent root advisories. All listed packages were initially production dependencies (including nodemon). Raw JSON remains outside Git in /workspace/work/backend-security.

| Affected package | Severity | Dependency path | Production reachability / disposition |
|---|---|---|---|
| braces 3.0.3 | high | nodemon → chokidar → braces | Deep-pattern stack exhaustion. Development watcher chain; server.js does not import it. Now development-only and absent from clean omit-dev install. |
| chokidar 3.6.0 | high | nodemon → chokidar | Inherited braces finding; same disposition. |
| nodemon 3.1.14 | high | root → nodemon | Inherited watcher finding. npm dev still works; npm start/Docker use node server.js. Moved to devDependencies. |
| sprintf-js 1.0.3 | moderate | mammoth → argparse → sprintf-js | Unbounded format precision DoS. Mammoth's CLI bin imports argparse; current extractRawText library path does not use that CLI. Remains installed/audit-visible. |
| argparse 1.0.10 | moderate | mammoth → argparse | Inherited sprintf finding; same reachability. |
| mammoth 1.13.0 | moderate | root → mammoth | Inherited CLI dependency finding. CV DOCX library remains production-facing; existing isolated document-worker size/deadline controls are preserved, not declared a patch. |
| xlsx 0.18.5 | high | root → xlsx | Prototype pollution (<0.19.3) and ReDoS (<0.20.2). Backend currently generates candidate/audit XLSX using fixed write formats; no XLSX.read import/parser use found. Package remains vulnerable/audit-visible despite lower exposure of these parsing advisories. |

Root advisories: https://github.com/advisories/GHSA-vfj7-8cjw-p6xm (braces), https://github.com/advisories/GHSA-hp3w-g68c-fv3c (sprintf), https://github.com/advisories/GHSA-4r6h-8v6p-xvw6 and https://github.com/advisories/GHSA-5pgg-2g8v-p4x9 (SheetJS).

Registry queries returned braces 3.0.3, sprintf-js 1.1.3, nodemon 3.1.14, mammoth 1.13.0, xlsx 0.18.5 as latest. Direct checks for hypothetical braces 3.0.4/sprintf 1.1.4 returned E404. Mammoth latest still depends on argparse ~1.0.3; a blind upgrade would not remove this chain. No audit-fix force, unverifiable override, remote tarball substitution or major upgrade used.

Safe change: nodemon is a dev dependency. Docker installation uses npm ci --omit=dev and validates only runtime dependencies. Existing install secret/CA handling stays intact. For a native Render service use the equivalent build command when separately authorized; a native build that installs dev packages can still contain the watcher chain. No Render setting was changed here.

Lockfile diff contains dependency classification/dev flags only: ZERO version, integrity or resolved-source upgrades. Full audit remains 7 (3 moderate/4 high); `npm audit --omit=dev --json` reports 4 (3 moderate/1 high). This removes three high package entries from the intended runtime installation, not the underlying development vulnerabilities. npm audit exits nonzero for remaining findings as expected.

Clean isolated production installation succeeded (214 installed packages), nodemon/chokidar/braces absent; runtime module loading, synthetic DOCX extractRawText and genuine XLSX ZIP generation passed. Installation used --ignore-scripts for this local dependency smoke; no production Docker image or native build is claimed validated. Existing normal dependency/document regressions cover runtime behavior separately.

Remaining risk: a patched SheetJS source requires an officially supported off-registry distribution or a separately evaluated library migration, with artifact provenance/integrity and export contract regressions. Argparse 2+ substitution changes a transitive CLI API and is not an approved drop-in override. Upstream patches or reviewed migrations are still needed; “zero vulnerabilities” is not claimed. No production documents, database or secrets used.
