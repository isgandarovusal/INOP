# Audit diaqnostikası — Paket 1–11 status checklist-i

`resolved` tətbiq səviyyəsində yoxlanmış düzəlişdir; production migration/deploy edildiyi mənasına gəlmir. `partial` məhdud hissə həll olunub. `blocked` ayrıca qərar, provider və ya production sübutu tələb edir.

| Finding | Status | Sübut / açıq hissə |
|---|---|---|
| GFC-nin brend kimi göstərilməsi, restoran dublikatları | resolved | Sabit kataloq, üç brend, ID qorunması və offline mapping testləri. Faktiki mapping ayrıca təsdiqlənəcək. |
| Birdən çox aktiv auditor istiqaməti | resolved | Scalar profile, User `_id` uniqueness, seriallaşdırılmış direction/assignment yazıları; production rolları dəyişməyib. |
| JWT/permission, organization/direction və child resource sızması | resolved | Parent scope intersection, action/source/evidence access; Paket 10 daxili reviewer scope hesablamasında inactive/invalid profile guard-ını da tətbiq edir. |
| Management roluna yüksəltmə / aktiv auditor profilinin taleyi | blocked | Role-string bypass yoxdur. Profil deaktivləşdirmə və assignment/provenance siyasəti ayrıca qərardır. |
| Published template dəyişməsi və execution-un mutable template oxuması | resolved | Immutable revisions və server snapshot; concurrency testləri. Raw DB admin əməliyyatları ayrıca nəzarət tələb edir. |
| Boş cavabdan 100%, səhv denominator, service yes/no/na uyğunsuzluğu | resolved | Bağlı revision üzrə completeness və mövcud scoring kontraktı; unknown/all-N/A unscored, tarixi rescore yoxdur. |
| Client score/status/approval, self-approval, səhv status transitions | resolved | Server-owned fields, müstəqil reviewer, action verification və lifecycle testləri. Paket 10 davamı bağlı auditə approval yaratma/qərar yazısını 409 ilə bloklayır. |
| Duplicate assignments/execution, assignedBy provenance | resolved | Transaction/parent-profile locks, idempotency, server actor. |
| Finding bağlanması / corrective action / closure race | resolved | Action verification tələb olunur; eyni parent lock closure ilə yarışları seriallaşdırır. |
| Blob URL və davamlı private evidence storage | blocked | Adapter təməli, digest/read-back/metadata/access testləri hazırdır; provider/credentials/real durable adapter yoxdur. Production upload 503 qalır. |
| Hard-delete və yeni orphan record riski | resolved | Audit/restoran/source arxivlənir; qeyri-müəyyən DB commit-dən sonra original avtomatik silinmir. Tarixi orphans ayrıca review tələb edir. |
| Legacy unknown istiqamət, unbound revision və nəticələr | partial | Oxuma qorunur, təxmin/rescore edilmir. Sertifikasiya və mapping üçün manual review lazımdır. |
| Audit action router-in əlçatan olmaması | resolved | Mövcud DB grants ilə backend router mount edildi; ayrıca action idarəetmə UI-si növbəti mərhələdir; cross-parent və independent verification testləri. |
| Source-document processing | partial | PDF/DOCX real bounded text extraction, CAS və reauthorization; sual/şablon yaratmır. Digər formatlar 415, stale-job recovery və production source storage açıqdır. |
| Legacy analytics filter, score vahidi, null/zero, trend | resolved | Canonical filtrlər, percent/out-of-10 ayrılığı, nullable unknown score, real zero və latest-window testləri. Xarici strictly-number consumers release-dən əvvəl yoxlanmalıdır. |
| Pagination və unbounded list/query xərci | partial | Yeni direction UI scoped pagination istifadə edir; köhnə array API saxlanır. Legacy list callers və reviewer-directory N+1 üçün əlavə iş qalır. Ölçülməmiş sürət iddiası yoxdur. |
| Activity/history duplication | partial | Yeni əməliyyatların provenance-i yazılır; köhnə stream-lərin tam konsolidasiyası aparılmayıb. |
| AZ/EN/RU | partial | Yeni istiqamət, branding və pagination mətnləri tamdır; köhnə detail/history səhifələrində sabit mətnlər qalır. |
| CSS specificity və təkrarlanan Audit qatları | partial | Audit Mərkəzi refaktor edilib, Audit selector-ları scope edilib. Bütün legacy qaydalar silinməyib; HR CSS dəyişməyib. |
| Production transaction topology / unique indexes / validators | blocked | Offline dry-run və definition-lar hazırdır. Production bağlantısı, index, validator və backfill tətbiqi yoxdur. |
| Render ingress / X-Forwarded-For | blocked | trust proxy=1 və spoofing regression-ları saxlanır. Faktiki tək-hop ingress/direct access təsdiqlənməyib. |
| Production dependency findings | blocked | XLSX high və Mammoth/argparse/sprintf-js chain riski release gate-dədir. Təhlükəsiz işlətmə patch hesab olunmur. |
| Production browser QA | blocked | Effektiv custom allowlist boşdur; domenlər sınanmayıb. Lokal Chromium QA production sübutu deyil. |
| Orijinal Luminous Glass P favicon asset | blocked | Söhbətdə vizual var; orijinal PNG baytları/file ID lokal əlçatan deyil. Alternativ ikon yaradılmayıb; Paket 9 sənədi. |
| Private storage timeout / paralellik | resolved | Caller timeout-dan sonra provider işinin faktiki settlement-inə qədər slot saxlanır; abort-a əməl etməyən adapter regression-u. Provider staging gate yenə blocked. |
| Legacy nullable score consumers | partial | Generic siyahı shared auditScore ilə real 0/null fərqini qoruyur, minimum filtr düzəldilib. Köhnə safety /5 mexanizmi dəyişməyib, external strictly-number consumers review tələb edir. |
| Yeni HR scoring və real istiqamət şablonları | blocked | Suallar/kontraktlar istifadəçi ilə razılaşdırılır. HR 0/0.5/1/N/A tətbiq olunmayıb, başqa istiqamətlərə ötürülməyib. |
| Seçilmiş köhnə frontend regression fixture/contract uyğunluğu | resolved | Execution snapshot/legacy 409, canonical GFC/KFC source metadata, archive, müstəqil reviewer və async approval nəticəsi üzrə fixture-lər modernləşdirildi. İlkin FAIL log saxlanır. Bu status bütün repository testlərinin yoxlandığı mənasına gəlmir. |

Release üçün: provider və credential qərarı, concrete adapter staging QA, restore/topology təsdiqi, reviewed mapping/index/validator planı və external nullable-average consumer yoxlaması. Bunlardan sonra ayrıca push/deploy təsdiqi tələb olunur.

## Paket 6–8 dəyişən fayllar

- `Backend/controllers/auditAction.controller.js`
- `Backend/controllers/auditAnalytics.controller.js`
- `Backend/controllers/auditDashboard.controller.js`
- `Backend/controllers/auditDirectionAnalytics.controller.js`
- `Backend/controllers/auditSourceDocuments.controller.js`
- `Backend/controllers/audits.controller.js`
- `Backend/controllers/privateFiles.controller.js`
- `Backend/middleware/auditScope.middleware.js`
- `Backend/middleware/templateScope.middleware.js`
- `Backend/models/auditAction.model.js`
- `Backend/models/auditEvidence.model.js`
- `Backend/models/auditSourceDocument.model.js`
- `Backend/routes/auditAction.routes.js`
- `Backend/routes/auditEvidence.routes.js`
- `Backend/routes/auditSourceProcessing.routes.js`
- `Backend/routes/route.js`
- `Backend/scripts/auditReleaseDryRun.cjs`
- `Backend/services/auditEvidenceStorage.service.js`
- `Backend/services/auditLifecycle.service.js`
- `Backend/services/auditQuery.service.js`
- `Backend/services/auditReleasePlan.service.js`
- `Backend/tests/auditLegacySafety.test.cjs`
- `Backend/tests/auditStorageReadiness.test.cjs`
- `Frontend/public/favicon.svg`
- `Frontend/src/Components/INOPLogo.tsx`
- `Frontend/src/Components/brand/wordmarkPaths.ts`
- `Frontend/src/Pages/Audit/Analytics/SafetyAuditAnalytics.tsx`
- `Frontend/src/Pages/Audit/Analytics/ServiceAuditAnalytics.tsx`
- `Frontend/src/Pages/Audit/Analytics/StandardAuditAnalytics.tsx`
- `Frontend/src/Pages/Audit/AuditDirectionPage.tsx`
- `Frontend/src/Pages/Auth/Login/Login.tsx`
- `Frontend/src/Services/auditAnalyticsService.ts`
- `Frontend/src/i18n/locales/az.json`
- `Frontend/src/i18n/locales/en.json`
- `Frontend/src/i18n/locales/ru.json`
- `Frontend/tests/auditBranding.spec.cjs`
- `docs/AUDIT_FINDING_STATUS.md`
- `docs/AUDIT_FOUNDATION_QA.md`
- `docs/AUDIT_PACKAGE_6_BRANDING.md`
- `docs/AUDIT_PACKAGE_7_LEGACY_SAFETY.md`
- `docs/AUDIT_PRODUCTION_RELEASE_PLAN.md`

## Lokal yekun QA

Əsas inteqrasiya 157/157; əlavə sənəd/Mongoose yoxlamaları ilkin geniş 174/174 keçiddə yoxlanılıb; proxy/rate-limit 7/7; son readiness fokuslu yoxlaması 13/13. Playwright 2/2, həmçinin Paket 6 əvvəl/sonra iki ayrıca vizual keçid. TypeScript/Vite build keçir. Frontend lint 0 xəta/9 mövcud warning, seçilmiş backend ESLint 0 xəta/4 warning (mövcud təhlükəsizlik məqsədli control-character regex-ləri üçün scoped rule exception). Mongoose xəbərdarlıqları yalnız equivalence testinin legacy `new:true` müqayisə qolundandır.

Artifaktlar Git xaricində `/workspace/work/audit-next/` və `/workspace/work/audit-packages/` daxilindədir. Heç bir production ölçməsi və ya sürət artımı iddiası yoxdur.

## Paket 9–11

Favicon mənbə blokeri: `AUDIT_PACKAGE_9_FAVICON.md`. Təhlükəsizlik düzəlişləri və qalan borclar: `AUDIT_PACKAGE_10_SECURITY.md`. Offline mapping/context/revision rehearsal, migration/staging/dependency/rollback planı: `AUDIT_PACKAGE_11_RELEASE_REHEARSAL.md`. Cari QA: `AUDIT_PACKAGE_9_11_QA.md`.

Npm production-only audit təkrarlandı: 4 affected package (1 high / 3 moderate), fixAvailable=false, lockfile dəyişməyib. Bütün əvvəlki partial/blocked finding-lər saxlanır; production-ready statusu verilmir. Cari artifaktlar `/workspace/work/audit-technical/` daxilindədir, əvvəlki nəticələr silinməyib.
