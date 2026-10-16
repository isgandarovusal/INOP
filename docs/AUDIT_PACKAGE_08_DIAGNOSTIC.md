# Paket 08 — başlanğıc diaqnostika

Baza: `ac983548bda02cf11a3775f7ba94c85068942444`; lokal və GitHub `inop-main` eynidir, başlanğıc worktree təmizdir. Əvvəlki Blok 02 və Paket 03–07 implementation/source map/QA/regression sənədləri, legacy safety/security/release rehearsal məhdudiyyətləri nəzərə alınıb. Mənbə kataloqları/scoring yenidən yazılmır.

| Prioritet | Real məsələ | Kod/mənbə | Qərar |
|---|---|---|---|
| P1 | Fərqli audit metodologiyaları ümumi orta bala çevrilir | auditDirectionAnalytics.overview, AuditDashboard və generic analitika | Audit Mərkəzində yalnız say/status/coverage, ümumi faiz null; direction nəticələri ayrı |
| P1 | Standart/HSE 501 audit/execution-u JS-ə yükləyib >500 üçün 422 verir | standardAudit.controller.analytics, hseAudit.controller.analytics | Scope-first server aggregation, audit tarixçəsi üzrə tam saylar; timeout/DB limitləri açıq fail-closed |
| P1 | Bir profildə yalnız bir istiqamət dəstəklənir | auditorProfile.direction; middleware/source/assignment/UI müqavilələri | Explicit, versiyalı əlavə direction grants; primary sahə geriyə uyğun qalır; bütün əməliyyatlarda eyni yoxlama |
| P1 | Ümumi analytics səhv/empty vəziyyətində yanıltıcı boş rəqəmlər göstərə bilər | AuditAnalytics Promise.all.finally, hardcoded loading | Scoped resource/error/retry/empty UI və real mərkəzi endpoint |
| P1 | HR/Servis yeni auditor/section filtrləri backend-də yoxdur | HR/Service analytics metadata filter | Serverdə validasiya və source qiymətləndirməsini dəyişmədən filtr |
| P2 | Yeni source qiymətləndirmələr legacy generic analytics cavab şkalasına uyğun deyil | /audit-analytics/service, /standard, /safety | Legacy yol saxlanır; yeni source üçün ayrı mövcud analytics endpoint-ləri və metodologiya mesajı |
| External | Production storage/provider və real fayl smoke yoxlanmayıb | auditEvidenceStorage.service, Paket 07 QA | Mövcud 503 qalır, rollout/smoke/retention proseduru; production PASS yoxdur |
| External | Production template/HSE inventory/grants provision təsdiqlənməyib | source binding + published revision + object grants | Read-only dry-run inventar mexanizmi və idempotent/version-check operator proseduru; canlı DB əməliyyatı yoxdur |
| Known debt | Geniş backend 519 PASS / 44 əvvəlki FAIL | Paket 07 REGRESSION | Yeni failure və assertion fərqlərini ayrıca müqayisə et |

## İnteqrasiya xəritəsi

- UI: `/app/audit` mərkəzi, `/audit/analytics`, ayrı HR/Servis/Standart/HSE create/list/analytics; shared execution/detail/report route-ları backend parent provenance və direction ilə qorunur. Recruitment və Main Dashboard ayrıca qalır.
- API: `/audit-{hr,service,standard,hse}` source/list/create/analytics; `/audit-execution`, `/audit-report`, `/audit-export`, `/audit-evidence`, `/audit-findings`, `/audit-actions`, `/audit-approval`, `/audit-closure`, assignment/profile yolları. Existing six XLSX reports qorunur.
- Data: Audit + immutable template revision/context; HR/Service/Standard/HSE immutable save; evidence, finding/action, approval/closure/activity. HSE office/warehouse real object/grant modelləri Restaurant-dan ayrıdır.
- Scope: authorization → active direction profile → tenant/brand/restaurant/assignment və HSE object grants. Aggregate-dan əvvəl eyni parent scope tətbiq edilir; child resource scope ayrıca kəsişdirilir.
- Nəticələr: HR 66/71/35, Servis 94/79/61, Standart 190/123/71, HSE 52/19/29. NA/null, KFC B67/B79, boş source risk, HSE 85% və ayrı weighted kontraktlar dəyişmir. Köhnə nəticə/snapshot/revision migration edilmir.

Tam endpoint/route/model inventarı və readiness gate yekun sənədlərdədir. P0 üçün ilkin təsdiqlənmiş aktiv sızma müəyyən edilməyib; geniş təhlükəsizlik sınaqları icra edilməmiş PASS sayılmır.

## Yekun həll vəziyyəti

Yuxarıdakı P1/P2 məsələlərinin lokal funksional düzəlişləri və 55 backend +21 browser testinin nəticələri `AUDIT_PACKAGE_08_IMPLEMENTATION.md` və `AUDIT_PACKAGE_08_QA.md`-dədir. 500+ analitika tamlığı 601 Standart və 701 HSE auditində assert edilib. 44 əvvəlki legacy failure dəyişməz qalır; production storage/provision/smoke/readiness ayrıca BLOCKED/NOT TESTED-dir. Yeni mənbə forması, avtomatik migration və ya ümumi score düsturu yaradılmayıb.
