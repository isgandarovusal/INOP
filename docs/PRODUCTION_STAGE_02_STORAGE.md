# Production Mərhələ 2 — S3-compatible Audit storage

**Production aktiv deyil.** İstifadəçi S3-compatible protokol adapterinin lokal hazırlanmasını təsdiqləyib, konkret vendor/bucket/credentials seçilməyib. Yeni npm dependency, SDK, fork və ya credential yaradılmayıb.

## İnteqrasiya

- `auditStorageBootstrap.service.js`: server bootstrap-da yalnız statik `s3` factory qeydiyyatı. Idempotentdir; arbitrary env module loading, credential discovery və network I/O yoxdur.
- `auditS3Adapter.service.js`: Audit-ə aid konfiqurasiya, bucket safety probe və immutable versioned object əməliyyatları.
- `hrPrivateObjectStorage.service.js` technical `protocol` export-u: mövcud HTTPS/DNS/endpoint/config guard və SigV4 signer. Yeni canonical query signing versionId üçün lazımdır. Recruitment reference, HR CV key prefix/MIME və business workflow dəyişmir.
- `auditEvidenceStorage.service.js`: mövcud Audit wrapper ownership, byte/hash/size, receipt/version, iki aktiv operation limiti və timeout qorumasını saxlayır. Yeni availability probe və sanitized provider-error allowlist əlavə edilib.

Server registry-ni yaradır, lakin **provider seçmir və storage-u açmır**. `fromEnvironment()` yalnız explicit provider=`s3`, enabled=`true`, approved private bucket, valid endpoint/bucket/region/key bindings olduqda adapter yaradır. Production-da local write fallback yoxdur. Unknown/missing/invalid provider503-dür. Test inject-ləri yalnız birbaşa dependency injection-dır, env-dən test provider aktivləşmir.

## Konfiqurasiya müqaviləsi

Value-lar backend secret store-da qalmalıdır. Təhlükəsiz boş nümunə `Backend/.env.production.example`-dadır; avtomatik yüklənmir.

| Ad | Məna |
|---|---|
| AUDIT_EVIDENCE_STORAGE_ENABLED | Default bağlıdır; yalnız `true` explicit enable |
| AUDIT_EVIDENCE_STORAGE_PROVIDER | Yalnız reviewed adapter ID `s3`; vendor adı/endpoint təyin etmir |
| AUDIT_EVIDENCE_STORAGE_PRIVATE_BUCKET_APPROVED | Owner tərəfindən private bucket və policy təsdiqi; təkbaşına texniki sübut sayılmır |
| AUDIT_EVIDENCE_STORAGE_ENDPOINT | HTTPS, public DNS hostname, root path; embedded credentials/query/hash/custom port/private IP yoxdur |
| AUDIT_EVIDENCE_STORAGE_BUCKET / REGION | Strict canonical bucket və signing region |
| AUDIT_EVIDENCE_STORAGE_ACCESS_KEY_ID / SECRET_ACCESS_KEY | Ən az səlahiyyətli managed binding; logs/client/repo-da göstərilmir |
| AUDIT_EVIDENCE_STORAGE_SESSION_TOKEN | Mövcud temporary credential istifadə olunursa optional binding |

Adapter **bütün S3 adlı xidmətlərə uyğunluq iddiası etmir**. Seçiləcək provider GetPublicAccessBlock, GetBucketVersioning, SigV4 path-style requests, conditional PUT, immutable object version IDs və AES256 SSE receipt-i təmin etməlidir. Bunları dəstəkləməyən provider bypass edilmir; ayrıca reviewed uyğunluq işi tələb olunur.

## Private custody və data integrity

1. Upload/read əvvəl bucket block-public-access-in dörd flag-i true və versioning Enabled olmalıdır. 8 KiB bounded, entity/DOCTYPE qəbul etməyən response oxunur; false/duplicate/suspended/malformed/unsupported cavab fail-closed-dir. Environment approval təkbaşına `private:true` sübutu deyil.
2. Audit key `audit/evidence/<24hex auditId>/<UUIDv4>`; HR CV key-ləri qəbul edilmir. Tenant/direction/brand/restaurant/HSE-object və audit permission-ları mövcud API/controller qatında, key ownership isə wrapper-də yoxlanır. Fayl ID/key authorization əvəzi deyil.
3. PUT `If-None-Match:*`, `Cache-Control:private,no-store`, SHA metadata və AES256 SSE ilə imzalanır. Provider overwrite/conflict409 verir; blind retry və overwrite yoxdur.
4. Upload receipt-də qeyri-boş/versioned `x-amz-version-id` və AES256 təsdiqi tələb olunur; `null` version qəbul edilmir. GET/DELETE yalnız həmin versionId üçün imzalanır. Download response version ID də receipt ilə eyni olmalıdır; byte count və SHA-256 wrapper-də təkrar yoxlanır.
5. Mövcud upload controller 5MiB, extension/MIME/signature, bounded Office ZIP, ownership və mass-assignment guard-larını saxlayır. PDF/foto/sənəd nəzarəti aradan qaldırılmır. Əlavə sənədlərin üç müstəqil slot metadata-sı dəyişmir.
6. TLS validation və validated DNS answer pinning mövcuddur; private/reserved/mapped/rebound IP-lər rədd olunur. Redirect/retry/public URL və presigned URL fallback yoxdur. Native provider I/O testlərdə izolə transportla əvəz edilib; real production endpoint-ə sorğu edilməyib.
7. Wrapper əməliyyatları maksimum8s, iki aktiv slot ilə bounded-dir; timeout əməliyyatın həqiqətən dayandığını sübut etmirsə slot settlement-ə qədər saxlanır. Provider errors/body/credential/key log və response-a ötürülmür. Yalnız known safe code/status yenidən yaradılır.
8. Remove yalnız dəqiq key+version üçündür və mövcud reviewed cleanup yolunda istifadə oluna bilər. Bu task retention/delete policy və production cleanup icra etmir. Ambiguous PUT/timeout nəticəsi blind delete/retry deyil, metadata/version reconciliation tələb edir.

## Readiness və real smoke ayrılığı

S3 store `checkAvailability()` bucket-in private/versioning read-only probe-unu aparır. `/ready` configured və available sahələrini ayırır, probe timeout/negative/error503 edir. Bu, PutObject/GetObjectVersion/DeleteObjectVersion səlahiyyətlərinin tam testi və ya real upload/download sertifikatı deyil. Əlavə probe API xərci/latency-si operator tərəfindən monitor polling intervalında nəzərə alınmalıdır.

Lokal unit/protocol fixture və real Audit API/izolə Mongo integration HR, Servis, Standart, HSE restoran/ofis/anbar, üç sənəd, report/XLSX, ownership, direction/foreign access və revoked account denial yoxlayır. Real cloud credentials, TLS endpoint və bucket policy smoke **NOT TESTED/BLOCKED** qalır. Konkret provider seçildikdən sonra operator uyğunluq və real smoke matrisi ilə təsdiqləməlidir.
