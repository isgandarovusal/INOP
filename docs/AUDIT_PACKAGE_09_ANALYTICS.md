# Paket 09 — analitika sabitliyi

> Cari final closure: **COMPLETE** (lokal texniki). Production readiness: **BLOCKED**. Əvvəlki nəticələr tarixidir; aşağıdakı final closure bölməsi cari vəziyyətdir.

## Final closure — 19 oktyabr 2026

Yeni lockfile/writer ilə təkrar: 5001 HR/175035 meyar/50%/3301ms; 5001 Servis/305061 meyar/50%/6402ms; latest index explain docsExamined=1. Standart601/114190 meyar/33.33333333333333%/4092ms; HSE701/13319 meyar/simple66.66666666666666% və weighted72.72727272727273%/1231ms. Scope, pinned revision, mid-flight account/grant revocation, no truncation və no mixed average assertion-ları keçir. Bunlar lokal ölçmələrdir, production SLA deyil. Scoring/aggregation kodu bu closure-da dəyişməyib.

## Başlanğıc sənəd — arxiv (66e67f7)


## HR və Servis

`auditNumericAnalytics.service` əvvəlki controller-lərin 5001 limitli find/JS qruplaşdırmasını server aggregation ilə əvəz edir. Tenant/direction/assignment/restaurant scope `$match`-dan əvvəl hesablanır, aggregation-un ilk mərhələsində tətbiq edilir. Latest **completed**, eyni audit ID + **pinned templateRevisionId** execution-u deterministik updatedAt/_id sırası ilə seçilir. Başqa revision-un daha yeni nəticəsi tarixi nəticəni əvəz etmir.

Saxlanılmış `overallPercentage` və assessment section percentages istifadə edilir; köhnə audit yenidən score edilmir. HR KFC v1 blocked denominator null qalır; yeni KFC applicable denominator dəyişmir. Servis KFC v1 B67 nəticəsi yeni conformity kimi təqdim edilmir, exclusion sayı ayrıca qalır. B79 scored sual deyil. N/A criterion average-dən çıxarılır, raw 0/0.5 uyğunsuzluqları NA ilə qarışdırılmır. All-NA null-dur. Section filtri drilldown-u daraldır, ümumi audit nəticəsini yenidən hesablamır.

5000 hard cap ləğv edilib. 15s DB budget və facet/document memory limitində 422/no-partial verilir; istifadəçidən intervalı daraltmaq tələb edilir. Total/submitted/scored/unscored, auditor/section seçimləri və child status müqavilələri saxlanır. Child permissions ayrıca kəsişdirilir.

## Standart/HSE və Audit Mərkəzi

Paket 08-in 500+ server aggregation-u qorunur. Standart counts-based applicable formula, HSE restoran simple +85%, ofis/anbar 5/3/1 weighted ayrı qalır. Audit Mərkəzi və GFC HSE overallPercentage=null saxlayır; mixed average yoxdur.

`auditAnalyticsAuthority.service` sorğunun əvvəlində current permission/parent scope digest-i götürür. Cavabdan əvvəl token/account yenidən yoxlanır, fresh profil/role/assignment/object və child scope digest-i müqayisə edilir. Ləğv/deactivation və dəyişiklikdə 401/403, data olmadan retry mesajı verilir. Bu, uzun aggregation zamanı əvvəlki icazə ilə məlumat göndərilməsinin qarşısını alır. İcazə genişlənməsi zamanı da konservativ refresh tələb edilə bilər.

## Sübut və sərhəd

`auditNumericAnalyticsScale.test.cjs` hər istiqamətdə **5001** audit, HR **175035**, Servis **305061** meyar, score=50, N/A/nonconformity sayları, foreign actor sıfır və wrong-revision exclusion assert edir. `auditAnalyticsScale.test.cjs` 601 Standart /701 HSE-ni yenidən yoxlayır. `auditAnalyticsRevocation.test.cjs` real aggregate-dan sonra account/assignment/child permission ləğvini sınaqdan keçirir.

Execution lookup üçün `audit_source_latest_v1` indeksindən istifadə owned test DB-də explain ilə sübut edilir: maksimum 1 document examined. Vaxt/RSS faktiki final logdan QA sənədinə çıxarılır. Bunlar production SLA, concurrency stress, production peak-memory və ya production index rollout PASS deyil.
