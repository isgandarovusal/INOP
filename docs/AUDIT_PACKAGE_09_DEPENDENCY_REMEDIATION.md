# Paket 09 final closure — dependency remediation

19 oktyabr 2026. Başlanğıc commit `66e67f7fd2cfbe16e983cb2c1cba7f5fc5e4d199`. Əvvəlki audit yalnız production graph-da 1 HIGH/3 MODERATE göstərirdi. Bu davam icrasında development graph da araşdırıldı.

| Graph | Əvvəl | Remediation sonrası |
|---|---|---|
| Backend tam | 4 HIGH /3 MODERATE | 0 advisory |
| Backend production | 1 HIGH /3 MODERATE | 0 advisory |
| Frontend tam | 1 HIGH | 0 advisory |
| Frontend production | 0 | 0 advisory |

`npm audit --json` və `npm audit --omit=dev --json` ayrı-ayrı icra edilib. Suppression, ignore, audit fix --force, fork və saxta versiya yoxdur. Son nəticələr audit tarixində registry-nin bildiyi advisory-lərə aiddir; bu, bütün mümkün supply-chain risklərinin yoxluğu iddiası deyil.

## Advisory və remediation matrisi

| Paket/versiya və scope | Advisory / CVE | Exploit şərti və istifadə | Tətbiq edilmiş həll |
|---|---|---|---|
| xlsx 0.18.5, direct runtime | GHSA-4r6h-8v6p-xvw6 /CVE-2023-30533; affected <0.19.3 | Untrusted workbook parsing prototype pollution. Runtime yalnız Audit/candidate export yazırdı; generated workbook read testlərdə idi | Paket və transitive graph tam çıxarıldı; rəsmi exceljs 4.4.0 ilə kontrollu writer migration |
| xlsx 0.18.5, direct runtime | GHSA-5pgg-2g8v-p4x9 /CVE-2024-22363; affected <0.20.2 | Malicious workbook parsing zamanı ReDoS | Eyni removal; təhlükəsiz olmayan import endpoint əlavə edilmir |
| sprintf-js 1.0.3 ←argparse 1.0.10 ←mammoth 1.13.0, transitive runtime | GHSA-hp3w-g68c-fv3c /CVE-2026-97058; <=1.1.3 | Unbounded precision format string DoS. Mammoth CLI parser dependency-si idi; HTTP DOCX API CLI-ni çağırmır | Mammoth mövcud 1.13.0-a pin; həmin parent üçün argparse 2.0.1 override. sprintf-js graph-dan çıxır. Help/HTML/Markdown və real DOCX extract API testləri |
| braces 3.0.3 ←chokidar 3.6.0 ←nodemon 3.1.14, development | GHSA-vfj7-8cjw-p6xm /CVE-2026-93687; <=3.0.3 | Dərin nested glob pattern stack-exhaustion. Yalnız dev watcher | Nodemon/chokidar/braces zənciri çıxarıldı; Node24 native `node --watch server.js`. Dev watch davranışı Node-un dependency watcher müqaviləsidir |
| source-map-js 1.2.1, transitive development | GHSA-68fv-2mgg-jv7q /CVE-2026-93749; >=1.0.0 <1.2.2 | Malicious indexed source-map offsets event-loop DoS; build/tooling | Compatible patch 1.2.2, frontend lock yeniləndi |
| uuid 8.3.2 ←exceljs 4.4.0, migration zamanı aşkar edilən runtime risk | GHSA-w5hq-g745-h8pq /CVE-2026-41907; <11.1.1 | v3/v5/v6 supplied buffer bounds. ExcelJS v4 UUID API istifadə edir | Parent-specific official CommonJS uuid 11.1.1 override; actual writer/reader/report regressiyası. Vulnerable variant final graph-da yoxdur |

Argparse 2.0.1 köhnə camelCase CLI alias-larını deprecation xəbərdarlığı ilə dəstəkləyir. Mövcud Mammoth CLI help və HTML/Markdown əmrləri real synthetic DOCX-də uğurludur. Bu xəbərdarlıq gələcək upstream uyğunluq işidir, advisory suppression deyil. Npm reconciliation uyğun range-dəki transitive/minor paketləri də yenilədi, o cümlədən js-yaml 5.4.2→5.5.0; geniş regression bu lockfile ilə təkrarlanır.

## SheetJS qərarı və provenance

Rəsmi `https://cdn.sheetjs.com/xlsx-0.20.3/xlsx-0.20.3.tgz` managed proxy ilə yenidən yoxlanıb: CONNECT 403. Proxy bypass edilməyib. Npm-də patched rəsmi xlsx artifact yoxdur. Buna görə istifadəçinin ikinci icazəli variantı — etibarlı kitabxanaya kontrollu migrasiya — seçildi.

ExcelJS rəsmi npm `exceljs@4.4.0`, MIT, repository `https://github.com/exceljs/exceljs`, tarball `https://registry.npmjs.org/exceljs/-/exceljs-4.4.0.tgz`.

SRI: `sha512-XctvKaEMaj1Ii9oDOqbW/6e1gXknSY4g/aLCDicOXqBE4M0nRWkUu0PTp++UPNzoFY12BNHMfs/VadKIS6llvg==`.

Lockfile package artifacts/integrities npm ci ilə doğrulanıb. Backend və frontend üçün adi, clean npm ci ayrıca keçib. Registry signature audit əmri network download failure ilə bitib: həmin əlavə signature/attestation yoxlamasına PASS verilmir. Bu məhdudiyyət lockfile SRI yoxlamasından ayrıdır. ExcelJS transitive graph-da deprecated glob/fstream/inflight və s. npm warning-ləri var; audit 0 olsa da upstream maintenance izlənməlidir.

## İmplementasiya sərhədi və uyğunluq

`spreadsheet.service.js` yalnız table/cell serialization adapter-idir; ZIP/XML writer ExcelJS-dir. Application workbook import API-si yaradılmır. `auditExport.controller` və `candidateExport.controller` eyni rows/query/authorization saxlayır, async write istifadə edir. Scoring/source/catalog/history modelləri dəyişdirilmir.

Əvvəlki cell-table strukturunun dar müqaviləsi saxlanır: column order, string/boolean/number/date, zero/half/blank, null→empty, exact AZ/EN/RU mətnləri və formula-looking literal strings. Formula/hyperlink object-ləri writer-ə ötürülmür. Mövcud long-cell overflow, workbook resource budget, columns/filter və bütün evidence/document/workflow cədvəlləri qorunur. İlk sətir freeze/wrap ilə oxunaqlıdır.

**Sənədləşdirilmiş ad dəyişikliyi:** Excel-in rezerv etdiyi `History` adı ExcelJS tərəfindən rədd olunur. Həmin vərəq məlumatları `Audit History` adı ilə saxlanır. `HR History`, `Service History`, `HSE History`, `Lifecycle History` dəyişmir. Xarici reader `History` adını sabit gözləyirsə `Audit History`-yə keçməlidir; audit tarixçəsinin özü dəyişmir. Testdə tələb olunan vərəq adı uyğun yenilənib, history coverage silinməyib.

## Semantic baseline və testlər

Orijinal xlsx 0.18.5 tarball-ı yalnız scratch-a endirilib, SHA-512 əvvəlki committed lockfile ilə müqayisə edilib. Yalnız known synthetic məlumatı yazmaq/oxumaq üçün işlədilib; vulnerable paket yeni runtime/dev graph-a daxil edilməyib və repoya commit edilməyib. Altı sintetik vərəq üzrə typed semantic JSON golden yaradılıb; real şəxsi məlumat/orijinal Excel yoxdur.

`spreadsheetMigration.test.cjs` ExcelJS çıxışını həmin golden ilə müqayisə edir: bütün hüceyrə dəyərləri, column/sheet order, N/A/0/0.5/100/false/blank, Unicode, 3 sənəd və literal formula text. Köhnə writer bir timestamp-da 1 ms floating serial rounding yaradırdı; yeni writer orijinal timestamp-ı dəqiq saxlayır. Test orijinal timestamp-a dəqiq bərabərliyi və əvvəlki nəticədən maksimum 1 ms fərqi ayrıca assert edir. Digər dəyərlər exact comparison-dur.

Mövcud altı real report ailəsi, bütün brendlər, all-NA/null, N+1/large export, RBAC/IDOR, independent approval/closure və workbook injection testləri assertion-ları zəiflədilmədən async reader ilə işləyir. Native ExcelJS ilə cells/formula/type/format da ayrıca yoxlanır. Mənbə Excel verifier-ləri və scoring mənbələri dəyişdirilməyib. Final bütün-test sayı və hosted CI sübutu QA/CI sənədlərindədir.
