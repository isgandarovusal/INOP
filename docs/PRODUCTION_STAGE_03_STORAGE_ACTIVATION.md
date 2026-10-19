# Production Mərhələ 3 — storage aktivləşdirməyə hazırlıq

**Provider seçilməyib; production storage aktivləşdirilməyib.** Adapter vendor deyil, S3-compatible protokol müqaviləsidir. Bootstrap yalnız statik factory register edir; konfiqurasiya avtomatik enable yaratmır. Mövcud503 fallback qalır.

## Düzəldilən real boşluq

Əvvəlki substring yoxlaması `<Status>Enabled</Status><Status>Disabled</Status>` və nested policy/status sahələrini qəbul edə bilirdi. Yeni regression əvvəl `Missing expected rejection` ilə uğursuz oldu. `auditS3Adapter.service.js` indi bounded, entity-free, flat scalar configuration XML-i yoxlayır: duplicate/nested/unknown sahələr və qarışıq mətn fail-closed-dir. Canonical XML declaration/namespace/whitespace və optional `MfaDelete` dəstəyi qorunur. Səhv metadata zamanı object PUT göndərilmir. Bu, yeni audit biznes qaydası deyil, provider receipt validasiyasıdır.

## Provider tələbləri

- HTTPS/public DNS, SigV4 path-style, TLS verification və DNS pinning; private/reserved IP, redirect və public URL fallback yoxdur.
- Private bucket, dörd public-access-block flag-i true, Versioning Enabled; GetPublicAccessBlock/GetBucketVersioning read səlahiyyətləri.
- Conditional PUT `If-None-Match:*`; SSE AES256 receipt, non-null immutable versionId; version-specific GET/DELETE. Dəstəklənməyən provider üçün guard bypass edilmir.
- Least privilege yalnız approved audit evidence prefix-lərinə; no public ACL/account-admin/list-all shortcut.
- 5MiB type/extension/signature validation, tenant/direction/brand/restaurant/HSE-object ownership, SHA256/size/version receipt, IDOR və revoked user checks mövcud wrapper/controller qatında qalır.

Environment **adları** (values repo/chat/log-a daxil edilmir):

`AUDIT_EVIDENCE_STORAGE_ENABLED`, `AUDIT_EVIDENCE_STORAGE_PROVIDER`, `AUDIT_EVIDENCE_STORAGE_PRIVATE_BUCKET_APPROVED`, `AUDIT_EVIDENCE_STORAGE_ENDPOINT`, `AUDIT_EVIDENCE_STORAGE_BUCKET`, `AUDIT_EVIDENCE_STORAGE_REGION`, `AUDIT_EVIDENCE_STORAGE_ACCESS_KEY_ID`, `AUDIT_EVIDENCE_STORAGE_SECRET_ACCESS_KEY`, optional `AUDIT_EVIDENCE_STORAGE_SESSION_TOKEN`.

Hazır default disabled-dir. Ayrı approved activation-da provider ID `s3`, explicit enable/private approval tələb olunur; flag-in özü bucket custody sübutu deyil. Empty safe config template `Backend/.env.production.example`; avtomatik load edilmir. Secret bindinqini yalnız operator idarə edir.

## Nəzarətli aktivləşdirmə ardıcıllığı — bu task-da icra edilməyib

1. Vendor/bucket/region/IAM/retention owner qərarı, approved dəyişiklik ticket-i və version-aware rollback target təsdiqi alınır. Retention/SLA müddəti uydurulmur.
2. İzolə staging-də private/versioning/probe, conditional conflict, version-specific byte/hash read və timeout/error/redaction sınağı keçirilir. Real provider protokol uyğunsuzluğu varsa enable edilmir.
3. Consistent DB+evidence backup receipt və restore sübutu, real tenant/object/grant inventarı və təsdiqlənmiş smoke identity/auditləri hazırlanır. Production smoke yazma/delete üçün ayrıca icazə alınır.
4. Backend alignment release təsdiqindən sonra operator reviewed secret store binding-lərini tətbiq edir; həmin əməliyyatın ayrıca icazəsi olmalıdır. Bu sənəd enable icazəsi deyil.
5. Altı hesabat ailəsində question/section/final foto, üç müstəqil sənəd, finding/action evidence upload edilir; returned reference-dən authorized download byte/hash/version uyğunluğu yoxlanır. Foreign tenant/direction/object/evidence ID və revoked grant/account deny olmalıdır.
6. Retry/overwrite əvəzinə uncertain PUT receipt reconciliation; yaradılmış test key/version manifest-i saxlanır. Cleanup yalnız owner-approved dəqiq key+version üçündür; raw bucket/object silmə və blind DELETE yoxdur.
7. `/ready`200 yalnız DB/topology və bucket private/versioning probe deməkdir; `productionSmokeVerified:false` qalır. Real upload/download və retention ayrıca gate-lərdir.

Remove dəqiq version-a aiddir. Audit evidence delete/retention/hold siyasəti təsdiqlənməyibsə avtomatik təmizləmə yaradılmır. Storage disable yeni operations-u503 edə bilər; artıq saxlanmış receipt-lər silinmir. Rollback reader formatını qorumalıdır.
