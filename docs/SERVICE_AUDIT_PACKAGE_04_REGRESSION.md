# Paket 04 — 44 əvvəlki uğursuz testin müqayisəsi

Baza: `52474890289f02fd987cb9c0db9c47c152336f53` (Paket 03 bağlanışı, b1e9ff8 ilə eyni tree); müqayisə Paket 04 inop-main dəyişiklikləri ilə. Hər iki qaçış: **563 test, 519 PASS, 44 FAIL, 0 SKIP**. Adlar və hər assertion-un actual/expected dəyərləri eynidir. Yeni uğursuzluq: **0**. 44 sayına iki parent test də daxildir; 42 ayrıca assertion failure var. Testlər dəyişdirilməyib.

Lokal MongoDB 7 replica set, loopback 27018, hər fixture üçün ayrıca təsadüfi owned DB. Production-a çıxış yoxdur. Baza nəticələri Paket 03 bağlanış logundandır; `b1e9ff8` ilə merged `5247489` tree SHA-sı eynidir. Yeni baseline branch yaradılmayıb.

| # | Test | Səbəb | 1238cc8 | Paket 04 | Paket 04 ilə əlaqə |
|---|---|---|---|---|---|
| 1 | Assigned author may delete their own audit | Soft-delete sənədi saxlayır; köhnə test fiziki silinmə (false/null) gözləyir. | FAIL: actual `[Object]`, expected `null` | FAIL: actual `[Object]`, expected `null` | Bazada eyni; yeni regression deyil |
| 2 | Audit lists, aggregates and child endpoints enforce their own permission scope | Alt test uğursuzluqlarının Node test runner tərəfindən parent test-ə ötürülməsi; ayrıca assertion deyil. | FAIL: alt testlər | FAIL: alt testlər | Bazada eyni; yeni regression deyil |
| 3 | Department approval uses trusted snapshot and still rejects legacy forged JSON | Payload-da reviewer verilməyib; active independent reviewer validasiyası 400 qaytarır, test 201 gözləyir. | FAIL: actual `400`, expected `201` | FAIL: actual `400`, expected `201` | Bazada eyni; yeni regression deyil |
| 4 | Generic Audit scope and trusted department provenance | Alt test uğursuzluqlarının Node test runner tərəfindən parent test-ə ötürülməsi; ayrıca assertion deyil. | FAIL: alt testlər | FAIL: alt testlər | Bazada eyni; yeni regression deyil |
| 5 | Parent public id is normalized before ObjectId child queries and writes | Auditor profile/direction/organization validasiyası sintetik assignee-ni rədd edir (403); test 201 gözləyir. | FAIL: actual `403`, expected `201` | FAIL: actual `403`, expected `201` | Bazada eyni; yeni regression deyil |
| 6 | Real auditor retains explicitly granted all analytics/report and assigned Standard lists | Direction-scoped summary total 4, köhnə all-scope gözləntisi 14. | FAIL: actual `4`, expected `14` | FAIL: actual `4`, expected `14` | Bazada eyni; yeni regression deyil |
| 7 | admin: assigned audit-assignments mutation scope | Auditor profile/direction/organization validasiyası sintetik assignee-ni rədd edir (403); test 201 gözləyir. | FAIL: actual `403`, expected `201` | FAIL: actual `403`, expected `201` | Bazada eyni; yeni regression deyil |
| 8 | admin: assigned audit-score mutation scope | Revision-u olmayan legacy audit üçün rescore 409 qaytarır; köhnə test 200 gözləyir. | FAIL: actual `409`, expected `200` | FAIL: actual `409`, expected `200` | Bazada eyni; yeni regression deyil |
| 9 | admin: assigned closure mutation scope | Independent approved review yoxdur (409); scope testi prerequisites olmadan 201 gözləyir. | FAIL: actual `409`, expected `201` | FAIL: actual `409`, expected `201` | Bazada eyni; yeni regression deyil |
| 10 | admin: delete foreign enforces same scope | Soft-delete sənədi saxlayır; köhnə test fiziki silinmə (false/null) gözləyir. | FAIL: actual `true`, expected `false` | FAIL: actual `true`, expected `false` | Bazada eyni; yeni regression deyil |
| 11 | admin: delete own enforces same scope | Soft-delete sənədi saxlayır; köhnə test fiziki silinmə (false/null) gözləyir. | FAIL: actual `true`, expected `false` | FAIL: actual `true`, expected `false` | Bazada eyni; yeni regression deyil |
| 12 | admin: foreign audit-assignments mutation scope | Auditor profile/direction/organization validasiyası sintetik assignee-ni rədd edir (403); test 201 gözləyir. | FAIL: actual `403`, expected `201` | FAIL: actual `403`, expected `201` | Bazada eyni; yeni regression deyil |
| 13 | admin: foreign audit-score mutation scope | Revision-u olmayan legacy audit üçün rescore 409 qaytarır; köhnə test 200 gözləyir. | FAIL: actual `409`, expected `200` | FAIL: actual `409`, expected `200` | Bazada eyni; yeni regression deyil |
| 14 | admin: foreign closure mutation scope | Independent approved review yoxdur (409); scope testi prerequisites olmadan 201 gözləyir. | FAIL: actual `409`, expected `201` | FAIL: actual `409`, expected `201` | Bazada eyni; yeni regression deyil |
| 15 | admin: legacy audit-assignments mutation scope | Auditor profile/direction/organization validasiyası sintetik assignee-ni rədd edir (403); test 201 gözləyir. | FAIL: actual `403`, expected `201` | FAIL: actual `403`, expected `201` | Bazada eyni; yeni regression deyil |
| 16 | admin: legacy audit-score mutation scope | Revision-u olmayan legacy audit üçün rescore 409 qaytarır; köhnə test 200 gözləyir. | FAIL: actual `409`, expected `200` | FAIL: actual `409`, expected `200` | Bazada eyni; yeni regression deyil |
| 17 | admin: legacy closure mutation scope | Independent approved review yoxdur (409); scope testi prerequisites olmadan 201 gözləyir. | FAIL: actual `409`, expected `201` | FAIL: actual `409`, expected `201` | Bazada eyni; yeni regression deyil |
| 18 | admin: own audit-assignments mutation scope | Auditor profile/direction/organization validasiyası sintetik assignee-ni rədd edir (403); test 201 gözləyir. | FAIL: actual `403`, expected `201` | FAIL: actual `403`, expected `201` | Bazada eyni; yeni regression deyil |
| 19 | admin: own audit-score mutation scope | Revision-u olmayan legacy audit üçün rescore 409 qaytarır; köhnə test 200 gözləyir. | FAIL: actual `409`, expected `200` | FAIL: actual `409`, expected `200` | Bazada eyni; yeni regression deyil |
| 20 | admin: own closure mutation scope | Independent approved review yoxdur (409); scope testi prerequisites olmadan 201 gözləyir. | FAIL: actual `409`, expected `201` | FAIL: actual `409`, expected `201` | Bazada eyni; yeni regression deyil |
| 21 | admin: peer audit-assignments mutation scope | Auditor profile/direction/organization validasiyası sintetik assignee-ni rədd edir (403); test 201 gözləyir. | FAIL: actual `403`, expected `201` | FAIL: actual `403`, expected `201` | Bazada eyni; yeni regression deyil |
| 22 | admin: peer audit-score mutation scope | Revision-u olmayan legacy audit üçün rescore 409 qaytarır; köhnə test 200 gözləyir. | FAIL: actual `409`, expected `200` | FAIL: actual `409`, expected `200` | Bazada eyni; yeni regression deyil |
| 23 | admin: peer closure mutation scope | Independent approved review yoxdur (409); scope testi prerequisites olmadan 201 gözləyir. | FAIL: actual `409`, expected `201` | FAIL: actual `409`, expected `201` | Bazada eyni; yeni regression deyil |
| 24 | admin: safety facets are scoped before averages/distributions | Safety aggregate canonical və legacy safety alias-larını birlikdə sayır (5); test yalnız occupational-safety sayır (4). | FAIL: actual `5`, expected `4` | FAIL: actual `5`, expected `4` | Bazada eyni; yeni regression deyil |
| 25 | assigned: assigned audit-assignments mutation scope | Auditor profile/direction/organization validasiyası sintetik assignee-ni rədd edir (403); test 201 gözləyir. | FAIL: actual `403`, expected `201` | FAIL: actual `403`, expected `201` | Bazada eyni; yeni regression deyil |
| 26 | assigned: assigned audit-score mutation scope | Revision-u olmayan legacy audit üçün rescore 409 qaytarır; köhnə test 200 gözləyir. | FAIL: actual `409`, expected `200` | FAIL: actual `409`, expected `200` | Bazada eyni; yeni regression deyil |
| 27 | assigned: assigned closure mutation scope | Independent approved review yoxdur (409); scope testi prerequisites olmadan 201 gözləyir. | FAIL: actual `409`, expected `201` | FAIL: actual `409`, expected `201` | Bazada eyni; yeni regression deyil |
| 28 | assigned: foreign audit-assignments mutation scope | Auditor profile/direction/organization validasiyası sintetik assignee-ni rədd edir (403); test 201 gözləyir. | FAIL: actual `403`, expected `201` | FAIL: actual `403`, expected `201` | Bazada eyni; yeni regression deyil |
| 29 | assigned: foreign audit-score mutation scope | Revision-u olmayan legacy audit üçün rescore 409 qaytarır; köhnə test 200 gözləyir. | FAIL: actual `409`, expected `200` | FAIL: actual `409`, expected `200` | Bazada eyni; yeni regression deyil |
| 30 | assigned: foreign closure mutation scope | Independent approved review yoxdur (409); scope testi prerequisites olmadan 201 gözləyir. | FAIL: actual `409`, expected `201` | FAIL: actual `409`, expected `201` | Bazada eyni; yeni regression deyil |
| 31 | department: assigned audit-assignments mutation scope | Auditor profile/direction/organization validasiyası sintetik assignee-ni rədd edir (403); test 201 gözləyir. | FAIL: actual `403`, expected `201` | FAIL: actual `403`, expected `201` | Bazada eyni; yeni regression deyil |
| 32 | department: assigned audit-score mutation scope | Revision-u olmayan legacy audit üçün rescore 409 qaytarır; köhnə test 200 gözləyir. | FAIL: actual `409`, expected `200` | FAIL: actual `409`, expected `200` | Bazada eyni; yeni regression deyil |
| 33 | department: assigned closure mutation scope | Independent approved review yoxdur (409); scope testi prerequisites olmadan 201 gözləyir. | FAIL: actual `409`, expected `201` | FAIL: actual `409`, expected `201` | Bazada eyni; yeni regression deyil |
| 34 | department: delete own enforces same scope | Soft-delete sənədi saxlayır; köhnə test fiziki silinmə (false/null) gözləyir. | FAIL: actual `true`, expected `false` | FAIL: actual `true`, expected `false` | Bazada eyni; yeni regression deyil |
| 35 | department: own audit-assignments mutation scope | Auditor profile/direction/organization validasiyası sintetik assignee-ni rədd edir (403); test 201 gözləyir. | FAIL: actual `403`, expected `201` | FAIL: actual `403`, expected `201` | Bazada eyni; yeni regression deyil |
| 36 | department: own audit-score mutation scope | Revision-u olmayan legacy audit üçün rescore 409 qaytarır; köhnə test 200 gözləyir. | FAIL: actual `409`, expected `200` | FAIL: actual `409`, expected `200` | Bazada eyni; yeni regression deyil |
| 37 | department: own closure mutation scope | Independent approved review yoxdur (409); scope testi prerequisites olmadan 201 gözləyir. | FAIL: actual `409`, expected `201` | FAIL: actual `409`, expected `201` | Bazada eyni; yeni regression deyil |
| 38 | department: peer audit-assignments mutation scope | Auditor profile/direction/organization validasiyası sintetik assignee-ni rədd edir (403); test 201 gözləyir. | FAIL: actual `403`, expected `201` | FAIL: actual `403`, expected `201` | Bazada eyni; yeni regression deyil |
| 39 | department: peer audit-score mutation scope | Revision-u olmayan legacy audit üçün rescore 409 qaytarır; köhnə test 200 gözləyir. | FAIL: actual `409`, expected `200` | FAIL: actual `409`, expected `200` | Bazada eyni; yeni regression deyil |
| 40 | department: peer closure mutation scope | Independent approved review yoxdur (409); scope testi prerequisites olmadan 201 gözləyir. | FAIL: actual `409`, expected `201` | FAIL: actual `409`, expected `201` | Bazada eyni; yeni regression deyil |
| 41 | own: delete own enforces same scope | Soft-delete sənədi saxlayır; köhnə test fiziki silinmə (false/null) gözləyir. | FAIL: actual `true`, expected `false` | FAIL: actual `true`, expected `false` | Bazada eyni; yeni regression deyil |
| 42 | own: own audit-assignments mutation scope | Auditor profile/direction/organization validasiyası sintetik assignee-ni rədd edir (403); test 201 gözləyir. | FAIL: actual `403`, expected `201` | FAIL: actual `403`, expected `201` | Bazada eyni; yeni regression deyil |
| 43 | own: own audit-score mutation scope | Revision-u olmayan legacy audit üçün rescore 409 qaytarır; köhnə test 200 gözləyir. | FAIL: actual `409`, expected `200` | FAIL: actual `409`, expected `200` | Bazada eyni; yeni regression deyil |
| 44 | own: own closure mutation scope | Independent approved review yoxdur (409); scope testi prerequisites olmadan 201 gözləyir. | FAIL: actual `409`, expected `201` | FAIL: actual `409`, expected `201` | Bazada eyni; yeni regression deyil |

## İcra və sübut

Eyni əmr hər iki checkout-un kökündən icra olunub:

```bash
INOP_AUDIT_TEST_PORT=27018 node --test --test-isolation=none \
  Backend/tests/auditCatalog.test.cjs Backend/tests/auditDirection.test.cjs \
  Backend/tests/auditTemplateRevision.test.cjs Backend/tests/auditLifecycleSafety.test.cjs \
  Backend/tests/auditFoundation.test.cjs Backend/tests/auditDashboardScores.test.cjs \
  Backend/tests/auditEndpoints.test.cjs Backend/tests/auditScopes.test.cjs \
  Backend/tests/auditLegacySafety.test.cjs Backend/tests/auditStorageReadiness.test.cjs \
  Backend/tests/auditIntegrationDebt.test.cjs Backend/tests/auditReleaseRehearsal.test.cjs
```

Lokal tam loglar (repoya əlavə edilmir):
- `/workspace/work/hr-audit-source/closure-legacy-regression.log` — SHA-256 `aa5dbe88e2b35bc466c474233e3e275469dae5e3c16ab0cc3168cef4c149b87c`
- `/workspace/work/hr-audit-source/../service-audit-p04/legacy-regression.log` — SHA-256 `5489fd3afaf3e4a2c6e0440ec3757f8464ea2d200120518c828c04ba5420e645`

Bu sübut legacy uyğunsuzluqları aradan qaldırmır və bütün repository testlərini PASS elan etmir. Scope testlərini yaşıl etmək üçün lifecycle/direction/soft-delete təhlükəsizliyi geri çevrilməyib.
