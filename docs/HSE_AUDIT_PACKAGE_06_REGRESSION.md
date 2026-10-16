# Paket 06 — 44 məlum backend uğursuzluğunun müqayisəsi

Baza: Paket 05 `93c0165f07d9831fc879afce292910df75189d6a`. Hər iki icra **563 test / 519 PASS / 44 FAIL / 0 SKIP**. Uğursuz adlar və bütün assertion actual/expected-ləri eynidir (mənbə sətrinin nömrəsi müqayisəyə daxil deyil). Yeni failing test adı və dəyişmiş assertion: **0**. 44-ün ikisi parent, 42-si ayrıca assertion-dur. Geniş suite yaşıl elan edilmir.

Geniş suite-də mövcud testlərin heç biri Paket 06 üçün zəiflədilməyib və skip edilməyib. İlkin qaçış 508/55 idi: əlavə source-HSE guard-ı legacy safety-details controller-də `audit` dəyişəninə təyinatdan əvvəl müraciət edirdi. Həmin real ReferenceError düzəldilib; source HSE üçün 409 guard və atomic update filter qalır, köhnə 11 allowed mutation yenə 200 verir. Yekun müqayisə 519/44-dür.

| # | Test | Səbəb | Paket 05 | Paket 06 | Əlaqə |
|---|---|---|---|---|---|
| 1 | Assigned author may delete their own audit | Soft-delete sənədi saxlayır; köhnə test fiziki silinmə gözləyir. | FAIL actual `[Object]` / expected `null` | FAIL actual `[Object]` / expected `null` | Bazada eyni; yeni regressiya deyil |
| 2 | Audit lists, aggregates and child endpoints enforce their own permission scope | Alt assertion-ların parent testə ötürülməsi; ayrıca assertion deyil. | FAIL: alt testlər | FAIL: alt testlər | Bazada eyni; yeni regressiya deyil |
| 3 | Department approval uses trusted snapshot and still rejects legacy forged JSON | Reviewer-siz payload 400; köhnə test 201 gözləyir. | FAIL actual `400` / expected `201` | FAIL actual `400` / expected `201` | Bazada eyni; yeni regressiya deyil |
| 4 | Generic Audit scope and trusted department provenance | Alt assertion-ların parent testə ötürülməsi; ayrıca assertion deyil. | FAIL: alt testlər | FAIL: alt testlər | Bazada eyni; yeni regressiya deyil |
| 5 | Parent public id is normalized before ObjectId child queries and writes | Sintetik assignee aktiv və uyğun auditor profili deyil: 403; test 201 gözləyir. | FAIL actual `403` / expected `201` | FAIL actual `403` / expected `201` | Bazada eyni; yeni regressiya deyil |
| 6 | Real auditor retains explicitly granted all analytics/report and assigned Standard lists | Paket 05-dən assignment-siz auditor üçün 0; köhnə global gözlənti 14. | FAIL actual `0` / expected `14` | FAIL actual `0` / expected `14` | Bazada eyni; yeni regressiya deyil |
| 7 | admin: assigned audit-assignments mutation scope | Sintetik assignee aktiv və uyğun auditor profili deyil: 403; test 201 gözləyir. | FAIL actual `403` / expected `201` | FAIL actual `403` / expected `201` | Bazada eyni; yeni regressiya deyil |
| 8 | admin: assigned audit-score mutation scope | Revision-suz legacy audit rescore 409; test 200 gözləyir. | FAIL actual `409` / expected `200` | FAIL actual `409` / expected `200` | Bazada eyni; yeni regressiya deyil |
| 9 | admin: assigned closure mutation scope | Müstəqil approval olmadan closure 409; test 201 gözləyir. | FAIL actual `409` / expected `201` | FAIL actual `409` / expected `201` | Bazada eyni; yeni regressiya deyil |
| 10 | admin: delete foreign enforces same scope | Soft-delete sənədi saxlayır; köhnə test fiziki silinmə gözləyir. | FAIL actual `true` / expected `false` | FAIL actual `true` / expected `false` | Bazada eyni; yeni regressiya deyil |
| 11 | admin: delete own enforces same scope | Soft-delete sənədi saxlayır; köhnə test fiziki silinmə gözləyir. | FAIL actual `true` / expected `false` | FAIL actual `true` / expected `false` | Bazada eyni; yeni regressiya deyil |
| 12 | admin: foreign audit-assignments mutation scope | Sintetik assignee aktiv və uyğun auditor profili deyil: 403; test 201 gözləyir. | FAIL actual `403` / expected `201` | FAIL actual `403` / expected `201` | Bazada eyni; yeni regressiya deyil |
| 13 | admin: foreign audit-score mutation scope | Revision-suz legacy audit rescore 409; test 200 gözləyir. | FAIL actual `409` / expected `200` | FAIL actual `409` / expected `200` | Bazada eyni; yeni regressiya deyil |
| 14 | admin: foreign closure mutation scope | Müstəqil approval olmadan closure 409; test 201 gözləyir. | FAIL actual `409` / expected `201` | FAIL actual `409` / expected `201` | Bazada eyni; yeni regressiya deyil |
| 15 | admin: legacy audit-assignments mutation scope | Sintetik assignee aktiv və uyğun auditor profili deyil: 403; test 201 gözləyir. | FAIL actual `403` / expected `201` | FAIL actual `403` / expected `201` | Bazada eyni; yeni regressiya deyil |
| 16 | admin: legacy audit-score mutation scope | Revision-suz legacy audit rescore 409; test 200 gözləyir. | FAIL actual `409` / expected `200` | FAIL actual `409` / expected `200` | Bazada eyni; yeni regressiya deyil |
| 17 | admin: legacy closure mutation scope | Müstəqil approval olmadan closure 409; test 201 gözləyir. | FAIL actual `409` / expected `201` | FAIL actual `409` / expected `201` | Bazada eyni; yeni regressiya deyil |
| 18 | admin: own audit-assignments mutation scope | Sintetik assignee aktiv və uyğun auditor profili deyil: 403; test 201 gözləyir. | FAIL actual `403` / expected `201` | FAIL actual `403` / expected `201` | Bazada eyni; yeni regressiya deyil |
| 19 | admin: own audit-score mutation scope | Revision-suz legacy audit rescore 409; test 200 gözləyir. | FAIL actual `409` / expected `200` | FAIL actual `409` / expected `200` | Bazada eyni; yeni regressiya deyil |
| 20 | admin: own closure mutation scope | Müstəqil approval olmadan closure 409; test 201 gözləyir. | FAIL actual `409` / expected `201` | FAIL actual `409` / expected `201` | Bazada eyni; yeni regressiya deyil |
| 21 | admin: peer audit-assignments mutation scope | Sintetik assignee aktiv və uyğun auditor profili deyil: 403; test 201 gözləyir. | FAIL actual `403` / expected `201` | FAIL actual `403` / expected `201` | Bazada eyni; yeni regressiya deyil |
| 22 | admin: peer audit-score mutation scope | Revision-suz legacy audit rescore 409; test 200 gözləyir. | FAIL actual `409` / expected `200` | FAIL actual `409` / expected `200` | Bazada eyni; yeni regressiya deyil |
| 23 | admin: peer closure mutation scope | Müstəqil approval olmadan closure 409; test 201 gözləyir. | FAIL actual `409` / expected `201` | FAIL actual `409` / expected `201` | Bazada eyni; yeni regressiya deyil |
| 24 | admin: safety facets are scoped before averages/distributions | Canonical/legacy safety alias-ları ilə 5; köhnə test 4 gözləyir. | FAIL actual `5` / expected `4` | FAIL actual `5` / expected `4` | Bazada eyni; yeni regressiya deyil |
| 25 | assigned: assigned audit-assignments mutation scope | Sintetik assignee aktiv və uyğun auditor profili deyil: 403; test 201 gözləyir. | FAIL actual `403` / expected `201` | FAIL actual `403` / expected `201` | Bazada eyni; yeni regressiya deyil |
| 26 | assigned: assigned audit-score mutation scope | Revision-suz legacy audit rescore 409; test 200 gözləyir. | FAIL actual `409` / expected `200` | FAIL actual `409` / expected `200` | Bazada eyni; yeni regressiya deyil |
| 27 | assigned: assigned closure mutation scope | Müstəqil approval olmadan closure 409; test 201 gözləyir. | FAIL actual `409` / expected `201` | FAIL actual `409` / expected `201` | Bazada eyni; yeni regressiya deyil |
| 28 | assigned: foreign audit-assignments mutation scope | Sintetik assignee aktiv və uyğun auditor profili deyil: 403; test 201 gözləyir. | FAIL actual `403` / expected `201` | FAIL actual `403` / expected `201` | Bazada eyni; yeni regressiya deyil |
| 29 | assigned: foreign audit-score mutation scope | Revision-suz legacy audit rescore 409; test 200 gözləyir. | FAIL actual `409` / expected `200` | FAIL actual `409` / expected `200` | Bazada eyni; yeni regressiya deyil |
| 30 | assigned: foreign closure mutation scope | Müstəqil approval olmadan closure 409; test 201 gözləyir. | FAIL actual `409` / expected `201` | FAIL actual `409` / expected `201` | Bazada eyni; yeni regressiya deyil |
| 31 | department: assigned audit-assignments mutation scope | Sintetik assignee aktiv və uyğun auditor profili deyil: 403; test 201 gözləyir. | FAIL actual `403` / expected `201` | FAIL actual `403` / expected `201` | Bazada eyni; yeni regressiya deyil |
| 32 | department: assigned audit-score mutation scope | Revision-suz legacy audit rescore 409; test 200 gözləyir. | FAIL actual `409` / expected `200` | FAIL actual `409` / expected `200` | Bazada eyni; yeni regressiya deyil |
| 33 | department: assigned closure mutation scope | Müstəqil approval olmadan closure 409; test 201 gözləyir. | FAIL actual `409` / expected `201` | FAIL actual `409` / expected `201` | Bazada eyni; yeni regressiya deyil |
| 34 | department: delete own enforces same scope | Soft-delete sənədi saxlayır; köhnə test fiziki silinmə gözləyir. | FAIL actual `true` / expected `false` | FAIL actual `true` / expected `false` | Bazada eyni; yeni regressiya deyil |
| 35 | department: own audit-assignments mutation scope | Sintetik assignee aktiv və uyğun auditor profili deyil: 403; test 201 gözləyir. | FAIL actual `403` / expected `201` | FAIL actual `403` / expected `201` | Bazada eyni; yeni regressiya deyil |
| 36 | department: own audit-score mutation scope | Revision-suz legacy audit rescore 409; test 200 gözləyir. | FAIL actual `409` / expected `200` | FAIL actual `409` / expected `200` | Bazada eyni; yeni regressiya deyil |
| 37 | department: own closure mutation scope | Müstəqil approval olmadan closure 409; test 201 gözləyir. | FAIL actual `409` / expected `201` | FAIL actual `409` / expected `201` | Bazada eyni; yeni regressiya deyil |
| 38 | department: peer audit-assignments mutation scope | Sintetik assignee aktiv və uyğun auditor profili deyil: 403; test 201 gözləyir. | FAIL actual `403` / expected `201` | FAIL actual `403` / expected `201` | Bazada eyni; yeni regressiya deyil |
| 39 | department: peer audit-score mutation scope | Revision-suz legacy audit rescore 409; test 200 gözləyir. | FAIL actual `409` / expected `200` | FAIL actual `409` / expected `200` | Bazada eyni; yeni regressiya deyil |
| 40 | department: peer closure mutation scope | Müstəqil approval olmadan closure 409; test 201 gözləyir. | FAIL actual `409` / expected `201` | FAIL actual `409` / expected `201` | Bazada eyni; yeni regressiya deyil |
| 41 | own: delete own enforces same scope | Soft-delete sənədi saxlayır; köhnə test fiziki silinmə gözləyir. | FAIL actual `true` / expected `false` | FAIL actual `true` / expected `false` | Bazada eyni; yeni regressiya deyil |
| 42 | own: own audit-assignments mutation scope | Sintetik assignee aktiv və uyğun auditor profili deyil: 403; test 201 gözləyir. | FAIL actual `403` / expected `201` | FAIL actual `403` / expected `201` | Bazada eyni; yeni regressiya deyil |
| 43 | own: own audit-score mutation scope | Revision-suz legacy audit rescore 409; test 200 gözləyir. | FAIL actual `409` / expected `200` | FAIL actual `409` / expected `200` | Bazada eyni; yeni regressiya deyil |
| 44 | own: own closure mutation scope | Müstəqil approval olmadan closure 409; test 201 gözləyir. | FAIL actual `409` / expected `201` | FAIL actual `409` / expected `201` | Bazada eyni; yeni regressiya deyil |

## Təkrar icra

```bash
INOP_AUDIT_TEST_PORT=27018 node --test --test-isolation=none \
 Backend/tests/auditCatalog.test.cjs Backend/tests/auditDirection.test.cjs \
 Backend/tests/auditTemplateRevision.test.cjs Backend/tests/auditLifecycleSafety.test.cjs \
 Backend/tests/auditFoundation.test.cjs Backend/tests/auditDashboardScores.test.cjs \
 Backend/tests/auditEndpoints.test.cjs Backend/tests/auditScopes.test.cjs \
 Backend/tests/auditLegacySafety.test.cjs Backend/tests/auditStorageReadiness.test.cjs \
 Backend/tests/auditIntegrationDebt.test.cjs Backend/tests/auditReleaseRehearsal.test.cjs
```

Yalnız task-a məxsus MongoDB 7 replica set, 127.0.0.1:27018. Fixture hər dəfə yeni təsadüfi `inop_audit_test_*` DB yaradır və yalnız öz DB-sini silir. Production və əvvəlki 27017 konteyneri istifadə edilmir.

## Sübut logları (Git xaricində)
- `/workspace/work/audit-p05/legacy-closure.log` — SHA-256 `f8aacd7cce0cba251ac8ed4530fba7ad413e28794f7753b34329343120392156`
- `/workspace/work/audit-p06/legacy-final.log` — SHA-256 `03eacad3c3d060172b976fbecb8347ed8e98b283876cf7dc9e2c514b6c3e0b8c`
- `/workspace/work/audit-p06/legacy-comparison.json` — SHA-256 `cd424b808cafbb943aa982ab88b00f9e7a9412d837708777dbe124b11f079a59`
