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

**NOT TESTED**. Run:Yeni code üçün hosted run hələ təsdiqlənməyib. Tested SHA:`0543e04`. Conclusion:`pending`. Job/backend/browser nəticələrinin detalları real final run logs ilə final closure mərhələsində tamamlanır. Lokal ekvivalent:backend2007/0,browser41/0,build/lint və audit0.
