# Paket 05 — geniş backend regressiyası

16 oktyabr 2026. Müqayisə bazası: Paket 04 `5948a7837a637e7d4f1f680a49ea80738c66c5c5`. Hər iki qaçış: **563 test / 519 PASS / 44 FAIL / 0 SKIP**. 44 uğursuz test adı eynidir; **yeni uğursuz test adı 0**. Bunlardan 42-si assertion, ikisi parent test uğursuzluğudur.

Bütün assertion dəyərləri eyni deyil: `Real auditor retains explicitly granted all analytics/report and assigned Standard lists` əvvəl actual 4 / expected 14, indi actual 0 / expected 14-dür. Paket 05-in məcburi assignment/RBAC tələbinə görə təyinatı olmayan profilli auditor bütün restoranların statistikası ilə təmin edilmir. Bu dəyişiklik ayrıca yeni icazə testləri ilə deny və grant hallarında yoxlanıb. Qalan assertion actual/expected-ləri bazadakı ilə eynidir. Geniş suite yaşıl elan edilmir.

## Dörd uyğunlaşdırılmış fixture

Aşağıdakı köhnə testlərin təhlükəsizlik gözləntisi Paket 05-in açıq tələbini əks etdirmək üçün dəyişib; istehsal kodunun təhlükəsizliyi zəiflədilməyib:

- `auditCatalog.test.cjs`: təyinatsız auditor üçün boş brand siyahısı, owned KFC auditdən sonra yalnız KFC; admin üçün üç brand.
- `auditFoundation.test.cjs`: əlavə PH assignment-dən əvvəl məhdud 2 audit / orta 8, assignment-dən sonra əvvəlki 3 audit / orta 7.
- `auditIntegrationDebt.test.cjs`: admin roluna yüksəldilmiş profilli auditor təyinatsız 403, aktiv assignment-dən sonra əvvəlki 201.
- `auditLegacySafety.test.cjs`: template processing-də təyinatsız brand 403, uyğun owned Safety auditdən sonra əvvəlki 200.

Bu dörd hal ilkin Paket 05 qaçışında 48 FAIL yaratmışdı; deny-then-grant fixture-ləri uyğunlaşdırıldıqdan sonra 44 məlum uğursuzluq qalır. Testlər skip edilməyib. Yeni `auditSeparation.test.cjs` eyni məhdudiyyəti dörd istiqamət, üç brand və iki KFC restoranı, bütün parent/child əməliyyatları üzrə müstəqil yoxlayır.

## Hər uğursuz testin müqayisəsi

| # | Test | Səbəb | Paket 04 baza | Paket 05 | Paket 05 ilə əlaqə |
|---|---|---|---|---|---|
| 1 | Assigned author may delete their own audit | Məlumatı qoruyan soft-delete sənədi saxlayır; test fiziki silinmə gözləyir. | FAIL: actual `[Object]`, expected `null` | FAIL: actual `[Object]`, expected `null` | Bazadakı məlum uğursuzluq; yeni deyil |
| 2 | Audit lists, aggregates and child endpoints enforce their own permission scope | Alt assertion-ların parent testə ötürülməsi; ayrıca müstəqil assertion deyil. | FAIL: alt testlər | FAIL: alt testlər | Bazadakı məlum uğursuzluq; yeni deyil |
| 3 | Department approval uses trusted snapshot and still rejects legacy forged JSON | Reviewer-siz payload 400; test 201 gözləyir. | FAIL: actual `400`, expected `201` | FAIL: actual `400`, expected `201` | Bazadakı məlum uğursuzluq; yeni deyil |
| 4 | Generic Audit scope and trusted department provenance | Alt assertion-ların parent testə ötürülməsi; ayrıca müstəqil assertion deyil. | FAIL: alt testlər | FAIL: alt testlər | Bazadakı məlum uğursuzluq; yeni deyil |
| 5 | Parent public id is normalized before ObjectId child queries and writes | Sintetik assignee aktiv və uyğun auditor profili deyil: 403; test 201 gözləyir. | FAIL: actual `403`, expected `201` | FAIL: actual `403`, expected `201` | Bazadakı məlum uğursuzluq; yeni deyil |
| 6 | Real auditor retains explicitly granted all analytics/report and assigned Standard lists | Köhnə global auditor gözləntisi 14; assignment tələbi sayını 4-dən 0-a endirir. | FAIL: actual `4`, expected `14` | FAIL: actual `0`, expected `14` | Qəsdən daha dar assignment əhatəsi; 4 → 0; ayrıca yeni RBAC testi keçir |
| 7 | admin: assigned audit-assignments mutation scope | Sintetik assignee aktiv və uyğun auditor profili deyil: 403; test 201 gözləyir. | FAIL: actual `403`, expected `201` | FAIL: actual `403`, expected `201` | Bazadakı məlum uğursuzluq; yeni deyil |
| 8 | admin: assigned audit-score mutation scope | Revision-suz legacy rescore 409; test 200 gözləyir. | FAIL: actual `409`, expected `200` | FAIL: actual `409`, expected `200` | Bazadakı məlum uğursuzluq; yeni deyil |
| 9 | admin: assigned closure mutation scope | Müstəqil approved review olmadan closure 409; test 201 gözləyir. | FAIL: actual `409`, expected `201` | FAIL: actual `409`, expected `201` | Bazadakı məlum uğursuzluq; yeni deyil |
| 10 | admin: delete foreign enforces same scope | Məlumatı qoruyan soft-delete sənədi saxlayır; test fiziki silinmə gözləyir. | FAIL: actual `true`, expected `false` | FAIL: actual `true`, expected `false` | Bazadakı məlum uğursuzluq; yeni deyil |
| 11 | admin: delete own enforces same scope | Məlumatı qoruyan soft-delete sənədi saxlayır; test fiziki silinmə gözləyir. | FAIL: actual `true`, expected `false` | FAIL: actual `true`, expected `false` | Bazadakı məlum uğursuzluq; yeni deyil |
| 12 | admin: foreign audit-assignments mutation scope | Sintetik assignee aktiv və uyğun auditor profili deyil: 403; test 201 gözləyir. | FAIL: actual `403`, expected `201` | FAIL: actual `403`, expected `201` | Bazadakı məlum uğursuzluq; yeni deyil |
| 13 | admin: foreign audit-score mutation scope | Revision-suz legacy rescore 409; test 200 gözləyir. | FAIL: actual `409`, expected `200` | FAIL: actual `409`, expected `200` | Bazadakı məlum uğursuzluq; yeni deyil |
| 14 | admin: foreign closure mutation scope | Müstəqil approved review olmadan closure 409; test 201 gözləyir. | FAIL: actual `409`, expected `201` | FAIL: actual `409`, expected `201` | Bazadakı məlum uğursuzluq; yeni deyil |
| 15 | admin: legacy audit-assignments mutation scope | Sintetik assignee aktiv və uyğun auditor profili deyil: 403; test 201 gözləyir. | FAIL: actual `403`, expected `201` | FAIL: actual `403`, expected `201` | Bazadakı məlum uğursuzluq; yeni deyil |
| 16 | admin: legacy audit-score mutation scope | Revision-suz legacy rescore 409; test 200 gözləyir. | FAIL: actual `409`, expected `200` | FAIL: actual `409`, expected `200` | Bazadakı məlum uğursuzluq; yeni deyil |
| 17 | admin: legacy closure mutation scope | Müstəqil approved review olmadan closure 409; test 201 gözləyir. | FAIL: actual `409`, expected `201` | FAIL: actual `409`, expected `201` | Bazadakı məlum uğursuzluq; yeni deyil |
| 18 | admin: own audit-assignments mutation scope | Sintetik assignee aktiv və uyğun auditor profili deyil: 403; test 201 gözləyir. | FAIL: actual `403`, expected `201` | FAIL: actual `403`, expected `201` | Bazadakı məlum uğursuzluq; yeni deyil |
| 19 | admin: own audit-score mutation scope | Revision-suz legacy rescore 409; test 200 gözləyir. | FAIL: actual `409`, expected `200` | FAIL: actual `409`, expected `200` | Bazadakı məlum uğursuzluq; yeni deyil |
| 20 | admin: own closure mutation scope | Müstəqil approved review olmadan closure 409; test 201 gözləyir. | FAIL: actual `409`, expected `201` | FAIL: actual `409`, expected `201` | Bazadakı məlum uğursuzluq; yeni deyil |
| 21 | admin: peer audit-assignments mutation scope | Sintetik assignee aktiv və uyğun auditor profili deyil: 403; test 201 gözləyir. | FAIL: actual `403`, expected `201` | FAIL: actual `403`, expected `201` | Bazadakı məlum uğursuzluq; yeni deyil |
| 22 | admin: peer audit-score mutation scope | Revision-suz legacy rescore 409; test 200 gözləyir. | FAIL: actual `409`, expected `200` | FAIL: actual `409`, expected `200` | Bazadakı məlum uğursuzluq; yeni deyil |
| 23 | admin: peer closure mutation scope | Müstəqil approved review olmadan closure 409; test 201 gözləyir. | FAIL: actual `409`, expected `201` | FAIL: actual `409`, expected `201` | Bazadakı məlum uğursuzluq; yeni deyil |
| 24 | admin: safety facets are scoped before averages/distributions | Canonical və legacy safety alias-ları birlikdə 5; test 4 gözləyir. | FAIL: actual `5`, expected `4` | FAIL: actual `5`, expected `4` | Bazadakı məlum uğursuzluq; yeni deyil |
| 25 | assigned: assigned audit-assignments mutation scope | Sintetik assignee aktiv və uyğun auditor profili deyil: 403; test 201 gözləyir. | FAIL: actual `403`, expected `201` | FAIL: actual `403`, expected `201` | Bazadakı məlum uğursuzluq; yeni deyil |
| 26 | assigned: assigned audit-score mutation scope | Revision-suz legacy rescore 409; test 200 gözləyir. | FAIL: actual `409`, expected `200` | FAIL: actual `409`, expected `200` | Bazadakı məlum uğursuzluq; yeni deyil |
| 27 | assigned: assigned closure mutation scope | Müstəqil approved review olmadan closure 409; test 201 gözləyir. | FAIL: actual `409`, expected `201` | FAIL: actual `409`, expected `201` | Bazadakı məlum uğursuzluq; yeni deyil |
| 28 | assigned: foreign audit-assignments mutation scope | Sintetik assignee aktiv və uyğun auditor profili deyil: 403; test 201 gözləyir. | FAIL: actual `403`, expected `201` | FAIL: actual `403`, expected `201` | Bazadakı məlum uğursuzluq; yeni deyil |
| 29 | assigned: foreign audit-score mutation scope | Revision-suz legacy rescore 409; test 200 gözləyir. | FAIL: actual `409`, expected `200` | FAIL: actual `409`, expected `200` | Bazadakı məlum uğursuzluq; yeni deyil |
| 30 | assigned: foreign closure mutation scope | Müstəqil approved review olmadan closure 409; test 201 gözləyir. | FAIL: actual `409`, expected `201` | FAIL: actual `409`, expected `201` | Bazadakı məlum uğursuzluq; yeni deyil |
| 31 | department: assigned audit-assignments mutation scope | Sintetik assignee aktiv və uyğun auditor profili deyil: 403; test 201 gözləyir. | FAIL: actual `403`, expected `201` | FAIL: actual `403`, expected `201` | Bazadakı məlum uğursuzluq; yeni deyil |
| 32 | department: assigned audit-score mutation scope | Revision-suz legacy rescore 409; test 200 gözləyir. | FAIL: actual `409`, expected `200` | FAIL: actual `409`, expected `200` | Bazadakı məlum uğursuzluq; yeni deyil |
| 33 | department: assigned closure mutation scope | Müstəqil approved review olmadan closure 409; test 201 gözləyir. | FAIL: actual `409`, expected `201` | FAIL: actual `409`, expected `201` | Bazadakı məlum uğursuzluq; yeni deyil |
| 34 | department: delete own enforces same scope | Məlumatı qoruyan soft-delete sənədi saxlayır; test fiziki silinmə gözləyir. | FAIL: actual `true`, expected `false` | FAIL: actual `true`, expected `false` | Bazadakı məlum uğursuzluq; yeni deyil |
| 35 | department: own audit-assignments mutation scope | Sintetik assignee aktiv və uyğun auditor profili deyil: 403; test 201 gözləyir. | FAIL: actual `403`, expected `201` | FAIL: actual `403`, expected `201` | Bazadakı məlum uğursuzluq; yeni deyil |
| 36 | department: own audit-score mutation scope | Revision-suz legacy rescore 409; test 200 gözləyir. | FAIL: actual `409`, expected `200` | FAIL: actual `409`, expected `200` | Bazadakı məlum uğursuzluq; yeni deyil |
| 37 | department: own closure mutation scope | Müstəqil approved review olmadan closure 409; test 201 gözləyir. | FAIL: actual `409`, expected `201` | FAIL: actual `409`, expected `201` | Bazadakı məlum uğursuzluq; yeni deyil |
| 38 | department: peer audit-assignments mutation scope | Sintetik assignee aktiv və uyğun auditor profili deyil: 403; test 201 gözləyir. | FAIL: actual `403`, expected `201` | FAIL: actual `403`, expected `201` | Bazadakı məlum uğursuzluq; yeni deyil |
| 39 | department: peer audit-score mutation scope | Revision-suz legacy rescore 409; test 200 gözləyir. | FAIL: actual `409`, expected `200` | FAIL: actual `409`, expected `200` | Bazadakı məlum uğursuzluq; yeni deyil |
| 40 | department: peer closure mutation scope | Müstəqil approved review olmadan closure 409; test 201 gözləyir. | FAIL: actual `409`, expected `201` | FAIL: actual `409`, expected `201` | Bazadakı məlum uğursuzluq; yeni deyil |
| 41 | own: delete own enforces same scope | Məlumatı qoruyan soft-delete sənədi saxlayır; test fiziki silinmə gözləyir. | FAIL: actual `true`, expected `false` | FAIL: actual `true`, expected `false` | Bazadakı məlum uğursuzluq; yeni deyil |
| 42 | own: own audit-assignments mutation scope | Sintetik assignee aktiv və uyğun auditor profili deyil: 403; test 201 gözləyir. | FAIL: actual `403`, expected `201` | FAIL: actual `403`, expected `201` | Bazadakı məlum uğursuzluq; yeni deyil |
| 43 | own: own audit-score mutation scope | Revision-suz legacy rescore 409; test 200 gözləyir. | FAIL: actual `409`, expected `200` | FAIL: actual `409`, expected `200` | Bazadakı məlum uğursuzluq; yeni deyil |
| 44 | own: own closure mutation scope | Müstəqil approved review olmadan closure 409; test 201 gözləyir. | FAIL: actual `409`, expected `201` | FAIL: actual `409`, expected `201` | Bazadakı məlum uğursuzluq; yeni deyil |

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

Testlər ayrı lokal MongoDB 7 replica set-in 127.0.0.1:27018 portunda hər fixture üçün təsadüfi owned DB ilə işləyib; yalnız öz test DB-si silinir. Production DB açılmır. Sintetik istifadəçi/restoranlar real məlumatlara yazılmır.

Lokal sübut logları (repoya böyük log və credentials daxil edilmir):
- `/workspace/work/service-audit-p04/closure-legacy-final.log` — SHA-256 `aefd8e812c92c54e7d205e536458309d3b047c5269e0e29cd9d6000b177dabf2`
- `/workspace/work/audit-p05/legacy-closure.log` — SHA-256 `f8aacd7cce0cba251ac8ed4530fba7ad413e28794f7753b34329343120392156`
- `/workspace/work/audit-p05/legacy-comparison.json` — SHA-256 `8d3275156726ac5084d691e738505d2a1fd1e4b1e66aa1cbceedb31cf26e3607`
