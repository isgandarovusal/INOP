# Paket 07 — hesabat, evidence və Excel inteqrasiyası

16 oktyabr 2026. Repository `isgandarovusal/INOP`, yalnız `inop-main`; başlanğıc lokal/remote HEAD `323c3dbfc42e6a49501c12b18b221222712677a6`, iş qovluğu təmiz idi. İnventar `AUDIT_PACKAGE_07_MATRIX.md`, data sahələri `AUDIT_PACKAGE_07_SOURCE_MAP.md`, icra nəticələri QA/REGRESSION sənədlərindədir.

## Həll olunan real boşluqlar

1. HSE report metadata-sında GFC ayrıca təşkilatdır: restoranın real brendi istifadə edilir, ofis/anbar üçün brend boşdur. Mövcud `/audit-report/:id` source auditlər üçün metadata, bütün meyar/cavab, qeydlər, nəticə, evidence/slot əlaqələri, finding/action/approval/closure və history bundle-u verir. Legacy report müqaviləsi saxlanır. Canonical nəticə son completed immutable save-dən oxunur, yenidən hesablanmır. Source report xülasəsində status-field əsasında yanlış sıfır passed/failed əvəzinə həqiqi müqavilə cavabları sayılır.
2. `AuditFinalReport` mövcud source AuditDetail və report route-unda yekun görünüş yaradır: responsive bölmə kartları, bütün sual mətnləri/cavablar, source HR AZ/EN/RU editorial təqdimatı, qeydlər və sağ evidence paneli, üç sənəd slotu, workflow və versiya xülasəsi. Qatlanan bölmələr uzun kataloqu oxunaqlı saxlayır. Fayllar authenticated Blob download ilə açılır; xarici/public storage URL-ləri əlavə edilmir. Mövcud canlı follow-up/approval/closure/history/export panelləri qalır.
3. HR formalarında çatışmayan sual üzrə birbaşa photo upload və bölmə photo seçimi/yüklənməsi mövcud `ServicePhoto` ilə tamamlanır. HR details optional sectionPhotos saxlayır; server audit ownership və image MIME yoxlayır. Köhnə saved details yenidən yazılmır. HR action proof-un göndərilmiş evidenceIds-ni səssiz atması düzəldilir: artıq digər source istiqamətləri ilə eyni mövcud evidence validasiyasından keçir. HR follow-up həmin proof seçimini istifadə edir.
4. Mövcud `/audit-export/:auditId/excel` tək texniki endpoint olaraq qalır. Bütün əvvəlki source vərəqləri qorunur. Yeni Report Metadata, Evidence, Evidence Links, Documents, Lifecycle History, Access və Applicability Reviews əlavə olunur. HR/Service immutable history əvvəllər çatışmırdı, indi ayrıca vərəqlərdədir. HR meyar Score/EvidenceIds və bölmə foto/N/A/applicable sütunları tamamlanır.
5. Findings/Actions/Approvals/Closures ortaq mapping ilə doldurulur: FindingId, ExecutionId, severity/source risk, responsible, dueDate→Deadline, proof, verification, timestamps və approval/closure əlaqələri itmir. CSV/PDF summary yolları saxlanır, dueDate fallback və CSV formula text qoruması tətbiq olunur. CSV/PDF native Unicode/style məhdudiyyətləri həll edilib kimi təqdim edilmir; tam mənbə hesabatı XLSX-dir.
6. Uzun hüceyrə mətnləri itkisiz Long Text vərəqində nömrələnmiş hissələrə ayrılır; orijinal hüceyrədə istinad qalır. Mətn hüceyrələri string tipindədir, executable formula və xarici hyperlink yaranmır. Həqiqi rəqəm 0/0.5/null ayrıdır; sütun genişliyi, başlıq sıra hündürlüyü və auto-filter verilir. Yeni Excel kitabxanası və paralel storage/export sistemi yoxdur.

## Təhlükəsizlik və performans

- Mövcud parent tenant/direction/brand/restaurant/HSE object scope bütün endpoint-lərdə qalır. Bundle hər child resource-un read icazəsini ayrıca yoxlayır; eyni scope-un audit yoxlaması yalnız həmin request daxilində paylaşılır. Qlobal istifadəçilərarası cache yoxdur.
- Private evidence metadata yalnız auditId ilə bir batch sorğuda oxunur. Public report/export storageReference, storageKey, provider credentials və legacy daxili finding file yolunu göstərmir. Download mövcud evidence route-un parent/ownership, re-auth və hash/size yoxlamasından keçir.
- XLSX və source report payload göndərilməzdən əvvəl token/current account, cari auditor profile/grant və əvvəl icazəli child scope-lar yenidən yoxlanır. Hesab proses zamanı deaktiv ediləndə 403 JSON verilir, payload/download təqdim edilmir.
- Mongoose child queries 10s DB time budget və 5000 child qeyd limiti ilə işləyir; source immutable saves üçün 100 versiya pəncərəsi var. Limitdə 422 verilir; heç bir qeydi səssiz kəsmir. Bu həddi aşan audit üçün ayrıca təsdiqlənmiş arxiv export planı tələb olunur; həmin hallarda standart report verilmir.
- Workbook üçün 250000 hüceyrə və 32MiB mətn limiti var. Guard uğursuz olduqda headers/binary göndərilməmiş JSON xəta qaytarılır. Export provider-dən şəkil baytlarını ayrıca endirmir; yalnız təhlükəsiz evidence istinadlarını verir. Excel-ə foto baytları embed edilib kimi təqdim olunmur.
- 190 standart/250 uzun tədbir benchmark-ı QA sənədindədir. Bu, production yük testi deyil. Paket 05/HSE analitikasının 500-audit pəncərəsi qalır; ümumi analytics optimallaşdırması Paket 08-ə saxlanır (HR/Servis mövcud 5000 pəncərəsi dəyişmir).

## Production hazırlığı: açıq xarici asılılıqlar

Production storage PASS deyil. Mövcud `auditEvidenceStorage.service` bootstrap-da production adapter qeydiyyatı yoxdur; mühitdə credentials/runtime bindings yoxdur. `RENDER=true`/production və provider yoxdursa mövcud 503 qalır. Real provider upload/download, retention/restore və ACL yoxlanmayıb. Lokal private file bayt testi bunu əvəz etmir.

Rollout üçün ayrıca səlahiyyətli əməliyyatlar:

1. Mövcud provider registry-yə təsdiqlənmiş private/durable/versioned/conditionalWrites adapter-inin server bootstrap inteqrasiyası; mövcud `AUDIT_EVIDENCE_STORAGE_PROVIDER` və `AUDIT_EVIDENCE_STORAGE_ENABLED` müqaviləsi. Secrets provider-a uyğun təhlükəsiz binding ilə verilməli, repoya yazılmamalıdır.
2. Provider credentialsReady, ownership key/version, hash/size, MIME/limit, timeout, permission revocation, real upload/download və restore/retention ayrıca təsdiqlənməlidir. Səssiz local fallback yoxdur.
3. Production template published revisions/bindings və real HSE ofis/anbar inventory/grants səlahiyyətli operator tərəfindən provision edilməlidir; mövcud kataloq/audit overwrite edilməməlidir.
4. Production DB topology/ACL, rollout/backup/restore və release rehearsal ayrıca yoxlanmalıdır. Bu task-da production DB, migration, provision, secrets dəyişməsi və manual deployment yoxdur.

## Əsas fayllar

Backend: `auditReportBundle.service.js`, `auditReportExport.service.js`, `auditWorkbook.service.js`; mövcud report/export/action controller-ləri, HSE export history və HR details/evidence əlavələri. Frontend: `AuditFinalReport.tsx`, `auditFinalReportService.ts`, report/detail inteqrasiyası, HR question/section photo və action proof UI, AZ/EN/RU mətnləri. Yeni QA: report integration/security/performance/workbook testləri və real-browser report/HR photo yoxlamaları. Recruitment, Main Dashboard, branding/backup və mənbə Excel-lərinə toxunulmur.
