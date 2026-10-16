# Paket 07 — başlanğıc inventarı və inteqrasiya xəritəsi

Baza `323c3dbfc42e6a49501c12b18b221222712677a6`; lokal və GitHub `inop-main` eynidir, başlanğıc iş qovluğu təmizdir. Paket 03–06 implementation/source map/QA/regression sənədləri nəzərə alınıb. Bu paket mənbə kataloqlarını və scoring kontraktlarını dəyişmir.

| İstiqamət × funksiya | Backend başlanğıc | Frontend başlanğıc | Excel başlanğıc | QA bazası / tələb olunan əlavə |
|---|---|---|---|---|
| HR — cavab/nəticə | source-v2, immutable save, 0/0.5/1/NA | execution tam; detail yalnız xülasə | Criteria/Sections/Source; meyar evidence, score, bölmə foto/history çatışmır | HR 11; bütün brendlərin tam report/export inteqrasiyası |
| Servis — cavab/nəticə | source revision/B67 qorunması | execution tam; detail yalnız xülasə | Criteria/Sections/Source/References; immutable save export yoxdur | Servis 12; report/history |
| Standart — cavab/nəticə | tam 190/123/71, Compliant/Critical/Major/Minor/NA | Cover mövcuddur, detail bütün cavabları göstərmir | Cover/Standards/Findings/History; uzun action/review JSON hüceyrəsi riski | Standart/RBAC 10; unikal standart hesabı və uzun export |
| HSE — cavab/nəticə | restoran/ofis/anbar ayrı, 85% yalnız restoran | Cover var, detail bütün cavabları göstərmir | COVER və Results Summary/Criteria/History/Applicability | HSE 9; üç ayrıca hesabat |
| Hamısı — evidence/sənədlər | private upload, parent/direction/grant, metadata model; 503 fail-closed | ümumi fayl siyahısı; üç final slot; HR bölmə fotosu yoxdur | metadata və əlaqə/slot xəritəsi yoxdur | IDOR, audit/brand/tenant/object və 3 müstəqil slot |
| Hamısı — finding/action | mövcud modellər severity, priority, dueDate, evidenceIds | ayrı panellər/follow-up | HR üçün proof sütunları yoxdur; CSV/PDF deadline səhv mapping | bütün əlaqələr, notes/proof/review/closure |
| Hamısı — yekun hesabat | report endpoint yalnız summary | report/detail-də bir yerdə bütün source cavabları yoxdur | ortaq Audit metadata məhduddur | hesabat/Excel eyni saxlanmış snapshot |
| Hamısı — texniki export | tək /audit-export/:auditId/excel, parent scope | AuditExportPanel PDF/Excel/CSV | width/filter/wrap yoxdur, uzun hüceyrələr XLSX limitini aşa bilər | mətn formula təhlükəsizliyi, metadata redaction, fail-closed limit/performance |

## İnteqrasiya qərarları

Mövcud endpoint, immutable saves, evidence/storage, lifecycle və panel dizaynı təkrar istifadə edilir. Hesabat üçün ortaq texniki bundle və Excel enrichment əlavə olunur; mənbəyə uyğun mövcud vərəqlər saxlanır. Child məlumatları öz read səlahiyyəti ilə məhdudlaşdırılır. Yeni scoring/SLA/provision/migration yoxdur. UI yekun report-da bütün source cavablarını, qeyd/evidence/slot və workflow məlumatlarını bir yerdə göstərir. Production provider hələ xarici blokerdir; mövcud 503 dəyişmir.

## Yekun bağlanış

| Funksiya | Backend | Frontend | Export | Sübut |
|---|---|---|---|---|
| Altı yekun source hesabatı | Ortaq scoped bundle, immutable completed save | Bir yerdə metadata/cavab/workflow/evidence | Əvvəlki source vərəqləri + Report Metadata | 12 brend/obyekt variantı, 890 meyar; report integration |
| HR/Servis tarixçəsi | Mövcud immutable save modelləri | Versiya xülasəsi + əvvəlki history endpoint-i | HR History / Service History | 48/48 birgə backend, HR 4/4 və Servis browser |
| Foto/sənədlər | Ownership/MIME və 3 müstəqil slot | HR sual/bölmə foto əlavəsi, secure download | Evidence / Evidence Links / Documents | Real bayt, sparse slot, IDOR; HR photo browser |
| Finding/action/review/closure | Child read scope + HR proof persistence | Mövcud live panellər və yekun xülasə | Tam sahə mapping-i və ayrı Applicability Reviews | Bütün 12 variantda müstəqil workflow |
| XLSX texniki keyfiyyəti | Bounded batch query, son auth recheck | Mövcud AuditExportPanel | String formula qoruması, long-text lossless split | Workbook/security/performance + 6 real browser download |
| Responsive və dillər | Biznes məzmunu dəyişmir | AZ/EN/RU, 320/390/768/1440 | Mənbə mətnləri və canonical nəticə | 72 report görünüşü + 100 ümumi vizual hal |
| Production storage/provision | Mövcud 503 fail-closed | Saxta uğur yoxdur | ID və authenticated istinad | Lokal PASS; canlı provider/provision ayrıca açıqdır |
