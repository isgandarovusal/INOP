# Production Mərhələ 3 — versiyalararası uyğunluq

Müqayisə: operatorun live kodu `5d886ccf36cce0b67d25a12119663e00d4125ce9` → GitHub başlanğıcı `0d782d09fa70c8c44384e1aebda997427dcf3c95` → Mərhələ 3 lokal düzəlişi. Bu, canlı infra parametrlərinin sertifikatı deyil.

`git diff 5d886cc..0d782d0 -- Backend`:87 fayl; route və model fayllarında dəyişiklik yoxdur. Frontend `src` məzmunu dəyişməyib; frontend fərqləri dependency/test infrastrukturu ilə məhdudlaşıb. Audit source kataloqları, scoring müqavilələri və snapshot modelləri dəyişmir.

| Axın | Keçid / risk | Yoxlama və buraxılış şərti |
|---|---|---|
| Authentication | Login/me/logout response/token müqaviləsi eynidir; exception logging redaktə edilir | Cari auth/RBAC/revocation suite; operator approved smoke identity tələb olunur |
| Recruitment | Biznes route/model müqaviləsi eynidir; candidate Excel writer async ExcelJS olur; SigV4 transport texniki genişlənir | Recruitment browser və server testləri; worker flag-ləri mövcud inventardan təsdiqlənməlidir |
| Audit Center / HR / Servis / Standart / HSE | Endpoint/DTO, kataloq və scoring müqavilələri qorunur | Create/draft/resume/complete/approval/closure/history və N/A/null regressiyası |
| HR/Servis analytics | 5000 truncation/rejection sərhədi server aggregation ilə əvəz edilir; response-dan əvvəl authority yenidən yoxlanır | 5001 audit, revocation və scope testləri; live query capacity ayrıca ölçülməlidir |
| Standart/HSE analytics | Paket 08 aggregation metodologiyası qorunur; fərqli scoring bir faizə qarışdırılmır | Mövcud geniş suite və browser matrisi |
| Evidence/storage | Optional private/versioned S3 bootstrap; default disabled/503 qalır | Yerli protocol/API testləri real cloud smoke deyil; explicit ayrıca aktivləşdirmə icazəsi |
| Excel export | SheetJS əvəzinə ExcelJS; response download/metadata/cell semantics qorunur | Altı hesabat, formula injection, literal cells, source verifiers və semantic migration testləri |
| Workbook history | Əsas execution history sheet-i `History` → `Audit History`; ExcelJS-in qəbul etmədiyi protected `History` adı aradan qalxır | Xarici sheet-name parser-i varsa operator smoke etməlidir; frontend sheet adını parse etmir |
| Template provision | Current binding historical KFC revision-a işarə edirsə409/manual review | Köhnə audit execution/history bloklanmır; provisioning guard ayrıca test olunur |
| Runtime | Node24/port/Mongo URI/JWT startup fail-fast; yeni `/version` və `/ready` | Render Settings-də real Node/root/start və binding adları əvvəlcə təsdiqlənməlidir |

`72b114f` ilə Mərhələ 2-də aparılmış old-backend testini `5d886cc` sınağı kimi təqdim etmirik. Mərhələ 3-də ayrıca `5d886cc` backend product kodu və onun locked dependency-ləri ilə cari frontend browser sınağı hazırlanıb. Dörd QA helper yalnız27018-owned DB isolation və ayrıca ExcelJS QA-reader üçün uyğunlaşdırılıb; product kodu dəyişdirilməyib və assertion-lar dəyişməyib. Tarixi dependency-lər scratch-də, install scripts disabled, browser xarici şəbəkəsi blocked və real credentials yoxdur. Bu snapshot testi production Node/settings/data uyğunluğunu təsdiqləmir. Faktiki nəticələr QA sənədindədir.

## DB və rollback sərhədi

Bu aralıqda schema/model və scoring dəyişməyib; release üçün avtomatik data migration müəyyən edilməyib. `autoIndex:false/autoCreate:false` qalır; startup provision/seed yoxdur. Real DB topology, data shapes və indeksləri yalnız operator təsdiqləyə bilər. Provision/index/storage əməliyyatları application deploy-dan ayrıdır.

Storage OFF və yeni formatlı evidence yaranmamış alignment mərhələsində rollback üçün əvvəlki working release receipt-i saxlanır. **S3 versiyalı receipt-lər yazıldıqdan sonra `5d886cc` rollback target kimi avtomatik qəbul edilmir:** onda yeni S3 adapter/bootstrap yoxdur. Rollback target eyni receipt/revision formatını oxuyan sınaqdan keçmiş release olmalıdır. MongoDB və evidence ayrı-ayrı, uyğunsuz snapshot-lara qaytarılmır.

## Vercel/GitHub

Backend/docs-only əvvəlki push `0d782d0` üçün avtomatik Vercel Production deployment7172818591 SUCCESS yaradıb; bu dəyişiklik növü trigger-i dayandırmır. Frontend/build konfiqurasiyası Mərhələ 3-də dəyişmir. Adi push yalnız frontend src/config tree bərabərliyi, build-in canlı HTML/JS/CSS ilə uyğunluğu, cari/old-code test nəticələrinin qiymətləndirilməsi və Render AutoDeployOFF operator təsdiqi ilə edilə bilər. Branch protection bypass, force-push və manual deployment yoxdur.

## Tarixi dependency riski

`5d886cc` tarixi lockfile-in təkrar auditində full graph **4 HIGH / 3 MODERATE**, development dependency-lər çıxarılanda **1 HIGH / 3 MODERATE** aşkarlandı. Bu, canlı installed package inventarının ölçülməsi deyil; frozen source/lockfile üzrə nəticədir. SheetJS `xlsx` üçün GHSA-4r6h-8v6p-xvw6 və GHSA-5pgg-2g8v-p4x9, köhnə dev `nodemon/chokidar/braces` zənciri və `mammoth/argparse/sprintf-js` zənciri fərqləndirilir. Advisory mövcudluğu HTTP exploit-in əlçatanlığını öz-özünə sübut etmir; tətbiqdə XLSX əsasən export writer kimi istifadə olunur. Cari backend/frontend full və production graph-larında 0 advisory təsdiqləndi. Tarixi dependency-lər yalnız izolə snapshot testindədir, release artifact-ına əlavə olunmur.

## Tarixi writer/reader sərhədi

Cari strict browser suite-i `5d886cc` ilə **40 PASS / 1 FAIL** verdi; FAIL export testində ExcelJS QA-reader-in köhnə SheetJS blank Percentage xanasını `undefined`, yeni writer-in isə literal boş string kimi oxumasıdır. Bu FAIL saxlanır, assertion dəyişdirilməyib. Əlavə real HTTP probe Standard legacy workbook-da `History` vərəq adını ExcelJS-in protected name kimi rədd etdiyini aşkarladı. Yeni writer-də artıq `Audit History` istifadə olunur. Bu fərqlər Frontend runtime API xətası deyil: `AuditExportPanel` XLSX-i parse etmir, faylı endirir. Bütün altı köhnə/yeni export-un stored null və tam meyar sayı ayrıca probe-larla ölçülür; köhnə Strict suite-in FAIL-i həmin nəticələrlə gizlədilmir. Cari backend nəticəsi QA-da ayrıca göstərilir. Köhnə audit snapshot-u və saxlanmış XLSX bytes dəyişdirilmir.
