# Paket 09 — storage və təhlükəsizlik

## Saxlanan provider müqaviləsi

`AUDIT_EVIDENCE_STORAGE_PROVIDER`, `AUDIT_EVIDENCE_STORAGE_ENABLED=true`, bootstrap-da approved factory və `credentialsReady=true` tələb edilir. `NODE_ENV=production` / `RENDER=true` zamanı local write fallback yoxdur. Missing provider/credentials upload-da təhlükəsiz 503 saxlanır. Mövcud local historical references səbəbsiz dəyişdirilmir.

Provider private/durable/versioned/conditionalWrites capability-ləri, ifAbsent put, versioned receipt/remove, bounded get, SHA-256/size/MIME və `audit/evidence/<auditId>/<UUID>` ownership müqaviləsini yerinə yetirməlidir. Null/yanlış/boş/control-character/uzun version receipt-i yeni validasiya ilə 503-dür. Unknown error/receipt metadata-sı müştəriyə sızmır. Qeyri-müəyyən DB/provider nəticəsində faylın kor-koranə silinməsi və səssiz retry yoxdur.

`auditProviderIntegration.test.cjs` real source API-ləri ilə HR/Servis/Standart və 3 HSE növünü production-mode **isolated in-memory provider** üzərindən yoxlayır: hər birində 3 ayrı sənəd, private download/hash/version, report/XLSX istinadı, foreign read denial və corruption 409. Bu provider real production storage deyil. Mövcud suite real lokal photo/question/section/final evidence, MIME/size/IDOR/revocation, timeout və busy-slot qorumasını da yoxlayır.

## Real production smoke — icra edilməyib

Operator approved provider/secret binding, backup və synthetic obyektləri seçməlidir. Altı report ailəsində foto +3 sənəd upload/download hash, audit/version/slot metadata, cross-tenant/direction/brand/restaurant/HSE object deny, revoked account/grant, MIME/size, timeout/receipt/hash failure və public-URL bypass yoxlanmalıdır. Request ID və redacted status xaricində bytes, credential və private key loglanmamalıdır. Uğursuz smoke gate-i açmır.

Yeni retention/SLA/purge qaydası yaradılmır. Audit soft archive history/evidence metadata-sını silmir; yalnız owned, dəqiq uğursuz local upload və operator təsdiqli orphan proseduru təmizlənə bilər. Production retention/restore ayrıca storage sahibi tərəfindən təsdiqlənməlidir.

## Logging, auth və readiness

57 Audit/auth raw exception logu safe category/status ilə əvəz edilir. Structured request logging yalnız `API_REQUEST_LOG_ENABLED=true` ilə açılır: server UUID requestId, method/group/status/duration; body/query/URL/user/email/file key yoxdur. Bounded process counters mövcuddur, yeni public metrics və pullu xidmət yoxdur. Fatal exception/rejection secret-siz synchronous event yazıb process-i nonzero dayandırır.

`/health` liveness olaraq qalır. `/ready` DB connection, writable replica set/mongos transaction topology və storage configuration tələb edir; 200/503 qaytarır, `productionSmokeVerified=false` həmişə açıqdır. Bu endpoint real upload/download, provision və production release approval-u əvəz etmir. Missing provider ilə native production-mode startup testində `/health` 200, `/ready` 503 gözlənilir. Global DB startup autoCreate/autoIndex=false saxlanır.

## Dependency advisories

Read-only npm production audit-i xlsx üçün 1 high, mammoth → argparse → sprintf-js üçün 3 moderate advisory göstərib; frontend production dependencies üçün 0 advisory. `npm audit fix --force`, köhnə mammoth-a downgrade və unofficial fork tətbiq edilməyib. xlsx runtime Audit/candidate export controller-lərində workbook **write** üçün istifadə edilir; untrusted workbook read API yolu tapılmayıb. Argparse Mammoth CLI dependency-sidir; tətbiqin DOCX extraction API-si CLI-ni işlətmir. Bu reachability sərhədi advisory-ni aradan qaldırmır: patched upstream artifact/compatibility və security review production dependency gate-i üçün tələb olunur. Testlərdə workbook read yalnız isolated generated XLSX yoxlamasıdır. Real production-a aid PASS verilməyib.


19 oktyabr read-only audit yenidən eyni 4 dependency advisory-ni göstərdi. `xlsx` üçün npm fixAvailable=false; Mammoth zənciri üçün təklif 0.3.29-a böyük geriyə downgrade-dir. Rəsmi SheetJS patched artifact CDN sorğusu managed proxy-də CONNECT 403 ilə bloklanıb; GitHub-da yoxlanılan patched release tag-i tapılmayıb. Proxy bypass edilməyib. Bu səbəbdən dependency gate FAIL, production readiness BLOCKED qalır. Operator approved upstream artifact əldə edib integrity/version/compatibility yoxlaması və bütün XLSX/DOCX regressiyasını keçirməlidir. Bunlar tətbiq edilmədən xəbərdarlıqlar həll olunmuş sayılmır.
