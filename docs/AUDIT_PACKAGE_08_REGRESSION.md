# Paket 08 — geniş backend regressiyası

Baza: Paket 07 `ac983548bda02cf11a3775f7ba94c85068942444`. Eyni 12 test faylı, eyni 563 test: **519 PASS / 44 FAIL / 0 SKIP / 0 CANCELLED**. 44 uğursuz ad və bütün 42 assertion actual/expected dəyəri eynidir. İki parent failure ayrıca assertion deyil. Yeni uğursuzluq və dəyişmiş assertion: **0**. Geniş suite tam PASS deyil.

| # | Test | Səbəb | Paket 07 | Paket 08 | Əlaqə |
|---|---|---|---|---|---|
| 1 | Assigned author may delete their own audit | Soft-delete sənədi saxlayır; köhnə test fiziki silinmə gözləyir. | FAIL: actual `[Object]`, expected `null` | FAIL: actual `[Object]`, expected `null` | Yeni regressiya deyil |
| 2 | Audit lists, aggregates and child endpoints enforce their own permission scope | Alt assertion-ların parent testə ötürülməsi; ayrıca assertion deyil. | FAIL: alt testlər | FAIL: alt testlər | Yeni regressiya deyil |
| 3 | Department approval uses trusted snapshot and still rejects legacy forged JSON | Reviewer-siz payload 400; köhnə test 201 gözləyir. | FAIL: actual `400`, expected `201` | FAIL: actual `400`, expected `201` | Yeni regressiya deyil |
| 4 | Generic Audit scope and trusted department provenance | Alt assertion-ların parent testə ötürülməsi; ayrıca assertion deyil. | FAIL: alt testlər | FAIL: alt testlər | Yeni regressiya deyil |
| 5 | Parent public id is normalized before ObjectId child queries and writes | Sintetik assignee aktiv və uyğun auditor profili deyil: 403; test 201 gözləyir. | FAIL: actual `403`, expected `201` | FAIL: actual `403`, expected `201` | Yeni regressiya deyil |
| 6 | Real auditor retains explicitly granted all analytics/report and assigned Standard lists | Paket 05-dən assignment-siz auditor üçün 0; köhnə global gözlənti 14. | FAIL: actual `0`, expected `14` | FAIL: actual `0`, expected `14` | Yeni regressiya deyil |
| 7 | admin: assigned audit-assignments mutation scope | Sintetik assignee aktiv və uyğun auditor profili deyil: 403; test 201 gözləyir. | FAIL: actual `403`, expected `201` | FAIL: actual `403`, expected `201` | Yeni regressiya deyil |
| 8 | admin: assigned audit-score mutation scope | Revision-suz legacy audit rescore 409; test 200 gözləyir. | FAIL: actual `409`, expected `200` | FAIL: actual `409`, expected `200` | Yeni regressiya deyil |
| 9 | admin: assigned closure mutation scope | Müstəqil approval olmadan closure 409; test 201 gözləyir. | FAIL: actual `409`, expected `201` | FAIL: actual `409`, expected `201` | Yeni regressiya deyil |
| 10 | admin: delete foreign enforces same scope | Soft-delete sənədi saxlayır; köhnə test fiziki silinmə gözləyir. | FAIL: actual `true`, expected `false` | FAIL: actual `true`, expected `false` | Yeni regressiya deyil |
| 11 | admin: delete own enforces same scope | Soft-delete sənədi saxlayır; köhnə test fiziki silinmə gözləyir. | FAIL: actual `true`, expected `false` | FAIL: actual `true`, expected `false` | Yeni regressiya deyil |
| 12 | admin: foreign audit-assignments mutation scope | Sintetik assignee aktiv və uyğun auditor profili deyil: 403; test 201 gözləyir. | FAIL: actual `403`, expected `201` | FAIL: actual `403`, expected `201` | Yeni regressiya deyil |
| 13 | admin: foreign audit-score mutation scope | Revision-suz legacy audit rescore 409; test 200 gözləyir. | FAIL: actual `409`, expected `200` | FAIL: actual `409`, expected `200` | Yeni regressiya deyil |
| 14 | admin: foreign closure mutation scope | Müstəqil approval olmadan closure 409; test 201 gözləyir. | FAIL: actual `409`, expected `201` | FAIL: actual `409`, expected `201` | Yeni regressiya deyil |
| 15 | admin: legacy audit-assignments mutation scope | Sintetik assignee aktiv və uyğun auditor profili deyil: 403; test 201 gözləyir. | FAIL: actual `403`, expected `201` | FAIL: actual `403`, expected `201` | Yeni regressiya deyil |
| 16 | admin: legacy audit-score mutation scope | Revision-suz legacy audit rescore 409; test 200 gözləyir. | FAIL: actual `409`, expected `200` | FAIL: actual `409`, expected `200` | Yeni regressiya deyil |
| 17 | admin: legacy closure mutation scope | Müstəqil approval olmadan closure 409; test 201 gözləyir. | FAIL: actual `409`, expected `201` | FAIL: actual `409`, expected `201` | Yeni regressiya deyil |
| 18 | admin: own audit-assignments mutation scope | Sintetik assignee aktiv və uyğun auditor profili deyil: 403; test 201 gözləyir. | FAIL: actual `403`, expected `201` | FAIL: actual `403`, expected `201` | Yeni regressiya deyil |
| 19 | admin: own audit-score mutation scope | Revision-suz legacy audit rescore 409; test 200 gözləyir. | FAIL: actual `409`, expected `200` | FAIL: actual `409`, expected `200` | Yeni regressiya deyil |
| 20 | admin: own closure mutation scope | Müstəqil approval olmadan closure 409; test 201 gözləyir. | FAIL: actual `409`, expected `201` | FAIL: actual `409`, expected `201` | Yeni regressiya deyil |
| 21 | admin: peer audit-assignments mutation scope | Sintetik assignee aktiv və uyğun auditor profili deyil: 403; test 201 gözləyir. | FAIL: actual `403`, expected `201` | FAIL: actual `403`, expected `201` | Yeni regressiya deyil |
| 22 | admin: peer audit-score mutation scope | Revision-suz legacy audit rescore 409; test 200 gözləyir. | FAIL: actual `409`, expected `200` | FAIL: actual `409`, expected `200` | Yeni regressiya deyil |
| 23 | admin: peer closure mutation scope | Müstəqil approval olmadan closure 409; test 201 gözləyir. | FAIL: actual `409`, expected `201` | FAIL: actual `409`, expected `201` | Yeni regressiya deyil |
| 24 | admin: safety facets are scoped before averages/distributions | Canonical/legacy safety alias-ları ilə 5; köhnə test 4 gözləyir. | FAIL: actual `5`, expected `4` | FAIL: actual `5`, expected `4` | Yeni regressiya deyil |
| 25 | assigned: assigned audit-assignments mutation scope | Sintetik assignee aktiv və uyğun auditor profili deyil: 403; test 201 gözləyir. | FAIL: actual `403`, expected `201` | FAIL: actual `403`, expected `201` | Yeni regressiya deyil |
| 26 | assigned: assigned audit-score mutation scope | Revision-suz legacy audit rescore 409; test 200 gözləyir. | FAIL: actual `409`, expected `200` | FAIL: actual `409`, expected `200` | Yeni regressiya deyil |
| 27 | assigned: assigned closure mutation scope | Müstəqil approval olmadan closure 409; test 201 gözləyir. | FAIL: actual `409`, expected `201` | FAIL: actual `409`, expected `201` | Yeni regressiya deyil |
| 28 | assigned: foreign audit-assignments mutation scope | Sintetik assignee aktiv və uyğun auditor profili deyil: 403; test 201 gözləyir. | FAIL: actual `403`, expected `201` | FAIL: actual `403`, expected `201` | Yeni regressiya deyil |
| 29 | assigned: foreign audit-score mutation scope | Revision-suz legacy audit rescore 409; test 200 gözləyir. | FAIL: actual `409`, expected `200` | FAIL: actual `409`, expected `200` | Yeni regressiya deyil |
| 30 | assigned: foreign closure mutation scope | Müstəqil approval olmadan closure 409; test 201 gözləyir. | FAIL: actual `409`, expected `201` | FAIL: actual `409`, expected `201` | Yeni regressiya deyil |
| 31 | department: assigned audit-assignments mutation scope | Sintetik assignee aktiv və uyğun auditor profili deyil: 403; test 201 gözləyir. | FAIL: actual `403`, expected `201` | FAIL: actual `403`, expected `201` | Yeni regressiya deyil |
| 32 | department: assigned audit-score mutation scope | Revision-suz legacy audit rescore 409; test 200 gözləyir. | FAIL: actual `409`, expected `200` | FAIL: actual `409`, expected `200` | Yeni regressiya deyil |
| 33 | department: assigned closure mutation scope | Müstəqil approval olmadan closure 409; test 201 gözləyir. | FAIL: actual `409`, expected `201` | FAIL: actual `409`, expected `201` | Yeni regressiya deyil |
| 34 | department: delete own enforces same scope | Soft-delete sənədi saxlayır; köhnə test fiziki silinmə gözləyir. | FAIL: actual `true`, expected `false` | FAIL: actual `true`, expected `false` | Yeni regressiya deyil |
| 35 | department: own audit-assignments mutation scope | Sintetik assignee aktiv və uyğun auditor profili deyil: 403; test 201 gözləyir. | FAIL: actual `403`, expected `201` | FAIL: actual `403`, expected `201` | Yeni regressiya deyil |
| 36 | department: own audit-score mutation scope | Revision-suz legacy audit rescore 409; test 200 gözləyir. | FAIL: actual `409`, expected `200` | FAIL: actual `409`, expected `200` | Yeni regressiya deyil |
| 37 | department: own closure mutation scope | Müstəqil approval olmadan closure 409; test 201 gözləyir. | FAIL: actual `409`, expected `201` | FAIL: actual `409`, expected `201` | Yeni regressiya deyil |
| 38 | department: peer audit-assignments mutation scope | Sintetik assignee aktiv və uyğun auditor profili deyil: 403; test 201 gözləyir. | FAIL: actual `403`, expected `201` | FAIL: actual `403`, expected `201` | Yeni regressiya deyil |
| 39 | department: peer audit-score mutation scope | Revision-suz legacy audit rescore 409; test 200 gözləyir. | FAIL: actual `409`, expected `200` | FAIL: actual `409`, expected `200` | Yeni regressiya deyil |
| 40 | department: peer closure mutation scope | Müstəqil approval olmadan closure 409; test 201 gözləyir. | FAIL: actual `409`, expected `201` | FAIL: actual `409`, expected `201` | Yeni regressiya deyil |
| 41 | own: delete own enforces same scope | Soft-delete sənədi saxlayır; köhnə test fiziki silinmə gözləyir. | FAIL: actual `true`, expected `false` | FAIL: actual `true`, expected `false` | Yeni regressiya deyil |
| 42 | own: own audit-assignments mutation scope | Sintetik assignee aktiv və uyğun auditor profili deyil: 403; test 201 gözləyir. | FAIL: actual `403`, expected `201` | FAIL: actual `403`, expected `201` | Yeni regressiya deyil |
| 43 | own: own audit-score mutation scope | Revision-suz legacy audit rescore 409; test 200 gözləyir. | FAIL: actual `409`, expected `200` | FAIL: actual `409`, expected `200` | Yeni regressiya deyil |
| 44 | own: own closure mutation scope | Müstəqil approval olmadan closure 409; test 201 gözləyir. | FAIL: actual `409`, expected `201` | FAIL: actual `409`, expected `201` | Yeni regressiya deyil |

## Müqayisənin sərhədi

12 geniş legacy test faylı eyni siyahı ilə icra edilib. AuditDashboardScores testində yalnız unfiltered orta bal gözləntisi null-a dəyişdirilib; konkret istiqamət üzrə legacy raw-point müqaviləsi saxlanır. StandardAuditWorkflow ayrıca suite-də əvvəlki >500 üçün 422 gözləntisi tam 501 saylı 200 nəticəsi ilə əvəz edilib. Bunlar təsdiqlənmiş qəbul meyarı yeniləmələridir; 44 uğursuz assertion dəyişdirilməyib. Yeni Paket 08 testləri ayrıca suite-dədir. Köhnə testləri yaşıl göstərmək üçün delete/approval/direction təhlükəsizliyi zəiflədilməyib. Bütün DB yoxlamaları yalnız task-owned 127.0.0.1:27018 Mongo replica set-də və təsadüfi `inop_audit_test_*` bazalarında icra olunub. Production-a çıxış yoxdur.

## İcra

```bash
INOP_AUDIT_TEST_PORT=27018 node --test --test-isolation=none Backend/tests/auditCatalog.test.cjs Backend/tests/auditDirection.test.cjs Backend/tests/auditTemplateRevision.test.cjs Backend/tests/auditLifecycleSafety.test.cjs Backend/tests/auditFoundation.test.cjs Backend/tests/auditDashboardScores.test.cjs Backend/tests/auditEndpoints.test.cjs Backend/tests/auditScopes.test.cjs Backend/tests/auditLegacySafety.test.cjs Backend/tests/auditStorageReadiness.test.cjs Backend/tests/auditIntegrationDebt.test.cjs Backend/tests/auditReleaseRehearsal.test.cjs
```

## Log sübutları
- `/workspace/work/audit-p07/legacy-delivery.log` — SHA-256 `30a69ff51da0fd5513bd10d86112c0d49df66d376096e120f42209da9821ae3d`
- `/workspace/work/audit-p08/legacy-release.log` — SHA-256 `b2ff3a0b94dadbe0e18254ad30ccdd4651c7b8d9520cf82bb62c3df2f093657c`
- `/workspace/work/audit-p08/legacy-comparison.json` — SHA-256 `cd424b808cafbb943aa982ab88b00f9e7a9412d837708777dbe124b11f079a59`
