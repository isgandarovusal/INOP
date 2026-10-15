# Paket 04 — yekun QA

Tarix: 15 oktyabr 2026. İş branch-i yalnız `inop-main`; baza `52474890289f02fd987cb9c0db9c47c152336f53`.

| Yoxlama | Faktiki nəticə |
|---|---|
| Original Excel → system source verifier | PASS: 3 workbook / 3 worksheet / 34 bölmə; 234 scored criteria + 1 unscored summary; original text/row/order/number, section membership, source hashes və answer columns |
| Yeni Service backend | 6 PASS / 0 FAIL |
| Yeni Service browser | 4 PASS / 0 FAIL |
| Yekun birlikdə Service suite | **10 PASS / 0 FAIL / 0 SKIP**, `delivery-suite.log` |
| HR backend regressiyası | **11 PASS / 0 FAIL**, mövcud Paket 03 assessment/editorial/workflow testləri |
| HR detail/action və actual-auth browser regressiyası | **2 PASS / 0 FAIL** |
| Audit Blok 02 ümumi browser regressiyası | **1 scenario PASS**, 25 route × 4 viewport = 100 yoxlama; səhifə xətası 0 |
| Frontend build | PASS: TypeScript + Vite |
| Frontend lint | 0 error / 9 əvvəlki warning |
| Dəyişən/yeni backend syntax + ESLint | 25 fayl PASS, 0 error / 0 warning (lokal Node/CommonJS config) |
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

Təhvil **PARTIAL**: əsas Service implementasiyası və lokal QA tamamdır; production storage inteqrasiyası və SOURCE_MAP-dəki aydınlaşdırılmamış mənbə ifadələri açıq saxlanır. Birbaşa yalnız `inop-main`-ə adi push istifadəçi tərəfindən açıq icazəlidir; yeni branch/PR, force-push və manual deploy yoxdur.
