# Production Mərhələ 3 — indeks, backup və monitoring

## Yeddi indeks

`Backend/config/auditOperationalIndexes.json` dəyişməyib. Yeni `auditIndexExplain.test.cjs` owned27018 replica-set-də yeddi planın hər biri üçün200 sintetik sənəd,100 authorized-scope nəticəsi ilə hinted explain/result equality, idempotent create, conflict guard və yalnız newly-created index rollback-ni yoxlayır. Scratch collection-lar real collection data distribution-u deyil. Təhlükəsizlik siyasəti ayrıca real controller RBAC testlərində yoxlanır; hint testi production optimizer seçimi deyil.

Lokal nəticələr: latest-execution100keys/100docs; direction-date200/200; restaurant vəHSE-object101keys/100docs; actions/findings/evidence100/100; hərəsində100 nəticə, rollback sonrası eyni ID-lər. Direction-date planının bütün200 sənədi oxuması onun real distribution-da optimal olmasını sübut etmir. Yeni indeks əlavə edilmir, production selectivity/write-overhead PASS elan edilmir.

Operator ardıcıllığı: read-only `listIndexes`/collection stats+Mongo topology → conflict/equivalent-name dry-run → staging-də unhinted və hinted explain + eyni scoped nəticələr + load/write-capacity ölçümü → backup və change approval → yalnız approved nonunique yeni adları bir-bir tətbiq et → ölç və monitor et. `autoIndex:false/autoCreate:false` qalır. Rollback yalnız həmin planın newly-created nonunique indekslərini drop edir; əvvəlki/unique indekslər silinmir. Production-da heç biri icra edilməyib.

Model→collection xəritəsi lokal model kodundan çıxarılıb: `auditExecution`→`auditexecutions`, `audit`→`audits`, `auditAction`→`auditactions`, `auditFinding`→`auditfindings`, `auditEvidence`→`auditevidences`. Production collection/index inventarı yenə operator tərəfindən təsdiqlənməlidir.

## Backup və rollback

Əvvəlki15collection/45doc DB+evidence rehearsal sübutu saxlanır; cari full-suite testində yenidən icra nəticəsi QA-da göstərilir. Production backup deyil.

Buraxılışdan əvvəl owner tərəfindən son consistent DB backup və evidence immutable-version manifest-i, SHA/index digest-ləri, encrypted custody/access, replica topology, capture timestamp və izolə restore receipt təqdim edilməlidir. Writes davam edərkən consistency strategiyası təsdiqlənməlidir; tək collection dump və bucket copy tam consistency sübutu deyil. Production backup/restore bu task-da aparılmır.

RPO/RTO rəqəmləri təsdiqlənməyib; data/business owner seçməlidir. Operator staging restore-də sample/all applicable collection digest, index specs, template/revision/answers/history, evidence ref/version/hash və authorized read/export smoke yoxlayır. Yeni deployment SHA/image, runtime/config adları və dependency lock digest-ləri rollback receipt-də saxlanır. DB/index/app/storage/template rollback-ləri əlaqəli formatlarla aparılır; application rollback S3 receipts-i və completed snapshot-ları oxuya bilməlidir.

## Monitoring

`/health` liveness-dir. Yeni `/ready` DB+writable transaction topology+configured storage/private-versioned probe tələb edir; storageOFF503 normal dependency-unready vəziyyətidir. Render backend alignment üçün health-check path-i əvvəl Settings-dən təsdiqlənir; hazır olmayan `/ready`-ni operator review olmadan deployment health-check-ə çevirmək olmaz. `/version` yalnız minimal SHA/Node metadata, no-store; SHA environment metadata-sı deployment receipt-i ilə tutuşdurulur, kriptoqrafik attestation deyil.

Mövcud structured request correlation/status/denial/analytics timing, safeErrorLog və fatal exception/rejection redaction lokaldır. `API_REQUEST_LOG_ENABLED` optional reviewed flag-dir; raw query/body/token/PII/storage key loglanmır. `/ready` error responses secrets göstərmir. Request counters process-local-dır, durable monitoring xidməti deyil.

Operator collector/dashboard/owner/retention/alert delivery siyahısını təsdiqləməlidir: DB connection/topology, storage503/receipt failures, API5xx/auth denial, export errors, slow analytics və restart/fatal events. Threshold/SLA/vendor uydurulmur. Alert routing və monitoring production smoke ayrıca icazə+test tələb edir. Provider seçilməyibsə vendor aktivləşdirilmir.

## Controlled Render alignment — yalnız plan

1. Settings-dən service ID/type/repo/branch/root/build/start/Node major/health path/proxy və env **adlarının** mövcudluğunu təsdiqlə; worker flag-ləri və queue ownership-i qeyd et. Dəyərləri chat/log-a çıxarma.
2. CI-green dəqiq full target SHA/lockfile, compatible rollback release, consistent backup receipt və approved operator/change ticket seç. Production deployment üçün ayrıca istifadəçi təsdiqi al.
3. Native Node service üçün repo müqaviləsi Node24-dür. Root=`Backend` olarsa təklif edilən locked build=`npm ci`, start=`npm start`; repo root olarsa `npm ci --prefix Backend` və `npm start --prefix Backend`. Bunlar faktiki Settings deyil, operatorun təsdiqləyəcəyi variantlardır. Mongo URI binding `MONGO_URI` və ya mövcud `CS`, production JWT secret və validPORT əvvəlki secret store-da valid olmalıdır. Yeni values bu task-da verilmir.
4. Alignment rollout-da storage disabled, auto provision/seed/index yoxdur; worker flag-ləri dəyişmir. Approved manual deploy-u yalnız operator icra edir; Render AutoDeployOFF saxlanır. Vercel frontend üçün ayrı deploy əmri yoxdur.
5. Yeni release receipt-də exact SHA + Node major yoxla; `/health`200, `/version`200+expected SHA/no-store; storage OFF üçün `/ready`503 yalnız `checks.database=true`, `checks.transactions=true`, `checks.storageConfigured=false`, `productionSmokeVerified=false` olduqda gözlənilir. DB/topology false olarsa rollout qəbul edilmir. Unexpected404/5xx/wrongSHA vəziyyətində stop və reviewed app rollback; guard-u bypass etmə.
6. Owner-approved test identity ilə login/me/logout, Recruitment read/workflow, dörd audit direction list/create/draft/resume/complete/approval/closure/history, analytics və altı Excel export smoke. Real audit/data üzərində mutation yalnız ayrıca yazma icazəsi ilə; GET-only smoke lifecycle completion deyil. StorageOFF upload fail-closed503 qalmalıdır.
7. Provider/credentials, real upload/download, provision/index və production monitoring/restore ayrıca owner-approved mərhələlərdir. Alignment deploy özü full production-readiness PASS deyil. S3 yeni receipt-ləri yaranandan sonra köhnə5d886cc kor rollback qadağandır; compatible reader target seçilir.

Bu sənəd restart/deploy/DB/secrets/config/storage activation icazəsi vermir; task-da heç biri aparılmayıb.

### Recruitment runtime üçün əlavə preflight

`HR_NOTIFICATION_WORKER_ENABLED`, `HR_CV_PROCESSING_ENABLED`, `HR_CV_OCR_ENABLED`, `HR_CV_AI_PROCESSING_ENABLED` və optional `HR_CV_OCR_DATA_DIRECTORY` adlarının mövcud aktiv vəziyyəti operator tərəfindən təsdiqlənməlidir. Mövcud worker/queue ownership dəyişdirilmir; heç bir flag avtomatik açılmır. OCR aktivdirsə real runtime-da Tesseract binary-si, aze/eng/rus traineddata, fonts/PDF render imkanları ayrıca read-only yoxlanmalıdır. Repo Dockerfile-i Node24 runtime-dır və Tesseract quraşdırmır; onun mövcudluğu Native Render service-də OCR təminatı demək deyil. CI-də native prerequisites quraşdırılması production sübutu deyil. Bu task build mode-u dəyişmir və runtime package quraşdırmır. `/ready` Audit DB/storage yoxlamasıdır, bütün Recruitment native capability-lərinin sertifikatı deyil.

Cari full-suite-də real HR/Servis analytics endpoint-ləri hər biri5001audit üzrə yoxlandı:175035/305061 meyar, nəticə50%; lokal elapsed3551/9164ms, latest-execution index lookup1doc examined. Paralel lokal QA yükü var idi; bunlar production SLA/peak-load göstəricisi deyil.
