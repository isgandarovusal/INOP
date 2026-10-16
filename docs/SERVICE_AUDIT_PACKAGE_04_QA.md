# Paket 04 — yekun QA

Yenilənmə: 16 oktyabr 2026. İş branch-i yalnız `inop-main`; ilkin baza `52474890289f02fd987cb9c0db9c47c152336f53`, bu yekun yoxlamanın başlanğıcı `edb4d804f9645be7160be02c3e2e4c9cf8d8b782` (lokal və remote HEAD eyni).

| Yoxlama | Faktiki nəticə |
|---|---|
| Original Excel → system source verifier | PASS: 3 workbook / 3 worksheet / 34 bölmə; 234 scored criteria + 1 unscored summary; original text/row/order/number, section membership, source hashes və answer columns |
| Service backend, o cümlədən yeni versiya/legacy qoruması | **8 PASS / 0 FAIL**, `closure-backend-final.log` |
| Service browser | **4 PASS / 0 FAIL**, `closure-service-final.log` |
| Birlikdə Service suite | **12 PASS / 0 FAIL / 0 SKIP**, `closure-service-final.log`; son backend dəqiqləşdirmələrindən sonra ayrıca 8/8 yenidən PASS |
| HR backend regressiyası | **11 PASS / 0 FAIL**, mövcud Paket 03 assessment/editorial/workflow testləri, `closure-hr-backend-final.log` |
| HR detail/action və actual-auth browser regressiyası | **2 PASS / 0 FAIL**, `closure-hr-browser-final.log` |
| Audit Blok 02 ümumi browser regressiyası | **1 scenario PASS**, 25 route × 4 viewport = 100 yoxlama; səhifə xətası 0; ayrıca təkrar icra 100.7 saniyə, `closure-visual-retry.log` |
| Frontend build | PASS: TypeScript + Vite |
| Frontend lint | 0 error / 9 əvvəlki warning |
| Bu bağlanışda dəyişən backend JS/CJS ESLint | 6 fayl PASS, 0 error / 0 warning; ilkin Paket 04-də 25 fayl da yoxlanmışdı |
| Geniş legacy backend | **563 test: 519 PASS / 44 FAIL / 0 SKIP** |
| Legacy müqayisəsi | Bazadakı eyni 44 ad / 42 assertion failure + 2 parent failure; actual/expected dəyərlər də eynidir. Yeni fərqli uğursuzluq 0 |

Geniş suite tam PASS deyil. Hər uğursuzluğun adı, səbəbi, əvvəlki/current nəticəsi və əlaqəsi `SERVICE_AUDIT_PACKAGE_04_REGRESSION.md` sənədindədir. Baza logu Paket 03 bağlanışından saxlanır; `b1e9ff8` və merged `5247489` eyni `9649cfdbf29d9059dd189ff9c76d1c84a617061f` tree-yə malikdir. Bu müqayisə bütün repository testlərinin qaçırılması demək deyil.

## Functional/backend ssenarilər

- KFC 94, Pizza Hut 79 və Simit Sarayı 61 real meyar: yalnız öz brand source snapshot-u, section order, unique IDs. KFC əlavə “Orta göstərici” source reference-dır, scoring/required question deyil.
- Hər üç brend: bütün 0 → 0%, bütün 0.5 → 50%, bütün 1 → 100%, bütün N/A → null. Qarışıq 1/0.5/0 və qalan N/A → 50%; earned=1.5, applicable=3. SS-də əvvəl olmayan Orta cavabı işləyir.
- Client score=999 nəzərə alınmır. N/A per-answer score=null və cavab olaraq parent/history-də saxlanır; finding yaranmır, nonconformity sayına daxil edilmir. Report, analytics və parsed XLSX eyni stored nəticəni verir.
- Duplicate/unknown/invalid answer, altered source, unknown section/reference, natamam submit rədd edilir. Draft save/resume, stale version, paralel iki save-dən 200/409; immutable completion/history və legacy HR/Service scoring kontraktları qorunur.
- Provision idempotency, brand/restaurant mismatch denial; restoran yalnız mövcud GFC məlumatından seçilir. HR auditorunun Service istiqamətinə çıxışı yoxdur. Service auditoru yeni source auditlərdə assigned/own parent-ləri görür; assignment revocation sonrası read/write/analytics scope itir.
- Hər üç brenddə real PNG və üç TXT upload/download byte equality PASS. Foto question/section/final, sənədlər final observation məlumatı ilə eyni audit/execution revision save-inə bağlanır. Cross-parent photo, dördüncü final document, stale writes rədd edilir. Testin öz faylları sonda silinir.
- Service finding description/evidence, corrective action responsible/dueDate/status və proof IDs; foreign action evidence rədd edilir. Independent verification, self-review denial, bağlı action yoxlanmadan finding closure denial, independent approval və closure keçib.
- Service form submit olmadan generic workflow completion/closure rədd edilir; source nəticəsi calculate endpoint-i ilə yenidən hesablanmır. Köhnə HR/audit nəticələrinə rescore və template overwrite tətbiq olunmur.

## Browser və vizual QA

- 3 brand × AZ/EN/RU × 1440/768/390/320px = 36 form geometry/screenshot kombinasiyası; əlavə 8 list/analytics ekranı. 44px action düymələri və document overflow assert olunur. UI idarəetmə/cavab mətnləri lokallaşdırılıb; source criterion məzmunu peşəkar AZ-dadır.
- Real draft save/reload, unsaved-navigation confirmation, completed form immutable state, actual submit 50% və HR direction denial yoxlanıb. Service naviqasiyasının HR route-a yanlış keçmədiyi də assert olunur.
- 320px-də real question və section photo upload; üç document slotu tərs sıra ilə doldurulur, final photo əlavə edilir, save/reload və binding yoxlanır. 1440px-də section note/photo sağ sütundadır. Production storage 503 UI-da failure kimi göstərilir, yeni evidence row yaranmır.
- Actual `/auth/me` Service direction ilə yalnız assigned source sətiri və analytics görünür; foreign parent read 404 ilə gizlədilir. HR URL unauthorized-a yönləndirilir.
- 320px Service detail-də finding yaradılır, mövcud synthetic proof record-u bağlanır, action yaradılıb completed edilir və proof ID serverdən təsdiqlənir. Bu synthetic record testi real upload kimi təqdim edilmir; real upload ayrı testdə aparılıb.
- Mobile Simit Sarayı AZ forması və final-evidence screenshot-u vizual nəzərdən keçirilib. Bu, bütün screenshot-ların insan tərəfindən ayrıca review edilməsi demək deyil.
- Ümumi Audit regressiya fixture-i yeni `/audit-service/*` read response-ları ilə genişləndirilib. Digər route, pagination/retry/lazy-panels və Recruitment CSS isolation assert-ləri saxlanıb.

## Aşkar edilən və düzəldilənlər

- Service auditoru all analytics grant ilə source endpoint-lərində legacy foreign parent sayını görə bilirdi. Yeni endpoint-lər assigned/own-a daraldıldı, source parent read/write/evidence isə scope filter ilə qorundu; legacy generic Service grant kontraktı dəyişdirilmədi. Təkrar backend və yekun suite PASS.
- İlk yeni photo fixture-i SS restaurant üçün KFC template provision edirdi; source-bound create 409 ilə düzgün rədd etdi. Fixture SS ilə düzəldildi. Foreign parent üçün expected 403 mövcud API-nin concealment 404 kontraktına uyğunlaşdırıldı.
- Service naviqasiyasında HR-dən qalan link və heading mətnləri düzəldildi. Backend export Service dueDate/severity/evidence/verification sahələri ilə tamamlandı.

## B67 və köhnə auditlər üzrə yeni regressiya sınaqları

- Source v1 arxivi eyni saxlanır; KFC v2 yalnız B67-nin müsbət uyğunluq ifadəsini və izahını dəyişir. Bütün 94 meyarın ID/sourceCell/sourceNumber/sourceText sırası eynidir; digər 93 meyar byte-equivalent məzmundadır. Unknown/forged versiya 409-dur.
- Yeni v2 B67-də tək tətbiq olunan cavab 0 / 0.5 / 1 olduqda 0% / 50% / 100%; bütün N/A null. Ümumi qarışıq və bütün cavablar ssenariləri hər üç brenddə saxlanır.
- v1 B67 rəqəmsal cavabının draft-da mətni saxlanır; yeni hesablamada overall, problemli bölmənin earned/percentage və həmin cavabın score-u null-dır. Submit 422-dir; uğursuz submit save tarixçəsini artırmır. Generic status endpoint-i ilə submit qorumasını keçmək 409-dur.
- B67 həqiqətən N/A olan köhnə v1 audit normal tamamlanır: digər 93 meyar 0.5 olduqda nəticə 50%-dir. Bu, v1-in bütövlükdə bloklanmadığını sübut edir.
- Tarixi tamamlanmış v1 execution-un cavabları/nəticəsi əvvəl-sonra deep-equal-dır; yeni v2 provision v1 binding/revision-u dəyişmir. Köhnə nəticə oxunur, report və parsed Excel 100% saxlanmış nəticəni göstərir; status completion, müstəqil approval və closure işləyir. Yeni guard tarixi nəticəyə geriyə tətbiq edilmir.
- Analitika tarixi overall nəticəni dəyişmir; köhnə mənfi B67-nin rəqəmsal cavabı yeni meyar statistikası ilə birləşdirilmir və `legacyConformityExclusions=1` açıq qaytarılır. Yeni UI-da bunun AZ/EN/RU izahı var.
- Browser form matrix-də KFC B67-nin v2 müsbət ifadəsi, `0.5` seçimi və B79 üçün scored select olmaması assert edilir. B106/B115 məzmunu dəyişmir; hədəfləri bilmə sualına Orta=0.5 qalır.

Yeni testlərin tapdığı missing analytics projection düzəldilib. Yeni historical fixture-in ilkin closure 409 cavabı draft parent hazırlığı ilə bağlı idi; fixture tarixi in-progress parent-ə uyğunlaşdırıldı. Bundan sonra həqiqi uyğunluq riski aradan qaldırıldı: source-Service status/closure artıq immutable tamamlanmış execution nəticəsindən istifadə edir, yeni qiymətləndirmə qaydası ilə köhnə cavabı yenidən hesablamır. HR və legacy lifecycle şərtləri əvvəlki kimi qalır.

## Production və icra sərhədi

**Production storage BLOCKED:** bu mühitdən production provider/credentials/Render konfiqurasiyası əlçatan deyil; repository bootstrap-da production private durable/versioned adapter aktivləşdirilməyib. Lokal real upload PASS bu məhdudiyyəti aradan qaldırmır. Production konfiqurasiyasız 503 həm API, həm browser-də yoxlanıb. Production provider read/write, retention/restore və real production identity/topology sınağı aparılmayıb.

QA `127.0.0.1:27018` üzərində yalnız task-a məxsus `inop-service-audit-p04-qa` replica set-də təsadüfi `inop_audit_test_*` bazaları istifadə edib, öz bazalarını təmizləyib. Mövcud `inop-cloud-mongo` və real auditlər dəyişdirilməyib. Production DB/migration, seed və manual deploy yoxdur. Mənbə workbook-lar commit edilmir.

## Təkrar icra və lokal artifaktlar

```bash
INOP_AUDIT_TEST_PORT=27018 node --test --test-isolation=none \
 Backend/tests/serviceAuditAssessment.test.cjs \
 Backend/tests/serviceAuditWorkflow.test.cjs \
 Frontend/tests/serviceAuditWorkflow.spec.cjs
npm --prefix Frontend run build
npm --prefix Frontend run lint
python3 Backend/scripts/verifyServiceAuditSources.py KFC.xlsx PizzaHut.xlsx SimitSarayi.xlsx
```

- `/workspace/work/service-audit-p04/`: source verification, final delivery suite, HR/legacy regression, build/lint və əvvəlki failure logları.
- `/tmp/inop-service-audit-p04-screens/`: 36 form + 8 list/analytics və final evidence screenshot-u.
- `/tmp/inop-p04-block02-regression/`: 100 route/viewport screenshot-u və geometry JSON.

Yekun status testlərin tamamlanması ilə aşağıda ayrıca qeyd edilir. Production storage external infrastructure blocker olaraq funksional yerli bağlanışdan ayrıca saxlanır; mənbədə tərifi verilməyən göstəricilər SOURCE_MAP-də konkret istisna kimi sənədləşdirilir. Birbaşa yalnız `inop-main`-ə adi push istifadəçi tərəfindən açıq icazəlidir; yeni branch/PR, force-push və manual deploy yoxdur.

## Yekun bağlanış — 16 oktyabr 2026

**Paket 04: COMPLETE — lokal funksional implementasiya.** Production storage ayrıca **external infrastructure blocker** olaraq açıqdır; production upload/download PASS deyil. Naməlum mənbə terminləri və vaxt izahları SOURCE_MAP-də konkret biznes istisnalarıdır; əlavə scoring qaydası yaradılmayıb.

Yekun: Service 8 backend + 4 browser = **12 PASS**, HR backend **11 PASS**, HR browser **2 PASS**, ümumi Audit vizual **100/100 yoxlama PASS** (1 ssenari), build PASS, frontend lint **0 error / 9 əvvəlki warning**, dəyişən 6 backend JS/CJS ESLint PASS. Legacy geniş suite **519 PASS / 44 əvvəlki FAIL**, yeni fərqli failure **0**. Tam suite-ni bütövlükdə PASS adlandırmırıq.

Paralel browser yükündə vizual suite ilk dəfə 180 saniyəlik limitlə ləğv olunmuşdu (PASS deyil). Digər testlər bitdikdən sonra eyni mənbə və dəyişdirilməmiş test limiti ilə ayrıca təkrar icra **100.7 saniyədə PASS** verdi. Lokal MongoDB dayanması zamanı alınmış connection timeout logları yekun PASS nəticələri ilə qarışdırılmayıb; PRIMARY bərpasından sonra testlər tam yenidən icra edilib.

Qeyd/foto/üç sənəd, draft/resume, completion, findings/actions, independent approval/closure, evidence parent isolation, assignment revocation, actual-auth direction denial, analytics və parsed Excel üzrə real lokal sınaqlar keçib. Testlər yalnız öz sintetik məlumatını istifadə edir; mövcud real audit, revision və tarixçə dəyişdirilmir. Yeni KFC v2 istehsal bazasında avtomatik provision edilməyib; mövcud admin/menecer mexanizmi ilə açıq provision tələb edir. Köhnə mənfi B67-yə rəqəmsal cavabı olan v1 draft üçün yeni reviewed audit tələb olunması qəsdən tətbiq olunan məlumat mənası qorumasıdır; bütün köhnə auditlər bloklanmır.

Yekun lokal sübut logları (repoya əlavə edilmir):
- `closure-source-verification.log` — SHA-256 `0f57bf4557b0592e0ffdb92367271fa4d4eccd8d91de2f1d58e32666c613b85f`
- `closure-service-final.log` — SHA-256 `f86b41df4092998f9593b869802ffa3068852b5c639e6d07b5a67934b7a79fd4`
- `closure-backend-final.log` — SHA-256 `8ffe59e62e1eb05e8abb8a8339bc624b80699d2c69d0d46368dbbbbbb540d956`
- `closure-hr-backend-final.log` — SHA-256 `5e1f02ac5e5e549c07b0ee349b51526d4f18e7f8a3aea18e11a0432edbbf9153`
- `closure-hr-browser-final.log` — SHA-256 `1214761a00c56a7544d2785767a76676ba532487d7e50497e375389dfcca83c3`
- `closure-visual-retry.log` — SHA-256 `f541debd24ed378985a9fb906bb0b0a0d71f8c12b2899456bf88ca2adb17edcd`
- `closure-legacy-final.log` — SHA-256 `aefd8e812c92c54e7d205e536458309d3b047c5269e0e29cd9d6000b177dabf2`
- `closure-build-final.log` — SHA-256 `fabc4d9229ef0987a6474fe004c92b4b4f2f60772feb44eae67da7f7b7d06209`
- `closure-lint-final.log` — SHA-256 `9558c666d7e55b8876e60e8f509e200095f682d51c0d93bd14fe1f2289f92b65`
- `closure-backend-lint-latest.log` — SHA-256 `e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855`
