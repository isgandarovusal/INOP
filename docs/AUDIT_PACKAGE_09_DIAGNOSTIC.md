# Paket 09 — tam sistem diaqnostikası

Baza `5d886ccf36cce0b67d25a12119663e00d4125ce9`, yalnız `inop-main`. İlk iş qovluğu təmiz idi; davametmə zamanı mövcud `9b1e256` commit-i və təhlükəsiz uncommitted dəyişikliklər qorundu. 19 oktyabr 2026-da mühit bərpa ediləndən sonra final QA yenidən icra edilib. Production DB/secrets/deploy üzərində əməliyyat yoxdur.

## İstifadə edilən mənbələr

Paket 01–08 Audit/source map/QA/regression/release sənədləri; 51 Audit/release sənədinin path, başlıq və SHA-256 inventarı `/workspace/work/audit-p09/document-inventory.json`-dadır. Orijinal Excel-lər, source kataloqları və scoring xidmətləri dəyişdirilmir. Audit route/model xəritəsi Paket 08 INVENTORY ilə birlikdə nəzərə alınır.

| Prioritet | Aşkar edilmiş real məsələ | Düzəliş / sərhəd |
|---|---|---|
| P1 | 44 məlum assertion/fixture failure | 519/44 təkrarlandı; mənbə guard-larına uyğun fixture/assertion, əlavə denial/no-write testi; focused 532/532, legacy 564/564 |
| P1 | HR/Servis JS materialization və 5000 limit | Scope-first, pinned-revision latest completed execution server aggregation; stored audit/section averages qorunur |
| P0 | Analitika uzun sorğu zamanı əvvəlki icazə snapshot-u ilə cavab göndərə bilər | Bütün 4 source analytics + center cavabından əvvəl fresh JWT/account/profile/parent/child scope yenidən yoxlanır; dəyişiklikdə məlumat verilmir |
| P1 | Provider receipt null/yanlış version dəyəri 500/yanlış validasiya yarada bilər | Bounded receipt type/version yoxlaması; təhlükəsiz 503; bytes/metadata success kimi göstərilmir |
| P1 | Audit/auth catch-ları raw exception/stack loglaya bilər | 57 raw logging nöqtəsi mövcud safeErrorLog ilə əvəz edilir; actual controller injection testi və fatal redaction |
| P1 | Əlavə full-suite approval/execution/template/restaurant testləri köhnə müqavilələrə əsaslanır | Certified revision fixture, independent approval, immutable resolved history, archive və direction/assignment testləri saxlanır |
| P1 | HR concurrency testinin hook-u optimallaşdırılmış countDocuments çağırışını tutmur | Hər iki real read yolu intercept edilir; bounded gate; business controller dəyişdirilmir |
| P1 | Test helper missing env zamanı 27017-yə implicit qoşula bilər | Explicit 27018-only opt-in; missing/foreign URI connection-dan əvvəl rədd edilir; no-fallback avtomatlaşdırılmış testi |
| P1 | Native/seed testləri port 27018-dən advertised 27017-yə yönələ bilər | Owned loopback URI-lərə directConnection=true; digər Mongo-ya toxunulmur |
| P2 | Soyuq validation/auth mərhələsi timeout testində parser/scanner başlamadan deadline yaradır | Explicit entry handshake və synthetic timeout; guard/slot/late-write assertion-ları saxlanır |
| P2 | Vite cache-ləri hər testdən sonra qalır | Yalnız cari mkdtemp owner inode ilə təsdiqlənir; browser/Vite bağlanandan sonra cleanup; supplied cache və evidence saxlanır |
| P1 | Local compose standalone Mongo transaction tələb edən Audit ilə uyğun deyil | Local-only replica set/init mərhələsi hazırlanıb; mövcud volume backup/operator review tələb edir; compose işə salınmayıb |
| P2 | CI/backend test script-i təkrar icra üçün hazır deyil | Bütün backend faylları serial process + 5 dəqiqə test deadline; pinned Playwright və secret-siz CI gate |
| P2 / release | Dependency audit: xlsx high, mammoth/argparse/sprintf-js moderate advisories | Avtomatik downgrade/fork yoxdur; runtime reachability və upstream patch/operator review ayrıca production blocker-dir |
| External | Production storage, real smoke, source/object/grant inventarı, monitoring/backup/rollout | BLOCKED/NOT TESTED; operator runbook və read-only plan hazırlanır, production PASS verilmir |

## Tam sistem sərhədi

Backend/API authentication və current-role authorization; Audit lifecycle/scoring/source revisions; Recruitment və Main Dashboard regressiyası; Mongo model/index/transaction; private evidence və export; real analytics; default-disabled notification/CV/OCR background jobs; native startup/build/lint və CI nəzərə alınıb. Auditdən kənar dəyişikliklər yalnız test infrastrukturu və ümumi runtime sabitliyinə aiddir. Recruitment/Main Dashboard biznes funksiyaları və vizual dizaynı dəyişdirilmir.

Final faktiki nəticələr QA və PRODUCTION_GATE sənədlərindədir. Köhnə loglar saxlanılıb, yarımçıq/uğursuz qaçışlar gizlədilmir.
