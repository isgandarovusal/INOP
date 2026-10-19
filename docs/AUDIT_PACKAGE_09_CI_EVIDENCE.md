# Paket 09 — real GitHub hosted CI evidence

## İlkin real failure

Run https://github.com/isgandarovusal/INOP/actions/runs/39208759764, code66e67f7, job117917246586, Ubuntu24.04.5 GitHub-hosted. Backend2001PASS/4FAIL; build/browser fail-fast səbəbindən skip idi, PASS kimi təqdim edilmədi. Job logs GitHub connector ilə götürüldü; CLI log download redirect ayrıca network403 idi. Logs artifact original closure work qovluğunda saxlanır.

| Root cause | Real failure | Düzəliş |
|---|---|---|
| auditStorageReadiness CLI cwd | /workspace/INOP hosted runner-də yoxdur; spawn statusnull | __dirname əsasında repo root;exit0/writes0 assertions qalır |
| hrHundredBranches benchmark sink | /workspace path ENOENT;functional assertions əvvəl keçirdi | os.tmpdir+pid;100branch/5000application assertions qalır |
| hrSignedSourceHttp quota | Minute boundary reset:expected429,actual202;parent failure də sayılır | Existing injected clock/signature timestamp sabit;real HTTP/Mongo/HMAC quota/429 guard saxlanır |

## Workflow hardening

Contents read-only;no production secret/DB/deploy. Checkout6 `d23441a48e516b6c34aea4fa41551a30e30af803`;setup-node6 `249970729cb0ef3589644e2896645e5dc5ba9c38`;upload-artifact6 `b7c566a772e6b6bfb58ed0dc250532a479d7789f`, rəsmi GitHub repo tag-larından resolve edilib. Checkout credentials persist etmir. Node24,60minute budget,serial bounded backend/browser,owned Mongo7 loopback27018 replica,labelguard cleanup və branch concurrency saxlanır.

Full+omit-dev audit Backend/Frontend üçün ayrı icra edilir; failure basdırılmır. Npm ci,backend,build,lint,browser logs və audit JSON artifact-a yığılır,retention7days. Artifact yalnız generated QA logs/JSON-dur,source documents/private storage bytes/secrets daxil deyil. Bash pipefail,fail-fast və always cleanup/artifact/status summary var.

Push inop-main/PR code change və manual dispatch işləyir;docs-only change ignore edilir. Final hosted evidence sənədi docs-only commit ola bilər; tested code SHA və son docs diff-i ayrıca yoxlanır. Hosted icra olmadan PASS yazılmır.

## Cari hosted nəticə

**PASS**. Run:https://github.com/isgandarovusal/INOP/actions/runs/39212246965. Tested SHA:`1d8cc8871a0ca0849dd1f814d3095bc86c4d1384`. Conclusion:`success`. Bütün job step-ləri success-dir; actual nəticələr aşağıdadır. Lokal ekvivalent:backend2007/0,browser41/0,build/lint və audit0.


## Completed hosted sübutu

Run `39212246965`, attempt1, job `117928025443`; push event, GitHub-hosted Ubuntu24.04.5. 06:50:26→07:08:13 UTC, job17m44s. Backend **2007/2007**,browser **41/41** (Audit21+Recruitment20),0 FAIL/SKIP/CANCELLED. Center36/report72/visual100;dependency full/prod,build/lint,native prerequisites,replica setup,cleanup,artifact və summary addımlarının hamısı success.

Artifact `audit-qa-39212246965-1`, ID `12168668039`,57989bytes;digest `sha256:263d909582bfa51e71e43140d3f222695daf24e975bae8c20bf2416b1b03ae65`;expiry2026-10-26T07:08:07Z. Yalnız generated QA logs/JSON,7day retention. Metadata GitHub Actions API-dən götürülüb; archive bytes ayrıca download/re-hash edilməyib, digest server metadata-sıdır.

Completed job log SHA-256 `ecd5ffb6f2fdebe4e3dc6a9319321665178203709e6feaba592b6e86c5442951`. Logs GitHub connector ilə endirilib və PASS/FAIL summary-ləri avtomatik assert edilib: `[2007,2,3,8,4,1,2,1,20]` PASS və9×0 FAIL. Temporary in-progress log404 final job tamamlandıqdan sonra aradan qalxıb.

Tested commit `1d8cc8871a0ca0849dd1f814d3095bc86c4d1384`-dür. Son evidence commit-i yalnız docs dəyişir; runtime,test,lockfile və workflow həmin tested SHA ilə eyni qalır. Docs-only push workflow-un path filter-i ilə yenidən code QA başlatmır; final Git diff bu sərhədi təsdiqləyir. Hosted PASS final code-a aiddir, production release approval-u deyil.
