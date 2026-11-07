# Recovery and real staging acceptance — 7 November 2026

## Recovery versus reconstruction

The old `/tmp/inop-approved-recovery` source, uncommitted patches, native binaries
and QA artifacts were **UNRECOVERED** through the available capabilities, not
proven permanently lost. One bounded read-only pass found no accessible recovery
artifacts, additional worktrees, stashes or unreachable Git objects. Empty shared
artifact directories and absent old temporary paths are not proof of backup loss.
No workspace, volume, index or source was reset/cleaned to attempt recovery.

Available clean checkout `/workspace/INOP` remains at
`fccabbb19fbd4259c2a8e5fb83a42c356c8f1f0c`, separate from development.
A complete verified Git bundle, byte-identical index copy, empty staged/unstaged
patches and status record are retained at `/workspace/inop-recovery-preservation`.
Bundle SHA256: `92d301476e8565d6848eab5eeab069616c8bb0e902b93120aeb120755b78d92e`;
index SHA256: `24a40ea7f970f644d7d55b4674baee833c42ef98d3099cd24d976bc1b6e7ba1e`.
These protect the available checkout; they do not recover the missing old index.

Remote was verified at `77262852fb63807ea4cbe3a40de724b2e1ecfba8` before reconstruction.
A new independent HTTPS clone was made at the previously missing temporary path;
no shared objects, alternates or linked worktree were used. Remote accepted
functionality was recovered; the two journal fixes and real S3 acceptance were
**reconstructed**, without claiming byte/patch equivalence to the missing work.
Historical PASS labels were not reused as fresh results.

## Fresh results

| Item | Classification | Actual evidence / remaining boundary |
|---|---|---|
| Journal defects | PASS — LOCAL ONLY | [Before/after](INDEX.md): both failures reproduced; strict scalar types and safe receipt lifecycle fixed. Final recovery tests4/4; existing service test1/1, real Mongo7.0.45. No deployed data inspected/DDL. |
| Private storage restore | PASS — ISOLATED STAGING | [Receipt](storage-result.json), real SeaweedFS4.52, actual SigV4 adapter, HTTPS and Express/Mongo authorization; 12 named checks, two original PDF/DOCX byte backups restored to unchanged references. Not a mock provider. |
| Harness boundaries | PASS — LOCAL ONLY | [Guard checks](runner-guards.txt),3/3 including scanner guard. All new JS syntax/diff checks pass. Production bindings/processing gates rejected. |
| Deployment-host scanner | BLOCKED — OWNER ACTION | [Actual preflight](scanner-preflight.json): no clamscan/sigtool. Runner delivered; native execution not claimed. Prior hosted42280035394 is historical evidence only. |
| Full two-worker/source-owner combination | BLOCKED — OWNER ACTION | Real Mongo and S3 are now available locally, but no real scanner or owner source profiles/approved target runtime. Existing six-case process acceptance was not repeated or relabelled. |
| Russian transcription | FAIL — REPRODUCED | [Fresh crop diagnostic](ocr-crop.json): regenerated repository layout, EN4/4, AZ4/4, RU3/4. Alternate crop reads HACCP; primary remains НАССР. Original pinned scan remains unrecovered, so this is not its acceptance. |
| Contextual AI | BLOCKED — OWNER ACTION | No approved model bundle found in available artifact/cache locations; no Transformers/Torch runtime, no reviewed revision/license/digest packet. No inference, model download or production AI change. |

S3 tests include unsigned/cross-department denial, revoked users and revocation
while awaiting a real provider read, exact-byte recovery, immutable conflicts,
corrupt-object rejection and a real provider outage/restart. The deliberate
read delay is injected; provider responses, persisted objects, HTTP and MongoDB
are real. The fixture's HR membership collaborator follows the existing owned
scope harness; this is not acceptance of a real organization's role provisioning.
Its loopback TLS transport does not exercise production DNS/network policy.
Synthetic S3 keys/TLS material and raw server logs were not committed.

## Commands and scope

- Journal: `INOP_AUDIT_TEST_PORT=27018 node --test Backend/tests/journalRolloutRecovery.test.cjs`.
- Original service check executed freshly: `INOP_AUDIT_TEST_PORT=27018 node --test Backend/tests/duplicateJournalIndex.test.cjs`.
- Guards: `node --test Backend/tests/scannerTargetGuard.test.cjs Backend/tests/stagingRecoveryGuard.test.cjs`.
- Real storage/preflight: [operator procedure](../../RECRUITMENT_ISOLATED_ACCEPTANCE.md).
- Scanner: [operator procedure](../../HR_NATIVE_MALWARE_SCANNER.md#isolated-deployment-host-acceptance-runner-7-november-2026).
- OCR: prepare existing hash-pinned models, then `python3 Backend/scripts/diagnoseOcrScriptAmbiguity.py`.

The official Apache-2.0 SeaweedFS archive and executable were independently hashed;
[artifact receipt](provider-artifact.json). Mongo official image was run with only
tmpfs `/data/db` and `/data/configdb`, loopback27018 and a replica set; no persistent
Docker volumes. Backend lockfile dependencies installed with scripts disabled.
No new runtime dependency, schema, product route, UI, scoring, CAPA, hiring,
cache, authorization or provenance behavior changed. Accepted browser suites were
not rerun; no new Playwright PASS is claimed for non-UI tooling changes. No
comprehensive CI was started.

## OCR interpretation and measurements

Real Tesseract5.5.0 with the existing pinned tessdata_fast4.1.0 models. Primary
language order matches the runtime (`aze+eng+rus`,PSM6). A bounded generic word-box
crop/3x resize/English PSM7 alternative produced HACCP in108ms. Three-language
experiment1671ms; Python peak23.63MiB, greatest child peak57.77MiB, not whole-system
peak. Regenerated source-image hashes are retained. EN/AZ marker coverage4/4,
RU3/4; English/Russian/Azerbaijani explicit adverse phrases remained in the primary
output. These small synthetic cases do not prove comprehensive language quality.
No extraction is replaced, no candidate fact is changed and no alternative is
sent to ATS/AI. This diagnostic is an operator/human-review aid, not a fix or
validated contextual inference. Existing warning/manual review remains necessary.

## Exact remaining owner actions

1. **Scanner operations owner:** supply approved isolated native host/runtime,
   verified official definitions under24h and read/execute permissions documented
   in the scanner procedure. Run preflight then synthetic-only; retain sanitized
   identity/results. Authorize and witness supervised reload/restart, changed
   definitions, quarantine API denial and resource/deadline tests separately.
   No production intake enablement follows from a local PASS.
2. **Storage owner:** supply approved private non-production bucket/test prefix,
   protected `HR_CV_STORAGE_*` bindings and exact-key conditional Put/Get and
   approved restore/delete/version permissions. Execute provider-specific restore
   from a real approved backup/version; require original SHA256/size/revision and
   authorized200/unsigned+cross-scope denial. The new Seaweed runner accepts only
   its own loopback target, not arbitrary production bindings.
3. **Source owner + operations:** approve isolated KFC/Pizza Hut source IDs,
   `createSignedSource` source secret bindings (never values in reports),
   noticeVersion, brand/job mappings, privacy/ownership approvals, scoped actors,
   real scanner/store and two supervised workers. No environment auto-profile is
   installed. Run the existing [ten-scenario owner sequence](../readiness-dependencies-2026-11-06/README.md#3-staged-workersource-owner-sequence);
   require one durable source/publication/HR-review state and no cross-brand data.
4. **DBA:** protected approved target `MONGO_URI`, aggregate/read/index-inspection
   privileges; run `node Backend/scripts/duplicateJournalIndex.cjs` read-only.
   Return malformed/conflict/truncation/index receipt only. Apply/rollback require
   separately approved backup, paused writers and explicit DDL permissions per
   [rollout procedure](../../DUPLICATE_JOURNAL_INDEX_ROLLOUT.md). No production DDL
   or silent conflict deletion was performed.
5. **Model owner:** approved official publisher/repository, exact immutable revision,
   artifact SHA256, commercial/weight license, tokenizer/runtime/quantization
   provenance and CPU/RAM budget. Execute existing42-case AZ/EN/RU + safety slices
   offline; report FP/FN, grounded recall/coverage/attribution, latency/memory and
   approved thresholds. Production semantic hiring stays disabled.

Overall: reconstructed engineering scope accepted locally/isolated staging;
production activation remains blocked by the exact owner-controlled target gates.
The two previously approved HR duplicate/no-merge and immutable reinspection
policies remain accepted and are not reopened as policy blockers.
