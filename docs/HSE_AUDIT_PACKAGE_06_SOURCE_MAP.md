# Paket 06 — HSE mənbə xəritəsi və ilkin diaqnostika

Tarix: 16 oktyabr 2026. Baza/local/remote `93c0165f07d9831fc879afce292910df75189d6a`, `inop-main`, təmiz başlanğıc. Actual əlavə adlarında `(1)` şəkilçisi yoxdur; aşağıda faktiki fayl adları/hash-lər verilir. Workbook-lar oxunur, dəyişdirilmir və commit edilmir.

## Mövcud implementasiya və fərqlər

- Köhnə `SafetyAuditForm.tsx` və `occupationalSafetyChecklist.ts`: restoran əsaslı müvəqqəti meyarlar, hər meyar üçün 0–5; `maxScore=expectedItems.length*5`. Bu qiymətləndirmə təqdim olunan üç Excel-in 1/0/N/A müqaviləsinə aid deyil. Köhnə auditlər təkrar hesablanmır; source HSE ayrıca versiya/assessment alan yeni auditdir.
- `Audit`, `AuditContext`, assignments və scope əvvəllər restaurantId tələb edirdi; HSE üçün tenant-a bağlı ofis/anbar modeli və obyekt icazəsi yox idi. `RecruitmentBranch.kind` ofis/anbar dəyərləri saxlayır, lakin bu HR məkan siyahısında GFC tenant və HSE grant müqaviləsi yoxdur; avtomatik Audit inventory və ya HSE icazəsi hesab edilmir. Recruitment qeydləri dəyişdirilmir. Yeni HSE ofis/anbar öz kolleksiyasında saxlanır, restoran yaradılmır.
- Template revision, execution, transaction, evidence, actions, müstəqil approval, closure və history təkrar istifadə olunur. Paket 05 direction ayrılığı saxlanır. Mənbənin sırf kameraya işarə edən glyph-i məcburi foto kimi yozulmur.
- Əlavələrdə auditor adı doludur. Bu şəxsi məlumat və hazır metadata yeni auditlərə və repoya köçürülmür. Boş foto/sənəd sahələri saxta evidence yaratmır.

## Qiymətləndirmə və mənbə ziddiyyətləri

- Restoran: 6 bölmə, **52 real meyar**. `AUDİT BLANKI!N6` köhnə `57` sabitini mətn kimi göstərir, faktiki meyar sayı deyil. A4 / D13 real meyardır, lakin F13 bal düsturu boşdur. İstifadəçinin bütün real restoran meyarlarına təsdiqlədiyi Uyğun=1 / Uyğunsuz=0 / N/A xaric müqaviləsi A4 daxil 52 meyara tətbiq edilir; sətir itmir.
- Restoran `COVER!D19:D24` əl ilə sıfır, `G23=E23/C23` uyğunluq əvəzinə uyğunsuzluğu bölür; digər Cover bölmə/total məxrəcləri N/A-nı çıxarmır. Təsdiqlənmiş N/A qaydasına görə server real tətbiq edilən cavabları hesablayır. Bu səhv hesabat düsturları kor-koranə köçürülmür.
- `COVER!B15` 85% pass/fail həddi ehtiva edir. İstifadəçi bu icrada yalnız restoran üçün ≥85% keçid həddini açıq təsdiqləyib. Server təsdiqlənmiş sadə uyğunluq faizindən `passed=true/false` hesablayır; bütün N/A/incomplete üçün null. Ofis/anbar pass/fail-i null qalır. Bu hədd corrective action və ya obyektin avtomatik bağlanması qaydası deyil.
- Ofis: 5 bölmə/19; Anbar: 6/29. H/I/J sütunları Uyğun=1, Uyğunsuz=0, digər nəticələr boş; risk çəkiləri Kritik=5, Mühüm=3, Kiçik=1. D6/F yekun adi bal = AVERAGE; D7/F çəkili bal = SUM(J)/SUMPRODUCT(cavab Uyğun/Uyğunsuz olduqda I). N/A və boş denominator-da iştirak etmir; sistemdə cavabsız completion-u bloklayır, N/A əsaslandırılır. Excel-in 0–1 nisbəti UI/export-da ×100 faiz kimi təqdim olunur.
- Restoran risk dərəcəsi/çəkisi mənbədə yoxdur: null saxlanır; restaurant finding severity-si də uydurulmur. Ofis/anbar risk termini mənbə metadata-sıdır, corrective action üçün ayrıca yeni prioritet/SLA yaradılmır.
- GFC üçün vahid ümumi HSE faizi təsdiqlənməyib: null qalır. Obyekt növləri üzrə ayrı adi/çəkili göstəricilər və ümumi say/statuslar var.
- Mənbədəki qanuni/normativ istinadlar olduğu kimi metadata kimi saxlanır; yeni qanun tələbi yaradılmır. Təkrarlanan A1 kimi kodlar obyekt növü/vərəq/sətir ilə unikal sistem ID-si alır; səssiz dedup yoxdur.

## Verifier

`python Backend/scripts/verifyHseAuditSources.py Restaurant.xlsx Office.xlsx Warehouse.xlsx` (QA dependency: openpyxl) üç SHA-256, bütün 4 vərəq, 17 bölmə/100 meyar, 308 formula, bütün gizli sətir/sütunlar, birləşmələr, validation və conditional format-ları müqayisə edir. Hər sualın orijinal mətni/kodu/risk/çəkisi/sırası, mənbə hüceyrəsi və tam əhatəsi yoxlanır. Workbook-a yazı etmir.

## Məcburilik və versiya

İstifadəçi auditin bütün real məcburi meyarlarının cavablandırılmasını tələb edib. Bütün real meyarlar məcburidir; foto məcburi deyil. N/A səbəbi serverdə saxlanır. Versiya `hse-source-v1`; restoran kontraktı `hse-simple-v1`, ofis/anbar `hse-weighted-v1`. ID `hse-{objectType}-w{sheetIndex}-r{row}`. Köhnə revision override edilmir; gələcək mənbə versiyası registry-də ayrıca saxlanmalıdır.

## warehouse — ƏM - GFC_HSE_Audit_Blanki_Anbar.xlsx

SHA-256 `db204f4bde2fcae933729a2e914a1a31b5f91dca931703ce91ac9364a609c12e`.

### Vərəq: AUDİT BLANKI - Anbar

Vəziyyət: `visible`; gizli sətirlər `[]`; gizli sütunlar `[]`; birləşmələr: A48:E48, N7:O7, E70:T70, A39:T39, A72:D72, A64:T64, F50:H50, A51:E51, A49:E49, D7:F7, F47:H47, E72:T72, I5:K5, D4:F4, A65:T65, F52:H52, I4:K4, F48:H48, N5:O5, A66:T66, E71:T71, B59:T59, A70:D70, A50:E50, A46:T46, A74:T74, D5:F5, A69:D69, F49:H49, A55:T55, B58:T58, B56:T56, A47:E47, A33:T33, F53:H53, B2:T2, I6:K6, A53:E53, A23:T23, B60:T60, A17:T17, A52:E52, A62:T62, N6:O6, E69:T69, B57:T57, A29:T29, B1:T1, A71:D71, A63:T63, A10:T10, D6:F6, A68:T68, I7:K7, N4:O4, F51:H51.

Tam cfRule XML-i və rəng/font/border differential style XML-i config-də saxlanır və verifier ilə müqayisə edilir. Data validations: `[{"range": "E11:E16 E18:E22 E24:E28 E30:E32 E34:E38 E40:E44", "formula1": "\"Kritik,Mühüm,Kiçik\"", "type": "list"}, {"range": "G11:G16 G18:G22 G24:G28 G30:G32 G34:G38 G40:G44", "formula1": "\"✓ Uyğun,✗ Uyğunsuz,N/A\"", "type": "list"}, {"range": "L11:L16 L18:L22 L24:L28 L30:L32 L34:L38 L40:L44", "formula1": "\"Bəli,Xeyr,-\"", "type": "list"}, {"range": "S11:S16 S18:S22 S24:S28 S30:S32 S34:S38 S40:S44", "formula1": "\"Açıq,İcra edilir,Tamamlanıb,Təsdiqlənib\"", "type": "list"}]`. Conditional formatting: `[{"range": "<ConditionalFormatting G11:G16 G18:G22 G24:G28 G30:G32 G34:G38 G40:G44>", "rules": [{"type": "expression", "formula": ["G11=\"✓ Uyğun\""]}, {"type": "expression", "formula": ["G11=\"✗ Uyğunsuz\""]}, {"type": "expression", "formula": ["G11=\"N/A\""]}]}, {"range": "<ConditionalFormatting K11:K16 K18:K22 K24:K28 K30:K32 K34:K38 K40:K44>", "rules": [{"type": "expression", "formula": ["K11=\"Var\""]}, {"type": "expression", "formula": ["K11=\"Yoxdur\""]}]}, {"range": "<ConditionalFormatting E11:E16 E18:E22 E24:E28 E30:E32 E34:E38 E40:E44>", "rules": [{"type": "expression", "formula": ["E11=\"Kritik\""]}, {"type": "expression", "formula": ["E11=\"Mühüm\""]}, {"type": "expression", "formula": ["E11=\"Kiçik\""]}]}, {"range": "<ConditionalFormatting D11:D16 D18:D22 D24:D28 D30:D32 D34:D38 D40:D44>", "rules": [{"type": "expression", "formula": ["AND($E11=\"Kritik\",$G11=\"✗ Uyğunsuz\")"]}]}]`.

### SƏNƏDLƏŞMƏ VƏ QEYDİYYAT

Mənbə: `AUDİT BLANKI - Anbar!A10`; orijinal: A  │  SƏNƏDLƏŞMƏ VƏ QEYDİYYAT.

| Sistem ID / xana | Kod | Orijinal mətn | UI AZ | Risk / çəki | Normativ istinad | Bal düsturu |
|---|---|---|---|---|---|---|
| `hse-warehouse-w1-r11` / D11 | A1 | Anbar üzrə əməyin mühafizəsi təlimatlandırma jurnalı aparılır | Anbar üzrə əməyin mühafizəsi təlimatlandırma jurnalı aparılır | Mühüm / 3 | Əmək Məcəlləsi; Daxili Təlimatlandırma Qaydaları | {"H": "=IF(G11=\"✓ Uyğun\",1,IF(G11=\"✗ Uyğunsuz\",0,\"\"))", "I": "=IF(E11=\"Kritik\",5,IF(E11=\"Mühüm\",3,IF(E11=\"Kiçik\",1,\"\")))", "J": "=IF(H11=\"\",\"\",H11*I11)", "K": "=IF(G11=\"✗ Uyğunsuz\",\"Var\",IF(G11=\"\",\"\",\"Yoxdur\"))"} |
| `hse-warehouse-w1-r12` / D12 | A2 | Yükləmə/boşaltma texnikası (əl arabası, forklift) üzrə sürücü sertifikatları mövcuddur | Yükləmə/boşaltma texnikası (əl arabası, forklift) üzrə sürücü sertifikatları mövcuddur | Kritik / 5 | Əmək Məcəlləsi; Daxili Təlimatlandırma Qaydaları | {"H": "=IF(G12=\"✓ Uyğun\",1,IF(G12=\"✗ Uyğunsuz\",0,\"\"))", "I": "=IF(E12=\"Kritik\",5,IF(E12=\"Mühüm\",3,IF(E12=\"Kiçik\",1,\"\")))", "J": "=IF(H12=\"\",\"\",H12*I12)", "K": "=IF(G12=\"✗ Uyğunsuz\",\"Var\",IF(G12=\"\",\"\",\"Yoxdur\"))"} |
| `hse-warehouse-w1-r13` / D13 | A3 | Stellaj/rəf yük limiti barədə məlumat lövhələri mövcuddur | Stellaj/rəf yük limiti barədə məlumat lövhələri mövcuddur | Mühüm / 3 | Əmək Məcəlləsi; Daxili Təlimatlandırma Qaydaları | {"H": "=IF(G13=\"✓ Uyğun\",1,IF(G13=\"✗ Uyğunsuz\",0,\"\"))", "I": "=IF(E13=\"Kritik\",5,IF(E13=\"Mühüm\",3,IF(E13=\"Kiçik\",1,\"\")))", "J": "=IF(H13=\"\",\"\",H13*I13)", "K": "=IF(G13=\"✗ Uyğunsuz\",\"Var\",IF(G13=\"\",\"\",\"Yoxdur\"))"} |
| `hse-warehouse-w1-r14` / D14 | A4 | Bədbəxt hadisələrin qeydiyyatı jurnalı aparılır | Bədbəxt hadisələrin qeydiyyatı jurnalı aparılır | Kritik / 5 | Əmək Məcəlləsi; Daxili Təlimatlandırma Qaydaları | {"H": "=IF(G14=\"✓ Uyğun\",1,IF(G14=\"✗ Uyğunsuz\",0,\"\"))", "I": "=IF(E14=\"Kritik\",5,IF(E14=\"Mühüm\",3,IF(E14=\"Kiçik\",1,\"\")))", "J": "=IF(H14=\"\",\"\",H14*I14)", "K": "=IF(G14=\"✗ Uyğunsuz\",\"Var\",IF(G14=\"\",\"\",\"Yoxdur\"))"} |
| `hse-warehouse-w1-r15` / D15 | A5 | FQV verilməsi/qaytarılması jurnalı aparılır | FQV verilməsi/qaytarılması jurnalı aparılır | Kiçik / 1 | Əmək Məcəlləsi; Daxili Təlimatlandırma Qaydaları | {"H": "=IF(G15=\"✓ Uyğun\",1,IF(G15=\"✗ Uyğunsuz\",0,\"\"))", "I": "=IF(E15=\"Kritik\",5,IF(E15=\"Mühüm\",3,IF(E15=\"Kiçik\",1,\"\")))", "J": "=IF(H15=\"\",\"\",H15*I15)", "K": "=IF(G15=\"✗ Uyğunsuz\",\"Var\",IF(G15=\"\",\"\",\"Yoxdur\"))"} |
| `hse-warehouse-w1-r16` / D16 | A6 | Təhlükəli maddələrin (təmizlik kimyəvisi və s.) SDS reyestri mövcuddur | Təhlükəli maddələrin (təmizlik kimyəvisi və s.) SDS reyestri mövcuddur | Mühüm / 3 | Əmək Məcəlləsi; Daxili Təlimatlandırma Qaydaları | {"H": "=IF(G16=\"✓ Uyğun\",1,IF(G16=\"✗ Uyğunsuz\",0,\"\"))", "I": "=IF(E16=\"Kritik\",5,IF(E16=\"Mühüm\",3,IF(E16=\"Kiçik\",1,\"\")))", "J": "=IF(H16=\"\",\"\",H16*I16)", "K": "=IF(G16=\"✗ Uyğunsuz\",\"Var\",IF(G16=\"\",\"\",\"Yoxdur\"))"} |

### YÜKLƏMƏ/BOŞALTMA VƏ YÜK DAŞIMA TƏHLÜKƏSİZLİYİ

Mənbə: `AUDİT BLANKI - Anbar!A17`; orijinal: B  │  YÜKLƏMƏ/BOŞALTMA VƏ YÜK DAŞIMA TƏHLÜKƏSİZLİYİ.

| Sistem ID / xana | Kod | Orijinal mətn | UI AZ | Risk / çəki | Normativ istinad | Bal düsturu |
|---|---|---|---|---|---|---|
| `hse-warehouse-w1-r18` / D18 | B1 | Yükləmə rampası/platforması təhlükəsiz vəziyyətdədir | Yükləmə rampası/platforması təhlükəsiz vəziyyətdədir | Kritik / 5 | Əmək Məcəlləsi; Daxili SOP | {"H": "=IF(G18=\"✓ Uyğun\",1,IF(G18=\"✗ Uyğunsuz\",0,\"\"))", "I": "=IF(E18=\"Kritik\",5,IF(E18=\"Mühüm\",3,IF(E18=\"Kiçik\",1,\"\")))", "J": "=IF(H18=\"\",\"\",H18*I18)", "K": "=IF(G18=\"✗ Uyğunsuz\",\"Var\",IF(G18=\"\",\"\",\"Yoxdur\"))"} |
| `hse-warehouse-w1-r19` / D19 | B2 | Forklift/əl arabası əyləc və siqnal sistemi işləkdir | Forklift/əl arabası əyləc və siqnal sistemi işləkdir | Kritik / 5 | Əmək Məcəlləsi; Daxili SOP | {"H": "=IF(G19=\"✓ Uyğun\",1,IF(G19=\"✗ Uyğunsuz\",0,\"\"))", "I": "=IF(E19=\"Kritik\",5,IF(E19=\"Mühüm\",3,IF(E19=\"Kiçik\",1,\"\")))", "J": "=IF(H19=\"\",\"\",H19*I19)", "K": "=IF(G19=\"✗ Uyğunsuz\",\"Var\",IF(G19=\"\",\"\",\"Yoxdur\"))"} |
| `hse-warehouse-w1-r20` / D20 | B3 | Yük daşıyan işçilər üçün ergonomik təlim keçirilib (ağır yükün qaldırılması) | Yük daşıyan işçilər üçün ergonomik təlim keçirilib (ağır yükün qaldırılması) | Mühüm / 3 | Əmək Məcəlləsi; Daxili SOP | {"H": "=IF(G20=\"✓ Uyğun\",1,IF(G20=\"✗ Uyğunsuz\",0,\"\"))", "I": "=IF(E20=\"Kritik\",5,IF(E20=\"Mühüm\",3,IF(E20=\"Kiçik\",1,\"\")))", "J": "=IF(H20=\"\",\"\",H20*I20)", "K": "=IF(G20=\"✗ Uyğunsuz\",\"Var\",IF(G20=\"\",\"\",\"Yoxdur\"))"} |
| `hse-warehouse-w1-r21` / D21 | B4 | Piyada/texnika hərəkət zonaları ayrılıb və işarələnib | Piyada/texnika hərəkət zonaları ayrılıb və işarələnib | Mühüm / 3 | Əmək Məcəlləsi; Daxili SOP | {"H": "=IF(G21=\"✓ Uyğun\",1,IF(G21=\"✗ Uyğunsuz\",0,\"\"))", "I": "=IF(E21=\"Kritik\",5,IF(E21=\"Mühüm\",3,IF(E21=\"Kiçik\",1,\"\")))", "J": "=IF(H21=\"\",\"\",H21*I21)", "K": "=IF(G21=\"✗ Uyğunsuz\",\"Var\",IF(G21=\"\",\"\",\"Yoxdur\"))"} |
| `hse-warehouse-w1-r22` / D22 | B5 | Yüklərin sabit və düzgün bağlanması təmin olunur | Yüklərin sabit və düzgün bağlanması təmin olunur | Mühüm / 3 | Əmək Məcəlləsi; Daxili SOP | {"H": "=IF(G22=\"✓ Uyğun\",1,IF(G22=\"✗ Uyğunsuz\",0,\"\"))", "I": "=IF(E22=\"Kritik\",5,IF(E22=\"Mühüm\",3,IF(E22=\"Kiçik\",1,\"\")))", "J": "=IF(H22=\"\",\"\",H22*I22)", "K": "=IF(G22=\"✗ Uyğunsuz\",\"Var\",IF(G22=\"\",\"\",\"Yoxdur\"))"} |

### STELLAJ, ANBARLAMA VƏ STRUKTUR TƏHLÜKƏSİZLİK

Mənbə: `AUDİT BLANKI - Anbar!A23`; orijinal: C  │  STELLAJ, ANBARLAMA VƏ STRUKTUR TƏHLÜKƏSİZLİK.

| Sistem ID / xana | Kod | Orijinal mətn | UI AZ | Risk / çəki | Normativ istinad | Bal düsturu |
|---|---|---|---|---|---|---|
| `hse-warehouse-w1-r24` / D24 | C1 | Stellajlar struktur baxımından sabitdir, əyilmə/zədə yoxdur | Stellajlar struktur baxımından sabitdir, əyilmə/zədə yoxdur | Kritik / 5 | Daxili SOP; Struktur Təhlükəsizlik Normativləri | {"H": "=IF(G24=\"✓ Uyğun\",1,IF(G24=\"✗ Uyğunsuz\",0,\"\"))", "I": "=IF(E24=\"Kritik\",5,IF(E24=\"Mühüm\",3,IF(E24=\"Kiçik\",1,\"\")))", "J": "=IF(H24=\"\",\"\",H24*I24)", "K": "=IF(G24=\"✗ Uyğunsuz\",\"Var\",IF(G24=\"\",\"\",\"Yoxdur\"))"} |
| `hse-warehouse-w1-r25` / D25 | C2 | Yük limitindən artıq yükləmə aparılmır | Yük limitindən artıq yükləmə aparılmır | Kritik / 5 | Daxili SOP; Struktur Təhlükəsizlik Normativləri | {"H": "=IF(G25=\"✓ Uyğun\",1,IF(G25=\"✗ Uyğunsuz\",0,\"\"))", "I": "=IF(E25=\"Kritik\",5,IF(E25=\"Mühüm\",3,IF(E25=\"Kiçik\",1,\"\")))", "J": "=IF(H25=\"\",\"\",H25*I25)", "K": "=IF(G25=\"✗ Uyğunsuz\",\"Var\",IF(G25=\"\",\"\",\"Yoxdur\"))"} |
| `hse-warehouse-w1-r26` / D26 | C3 | Hündür rəflərə çıxmaq üçün müvafiq pilləkən/platforma mövcuddur | Hündür rəflərə çıxmaq üçün müvafiq pilləkən/platforma mövcuddur | Mühüm / 3 | Daxili SOP; Struktur Təhlükəsizlik Normativləri | {"H": "=IF(G26=\"✓ Uyğun\",1,IF(G26=\"✗ Uyğunsuz\",0,\"\"))", "I": "=IF(E26=\"Kritik\",5,IF(E26=\"Mühüm\",3,IF(E26=\"Kiçik\",1,\"\")))", "J": "=IF(H26=\"\",\"\",H26*I26)", "K": "=IF(G26=\"✗ Uyğunsuz\",\"Var\",IF(G26=\"\",\"\",\"Yoxdur\"))"} |
| `hse-warehouse-w1-r27` / D27 | C4 | Ağır/təhlükəli məhsullar aşağı rəflərdə saxlanılır | Ağır/təhlükəli məhsullar aşağı rəflərdə saxlanılır | Kiçik / 1 | Daxili SOP; Struktur Təhlükəsizlik Normativləri | {"H": "=IF(G27=\"✓ Uyğun\",1,IF(G27=\"✗ Uyğunsuz\",0,\"\"))", "I": "=IF(E27=\"Kritik\",5,IF(E27=\"Mühüm\",3,IF(E27=\"Kiçik\",1,\"\")))", "J": "=IF(H27=\"\",\"\",H27*I27)", "K": "=IF(G27=\"✗ Uyğunsuz\",\"Var\",IF(G27=\"\",\"\",\"Yoxdur\"))"} |
| `hse-warehouse-w1-r28` / D28 | C5 | Keçidlər və qaçış yolları kənar əşyalarla bağlanmayıb | Keçidlər və qaçış yolları kənar əşyalarla bağlanmayıb | Kritik / 5 | Daxili SOP; Struktur Təhlükəsizlik Normativləri | {"H": "=IF(G28=\"✓ Uyğun\",1,IF(G28=\"✗ Uyğunsuz\",0,\"\"))", "I": "=IF(E28=\"Kritik\",5,IF(E28=\"Mühüm\",3,IF(E28=\"Kiçik\",1,\"\")))", "J": "=IF(H28=\"\",\"\",H28*I28)", "K": "=IF(G28=\"✗ Uyğunsuz\",\"Var\",IF(G28=\"\",\"\",\"Yoxdur\"))"} |

### SOYUQ ANBAR VƏ TEMPERATUR NƏZARƏTİ

Mənbə: `AUDİT BLANKI - Anbar!A29`; orijinal: D  │  SOYUQ ANBAR VƏ TEMPERATUR NƏZARƏTİ.

| Sistem ID / xana | Kod | Orijinal mətn | UI AZ | Risk / çəki | Normativ istinad | Bal düsturu |
|---|---|---|---|---|---|---|
| `hse-warehouse-w1-r30` / D30 | D1 | Soyuq anbarda işləyən işçilər üçün müvafiq isti geyim/FQV təmin olunub | Soyuq anbarda işləyən işçilər üçün müvafiq isti geyim/FQV təmin olunub | Mühüm / 3 | Əmək Məcəlləsi; Sanitar-Gigiyena Normativləri | {"H": "=IF(G30=\"✓ Uyğun\",1,IF(G30=\"✗ Uyğunsuz\",0,\"\"))", "I": "=IF(E30=\"Kritik\",5,IF(E30=\"Mühüm\",3,IF(E30=\"Kiçik\",1,\"\")))", "J": "=IF(H30=\"\",\"\",H30*I30)", "K": "=IF(G30=\"✗ Uyğunsuz\",\"Var\",IF(G30=\"\",\"\",\"Yoxdur\"))"} |
| `hse-warehouse-w1-r31` / D31 | D2 | Soyuq anbar qapıları daxildən açıla bilən təhlükəsizlik mexanizmi ilə təchiz olunub | Soyuq anbar qapıları daxildən açıla bilən təhlükəsizlik mexanizmi ilə təchiz olunub | Kritik / 5 | Əmək Məcəlləsi; Sanitar-Gigiyena Normativləri | {"H": "=IF(G31=\"✓ Uyğun\",1,IF(G31=\"✗ Uyğunsuz\",0,\"\"))", "I": "=IF(E31=\"Kritik\",5,IF(E31=\"Mühüm\",3,IF(E31=\"Kiçik\",1,\"\")))", "J": "=IF(H31=\"\",\"\",H31*I31)", "K": "=IF(G31=\"✗ Uyğunsuz\",\"Var\",IF(G31=\"\",\"\",\"Yoxdur\"))"} |
| `hse-warehouse-w1-r32` / D32 | D3 | Soyuq anbarda uzun müddət tək qalmanın qarşısını alan nəzarət sistemi mövcuddur | Soyuq anbarda uzun müddət tək qalmanın qarşısını alan nəzarət sistemi mövcuddur | Mühüm / 3 | Əmək Məcəlləsi; Sanitar-Gigiyena Normativləri | {"H": "=IF(G32=\"✓ Uyğun\",1,IF(G32=\"✗ Uyğunsuz\",0,\"\"))", "I": "=IF(E32=\"Kritik\",5,IF(E32=\"Mühüm\",3,IF(E32=\"Kiçik\",1,\"\")))", "J": "=IF(H32=\"\",\"\",H32*I32)", "K": "=IF(G32=\"✗ Uyğunsuz\",\"Var\",IF(G32=\"\",\"\",\"Yoxdur\"))"} |

### YANĞIN VƏ ELEKTRİK TƏHLÜKƏSİZLİYİ

Mənbə: `AUDİT BLANKI - Anbar!A33`; orijinal: E  │  YANĞIN VƏ ELEKTRİK TƏHLÜKƏSİZLİYİ.

| Sistem ID / xana | Kod | Orijinal mətn | UI AZ | Risk / çəki | Normativ istinad | Bal düsturu |
|---|---|---|---|---|---|---|
| `hse-warehouse-w1-r34` / D34 | E1 | Yanğınsöndürən balonlar mövcuddur, yoxlama tarixi keçməyib | Yanğınsöndürən balonlar mövcuddur, yoxlama tarixi keçməyib | Kritik / 5 | FHN "Yanğın Təhlükəsizliyi Qaydaları"; EQQQ | {"H": "=IF(G34=\"✓ Uyğun\",1,IF(G34=\"✗ Uyğunsuz\",0,\"\"))", "I": "=IF(E34=\"Kritik\",5,IF(E34=\"Mühüm\",3,IF(E34=\"Kiçik\",1,\"\")))", "J": "=IF(H34=\"\",\"\",H34*I34)", "K": "=IF(G34=\"✗ Uyğunsuz\",\"Var\",IF(G34=\"\",\"\",\"Yoxdur\"))"} |
| `hse-warehouse-w1-r35` / D35 | E2 | Yanğın siqnalizasiya sistemi (mövcuddursa) işləkdir | Yanğın siqnalizasiya sistemi (mövcuddursa) işləkdir | Kritik / 5 | FHN "Yanğın Təhlükəsizliyi Qaydaları"; EQQQ | {"H": "=IF(G35=\"✓ Uyğun\",1,IF(G35=\"✗ Uyğunsuz\",0,\"\"))", "I": "=IF(E35=\"Kritik\",5,IF(E35=\"Mühüm\",3,IF(E35=\"Kiçik\",1,\"\")))", "J": "=IF(H35=\"\",\"\",H35*I35)", "K": "=IF(G35=\"✗ Uyğunsuz\",\"Var\",IF(G35=\"\",\"\",\"Yoxdur\"))"} |
| `hse-warehouse-w1-r36` / D36 | E3 | Elektrik panoları qapalı və əlçatan deyil | Elektrik panoları qapalı və əlçatan deyil | Mühüm / 3 | FHN "Yanğın Təhlükəsizliyi Qaydaları"; EQQQ | {"H": "=IF(G36=\"✓ Uyğun\",1,IF(G36=\"✗ Uyğunsuz\",0,\"\"))", "I": "=IF(E36=\"Kritik\",5,IF(E36=\"Mühüm\",3,IF(E36=\"Kiçik\",1,\"\")))", "J": "=IF(H36=\"\",\"\",H36*I36)", "K": "=IF(G36=\"✗ Uyğunsuz\",\"Var\",IF(G36=\"\",\"\",\"Yoxdur\"))"} |
| `hse-warehouse-w1-r37` / D37 | E4 | Yanğına davamlı/uyğun saxlama qaydalarına (asan alışan materiallar üçün) əməl olunur | Yanğına davamlı/uyğun saxlama qaydalarına (asan alışan materiallar üçün) əməl olunur | Mühüm / 3 | FHN "Yanğın Təhlükəsizliyi Qaydaları"; EQQQ | {"H": "=IF(G37=\"✓ Uyğun\",1,IF(G37=\"✗ Uyğunsuz\",0,\"\"))", "I": "=IF(E37=\"Kritik\",5,IF(E37=\"Mühüm\",3,IF(E37=\"Kiçik\",1,\"\")))", "J": "=IF(H37=\"\",\"\",H37*I37)", "K": "=IF(G37=\"✗ Uyğunsuz\",\"Var\",IF(G37=\"\",\"\",\"Yoxdur\"))"} |
| `hse-warehouse-w1-r38` / D38 | E5 | Təxliyə yolları və çıxışlar açıqdır | Təxliyə yolları və çıxışlar açıqdır | Kritik / 5 | FHN "Yanğın Təhlükəsizliyi Qaydaları"; EQQQ | {"H": "=IF(G38=\"✓ Uyğun\",1,IF(G38=\"✗ Uyğunsuz\",0,\"\"))", "I": "=IF(E38=\"Kritik\",5,IF(E38=\"Mühüm\",3,IF(E38=\"Kiçik\",1,\"\")))", "J": "=IF(H38=\"\",\"\",H38*I38)", "K": "=IF(G38=\"✗ Uyğunsuz\",\"Var\",IF(G38=\"\",\"\",\"Yoxdur\"))"} |

### ÜMUMİ TƏHLÜKƏSİZLİK VƏ GİGİYENA

Mənbə: `AUDİT BLANKI - Anbar!A39`; orijinal: F  │  ÜMUMİ TƏHLÜKƏSİZLİK VƏ GİGİYENA.

| Sistem ID / xana | Kod | Orijinal mətn | UI AZ | Risk / çəki | Normativ istinad | Bal düsturu |
|---|---|---|---|---|---|---|
| `hse-warehouse-w1-r40` / D40 | F1 | İşçilər FQV (əlcək, iş ayaqqabısı, jilet) ilə təmin olunub | İşçilər FQV (əlcək, iş ayaqqabısı, jilet) ilə təmin olunub | Mühüm / 3 | Əmək Məcəlləsi; Daxili SOP | {"H": "=IF(G40=\"✓ Uyğun\",1,IF(G40=\"✗ Uyğunsuz\",0,\"\"))", "I": "=IF(E40=\"Kritik\",5,IF(E40=\"Mühüm\",3,IF(E40=\"Kiçik\",1,\"\")))", "J": "=IF(H40=\"\",\"\",H40*I40)", "K": "=IF(G40=\"✗ Uyğunsuz\",\"Var\",IF(G40=\"\",\"\",\"Yoxdur\"))"} |
| `hse-warehouse-w1-r41` / D41 | F2 | Döşəmə təmiz, sürüşkən deyil, tökülmüş maye dərhal təmizlənir | Döşəmə təmiz, sürüşkən deyil, tökülmüş maye dərhal təmizlənir | Mühüm / 3 | Əmək Məcəlləsi; Daxili SOP | {"H": "=IF(G41=\"✓ Uyğun\",1,IF(G41=\"✗ Uyğunsuz\",0,\"\"))", "I": "=IF(E41=\"Kritik\",5,IF(E41=\"Mühüm\",3,IF(E41=\"Kiçik\",1,\"\")))", "J": "=IF(H41=\"\",\"\",H41*I41)", "K": "=IF(G41=\"✗ Uyğunsuz\",\"Var\",IF(G41=\"\",\"\",\"Yoxdur\"))"} |
| `hse-warehouse-w1-r42` / D42 | F3 | İlk yardım qutusu mövcuddur və əlçatandır | İlk yardım qutusu mövcuddur və əlçatandır | Kritik / 5 | Əmək Məcəlləsi; Daxili SOP | {"H": "=IF(G42=\"✓ Uyğun\",1,IF(G42=\"✗ Uyğunsuz\",0,\"\"))", "I": "=IF(E42=\"Kritik\",5,IF(E42=\"Mühüm\",3,IF(E42=\"Kiçik\",1,\"\")))", "J": "=IF(H42=\"\",\"\",H42*I42)", "K": "=IF(G42=\"✗ Uyğunsuz\",\"Var\",IF(G42=\"\",\"\",\"Yoxdur\"))"} |
| `hse-warehouse-w1-r43` / D43 | F4 | Fövqəladə hallar planı və toplanış məntəqəsi mövcuddur | Fövqəladə hallar planı və toplanış məntəqəsi mövcuddur | Mühüm / 3 | Əmək Məcəlləsi; Daxili SOP | {"H": "=IF(G43=\"✓ Uyğun\",1,IF(G43=\"✗ Uyğunsuz\",0,\"\"))", "I": "=IF(E43=\"Kritik\",5,IF(E43=\"Mühüm\",3,IF(E43=\"Kiçik\",1,\"\")))", "J": "=IF(H43=\"\",\"\",H43*I43)", "K": "=IF(G43=\"✗ Uyğunsuz\",\"Var\",IF(G43=\"\",\"\",\"Yoxdur\"))"} |
| `hse-warehouse-w1-r44` / D44 | F5 | Zibil/tullantı düzgün idarə olunur | Zibil/tullantı düzgün idarə olunur | Kiçik / 1 | Əmək Məcəlləsi; Daxili SOP | {"H": "=IF(G44=\"✓ Uyğun\",1,IF(G44=\"✗ Uyğunsuz\",0,\"\"))", "I": "=IF(E44=\"Kritik\",5,IF(E44=\"Mühüm\",3,IF(E44=\"Kiçik\",1,\"\")))", "J": "=IF(H44=\"\",\"\",H44*I44)", "K": "=IF(G44=\"✗ Uyğunsuz\",\"Var\",IF(G44=\"\",\"\",\"Yoxdur\"))"} |

### Bütün düstur istinadları

| Vərəq | Xana | Orijinal düstur |
|---|---|---|
| AUDİT BLANKI - Anbar | D6 | `=IFERROR(AVERAGE(H10:H44),"")` |
| AUDİT BLANKI - Anbar | I6 | `=COUNTIF(G10:G44,"✗ Uyğunsuz")` |
| AUDİT BLANKI - Anbar | N6 | `=COUNT(H10:H44)&" / "&COUNTA(D10:D44)` |
| AUDİT BLANKI - Anbar | D7 | `=IFERROR(SUM(J10:J44)/SUMPRODUCT((($G$10:$G$44="✓ Uyğun")+($G$10:$G$44="✗ Uyğunsuz"))*$I$10:$I$44),"")` |
| AUDİT BLANKI - Anbar | I7 | `=COUNTIFS(E10:E44,"Kritik",G10:G44,"✗ Uyğunsuz")` |
| AUDİT BLANKI - Anbar | H11 | `=IF(G11="✓ Uyğun",1,IF(G11="✗ Uyğunsuz",0,""))` |
| AUDİT BLANKI - Anbar | I11 | `=IF(E11="Kritik",5,IF(E11="Mühüm",3,IF(E11="Kiçik",1,"")))` |
| AUDİT BLANKI - Anbar | J11 | `=IF(H11="","",H11*I11)` |
| AUDİT BLANKI - Anbar | K11 | `=IF(G11="✗ Uyğunsuz","Var",IF(G11="","","Yoxdur"))` |
| AUDİT BLANKI - Anbar | H12 | `=IF(G12="✓ Uyğun",1,IF(G12="✗ Uyğunsuz",0,""))` |
| AUDİT BLANKI - Anbar | I12 | `=IF(E12="Kritik",5,IF(E12="Mühüm",3,IF(E12="Kiçik",1,"")))` |
| AUDİT BLANKI - Anbar | J12 | `=IF(H12="","",H12*I12)` |
| AUDİT BLANKI - Anbar | K12 | `=IF(G12="✗ Uyğunsuz","Var",IF(G12="","","Yoxdur"))` |
| AUDİT BLANKI - Anbar | H13 | `=IF(G13="✓ Uyğun",1,IF(G13="✗ Uyğunsuz",0,""))` |
| AUDİT BLANKI - Anbar | I13 | `=IF(E13="Kritik",5,IF(E13="Mühüm",3,IF(E13="Kiçik",1,"")))` |
| AUDİT BLANKI - Anbar | J13 | `=IF(H13="","",H13*I13)` |
| AUDİT BLANKI - Anbar | K13 | `=IF(G13="✗ Uyğunsuz","Var",IF(G13="","","Yoxdur"))` |
| AUDİT BLANKI - Anbar | H14 | `=IF(G14="✓ Uyğun",1,IF(G14="✗ Uyğunsuz",0,""))` |
| AUDİT BLANKI - Anbar | I14 | `=IF(E14="Kritik",5,IF(E14="Mühüm",3,IF(E14="Kiçik",1,"")))` |
| AUDİT BLANKI - Anbar | J14 | `=IF(H14="","",H14*I14)` |
| AUDİT BLANKI - Anbar | K14 | `=IF(G14="✗ Uyğunsuz","Var",IF(G14="","","Yoxdur"))` |
| AUDİT BLANKI - Anbar | H15 | `=IF(G15="✓ Uyğun",1,IF(G15="✗ Uyğunsuz",0,""))` |
| AUDİT BLANKI - Anbar | I15 | `=IF(E15="Kritik",5,IF(E15="Mühüm",3,IF(E15="Kiçik",1,"")))` |
| AUDİT BLANKI - Anbar | J15 | `=IF(H15="","",H15*I15)` |
| AUDİT BLANKI - Anbar | K15 | `=IF(G15="✗ Uyğunsuz","Var",IF(G15="","","Yoxdur"))` |
| AUDİT BLANKI - Anbar | H16 | `=IF(G16="✓ Uyğun",1,IF(G16="✗ Uyğunsuz",0,""))` |
| AUDİT BLANKI - Anbar | I16 | `=IF(E16="Kritik",5,IF(E16="Mühüm",3,IF(E16="Kiçik",1,"")))` |
| AUDİT BLANKI - Anbar | J16 | `=IF(H16="","",H16*I16)` |
| AUDİT BLANKI - Anbar | K16 | `=IF(G16="✗ Uyğunsuz","Var",IF(G16="","","Yoxdur"))` |
| AUDİT BLANKI - Anbar | H18 | `=IF(G18="✓ Uyğun",1,IF(G18="✗ Uyğunsuz",0,""))` |
| AUDİT BLANKI - Anbar | I18 | `=IF(E18="Kritik",5,IF(E18="Mühüm",3,IF(E18="Kiçik",1,"")))` |
| AUDİT BLANKI - Anbar | J18 | `=IF(H18="","",H18*I18)` |
| AUDİT BLANKI - Anbar | K18 | `=IF(G18="✗ Uyğunsuz","Var",IF(G18="","","Yoxdur"))` |
| AUDİT BLANKI - Anbar | H19 | `=IF(G19="✓ Uyğun",1,IF(G19="✗ Uyğunsuz",0,""))` |
| AUDİT BLANKI - Anbar | I19 | `=IF(E19="Kritik",5,IF(E19="Mühüm",3,IF(E19="Kiçik",1,"")))` |
| AUDİT BLANKI - Anbar | J19 | `=IF(H19="","",H19*I19)` |
| AUDİT BLANKI - Anbar | K19 | `=IF(G19="✗ Uyğunsuz","Var",IF(G19="","","Yoxdur"))` |
| AUDİT BLANKI - Anbar | H20 | `=IF(G20="✓ Uyğun",1,IF(G20="✗ Uyğunsuz",0,""))` |
| AUDİT BLANKI - Anbar | I20 | `=IF(E20="Kritik",5,IF(E20="Mühüm",3,IF(E20="Kiçik",1,"")))` |
| AUDİT BLANKI - Anbar | J20 | `=IF(H20="","",H20*I20)` |
| AUDİT BLANKI - Anbar | K20 | `=IF(G20="✗ Uyğunsuz","Var",IF(G20="","","Yoxdur"))` |
| AUDİT BLANKI - Anbar | H21 | `=IF(G21="✓ Uyğun",1,IF(G21="✗ Uyğunsuz",0,""))` |
| AUDİT BLANKI - Anbar | I21 | `=IF(E21="Kritik",5,IF(E21="Mühüm",3,IF(E21="Kiçik",1,"")))` |
| AUDİT BLANKI - Anbar | J21 | `=IF(H21="","",H21*I21)` |
| AUDİT BLANKI - Anbar | K21 | `=IF(G21="✗ Uyğunsuz","Var",IF(G21="","","Yoxdur"))` |
| AUDİT BLANKI - Anbar | H22 | `=IF(G22="✓ Uyğun",1,IF(G22="✗ Uyğunsuz",0,""))` |
| AUDİT BLANKI - Anbar | I22 | `=IF(E22="Kritik",5,IF(E22="Mühüm",3,IF(E22="Kiçik",1,"")))` |
| AUDİT BLANKI - Anbar | J22 | `=IF(H22="","",H22*I22)` |
| AUDİT BLANKI - Anbar | K22 | `=IF(G22="✗ Uyğunsuz","Var",IF(G22="","","Yoxdur"))` |
| AUDİT BLANKI - Anbar | H24 | `=IF(G24="✓ Uyğun",1,IF(G24="✗ Uyğunsuz",0,""))` |
| AUDİT BLANKI - Anbar | I24 | `=IF(E24="Kritik",5,IF(E24="Mühüm",3,IF(E24="Kiçik",1,"")))` |
| AUDİT BLANKI - Anbar | J24 | `=IF(H24="","",H24*I24)` |
| AUDİT BLANKI - Anbar | K24 | `=IF(G24="✗ Uyğunsuz","Var",IF(G24="","","Yoxdur"))` |
| AUDİT BLANKI - Anbar | H25 | `=IF(G25="✓ Uyğun",1,IF(G25="✗ Uyğunsuz",0,""))` |
| AUDİT BLANKI - Anbar | I25 | `=IF(E25="Kritik",5,IF(E25="Mühüm",3,IF(E25="Kiçik",1,"")))` |
| AUDİT BLANKI - Anbar | J25 | `=IF(H25="","",H25*I25)` |
| AUDİT BLANKI - Anbar | K25 | `=IF(G25="✗ Uyğunsuz","Var",IF(G25="","","Yoxdur"))` |
| AUDİT BLANKI - Anbar | H26 | `=IF(G26="✓ Uyğun",1,IF(G26="✗ Uyğunsuz",0,""))` |
| AUDİT BLANKI - Anbar | I26 | `=IF(E26="Kritik",5,IF(E26="Mühüm",3,IF(E26="Kiçik",1,"")))` |
| AUDİT BLANKI - Anbar | J26 | `=IF(H26="","",H26*I26)` |
| AUDİT BLANKI - Anbar | K26 | `=IF(G26="✗ Uyğunsuz","Var",IF(G26="","","Yoxdur"))` |
| AUDİT BLANKI - Anbar | H27 | `=IF(G27="✓ Uyğun",1,IF(G27="✗ Uyğunsuz",0,""))` |
| AUDİT BLANKI - Anbar | I27 | `=IF(E27="Kritik",5,IF(E27="Mühüm",3,IF(E27="Kiçik",1,"")))` |
| AUDİT BLANKI - Anbar | J27 | `=IF(H27="","",H27*I27)` |
| AUDİT BLANKI - Anbar | K27 | `=IF(G27="✗ Uyğunsuz","Var",IF(G27="","","Yoxdur"))` |
| AUDİT BLANKI - Anbar | H28 | `=IF(G28="✓ Uyğun",1,IF(G28="✗ Uyğunsuz",0,""))` |
| AUDİT BLANKI - Anbar | I28 | `=IF(E28="Kritik",5,IF(E28="Mühüm",3,IF(E28="Kiçik",1,"")))` |
| AUDİT BLANKI - Anbar | J28 | `=IF(H28="","",H28*I28)` |
| AUDİT BLANKI - Anbar | K28 | `=IF(G28="✗ Uyğunsuz","Var",IF(G28="","","Yoxdur"))` |
| AUDİT BLANKI - Anbar | H30 | `=IF(G30="✓ Uyğun",1,IF(G30="✗ Uyğunsuz",0,""))` |
| AUDİT BLANKI - Anbar | I30 | `=IF(E30="Kritik",5,IF(E30="Mühüm",3,IF(E30="Kiçik",1,"")))` |
| AUDİT BLANKI - Anbar | J30 | `=IF(H30="","",H30*I30)` |
| AUDİT BLANKI - Anbar | K30 | `=IF(G30="✗ Uyğunsuz","Var",IF(G30="","","Yoxdur"))` |
| AUDİT BLANKI - Anbar | H31 | `=IF(G31="✓ Uyğun",1,IF(G31="✗ Uyğunsuz",0,""))` |
| AUDİT BLANKI - Anbar | I31 | `=IF(E31="Kritik",5,IF(E31="Mühüm",3,IF(E31="Kiçik",1,"")))` |
| AUDİT BLANKI - Anbar | J31 | `=IF(H31="","",H31*I31)` |
| AUDİT BLANKI - Anbar | K31 | `=IF(G31="✗ Uyğunsuz","Var",IF(G31="","","Yoxdur"))` |
| AUDİT BLANKI - Anbar | H32 | `=IF(G32="✓ Uyğun",1,IF(G32="✗ Uyğunsuz",0,""))` |
| AUDİT BLANKI - Anbar | I32 | `=IF(E32="Kritik",5,IF(E32="Mühüm",3,IF(E32="Kiçik",1,"")))` |
| AUDİT BLANKI - Anbar | J32 | `=IF(H32="","",H32*I32)` |
| AUDİT BLANKI - Anbar | K32 | `=IF(G32="✗ Uyğunsuz","Var",IF(G32="","","Yoxdur"))` |
| AUDİT BLANKI - Anbar | H34 | `=IF(G34="✓ Uyğun",1,IF(G34="✗ Uyğunsuz",0,""))` |
| AUDİT BLANKI - Anbar | I34 | `=IF(E34="Kritik",5,IF(E34="Mühüm",3,IF(E34="Kiçik",1,"")))` |
| AUDİT BLANKI - Anbar | J34 | `=IF(H34="","",H34*I34)` |
| AUDİT BLANKI - Anbar | K34 | `=IF(G34="✗ Uyğunsuz","Var",IF(G34="","","Yoxdur"))` |
| AUDİT BLANKI - Anbar | H35 | `=IF(G35="✓ Uyğun",1,IF(G35="✗ Uyğunsuz",0,""))` |
| AUDİT BLANKI - Anbar | I35 | `=IF(E35="Kritik",5,IF(E35="Mühüm",3,IF(E35="Kiçik",1,"")))` |
| AUDİT BLANKI - Anbar | J35 | `=IF(H35="","",H35*I35)` |
| AUDİT BLANKI - Anbar | K35 | `=IF(G35="✗ Uyğunsuz","Var",IF(G35="","","Yoxdur"))` |
| AUDİT BLANKI - Anbar | H36 | `=IF(G36="✓ Uyğun",1,IF(G36="✗ Uyğunsuz",0,""))` |
| AUDİT BLANKI - Anbar | I36 | `=IF(E36="Kritik",5,IF(E36="Mühüm",3,IF(E36="Kiçik",1,"")))` |
| AUDİT BLANKI - Anbar | J36 | `=IF(H36="","",H36*I36)` |
| AUDİT BLANKI - Anbar | K36 | `=IF(G36="✗ Uyğunsuz","Var",IF(G36="","","Yoxdur"))` |
| AUDİT BLANKI - Anbar | H37 | `=IF(G37="✓ Uyğun",1,IF(G37="✗ Uyğunsuz",0,""))` |
| AUDİT BLANKI - Anbar | I37 | `=IF(E37="Kritik",5,IF(E37="Mühüm",3,IF(E37="Kiçik",1,"")))` |
| AUDİT BLANKI - Anbar | J37 | `=IF(H37="","",H37*I37)` |
| AUDİT BLANKI - Anbar | K37 | `=IF(G37="✗ Uyğunsuz","Var",IF(G37="","","Yoxdur"))` |
| AUDİT BLANKI - Anbar | H38 | `=IF(G38="✓ Uyğun",1,IF(G38="✗ Uyğunsuz",0,""))` |
| AUDİT BLANKI - Anbar | I38 | `=IF(E38="Kritik",5,IF(E38="Mühüm",3,IF(E38="Kiçik",1,"")))` |
| AUDİT BLANKI - Anbar | J38 | `=IF(H38="","",H38*I38)` |
| AUDİT BLANKI - Anbar | K38 | `=IF(G38="✗ Uyğunsuz","Var",IF(G38="","","Yoxdur"))` |
| AUDİT BLANKI - Anbar | H40 | `=IF(G40="✓ Uyğun",1,IF(G40="✗ Uyğunsuz",0,""))` |
| AUDİT BLANKI - Anbar | I40 | `=IF(E40="Kritik",5,IF(E40="Mühüm",3,IF(E40="Kiçik",1,"")))` |
| AUDİT BLANKI - Anbar | J40 | `=IF(H40="","",H40*I40)` |
| AUDİT BLANKI - Anbar | K40 | `=IF(G40="✗ Uyğunsuz","Var",IF(G40="","","Yoxdur"))` |
| AUDİT BLANKI - Anbar | H41 | `=IF(G41="✓ Uyğun",1,IF(G41="✗ Uyğunsuz",0,""))` |
| AUDİT BLANKI - Anbar | I41 | `=IF(E41="Kritik",5,IF(E41="Mühüm",3,IF(E41="Kiçik",1,"")))` |
| AUDİT BLANKI - Anbar | J41 | `=IF(H41="","",H41*I41)` |
| AUDİT BLANKI - Anbar | K41 | `=IF(G41="✗ Uyğunsuz","Var",IF(G41="","","Yoxdur"))` |
| AUDİT BLANKI - Anbar | H42 | `=IF(G42="✓ Uyğun",1,IF(G42="✗ Uyğunsuz",0,""))` |
| AUDİT BLANKI - Anbar | I42 | `=IF(E42="Kritik",5,IF(E42="Mühüm",3,IF(E42="Kiçik",1,"")))` |
| AUDİT BLANKI - Anbar | J42 | `=IF(H42="","",H42*I42)` |
| AUDİT BLANKI - Anbar | K42 | `=IF(G42="✗ Uyğunsuz","Var",IF(G42="","","Yoxdur"))` |
| AUDİT BLANKI - Anbar | H43 | `=IF(G43="✓ Uyğun",1,IF(G43="✗ Uyğunsuz",0,""))` |
| AUDİT BLANKI - Anbar | I43 | `=IF(E43="Kritik",5,IF(E43="Mühüm",3,IF(E43="Kiçik",1,"")))` |
| AUDİT BLANKI - Anbar | J43 | `=IF(H43="","",H43*I43)` |
| AUDİT BLANKI - Anbar | K43 | `=IF(G43="✗ Uyğunsuz","Var",IF(G43="","","Yoxdur"))` |
| AUDİT BLANKI - Anbar | H44 | `=IF(G44="✓ Uyğun",1,IF(G44="✗ Uyğunsuz",0,""))` |
| AUDİT BLANKI - Anbar | I44 | `=IF(E44="Kritik",5,IF(E44="Mühüm",3,IF(E44="Kiçik",1,"")))` |
| AUDİT BLANKI - Anbar | J44 | `=IF(H44="","",H44*I44)` |
| AUDİT BLANKI - Anbar | K44 | `=IF(G44="✗ Uyğunsuz","Var",IF(G44="","","Yoxdur"))` |
| AUDİT BLANKI - Anbar | F47 | `=COUNTA(D10:D44)` |
| AUDİT BLANKI - Anbar | F48 | `=COUNTIF(G10:G44,"✓ Uyğun")` |
| AUDİT BLANKI - Anbar | F49 | `=COUNTIF(G10:G44,"✗ Uyğunsuz")` |
| AUDİT BLANKI - Anbar | F50 | `=COUNTIFS(E10:E44,"Kritik",G10:G44,"✗ Uyğunsuz")` |
| AUDİT BLANKI - Anbar | F51 | `=COUNTIF(G10:G44,"N/A")` |
| AUDİT BLANKI - Anbar | F52 | `=IFERROR(AVERAGE(H10:H44),"")` |
| AUDİT BLANKI - Anbar | F53 | `=IFERROR(SUM(J10:J44)/SUMPRODUCT((($G$10:$G$44="✓ Uyğun")+($G$10:$G$44="✗ Uyğunsuz"))*$I$10:$I$44),"")` |

## office — ƏM -GFC_HSE_Audit_Blanki_Ofis.xlsx

SHA-256 `f2243f51f37a46c1f253152c7aade214e90bb6d0b9c849eee144e7c391631381`.

### Vərəq: AUDİT BLANKI - Ofis

Vəziyyət: `visible`; gizli sətirlər `[]`; gizli sütunlar `[]`; birləşmələr: A39:E39, F42:H42, F36:H36, N7:O7, F41:H41, A15:T15, E61:T61, B49:T49, A24:T24, A51:T51, A36:E36, D7:F7, A44:T44, F38:H38, A58:D58, B45:T45, I5:K5, D4:F4, A41:E41, A59:D59, A37:E37, E58:T58, A54:T54, I4:K4, N5:O5, A60:D60, B47:T47, F37:H37, F39:H39, A61:D61, D5:F5, B46:T46, A42:E42, A55:T55, A57:T57, B48:T48, B2:T2, E59:T59, I6:K6, A38:E38, A35:T35, N6:O6, E60:T60, A53:T53, A29:T29, B1:T1, F40:H40, A20:T20, A63:T63, A52:T52, A10:T10, D6:F6, A40:E40, I7:K7, N4:O4.

Tam cfRule XML-i və rəng/font/border differential style XML-i config-də saxlanır və verifier ilə müqayisə edilir. Data validations: `[{"range": "E11:E14 E16:E19 E21:E23 E25:E28 E30:E33", "formula1": "\"Kritik,Mühüm,Kiçik\"", "type": "list"}, {"range": "G11:G14 G16:G19 G21:G23 G25:G28 G30:G33", "formula1": "\"✓ Uyğun,✗ Uyğunsuz,N/A\"", "type": "list"}, {"range": "L11:L14 L16:L19 L21:L23 L25:L28 L30:L33", "formula1": "\"Bəli,Xeyr,-\"", "type": "list"}, {"range": "S11:S14 S16:S19 S21:S23 S25:S28 S30:S33", "formula1": "\"Açıq,İcra edilir,Tamamlanıb,Təsdiqlənib\"", "type": "list"}]`. Conditional formatting: `[{"range": "<ConditionalFormatting G11:G14 G16:G19 G21:G23 G25:G28 G30:G33>", "rules": [{"type": "expression", "formula": ["G11=\"✓ Uyğun\""]}, {"type": "expression", "formula": ["G11=\"✗ Uyğunsuz\""]}, {"type": "expression", "formula": ["G11=\"N/A\""]}]}, {"range": "<ConditionalFormatting K11:K14 K16:K19 K21:K23 K25:K28 K30:K33>", "rules": [{"type": "expression", "formula": ["K11=\"Var\""]}, {"type": "expression", "formula": ["K11=\"Yoxdur\""]}]}, {"range": "<ConditionalFormatting E11:E14 E16:E19 E21:E23 E25:E28 E30:E33>", "rules": [{"type": "expression", "formula": ["E11=\"Kritik\""]}, {"type": "expression", "formula": ["E11=\"Mühüm\""]}, {"type": "expression", "formula": ["E11=\"Kiçik\""]}]}, {"range": "<ConditionalFormatting D11:D14 D16:D19 D21:D23 D25:D28 D30:D33>", "rules": [{"type": "expression", "formula": ["AND($E11=\"Kritik\",$G11=\"✗ Uyğunsuz\")"]}]}]`.

### SƏNƏDLƏŞMƏ VƏ TƏLİMATLANDIRMA

Mənbə: `AUDİT BLANKI - Ofis!A10`; orijinal: A  │  SƏNƏDLƏŞMƏ VƏ TƏLİMATLANDIRMA.

| Sistem ID / xana | Kod | Orijinal mətn | UI AZ | Risk / çəki | Normativ istinad | Bal düsturu |
|---|---|---|---|---|---|---|
| `hse-office-w1-r11` / D11 | A1 | Ofis işçiləri üçün giriş təlimatlandırması aparılır | Ofis işçiləri üçün giriş təlimatlandırması aparılır | Mühüm / 3 | Əmək Məcəlləsi | {"H": "=IF(G11=\"✓ Uyğun\",1,IF(G11=\"✗ Uyğunsuz\",0,\"\"))", "I": "=IF(E11=\"Kritik\",5,IF(E11=\"Mühüm\",3,IF(E11=\"Kiçik\",1,\"\")))", "J": "=IF(H11=\"\",\"\",H11*I11)", "K": "=IF(G11=\"✗ Uyğunsuz\",\"Var\",IF(G11=\"\",\"\",\"Yoxdur\"))"} |
| `hse-office-w1-r12` / D12 | A2 | Yanğın təhlükəsizliyi təlimatlandırması qeydiyyatı aparılır | Yanğın təhlükəsizliyi təlimatlandırması qeydiyyatı aparılır | Mühüm / 3 | Əmək Məcəlləsi | {"H": "=IF(G12=\"✓ Uyğun\",1,IF(G12=\"✗ Uyğunsuz\",0,\"\"))", "I": "=IF(E12=\"Kritik\",5,IF(E12=\"Mühüm\",3,IF(E12=\"Kiçik\",1,\"\")))", "J": "=IF(H12=\"\",\"\",H12*I12)", "K": "=IF(G12=\"✗ Uyğunsuz\",\"Var\",IF(G12=\"\",\"\",\"Yoxdur\"))"} |
| `hse-office-w1-r13` / D13 | A3 | Bədbəxt hadisələrin qeydiyyatı jurnalı mövcuddur | Bədbəxt hadisələrin qeydiyyatı jurnalı mövcuddur | Kritik / 5 | Əmək Məcəlləsi | {"H": "=IF(G13=\"✓ Uyğun\",1,IF(G13=\"✗ Uyğunsuz\",0,\"\"))", "I": "=IF(E13=\"Kritik\",5,IF(E13=\"Mühüm\",3,IF(E13=\"Kiçik\",1,\"\")))", "J": "=IF(H13=\"\",\"\",H13*I13)", "K": "=IF(G13=\"✗ Uyğunsuz\",\"Var\",IF(G13=\"\",\"\",\"Yoxdur\"))"} |
| `hse-office-w1-r14` / D14 | A4 | İlk yardım təlimi keçmiş məsul şəxs təyin olunub | İlk yardım təlimi keçmiş məsul şəxs təyin olunub | Mühüm / 3 | Əmək Məcəlləsi | {"H": "=IF(G14=\"✓ Uyğun\",1,IF(G14=\"✗ Uyğunsuz\",0,\"\"))", "I": "=IF(E14=\"Kritik\",5,IF(E14=\"Mühüm\",3,IF(E14=\"Kiçik\",1,\"\")))", "J": "=IF(H14=\"\",\"\",H14*I14)", "K": "=IF(G14=\"✗ Uyğunsuz\",\"Var\",IF(G14=\"\",\"\",\"Yoxdur\"))"} |

### YANĞIN VƏ FÖVQƏLADƏ HALLAR

Mənbə: `AUDİT BLANKI - Ofis!A15`; orijinal: B  │  YANĞIN VƏ FÖVQƏLADƏ HALLAR.

| Sistem ID / xana | Kod | Orijinal mətn | UI AZ | Risk / çəki | Normativ istinad | Bal düsturu |
|---|---|---|---|---|---|---|
| `hse-office-w1-r16` / D16 | B1 | Yanğınsöndürən balon mövcuddur və yoxlanılıb | Yanğınsöndürən balon mövcuddur və yoxlanılıb | Kritik / 5 | FHN "Yanğın Təhlükəsizliyi Qaydaları" | {"H": "=IF(G16=\"✓ Uyğun\",1,IF(G16=\"✗ Uyğunsuz\",0,\"\"))", "I": "=IF(E16=\"Kritik\",5,IF(E16=\"Mühüm\",3,IF(E16=\"Kiçik\",1,\"\")))", "J": "=IF(H16=\"\",\"\",H16*I16)", "K": "=IF(G16=\"✗ Uyğunsuz\",\"Var\",IF(G16=\"\",\"\",\"Yoxdur\"))"} |
| `hse-office-w1-r17` / D17 | B2 | Təxliyə yolları/çıxışlar açıqdır, plan görünən yerdədir | Təxliyə yolları/çıxışlar açıqdır, plan görünən yerdədir | Kritik / 5 | FHN "Yanğın Təhlükəsizliyi Qaydaları" | {"H": "=IF(G17=\"✓ Uyğun\",1,IF(G17=\"✗ Uyğunsuz\",0,\"\"))", "I": "=IF(E17=\"Kritik\",5,IF(E17=\"Mühüm\",3,IF(E17=\"Kiçik\",1,\"\")))", "J": "=IF(H17=\"\",\"\",H17*I17)", "K": "=IF(G17=\"✗ Uyğunsuz\",\"Var\",IF(G17=\"\",\"\",\"Yoxdur\"))"} |
| `hse-office-w1-r18` / D18 | B3 | Təxliyə məşqi keçirilib | Təxliyə məşqi keçirilib | Mühüm / 3 | FHN "Yanğın Təhlükəsizliyi Qaydaları" | {"H": "=IF(G18=\"✓ Uyğun\",1,IF(G18=\"✗ Uyğunsuz\",0,\"\"))", "I": "=IF(E18=\"Kritik\",5,IF(E18=\"Mühüm\",3,IF(E18=\"Kiçik\",1,\"\")))", "J": "=IF(H18=\"\",\"\",H18*I18)", "K": "=IF(G18=\"✗ Uyğunsuz\",\"Var\",IF(G18=\"\",\"\",\"Yoxdur\"))"} |
| `hse-office-w1-r19` / D19 | B4 | Fövqəladə əlaqə nömrələri görünən yerdədir | Fövqəladə əlaqə nömrələri görünən yerdədir | Kiçik / 1 | FHN "Yanğın Təhlükəsizliyi Qaydaları" | {"H": "=IF(G19=\"✓ Uyğun\",1,IF(G19=\"✗ Uyğunsuz\",0,\"\"))", "I": "=IF(E19=\"Kritik\",5,IF(E19=\"Mühüm\",3,IF(E19=\"Kiçik\",1,\"\")))", "J": "=IF(H19=\"\",\"\",H19*I19)", "K": "=IF(G19=\"✗ Uyğunsuz\",\"Var\",IF(G19=\"\",\"\",\"Yoxdur\"))"} |

### ELEKTRİK TƏHLÜKƏSİZLİYİ

Mənbə: `AUDİT BLANKI - Ofis!A20`; orijinal: C  │  ELEKTRİK TƏHLÜKƏSİZLİYİ.

| Sistem ID / xana | Kod | Orijinal mətn | UI AZ | Risk / çəki | Normativ istinad | Bal düsturu |
|---|---|---|---|---|---|---|
| `hse-office-w1-r21` / D21 | C1 | Elektrik kabelləri qarışıq deyil, büdrəmə riski yaratmır | Elektrik kabelləri qarışıq deyil, büdrəmə riski yaratmır | Mühüm / 3 | EQQQ | {"H": "=IF(G21=\"✓ Uyğun\",1,IF(G21=\"✗ Uyğunsuz\",0,\"\"))", "I": "=IF(E21=\"Kritik\",5,IF(E21=\"Mühüm\",3,IF(E21=\"Kiçik\",1,\"\")))", "J": "=IF(H21=\"\",\"\",H21*I21)", "K": "=IF(G21=\"✗ Uyğunsuz\",\"Var\",IF(G21=\"\",\"\",\"Yoxdur\"))"} |
| `hse-office-w1-r22` / D22 | C2 | Çoxlu uzadıcı/adapter istifadəsi həddindən artıq deyil (overload riski) | Çoxlu uzadıcı/adapter istifadəsi həddindən artıq deyil (overload riski) | Mühüm / 3 | EQQQ | {"H": "=IF(G22=\"✓ Uyğun\",1,IF(G22=\"✗ Uyğunsuz\",0,\"\"))", "I": "=IF(E22=\"Kritik\",5,IF(E22=\"Mühüm\",3,IF(E22=\"Kiçik\",1,\"\")))", "J": "=IF(H22=\"\",\"\",H22*I22)", "K": "=IF(G22=\"✗ Uyğunsuz\",\"Var\",IF(G22=\"\",\"\",\"Yoxdur\"))"} |
| `hse-office-w1-r23` / D23 | C3 | Elektrik qurğuları (printer, kondisioner və s.) saz vəziyyətdədir | Elektrik qurğuları (printer, kondisioner və s.) saz vəziyyətdədir | Kiçik / 1 | EQQQ | {"H": "=IF(G23=\"✓ Uyğun\",1,IF(G23=\"✗ Uyğunsuz\",0,\"\"))", "I": "=IF(E23=\"Kritik\",5,IF(E23=\"Mühüm\",3,IF(E23=\"Kiçik\",1,\"\")))", "J": "=IF(H23=\"\",\"\",H23*I23)", "K": "=IF(G23=\"✗ Uyğunsuz\",\"Var\",IF(G23=\"\",\"\",\"Yoxdur\"))"} |

### ERGONOMİKA VƏ İŞ YERİ ŞƏRAİTİ

Mənbə: `AUDİT BLANKI - Ofis!A24`; orijinal: D  │  ERGONOMİKA VƏ İŞ YERİ ŞƏRAİTİ.

| Sistem ID / xana | Kod | Orijinal mətn | UI AZ | Risk / çəki | Normativ istinad | Bal düsturu |
|---|---|---|---|---|---|---|
| `hse-office-w1-r25` / D25 | D1 | İş stolu/stulu ergonomik tələblərə uyğundur | İş stolu/stulu ergonomik tələblərə uyğundur | Kiçik / 1 | Əmək Məcəlləsi | {"H": "=IF(G25=\"✓ Uyğun\",1,IF(G25=\"✗ Uyğunsuz\",0,\"\"))", "I": "=IF(E25=\"Kritik\",5,IF(E25=\"Mühüm\",3,IF(E25=\"Kiçik\",1,\"\")))", "J": "=IF(H25=\"\",\"\",H25*I25)", "K": "=IF(G25=\"✗ Uyğunsuz\",\"Var\",IF(G25=\"\",\"\",\"Yoxdur\"))"} |
| `hse-office-w1-r26` / D26 | D2 | Monitor gözlə düzgün məsafədə/hündürlükdə yerləşdirilib | Monitor gözlə düzgün məsafədə/hündürlükdə yerləşdirilib | Kiçik / 1 | Əmək Məcəlləsi | {"H": "=IF(G26=\"✓ Uyğun\",1,IF(G26=\"✗ Uyğunsuz\",0,\"\"))", "I": "=IF(E26=\"Kritik\",5,IF(E26=\"Mühüm\",3,IF(E26=\"Kiçik\",1,\"\")))", "J": "=IF(H26=\"\",\"\",H26*I26)", "K": "=IF(G26=\"✗ Uyğunsuz\",\"Var\",IF(G26=\"\",\"\",\"Yoxdur\"))"} |
| `hse-office-w1-r27` / D27 | D3 | İşıqlandırma kifayət qədərdir, göz yorğunluğuna səbəb olmur | İşıqlandırma kifayət qədərdir, göz yorğunluğuna səbəb olmur | Kiçik / 1 | Əmək Məcəlləsi | {"H": "=IF(G27=\"✓ Uyğun\",1,IF(G27=\"✗ Uyğunsuz\",0,\"\"))", "I": "=IF(E27=\"Kritik\",5,IF(E27=\"Mühüm\",3,IF(E27=\"Kiçik\",1,\"\")))", "J": "=IF(H27=\"\",\"\",H27*I27)", "K": "=IF(G27=\"✗ Uyğunsuz\",\"Var\",IF(G27=\"\",\"\",\"Yoxdur\"))"} |
| `hse-office-w1-r28` / D28 | D4 | Havalandırma/kondisioner sistemi işləkdir | Havalandırma/kondisioner sistemi işləkdir | Kiçik / 1 | Əmək Məcəlləsi | {"H": "=IF(G28=\"✓ Uyğun\",1,IF(G28=\"✗ Uyğunsuz\",0,\"\"))", "I": "=IF(E28=\"Kritik\",5,IF(E28=\"Mühüm\",3,IF(E28=\"Kiçik\",1,\"\")))", "J": "=IF(H28=\"\",\"\",H28*I28)", "K": "=IF(G28=\"✗ Uyğunsuz\",\"Var\",IF(G28=\"\",\"\",\"Yoxdur\"))"} |

### ÜMUMİ TƏHLÜKƏSİZLİK

Mənbə: `AUDİT BLANKI - Ofis!A29`; orijinal: E  │  ÜMUMİ TƏHLÜKƏSİZLİK.

| Sistem ID / xana | Kod | Orijinal mətn | UI AZ | Risk / çəki | Normativ istinad | Bal düsturu |
|---|---|---|---|---|---|---|
| `hse-office-w1-r30` / D30 | E1 | Döşəmə/pilləkənlər sürüşkən deyil, xalça/kilim bərkidilib | Döşəmə/pilləkənlər sürüşkən deyil, xalça/kilim bərkidilib | Mühüm / 3 | Əmək Məcəlləsi; Daxili SOP | {"H": "=IF(G30=\"✓ Uyğun\",1,IF(G30=\"✗ Uyğunsuz\",0,\"\"))", "I": "=IF(E30=\"Kritik\",5,IF(E30=\"Mühüm\",3,IF(E30=\"Kiçik\",1,\"\")))", "J": "=IF(H30=\"\",\"\",H30*I30)", "K": "=IF(G30=\"✗ Uyğunsuz\",\"Var\",IF(G30=\"\",\"\",\"Yoxdur\"))"} |
| `hse-office-w1-r31` / D31 | E2 | Ofis kimyəvi maddələri (toner, təmizlik) uşaq/kənar şəxslərdən uzaq saxlanılır | Ofis kimyəvi maddələri (toner, təmizlik) uşaq/kənar şəxslərdən uzaq saxlanılır | Kiçik / 1 | Əmək Məcəlləsi; Daxili SOP | {"H": "=IF(G31=\"✓ Uyğun\",1,IF(G31=\"✗ Uyğunsuz\",0,\"\"))", "I": "=IF(E31=\"Kritik\",5,IF(E31=\"Mühüm\",3,IF(E31=\"Kiçik\",1,\"\")))", "J": "=IF(H31=\"\",\"\",H31*I31)", "K": "=IF(G31=\"✗ Uyğunsuz\",\"Var\",IF(G31=\"\",\"\",\"Yoxdur\"))"} |
| `hse-office-w1-r32` / D32 | E3 | CCTV/giriş nəzarəti sistemi işləkdir | CCTV/giriş nəzarəti sistemi işləkdir | Kiçik / 1 | Əmək Məcəlləsi; Daxili SOP | {"H": "=IF(G32=\"✓ Uyğun\",1,IF(G32=\"✗ Uyğunsuz\",0,\"\"))", "I": "=IF(E32=\"Kritik\",5,IF(E32=\"Mühüm\",3,IF(E32=\"Kiçik\",1,\"\")))", "J": "=IF(H32=\"\",\"\",H32*I32)", "K": "=IF(G32=\"✗ Uyğunsuz\",\"Var\",IF(G32=\"\",\"\",\"Yoxdur\"))"} |
| `hse-office-w1-r33` / D33 | E4 | İşçilərin psixososial iş yükü/stress səviyyəsi izlənilir | İşçilərin psixososial iş yükü/stress səviyyəsi izlənilir | Kiçik / 1 | Əmək Məcəlləsi; Daxili SOP | {"H": "=IF(G33=\"✓ Uyğun\",1,IF(G33=\"✗ Uyğunsuz\",0,\"\"))", "I": "=IF(E33=\"Kritik\",5,IF(E33=\"Mühüm\",3,IF(E33=\"Kiçik\",1,\"\")))", "J": "=IF(H33=\"\",\"\",H33*I33)", "K": "=IF(G33=\"✗ Uyğunsuz\",\"Var\",IF(G33=\"\",\"\",\"Yoxdur\"))"} |

### Bütün düstur istinadları

| Vərəq | Xana | Orijinal düstur |
|---|---|---|
| AUDİT BLANKI - Ofis | D6 | `=IFERROR(AVERAGE(H10:H33),"")` |
| AUDİT BLANKI - Ofis | I6 | `=COUNTIF(G10:G33,"✗ Uyğunsuz")` |
| AUDİT BLANKI - Ofis | N6 | `=COUNT(H10:H33)&" / "&COUNTA(D10:D33)` |
| AUDİT BLANKI - Ofis | D7 | `=IFERROR(SUM(J10:J33)/SUMPRODUCT((($G$10:$G$33="✓ Uyğun")+($G$10:$G$33="✗ Uyğunsuz"))*$I$10:$I$33),"")` |
| AUDİT BLANKI - Ofis | I7 | `=COUNTIFS(E10:E33,"Kritik",G10:G33,"✗ Uyğunsuz")` |
| AUDİT BLANKI - Ofis | H11 | `=IF(G11="✓ Uyğun",1,IF(G11="✗ Uyğunsuz",0,""))` |
| AUDİT BLANKI - Ofis | I11 | `=IF(E11="Kritik",5,IF(E11="Mühüm",3,IF(E11="Kiçik",1,"")))` |
| AUDİT BLANKI - Ofis | J11 | `=IF(H11="","",H11*I11)` |
| AUDİT BLANKI - Ofis | K11 | `=IF(G11="✗ Uyğunsuz","Var",IF(G11="","","Yoxdur"))` |
| AUDİT BLANKI - Ofis | H12 | `=IF(G12="✓ Uyğun",1,IF(G12="✗ Uyğunsuz",0,""))` |
| AUDİT BLANKI - Ofis | I12 | `=IF(E12="Kritik",5,IF(E12="Mühüm",3,IF(E12="Kiçik",1,"")))` |
| AUDİT BLANKI - Ofis | J12 | `=IF(H12="","",H12*I12)` |
| AUDİT BLANKI - Ofis | K12 | `=IF(G12="✗ Uyğunsuz","Var",IF(G12="","","Yoxdur"))` |
| AUDİT BLANKI - Ofis | H13 | `=IF(G13="✓ Uyğun",1,IF(G13="✗ Uyğunsuz",0,""))` |
| AUDİT BLANKI - Ofis | I13 | `=IF(E13="Kritik",5,IF(E13="Mühüm",3,IF(E13="Kiçik",1,"")))` |
| AUDİT BLANKI - Ofis | J13 | `=IF(H13="","",H13*I13)` |
| AUDİT BLANKI - Ofis | K13 | `=IF(G13="✗ Uyğunsuz","Var",IF(G13="","","Yoxdur"))` |
| AUDİT BLANKI - Ofis | H14 | `=IF(G14="✓ Uyğun",1,IF(G14="✗ Uyğunsuz",0,""))` |
| AUDİT BLANKI - Ofis | I14 | `=IF(E14="Kritik",5,IF(E14="Mühüm",3,IF(E14="Kiçik",1,"")))` |
| AUDİT BLANKI - Ofis | J14 | `=IF(H14="","",H14*I14)` |
| AUDİT BLANKI - Ofis | K14 | `=IF(G14="✗ Uyğunsuz","Var",IF(G14="","","Yoxdur"))` |
| AUDİT BLANKI - Ofis | H16 | `=IF(G16="✓ Uyğun",1,IF(G16="✗ Uyğunsuz",0,""))` |
| AUDİT BLANKI - Ofis | I16 | `=IF(E16="Kritik",5,IF(E16="Mühüm",3,IF(E16="Kiçik",1,"")))` |
| AUDİT BLANKI - Ofis | J16 | `=IF(H16="","",H16*I16)` |
| AUDİT BLANKI - Ofis | K16 | `=IF(G16="✗ Uyğunsuz","Var",IF(G16="","","Yoxdur"))` |
| AUDİT BLANKI - Ofis | H17 | `=IF(G17="✓ Uyğun",1,IF(G17="✗ Uyğunsuz",0,""))` |
| AUDİT BLANKI - Ofis | I17 | `=IF(E17="Kritik",5,IF(E17="Mühüm",3,IF(E17="Kiçik",1,"")))` |
| AUDİT BLANKI - Ofis | J17 | `=IF(H17="","",H17*I17)` |
| AUDİT BLANKI - Ofis | K17 | `=IF(G17="✗ Uyğunsuz","Var",IF(G17="","","Yoxdur"))` |
| AUDİT BLANKI - Ofis | H18 | `=IF(G18="✓ Uyğun",1,IF(G18="✗ Uyğunsuz",0,""))` |
| AUDİT BLANKI - Ofis | I18 | `=IF(E18="Kritik",5,IF(E18="Mühüm",3,IF(E18="Kiçik",1,"")))` |
| AUDİT BLANKI - Ofis | J18 | `=IF(H18="","",H18*I18)` |
| AUDİT BLANKI - Ofis | K18 | `=IF(G18="✗ Uyğunsuz","Var",IF(G18="","","Yoxdur"))` |
| AUDİT BLANKI - Ofis | H19 | `=IF(G19="✓ Uyğun",1,IF(G19="✗ Uyğunsuz",0,""))` |
| AUDİT BLANKI - Ofis | I19 | `=IF(E19="Kritik",5,IF(E19="Mühüm",3,IF(E19="Kiçik",1,"")))` |
| AUDİT BLANKI - Ofis | J19 | `=IF(H19="","",H19*I19)` |
| AUDİT BLANKI - Ofis | K19 | `=IF(G19="✗ Uyğunsuz","Var",IF(G19="","","Yoxdur"))` |
| AUDİT BLANKI - Ofis | H21 | `=IF(G21="✓ Uyğun",1,IF(G21="✗ Uyğunsuz",0,""))` |
| AUDİT BLANKI - Ofis | I21 | `=IF(E21="Kritik",5,IF(E21="Mühüm",3,IF(E21="Kiçik",1,"")))` |
| AUDİT BLANKI - Ofis | J21 | `=IF(H21="","",H21*I21)` |
| AUDİT BLANKI - Ofis | K21 | `=IF(G21="✗ Uyğunsuz","Var",IF(G21="","","Yoxdur"))` |
| AUDİT BLANKI - Ofis | H22 | `=IF(G22="✓ Uyğun",1,IF(G22="✗ Uyğunsuz",0,""))` |
| AUDİT BLANKI - Ofis | I22 | `=IF(E22="Kritik",5,IF(E22="Mühüm",3,IF(E22="Kiçik",1,"")))` |
| AUDİT BLANKI - Ofis | J22 | `=IF(H22="","",H22*I22)` |
| AUDİT BLANKI - Ofis | K22 | `=IF(G22="✗ Uyğunsuz","Var",IF(G22="","","Yoxdur"))` |
| AUDİT BLANKI - Ofis | H23 | `=IF(G23="✓ Uyğun",1,IF(G23="✗ Uyğunsuz",0,""))` |
| AUDİT BLANKI - Ofis | I23 | `=IF(E23="Kritik",5,IF(E23="Mühüm",3,IF(E23="Kiçik",1,"")))` |
| AUDİT BLANKI - Ofis | J23 | `=IF(H23="","",H23*I23)` |
| AUDİT BLANKI - Ofis | K23 | `=IF(G23="✗ Uyğunsuz","Var",IF(G23="","","Yoxdur"))` |
| AUDİT BLANKI - Ofis | H25 | `=IF(G25="✓ Uyğun",1,IF(G25="✗ Uyğunsuz",0,""))` |
| AUDİT BLANKI - Ofis | I25 | `=IF(E25="Kritik",5,IF(E25="Mühüm",3,IF(E25="Kiçik",1,"")))` |
| AUDİT BLANKI - Ofis | J25 | `=IF(H25="","",H25*I25)` |
| AUDİT BLANKI - Ofis | K25 | `=IF(G25="✗ Uyğunsuz","Var",IF(G25="","","Yoxdur"))` |
| AUDİT BLANKI - Ofis | H26 | `=IF(G26="✓ Uyğun",1,IF(G26="✗ Uyğunsuz",0,""))` |
| AUDİT BLANKI - Ofis | I26 | `=IF(E26="Kritik",5,IF(E26="Mühüm",3,IF(E26="Kiçik",1,"")))` |
| AUDİT BLANKI - Ofis | J26 | `=IF(H26="","",H26*I26)` |
| AUDİT BLANKI - Ofis | K26 | `=IF(G26="✗ Uyğunsuz","Var",IF(G26="","","Yoxdur"))` |
| AUDİT BLANKI - Ofis | H27 | `=IF(G27="✓ Uyğun",1,IF(G27="✗ Uyğunsuz",0,""))` |
| AUDİT BLANKI - Ofis | I27 | `=IF(E27="Kritik",5,IF(E27="Mühüm",3,IF(E27="Kiçik",1,"")))` |
| AUDİT BLANKI - Ofis | J27 | `=IF(H27="","",H27*I27)` |
| AUDİT BLANKI - Ofis | K27 | `=IF(G27="✗ Uyğunsuz","Var",IF(G27="","","Yoxdur"))` |
| AUDİT BLANKI - Ofis | H28 | `=IF(G28="✓ Uyğun",1,IF(G28="✗ Uyğunsuz",0,""))` |
| AUDİT BLANKI - Ofis | I28 | `=IF(E28="Kritik",5,IF(E28="Mühüm",3,IF(E28="Kiçik",1,"")))` |
| AUDİT BLANKI - Ofis | J28 | `=IF(H28="","",H28*I28)` |
| AUDİT BLANKI - Ofis | K28 | `=IF(G28="✗ Uyğunsuz","Var",IF(G28="","","Yoxdur"))` |
| AUDİT BLANKI - Ofis | H30 | `=IF(G30="✓ Uyğun",1,IF(G30="✗ Uyğunsuz",0,""))` |
| AUDİT BLANKI - Ofis | I30 | `=IF(E30="Kritik",5,IF(E30="Mühüm",3,IF(E30="Kiçik",1,"")))` |
| AUDİT BLANKI - Ofis | J30 | `=IF(H30="","",H30*I30)` |
| AUDİT BLANKI - Ofis | K30 | `=IF(G30="✗ Uyğunsuz","Var",IF(G30="","","Yoxdur"))` |
| AUDİT BLANKI - Ofis | H31 | `=IF(G31="✓ Uyğun",1,IF(G31="✗ Uyğunsuz",0,""))` |
| AUDİT BLANKI - Ofis | I31 | `=IF(E31="Kritik",5,IF(E31="Mühüm",3,IF(E31="Kiçik",1,"")))` |
| AUDİT BLANKI - Ofis | J31 | `=IF(H31="","",H31*I31)` |
| AUDİT BLANKI - Ofis | K31 | `=IF(G31="✗ Uyğunsuz","Var",IF(G31="","","Yoxdur"))` |
| AUDİT BLANKI - Ofis | H32 | `=IF(G32="✓ Uyğun",1,IF(G32="✗ Uyğunsuz",0,""))` |
| AUDİT BLANKI - Ofis | I32 | `=IF(E32="Kritik",5,IF(E32="Mühüm",3,IF(E32="Kiçik",1,"")))` |
| AUDİT BLANKI - Ofis | J32 | `=IF(H32="","",H32*I32)` |
| AUDİT BLANKI - Ofis | K32 | `=IF(G32="✗ Uyğunsuz","Var",IF(G32="","","Yoxdur"))` |
| AUDİT BLANKI - Ofis | H33 | `=IF(G33="✓ Uyğun",1,IF(G33="✗ Uyğunsuz",0,""))` |
| AUDİT BLANKI - Ofis | I33 | `=IF(E33="Kritik",5,IF(E33="Mühüm",3,IF(E33="Kiçik",1,"")))` |
| AUDİT BLANKI - Ofis | J33 | `=IF(H33="","",H33*I33)` |
| AUDİT BLANKI - Ofis | K33 | `=IF(G33="✗ Uyğunsuz","Var",IF(G33="","","Yoxdur"))` |
| AUDİT BLANKI - Ofis | F36 | `=COUNTA(D10:D33)` |
| AUDİT BLANKI - Ofis | F37 | `=COUNTIF(G10:G33,"✓ Uyğun")` |
| AUDİT BLANKI - Ofis | F38 | `=COUNTIF(G10:G33,"✗ Uyğunsuz")` |
| AUDİT BLANKI - Ofis | F39 | `=COUNTIFS(E10:E33,"Kritik",G10:G33,"✗ Uyğunsuz")` |
| AUDİT BLANKI - Ofis | F40 | `=COUNTIF(G10:G33,"N/A")` |
| AUDİT BLANKI - Ofis | F41 | `=IFERROR(AVERAGE(H10:H33),"")` |
| AUDİT BLANKI - Ofis | F42 | `=IFERROR(SUM(J10:J33)/SUMPRODUCT((($G$10:$G$33="✓ Uyğun")+($G$10:$G$33="✗ Uyğunsuz"))*$I$10:$I$33),"")` |

## restaurant — ƏM - GFC_ HSE_Audit_Blanki Son versiya.xlsx

SHA-256 `3f47324b9bd8fd09beab15537a43b106f03fbc975b8ed774a5efc7c6c4fb259c`.

### Vərəq: COVER

Vəziyyət: `visible`; gizli sətirlər `[]`; gizli sütunlar `[]`; birləşmələr: B2:G2, C30:G30, C34:G34, B14:G14, B17:G17, C33:G33, E15:G15, C29:G29, C10:G10, B15:D15, C9:G9, B6:G6, C12:G12, B36:G36, C11:G11, B32:G32, B4:G4, B26:G26, C8:G8, B3:G3, C7:G7, B27:G27, C28:G28.

Tam cfRule XML-i və rəng/font/border differential style XML-i config-də saxlanır və verifier ilə müqayisə edilir. Data validations: `[]`. Conditional formatting: `[{"range": "<ConditionalFormatting B15:D15>", "rules": [{"type": "expression", "formula": ["ISNUMBER(SEARCH(\"UĞURLU\",B15))"]}, {"type": "expression", "formula": ["ISNUMBER(SEARCH(\"UĞURSUZ\",B15))"]}]}, {"range": "<ConditionalFormatting E19:E24>", "rules": [{"type": "cellIs", "formula": ["0"]}, {"type": "cellIs", "formula": ["0"]}]}]`.
### Vərəq: AUDİT BLANKI

Vəziyyət: `visible`; gizli sətirlər `[]`; gizli sütunlar `['H', 'N']`; birləşmələr: A87:O87, B79:O79, A73:E73, A91:D91, A75:O75, A84:O84, F70:H70, A27:O27, A70:E70, A69:E69, F72:H72, E88:O88, B77:O77, A42:O42, I5:K5, F71:H71, B2:O2, D4:F4, A85:O85, A23:O23, A32:O32, L5:M5, G6:H6, I4:K4, N5:O5, B1:O1, L4:M4, D5:F5, A88:D88, E90:O90, B78:O78, A71:E71, A68:O68, G5:H5, A93:O93, F73:H73, E89:O89, A9:O9, A90:D90, F69:H69, I6:K6, A83:O83, G4:H4, B6:C6, A89:D89, E91:O91, A51:O51, A82:O82, A72:E72, L6:M6, N6:O6, B5:C5, B80:O80, B76:O76, D6:F6, B4:C4, N4:O4.

Tam cfRule XML-i və rəng/font/border differential style XML-i config-də saxlanır və verifier ilə müqayisə edilir. Data validations: `[{"range": "D4", "formula1": "\"KFC,Pizza Hut,Simit Sarayı\"", "type": "list"}, {"range": "E10:E22 E24:E26 E28:E31 E33:E41 E43:E50 E52:E66", "formula1": "\"✓ Uyğun,✗ Uyğunsuz,N/A\"", "type": "list"}, {"range": "G10:G22 G24:G26 G28:G31 G33:G41 G43:G50 G52:G66", "formula1": "\"Var,Yoxdur\"", "type": "list"}, {"range": "N10:N22 N24:N26 N28:N31 N33:N41 N43:N50 N52:N66", "formula1": "\"Açıq,İcra edilir,Tamamlanıb,Təsdiqlənib\"", "type": "list"}]`. Conditional formatting: `[{"range": "<ConditionalFormatting G9:G66>", "rules": [{"type": "cellIs", "formula": ["\"Var\""]}]}, {"range": "<ConditionalFormatting E9:E66>", "rules": [{"type": "cellIs", "formula": ["\"✓ Uyğun\""]}]}]`.

### ƏMƏYİN MÜHAFİZƏSİ JURNALLARININ QEYDİYYATI

Mənbə: `AUDİT BLANKI!A9`; orijinal: A  │  ƏMƏYİN MÜHAFİZƏSİ JURNALLARININ QEYDİYYATI.

| Sistem ID / xana | Kod | Orijinal mətn | UI AZ | Risk / çəki | Normativ istinad | Bal düsturu |
|---|---|---|---|---|---|---|
| `hse-restaurant-w2-r10` / D10 | A1 | Giriş təlimatın qeydiyyatı | Giriş təlimatın qeydiyyatı | — / — | — | {"F": "=IF(E10=\"✓ Uyğun\",1,IF(E10=\"✗ Uyğunsuz\",0,\"\"))"} |
| `hse-restaurant-w2-r11` / D11 | A2 | İş yerində təlimatlandırma üzrə qeydiyyat | İş yerində təlimatlandırma üzrə qeydiyyat | — / — | — | {"F": "=IF(E11=\"✓ Uyğun\",1,IF(E11=\"✗ Uyğunsuz\",0,\"\"))"} |
| `hse-restaurant-w2-r12` / D12 | A3 | İşçilər üçün əmək mühafizəsi üzrə təlimatların verilməsi | İşçilər üçün əmək mühafizəsi üzrə təlimatların verilməsi | — / — | — | {"F": "=IF(E12=\"✓ Uyğun\",1,IF(E12=\"✗ Uyğunsuz\",0,\"\"))"} |
| `hse-restaurant-w2-r13` / D13 | A4 | İşçilərə bütün modul izah olunub,imtahandan uğurla keçib və qeydiyyatı aparılıb | İşçilərə bütün modul izah olunub, imtahandan uğurla keçib və qeydiyyatı aparılıb | — / — | — | {} |
| `hse-restaurant-w2-r14` / D14 | A5 | Elektrik təhlükəsizliyinə dair 1-ci qrup təlimatlandırma (cavabdeh olmayan işçilər) | Elektrik təhlükəsizliyinə dair 1-ci qrup təlimatlandırma (cavabdeh olmayan işçilər) | — / — | — | {"F": "=IF(E14=\"✓ Uyğun\",1,IF(E14=\"✗ Uyğunsuz\",0,\"\"))"} |
| `hse-restaurant-w2-r15` / D15 | A6 | Yanğın təhlükəsizliyi təlimatlandırmaları üzrə qeydiyyat | Yanğın təhlükəsizliyi təlimatlandırmaları üzrə qeydiyyat | — / — | — | {"F": "=IF(E15=\"✓ Uyğun\",1,IF(E15=\"✗ Uyğunsuz\",0,\"\"))"} |
| `hse-restaurant-w2-r16` / D16 | A7 | Yanğınsöndürənlərin qeydiyyatı | Yanğınsöndürənlərin qeydiyyatı | — / — | — | {"F": "=IF(E16=\"✓ Uyğun\",1,IF(E16=\"✗ Uyğunsuz\",0,\"\"))"} |
| `hse-restaurant-w2-r17` / D17 | A8 | Təlimatların qeydiyyatı (ümumi) | Təlimatların qeydiyyatı (ümumi) | — / — | — | {"F": "=IF(E17=\"✓ Uyğun\",1,IF(E17=\"✗ Uyğunsuz\",0,\"\"))"} |
| `hse-restaurant-w2-r18` / D18 | A9 | Avadanlıq/cihazlarla təhlükəsiz davranma qaydaları üzrə qeydiyyat | Avadanlıq/cihazlarla təhlükəsiz davranma qaydaları üzrə qeydiyyat | — / — | — | {"F": "=IF(E18=\"✓ Uyğun\",1,IF(E18=\"✗ Uyğunsuz\",0,\"\"))"} |
| `hse-restaurant-w2-r19` / D19 | A10 | Sağlamlıq jurnalı | Sağlamlıq jurnalı | — / — | — | {"F": "=IF(E19=\"✓ Uyğun\",1,IF(E19=\"✗ Uyğunsuz\",0,\"\"))"} |
| `hse-restaurant-w2-r20` / D20 | A11 | Tibbi müayinənin təyin edilməsi üzrə jurnal | Tibbi müayinənin təyin edilməsi üzrə jurnal | — / — | — | {"F": "=IF(E20=\"✓ Uyğun\",1,IF(E20=\"✗ Uyğunsuz\",0,\"\"))"} |
| `hse-restaurant-w2-r21` / D21 | A12 | Fərdi qorunma vasitələrinin (FQV) qeydiyyatı | Fərdi qorunma vasitələrinin (FQV) qeydiyyatı | — / — | — | {"F": "=IF(E21=\"✓ Uyğun\",1,IF(E21=\"✗ Uyğunsuz\",0,\"\"))"} |
| `hse-restaurant-w2-r22` / D22 | A13 | İstehsalatda bədbəxt hadisələrin qeydiyyatı | İstehsalatda bədbəxt hadisələrin qeydiyyatı | — / — | — | {"F": "=IF(E22=\"✓ Uyğun\",1,IF(E22=\"✗ Uyğunsuz\",0,\"\"))"} |

### YANĞIN TƏHLÜKƏSİZLİYİ VƏZİYYƏTİ

Mənbə: `AUDİT BLANKI!A23`; orijinal: B  │  YANĞIN TƏHLÜKƏSİZLİYİ VƏZİYYƏTİ.

| Sistem ID / xana | Kod | Orijinal mətn | UI AZ | Risk / çəki | Normativ istinad | Bal düsturu |
|---|---|---|---|---|---|---|
| `hse-restaurant-w2-r24` / D24 | B1 | Yanğınsöndürən balonlar mövcuddur, işləkdir, yoxlama tarixi keçməyib | Yanğınsöndürən balonlar mövcuddur, işləkdir, yoxlama tarixi keçməyib | — / — | — | {"F": "=IF(E24=\"✓ Uyğun\",1,IF(E24=\"✗ Uyğunsuz\",0,\"\"))"} |
| `hse-restaurant-w2-r25` / D25 | B2 | Evakuasiya çıxışları açıqdır, evakuasiya planı görünən yerdə asılıb | Evakuasiya çıxışları açıqdır, evakuasiya planı görünən yerdə asılıb | — / — | — | {"F": "=IF(E25=\"✓ Uyğun\",1,IF(E25=\"✗ Uyğunsuz\",0,\"\"))"} |
| `hse-restaurant-w2-r26` / D26 | B3 | Yanğın nişanları mövcuddur, balonlar görünən yerdədir | Yanğın nişanları mövcuddur, balonlar görünən yerdədir | — / — | — | {"F": "=IF(E26=\"✓ Uyğun\",1,IF(E26=\"✗ Uyğunsuz\",0,\"\"))"} |

### ELEKTRİK VƏ QAZ TƏHLÜKƏSİZLİYİ

Mənbə: `AUDİT BLANKI!A27`; orijinal: C  │  ELEKTRİK VƏ QAZ TƏHLÜKƏSİZLİYİ.

| Sistem ID / xana | Kod | Orijinal mətn | UI AZ | Risk / çəki | Normativ istinad | Bal düsturu |
|---|---|---|---|---|---|---|
| `hse-restaurant-w2-r28` / D28 | C1 | Elektrik panosu qapalı və təhlükəsizdir | Elektrik panosu qapalı və təhlükəsizdir | — / — | — | {"F": "=IF(E28=\"✓ Uyğun\",1,IF(E28=\"✗ Uyğunsuz\",0,\"\"))"} |
| `hse-restaurant-w2-r29` / D29 | C2 | Açıq kabel və nasazlıq yoxdur | Açıq kabel və nasazlıq yoxdur | — / — | — | {"F": "=IF(E29=\"✓ Uyğun\",1,IF(E29=\"✗ Uyğunsuz\",0,\"\"))"} |
| `hse-restaurant-w2-r30` / D30 | C3 | Qaz avadanlıqları saz vəziyyətdədir | Qaz avadanlıqları saz vəziyyətdədir | — / — | — | {"F": "=IF(E30=\"✓ Uyğun\",1,IF(E30=\"✗ Uyğunsuz\",0,\"\"))"} |
| `hse-restaurant-w2-r31` / D31 | C4 | Qaz sızması riski yoxdur | Qaz sızması riski yoxdur | — / — | — | {"F": "=IF(E31=\"✓ Uyğun\",1,IF(E31=\"✗ Uyğunsuz\",0,\"\"))"} |

### MƏTBƏX VƏ İSTEHSALAT SAHƏSİ

Mənbə: `AUDİT BLANKI!A32`; orijinal: D  │  MƏTBƏX VƏ İSTEHSALAT SAHƏSİ.

| Sistem ID / xana | Kod | Orijinal mətn | UI AZ | Risk / çəki | Normativ istinad | Bal düsturu |
|---|---|---|---|---|---|---|
| `hse-restaurant-w2-r33` / D33 | D1 | Fritöz və isti yağ təhlükəsiz istifadə edilir | Fritöz və isti yağ təhlükəsiz istifadə edilir | — / — | — | {"F": "=IF(E33=\"✓ Uyğun\",1,IF(E33=\"✗ Uyğunsuz\",0,\"\"))"} |
| `hse-restaurant-w2-r34` / D34 | D2 | Yağ yığılması yoxdur | Yağ yığılması yoxdur | — / — | — | {"F": "=IF(E34=\"✓ Uyğun\",1,IF(E34=\"✗ Uyğunsuz\",0,\"\"))"} |
| `hse-restaurant-w2-r35` / D35 | D3 | Qaz/elektrik avadanlıqları saz vəziyyətdədir | Qaz/elektrik avadanlıqları saz vəziyyətdədir | — / — | — | {"F": "=IF(E35=\"✓ Uyğun\",1,IF(E35=\"✗ Uyğunsuz\",0,\"\"))"} |
| `hse-restaurant-w2-r36` / D36 | D4 | Havalandırma sistemi işləkdir | Havalandırma sistemi işləkdir | — / — | — | {"F": "=IF(E36=\"✓ Uyğun\",1,IF(E36=\"✗ Uyğunsuz\",0,\"\"))"} |
| `hse-restaurant-w2-r37` / D37 | D5 | Kondisionerlər işlək vəziyyətdədir | Kondisionerlər işlək vəziyyətdədir | — / — | — | {"F": "=IF(E37=\"✓ Uyğun\",1,IF(E37=\"✗ Uyğunsuz\",0,\"\"))"} |
| `hse-restaurant-w2-r38` / D38 | D6 | Qaynar səthlər işarələnib | Qaynar səthlər işarələnib | — / — | — | {"F": "=IF(E38=\"✓ Uyğun\",1,IF(E38=\"✗ Uyğunsuz\",0,\"\"))"} |
| `hse-restaurant-w2-r39` / D39 | D7 | Kəskin alətlər təhlükəsiz saxlanılır | Kəskin alətlər təhlükəsiz saxlanılır | — / — | — | {"F": "=IF(E39=\"✓ Uyğun\",1,IF(E39=\"✗ Uyğunsuz\",0,\"\"))"} |
| `hse-restaurant-w2-r40` / D40 | D8 | Elektrik avadanlıqları saz vəziyyətdədir | Elektrik avadanlıqları saz vəziyyətdədir | — / — | — | {"F": "=IF(E40=\"✓ Uyğun\",1,IF(E40=\"✗ Uyğunsuz\",0,\"\"))"} |
| `hse-restaurant-w2-r41` / D41 | D9 | Xəbərdarlıq nişanları mövcuddur | Xəbərdarlıq nişanları mövcuddur | — / — | — | {"F": "=IF(E41=\"✓ Uyğun\",1,IF(E41=\"✗ Uyğunsuz\",0,\"\"))"} |

### İŞÇİ TƏHLÜKƏSİZLİYİ

Mənbə: `AUDİT BLANKI!A42`; orijinal: E  │  İŞÇİ TƏHLÜKƏSİZLİYİ.

| Sistem ID / xana | Kod | Orijinal mətn | UI AZ | Risk / çəki | Normativ istinad | Bal düsturu |
|---|---|---|---|---|---|---|
| `hse-restaurant-w2-r43` / D43 | E1 | İşçilər FQV (fərdi mühafizə vasitələri) ilə təmin olunub | İşçilər FQV (fərdi mühafizə vasitələri) ilə təmin olunub | — / — | — | {"F": "=IF(E43=\"✓ Uyğun\",1,IF(E43=\"✗ Uyğunsuz\",0,\"\"))"} |
| `hse-restaurant-w2-r44` / D44 | E2 | Təhlükəsizlik qaydalarına əməl olunur | Təhlükəsizlik qaydalarına əməl olunur | — / — | — | {"F": "=IF(E44=\"✓ Uyğun\",1,IF(E44=\"✗ Uyğunsuz\",0,\"\"))"} |
| `hse-restaurant-w2-r45` / D45 | E3 | Xüsusi iş geyimi mövcuddur | Xüsusi iş geyimi mövcuddur | — / — | — | {"F": "=IF(E45=\"✓ Uyğun\",1,IF(E45=\"✗ Uyğunsuz\",0,\"\"))"} |
| `hse-restaurant-w2-r46` / D46 | E4 | Ağır yük düzgün qaldırılır (ergonomika) | Ağır yük düzgün qaldırılır (ergonomika) | — / — | — | {"F": "=IF(E46=\"✓ Uyğun\",1,IF(E46=\"✗ Uyğunsuz\",0,\"\"))"} |
| `hse-restaurant-w2-r47` / D47 | E5 | İşçilər təhlükəsizlik qaydalarını bilir | İşçilər təhlükəsizlik qaydalarını bilir | — / — | — | {"F": "=IF(E47=\"✓ Uyğun\",1,IF(E47=\"✗ Uyğunsuz\",0,\"\"))"} |
| `hse-restaurant-w2-r48` / D48 | E6 | Döşəmə sürüşkən deyil | Döşəmə sürüşkən deyil | — / — | — | {"F": "=IF(E48=\"✓ Uyğun\",1,IF(E48=\"✗ Uyğunsuz\",0,\"\"))"} |
| `hse-restaurant-w2-r49` / D49 | E7 | Ofis otağı təmiz və səliqəlidir | Ofis otağı təmiz və səliqəlidir | — / — | — | {"F": "=IF(E49=\"✓ Uyğun\",1,IF(E49=\"✗ Uyğunsuz\",0,\"\"))"} |
| `hse-restaurant-w2-r50` / D50 | E8 | Kimyəvi maddələrlə iş düzgün aparılır | Kimyəvi maddələrlə iş düzgün aparılır | — / — | — | {"F": "=IF(E50=\"✓ Uyğun\",1,IF(E50=\"✗ Uyğunsuz\",0,\"\"))"} |

### ƏLAVƏ YOXLAMALAR VƏ SUALLAR

Mənbə: `AUDİT BLANKI!A51`; orijinal: F  │  ƏLAVƏ YOXLAMALAR VƏ SUALLAR.

| Sistem ID / xana | Kod | Orijinal mətn | UI AZ | Risk / çəki | Normativ istinad | Bal düsturu |
|---|---|---|---|---|---|---|
| `hse-restaurant-w2-r52` / D52 | F1 | Qarderob, tualet, yemək otağı — təmiz, səliqəli, işlək, ütü və ütü masası mövcuddur | Qarderob, tualet, yemək otağı — təmiz, səliqəli, işlək, ütü və ütü masası mövcuddur | — / — | — | {"F": "=IF(E52=\"✓ Uyğun\",1,IF(E52=\"✗ Uyğunsuz\",0,\"\"))"} |
| `hse-restaurant-w2-r53` / D53 | F2 | Uniforma standartları işçilərin əlçatan yerindədir | Uniforma standartları işçilərin əlçatan yerindədir | — / — | — | {"F": "=IF(E53=\"✓ Uyğun\",1,IF(E53=\"✗ Uyğunsuz\",0,\"\"))"} |
| `hse-restaurant-w2-r54` / D54 | F3 | Yeni işçilər ilk gün ƏM/TT təliminə cəlb edilir, mütəmadi kompleks təlim keçir | Yeni işçilər ilk gün ƏM/TT təliminə cəlb edilir, mütəmadi kompleks təlim keçir | — / — | — | {"F": "=IF(E54=\"✓ Uyğun\",1,IF(E54=\"✗ Uyğunsuz\",0,\"\"))"} |
| `hse-restaurant-w2-r55` / D55 | F4 | İşçilər isti sobalarda yağ/avadanlıq təmizliyini düzgün icra edir | İşçilər isti sobalarda yağ/avadanlıq təmizliyini düzgün icra edir | — / — | — | {"F": "=IF(E55=\"✓ Uyğun\",1,IF(E55=\"✗ Uyğunsuz\",0,\"\"))"} |
| `hse-restaurant-w2-r56` / D56 | F5 | Menecerlər yağın keyfiyyəti, fritöz tənzimləmələrini yoxlaya bilir | Menecerlər yağın keyfiyyəti, fritöz tənzimləmələrini yoxlaya bilir | — / — | — | {"F": "=IF(E56=\"✓ Uyğun\",1,IF(E56=\"✗ Uyğunsuz\",0,\"\"))"} |
| `hse-restaurant-w2-r57` / D57 | F6 | İş cədvəli ƏM-ə uyğun hazırlanır | İş cədvəli ƏM-ə uyğun hazırlanır | — / — | — | {"F": "=IF(E57=\"✓ Uyğun\",1,IF(E57=\"✗ Uyğunsuz\",0,\"\"))"} |
| `hse-restaurant-w2-r58` / D58 | F7 | İşçilər təxliyyə qaydaları və toplanış məntəqəsini bilir | İşçilər təxliyə qaydaları və toplanış məntəqəsini bilir | — / — | — | {"F": "=IF(E58=\"✓ Uyğun\",1,IF(E58=\"✗ Uyğunsuz\",0,\"\"))"} |
| `hse-restaurant-w2-r59` / D59 | F8 | İlk tibbi yardım qutusu mövcuddur, əməkdaşlar istifadə qaydalarını bilir | İlk tibbi yardım qutusu mövcuddur, əməkdaşlar istifadə qaydalarını bilir | — / — | — | {"F": "=IF(E59=\"✓ Uyğun\",1,IF(E59=\"✗ Uyğunsuz\",0,\"\"))"} |
| `hse-restaurant-w2-r60` / D60 | F9 | "Fövqəladə hallar" plakatı görünən yerdədir, işçilər məlumatlıdır | "Fövqəladə hallar" plakatı görünən yerdədir, işçilər məlumatlıdır | — / — | — | {"F": "=IF(E60=\"✓ Uyğun\",1,IF(E60=\"✗ Uyğunsuz\",0,\"\"))"} |
| `hse-restaurant-w2-r61` / D61 | F10 | FQV yerli tələblərə uyğundur, əməkdaşlar istifadəni bilir | FQV yerli tələblərə uyğundur, əməkdaşlar istifadəni bilir | — / — | — | {"F": "=IF(E61=\"✓ Uyğun\",1,IF(E61=\"✗ Uyğunsuz\",0,\"\"))"} |
| `hse-restaurant-w2-r62` / D62 | F11 | Potensial bədbəxt hadisə zamanı prosedurların ardıcıllığı bilinir | Potensial bədbəxt hadisə zamanı prosedurların ardıcıllığı bilinir | — / — | — | {"F": "=IF(E62=\"✓ Uyğun\",1,IF(E62=\"✗ Uyğunsuz\",0,\"\"))"} |
| `hse-restaurant-w2-r63` / D63 | F12 | Döşəmə təmizliyi zamanı sürüşmə xəbərdarlığı işarəsi qoyulur | Döşəmə təmizliyi zamanı sürüşmə xəbərdarlığı işarəsi qoyulur | — / — | — | {"F": "=IF(E63=\"✓ Uyğun\",1,IF(E63=\"✗ Uyğunsuz\",0,\"\"))"} |
| `hse-restaurant-w2-r64` / D64 | F13 | Restoran daxili hərəkət zonasında kənar obyektlər yoxdur | Restoran daxili hərəkət zonasında kənar obyektlər yoxdur | — / — | — | {"F": "=IF(E64=\"✓ Uyğun\",1,IF(E64=\"✗ Uyğunsuz\",0,\"\"))"} |
| `hse-restaurant-w2-r65` / D65 | F14 | Məhsulların qəbulu/daşınması zamanı əməkdaşlar müvafiq təlimdən keçib | Məhsulların qəbulu/daşınması zamanı əməkdaşlar müvafiq təlimdən keçib | — / — | — | {"F": "=IF(E65=\"✓ Uyğun\",1,IF(E65=\"✗ Uyğunsuz\",0,\"\"))"} |
| `hse-restaurant-w2-r66` / D66 | F15 | Restoran daxilindəki avadanlıqların quraşdırılma/yerləşimi düzgündür | Restoran daxilindəki avadanlıqların quraşdırılma/yerləşimi düzgündür | — / — | — | {"F": "=IF(E66=\"✓ Uyğun\",1,IF(E66=\"✗ Uyğunsuz\",0,\"\"))"} |

### Bütün düstur istinadları

| Vərəq | Xana | Orijinal düstur |
|---|---|---|
| COVER | C7 | `='AUDİT BLANKI'!D4` |
| COVER | C8 | `='AUDİT BLANKI'!I4` |
| COVER | C9 | `='AUDİT BLANKI'!N4` |
| COVER | C10 | `='AUDİT BLANKI'!D5` |
| COVER | C11 | `='AUDİT BLANKI'!I5` |
| COVER | C12 | `='AUDİT BLANKI'!N5` |
| COVER | B15 | `=IF(COUNT('AUDİT BLANKI'!F9:F66)=0,"⏳ GÖZLƏNİLİR / PENDING",IF('AUDİT BLANKI'!D6>=0.85,"✅ UĞURLU / PASSED","❌ UĞURSUZ / FAILED"))` |
| COVER | E15 | `='AUDİT BLANKI'!D6` |
| COVER | C19 | `=COUNTA('AUDİT BLANKI'!B10:B22)` |
| COVER | F19 | `=COUNTIF('AUDİT BLANKI'!E10:E22,"N/A")` |
| COVER | G19 | `=D19/C19` |
| COVER | C20 | `=COUNTA('AUDİT BLANKI'!B24:B26)` |
| COVER | F20 | `=COUNTIF('AUDİT BLANKI'!E24:E26,"N/A")` |
| COVER | G20 | `=D20/C20` |
| COVER | C21 | `=COUNTA('AUDİT BLANKI'!B28:B31)` |
| COVER | F21 | `=COUNTIF('AUDİT BLANKI'!E28:E31,"N/A")` |
| COVER | G21 | `=D21/C21` |
| COVER | C22 | `=COUNTA('AUDİT BLANKI'!B33:B41)` |
| COVER | F22 | `=COUNTIF('AUDİT BLANKI'!E33:E41,"N/A")` |
| COVER | G22 | `=D22/C22` |
| COVER | C23 | `=COUNTA('AUDİT BLANKI'!B43:B50)` |
| COVER | E23 | `=COUNTIF('AUDİT BLANKI'!G43:G50,"Var")` |
| COVER | F23 | `=COUNTIF('AUDİT BLANKI'!E43:E50,"N/A")` |
| COVER | G23 | `=E23/C23` |
| COVER | C24 | `=COUNTA('AUDİT BLANKI'!B52:B66)` |
| COVER | E24 | `=COUNTIF('AUDİT BLANKI'!G52:G66,"Var")` |
| COVER | F24 | `=COUNTIF('AUDİT BLANKI'!E52:E66,"N/A")` |
| COVER | G24 | `=D24/C24` |
| COVER | C25 | `=SUM(C19:C24)` |
| COVER | D25 | `=SUM(D19:D24)` |
| COVER | E25 | `=SUM(E19:E24)` |
| COVER | F25 | `=SUM(F19:F24)` |
| COVER | G25 | `=D25/C25` |
| AUDİT BLANKI | D6 | `=IFERROR(AVERAGE(F9:F66),"")` |
| AUDİT BLANKI | I6 | `=COUNTIF(G9:G66,"Var")` |
| AUDİT BLANKI | N6 | `=COUNT(F9:F66)&" / 57"` |
| AUDİT BLANKI | F10 | `=IF(E10="✓ Uyğun",1,IF(E10="✗ Uyğunsuz",0,""))` |
| AUDİT BLANKI | F11 | `=IF(E11="✓ Uyğun",1,IF(E11="✗ Uyğunsuz",0,""))` |
| AUDİT BLANKI | F12 | `=IF(E12="✓ Uyğun",1,IF(E12="✗ Uyğunsuz",0,""))` |
| AUDİT BLANKI | F14 | `=IF(E14="✓ Uyğun",1,IF(E14="✗ Uyğunsuz",0,""))` |
| AUDİT BLANKI | F15 | `=IF(E15="✓ Uyğun",1,IF(E15="✗ Uyğunsuz",0,""))` |
| AUDİT BLANKI | F16 | `=IF(E16="✓ Uyğun",1,IF(E16="✗ Uyğunsuz",0,""))` |
| AUDİT BLANKI | F17 | `=IF(E17="✓ Uyğun",1,IF(E17="✗ Uyğunsuz",0,""))` |
| AUDİT BLANKI | F18 | `=IF(E18="✓ Uyğun",1,IF(E18="✗ Uyğunsuz",0,""))` |
| AUDİT BLANKI | F19 | `=IF(E19="✓ Uyğun",1,IF(E19="✗ Uyğunsuz",0,""))` |
| AUDİT BLANKI | F20 | `=IF(E20="✓ Uyğun",1,IF(E20="✗ Uyğunsuz",0,""))` |
| AUDİT BLANKI | F21 | `=IF(E21="✓ Uyğun",1,IF(E21="✗ Uyğunsuz",0,""))` |
| AUDİT BLANKI | F22 | `=IF(E22="✓ Uyğun",1,IF(E22="✗ Uyğunsuz",0,""))` |
| AUDİT BLANKI | F24 | `=IF(E24="✓ Uyğun",1,IF(E24="✗ Uyğunsuz",0,""))` |
| AUDİT BLANKI | F25 | `=IF(E25="✓ Uyğun",1,IF(E25="✗ Uyğunsuz",0,""))` |
| AUDİT BLANKI | F26 | `=IF(E26="✓ Uyğun",1,IF(E26="✗ Uyğunsuz",0,""))` |
| AUDİT BLANKI | F28 | `=IF(E28="✓ Uyğun",1,IF(E28="✗ Uyğunsuz",0,""))` |
| AUDİT BLANKI | F29 | `=IF(E29="✓ Uyğun",1,IF(E29="✗ Uyğunsuz",0,""))` |
| AUDİT BLANKI | F30 | `=IF(E30="✓ Uyğun",1,IF(E30="✗ Uyğunsuz",0,""))` |
| AUDİT BLANKI | F31 | `=IF(E31="✓ Uyğun",1,IF(E31="✗ Uyğunsuz",0,""))` |
| AUDİT BLANKI | F33 | `=IF(E33="✓ Uyğun",1,IF(E33="✗ Uyğunsuz",0,""))` |
| AUDİT BLANKI | F34 | `=IF(E34="✓ Uyğun",1,IF(E34="✗ Uyğunsuz",0,""))` |
| AUDİT BLANKI | F35 | `=IF(E35="✓ Uyğun",1,IF(E35="✗ Uyğunsuz",0,""))` |
| AUDİT BLANKI | F36 | `=IF(E36="✓ Uyğun",1,IF(E36="✗ Uyğunsuz",0,""))` |
| AUDİT BLANKI | F37 | `=IF(E37="✓ Uyğun",1,IF(E37="✗ Uyğunsuz",0,""))` |
| AUDİT BLANKI | F38 | `=IF(E38="✓ Uyğun",1,IF(E38="✗ Uyğunsuz",0,""))` |
| AUDİT BLANKI | F39 | `=IF(E39="✓ Uyğun",1,IF(E39="✗ Uyğunsuz",0,""))` |
| AUDİT BLANKI | F40 | `=IF(E40="✓ Uyğun",1,IF(E40="✗ Uyğunsuz",0,""))` |
| AUDİT BLANKI | F41 | `=IF(E41="✓ Uyğun",1,IF(E41="✗ Uyğunsuz",0,""))` |
| AUDİT BLANKI | F43 | `=IF(E43="✓ Uyğun",1,IF(E43="✗ Uyğunsuz",0,""))` |
| AUDİT BLANKI | F44 | `=IF(E44="✓ Uyğun",1,IF(E44="✗ Uyğunsuz",0,""))` |
| AUDİT BLANKI | F45 | `=IF(E45="✓ Uyğun",1,IF(E45="✗ Uyğunsuz",0,""))` |
| AUDİT BLANKI | F46 | `=IF(E46="✓ Uyğun",1,IF(E46="✗ Uyğunsuz",0,""))` |
| AUDİT BLANKI | F47 | `=IF(E47="✓ Uyğun",1,IF(E47="✗ Uyğunsuz",0,""))` |
| AUDİT BLANKI | F48 | `=IF(E48="✓ Uyğun",1,IF(E48="✗ Uyğunsuz",0,""))` |
| AUDİT BLANKI | F49 | `=IF(E49="✓ Uyğun",1,IF(E49="✗ Uyğunsuz",0,""))` |
| AUDİT BLANKI | F50 | `=IF(E50="✓ Uyğun",1,IF(E50="✗ Uyğunsuz",0,""))` |
| AUDİT BLANKI | F52 | `=IF(E52="✓ Uyğun",1,IF(E52="✗ Uyğunsuz",0,""))` |
| AUDİT BLANKI | F53 | `=IF(E53="✓ Uyğun",1,IF(E53="✗ Uyğunsuz",0,""))` |
| AUDİT BLANKI | F54 | `=IF(E54="✓ Uyğun",1,IF(E54="✗ Uyğunsuz",0,""))` |
| AUDİT BLANKI | F55 | `=IF(E55="✓ Uyğun",1,IF(E55="✗ Uyğunsuz",0,""))` |
| AUDİT BLANKI | F56 | `=IF(E56="✓ Uyğun",1,IF(E56="✗ Uyğunsuz",0,""))` |
| AUDİT BLANKI | F57 | `=IF(E57="✓ Uyğun",1,IF(E57="✗ Uyğunsuz",0,""))` |
| AUDİT BLANKI | F58 | `=IF(E58="✓ Uyğun",1,IF(E58="✗ Uyğunsuz",0,""))` |
| AUDİT BLANKI | F59 | `=IF(E59="✓ Uyğun",1,IF(E59="✗ Uyğunsuz",0,""))` |
| AUDİT BLANKI | F60 | `=IF(E60="✓ Uyğun",1,IF(E60="✗ Uyğunsuz",0,""))` |
| AUDİT BLANKI | F61 | `=IF(E61="✓ Uyğun",1,IF(E61="✗ Uyğunsuz",0,""))` |
| AUDİT BLANKI | F62 | `=IF(E62="✓ Uyğun",1,IF(E62="✗ Uyğunsuz",0,""))` |
| AUDİT BLANKI | F63 | `=IF(E63="✓ Uyğun",1,IF(E63="✗ Uyğunsuz",0,""))` |
| AUDİT BLANKI | F64 | `=IF(E64="✓ Uyğun",1,IF(E64="✗ Uyğunsuz",0,""))` |
| AUDİT BLANKI | F65 | `=IF(E65="✓ Uyğun",1,IF(E65="✗ Uyğunsuz",0,""))` |
| AUDİT BLANKI | F66 | `=IF(E66="✓ Uyğun",1,IF(E66="✗ Uyğunsuz",0,""))` |
| AUDİT BLANKI | F69 | `=COUNTA(D9:D66)` |
| AUDİT BLANKI | F70 | `=COUNTIF(E9:E66,"✓ Uyğun")` |
| AUDİT BLANKI | F71 | `=COUNTIF(G9:G66,"Var")` |
| AUDİT BLANKI | F72 | `=COUNTIF(E9:E66,"N/A")` |
| AUDİT BLANKI | F73 | `=IFERROR(AVERAGE(F9:F66),"")` |
