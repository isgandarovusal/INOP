# Paket 04 — Servis auditi mənbə uyğunluğu

Baza: `52474890289f02fd987cb9c0db9c47c152336f53`. Bütün source məlumatı `Backend/config/serviceAuditSources.json`-dadır. Orijinal Excel-lər repoya əlavə edilmir.

| Brend | Worksheet (yalnız mənbə istinadı) | Bölmə | Qiymətləndirilən meyar | Əlavə mənbə sətri |
|---|---|---:|---:|---:|
| KFC | `Kfc Zoo Park` | 13 | 94 | 1 |
| Pizza Hut | `PH Fontan ` | 11 | 79 | 0 |
| Simit Sarayı | `SS ` | 10 | 61 | 0 |

Cəmi 34 bölmə, 234 qiymətləndirilən meyar və 1 bal verilməyən mənbə göstəricisi. 235 nömrələnmiş sətirin hamısı saxlanılıb. KFC B79 / 8.36 “Orta göstərici” yoxlama tələbi deyil; boş summary sətri və düstursuzdur. Optional reference qeyd sahəsi kimi saxlanır, uydurma sual və ya hesablanan orta rəqəm yaradılmır.

## Qiymətləndirmə və mənbə fərqləri

- İstifadəçi təsdiqi bütün üç brend üçün Bəli=1 / Orta=0.5 / Xeyr=0 / N/A neytral; tətbiq olunan meyarların bal cəmi / sayı × 100. Bütün N/A null-dır.
- KFC/PH-də Orta sütunu var; SS-də yoxdur. SS-yə Orta cavabı yalnız istifadəçinin açıq təsdiqinə əsasən əlavə edilib.
- Hər workbook bir worksheet-dən ibarətdir. Formula, data validation, cell comment, external link, macro və embedded image yoxdur. Cavab və qeyd/foto sütunlarının xanaları boşdur.
- Hər üç mənbədə ≥90% keçid qeydi var. Mənbə metadata-da saxlanır; təsdiqlənmiş yekun faiz kontraktına əlavə pass/fail, cərimə, ağırlıq və severity qaydası tətbiq edilmir (`passed=null`).
- KFC B67 mənfi ifadədir: “düzgün təşkil edilməyib”. Dil redaktəsində inkarı silinməyib və bal tərsinə çevrilməyib; ayrıca dəqiqləşdirilməli qeyddir.
- KFC B77 “01:15/02:00” alternativ vaxtları, SS B52 “5:45” və ayrıca vaxt meyarları mənbədəki kimi saxlanır. Yeni SLA və ya avtomatik vaxt cəmlənməsi düsturu uydurulmayıb.
- KFC B106/B115 “dolğunluq/orta dəyər” göstəricilərinin texniki açılışı mənbədə yoxdur; tərif və yeni ölçü vahidi təxmin edilməyib.
- PH-də təkrarlanan 2.11 və 11-ci bölmədə 13.x nömrələri sourceNumber olaraq saxlanır. ID-lər worksheet row əsasında unikal olduğundan meyarlar birləşdirilmir.
- Worksheet-dəki Zoo Park/Fontan adları yalnız mənbə izidir. Şablon brandId-yə bağlıdır; runtime restoranı istifadəçi mövcud GFC restoranları arasından seçir. Yeni real restoran/brend yaradılmır.

## Source hash-ləri
- KFC: `2c42c35e5eae628cb75d4a31b4d7b147601b66148f196a447943bb16f558ce49`
- Pizza Hut: `82340f5c838abcc42355a394830db7ba7424a97e0fca03b2e2745a83652de032`
- Simit Sarayı: `5ae33e9224c38bd5ff02cef91159d31531dd9cd8d67798b609739fc8b64dfa64`

## Redaktə və izləniləbilənlik

Bölmə title/sourceTitle, meyar label/sourceText, sourceCell/sourceNumber və guidance/sourceGuidance birlikdə saxlanır. Təlimatlar ayrıca sual sayılmayan Tualetlər, Qonaq 1–3/1–5 və auditoriya qruplarından gəlir. Məcburilik və şərtlər saxlanır: məsələn, KFC-də istehsal sahəsi görünəndə qiymətləndirmə və görünən içki sahəsi şərti dəyişməyib. UI idarəetmə mətnləri və cavab variantları AZ/EN/RU-dur; mənbə meyarları peşəkar Azərbaycan dilində təqdim edilir, tərcümə adı ilə yeni məna əlavə olunmur.

| Sistem ID / sourceCell | Original mətn | Peşəkar AZ təqdimatı |
|---|---|---|
| `service-kfc-s7` / B7 | İlk təəssürat | İlk təəssürat |
| `service-kfc-r8` / B8 / 1.1 | Fasad təmizdir və brend standartlarına uyğundur | Fasad təmizdir və brend standartlarına uyğundur. |
| `service-kfc-r9` / B9 / 1.2 | Ətraf ərazi təmizdir (zibil qabları və giriş zonası daxil olmaqla) | Ətraf ərazi təmizdir (zibil qabları və giriş zonası daxil olmaqla). |
| `service-kfc-r10` / B10 / 1.3 | Giriş hissəsi (qapılar, tutacaqlar, şüşələr) təmizdir və zədələr yoxdur | Giriş hissəsi (qapılar, tutacaqlar, şüşələr) təmizdir və zədələr yoxdur. |
| `service-kfc-r11` / B11 / 1.4 | Reklam materialları, lightings təmiz və saz vəziyyətdədir.  Lighting, voblerlər, lightbox menuları aktualdır | Reklam materialları, işıqlandırma avadanlıqları təmiz və saz vəziyyətdədir. İşıqlandırma, reklam göstəriciləri, işıqlı menyu lövhələri aktualdır. |
| `service-kfc-r12` / B12 / 1.5 | Dekorasiyalar və bitkilər səliqəlidir - solmayıb, dibçəyin içərisində kənar əşyalar və ya zibil yoxdur | Dekorasiyalar və bitkilər səliqəlidir - solmayıb, dibçəyin içərisində kənar əşyalar və ya zibil yoxdur. |
| `service-kfc-s13` / B13 | Texniki vəziyyət, restoranın təmizliyi və qonaqlar üçün komfort | Texniki vəziyyət, restoranın təmizliyi və qonaqların rahatlığı |
| `service-kfc-r14` / B14 / 2.1 | Döşəmə təmiz, qurudur və sürüşkən deyil | Döşəmə təmiz və qurudur, sürüşkən deyil. |
| `service-kfc-r15` / B15 / 2.2 | Zədələr yoxdur (plitə, mebel və s.) | Zədələr yoxdur (plitə, mebel və s.). |
| `service-kfc-r16` / B16 / 2.3 | Masalar hər qonaqdan sonra təmizlənir (2 dəqiqə ərzində) | Masalar hər qonaqdan sonra təmizlənir (2 dəqiqə ərzində). |
| `service-kfc-r17` / B17 / 2.4 | Zibil qabları dolu deyil (ümumi təmizlik və sazlıq qorunur) | Zibil qabları dolu deyil (ümumi təmizlik və sazlıq qorunur). |
| `service-kfc-r18` / B18 / 2.5 | İşıqlandırma tam işləkdir (yanmış lampalar yoxdur) | İşıqlandırma tam işləkdir (yanmış lampalar yoxdur). |
| `service-kfc-r19` / B19 / 2.6 | Kondisioner/ventilyasiya  təmiz və düzgün işləyir (qonaqlara birbaşa yönəlmir) | Kondisioner/ventilyasiya təmiz və düzgün işləyir (qonaqlara birbaşa yönəlmir). |
| `service-kfc-r20` / B20 / 2.7 | Həşərat və zərərvericilər və onların izləri yoxdur | Həşəratlar, zərərvericilər və onların izləri yoxdur. |
| `service-kfc-r21` / B21 / 2.8 | Pis qoxular yoxdur | Pis qoxular yoxdur. |
| `service-kfc-r22` / B22 / 2.9 | Uşaq masaları təmiz və saz vəziyyətdədir | Uşaq masaları təmiz və saz vəziyyətdədir. |
| `service-kfc-r23` / B23 / 2.10 | Komfort temperatur və fon musiqi təmin olunub | Rahat temperatur və fon musiqisi təmin olunub. |
| `service-kfc-r24` / B24 / 2.11 | Kimyəvi maddələr, süpürgələr, moplar və s. kimi əşyalar qonaq ərazisində nəzarətsiz qoyulmayıb, təmizlik otaqları bağlıdır | Kimyəvi maddələr, süpürgələr, döşəmə silən alətlər və s. kimi əşyalar qonaq ərazisində nəzarətsiz qoyulmayıb, təmizlik otaqları bağlıdır. |
| `service-kfc-r26` / B26 / 2.12 | Qapılar,döşəmələr, zibil qabları, sabun dispensorları, havalandırma və unitaz (abadoku) təmiz, saz vəziyyətdədir | Qapılar, döşəmələr, zibil qabları, sabun dispenserləri, havalandırma və unitaz (oturacağı daxil olmaqla) təmiz və saz vəziyyətdədir. |
| `service-kfc-r27` / B27 / 2.13 | Tualet kağızı və salfetlər mövcuddur | Tualet kağızı və salfetlər mövcuddur. |
| `service-kfc-r28` / B28 / 2.14 | Quruducular/dispenserlər işləyir | Quruducular/dispenserlər işləyir. |
| `service-kfc-r29` / B29 / 2.15 | Təmizlik qrafiki var və aparılır, məlumat stikerləri var və səliqəlidir | Təmizlik qrafiki mövcuddur və icra olunur; məlumat stikerləri mövcuddur və səliqəlidir. |
| `service-kfc-r30` / B30 / 2.16 | İşıqlandırma işləkdir | İşıqlandırma işləkdir. |
| `service-kfc-r31` / B31 / 2.17 | Pis qoxular yoxdur | Pis qoxular yoxdur. |
| `service-kfc-s32` / B32 | Kiosklar: | Kiosklar |
| `service-kfc-r33` / B33 / 3.1 | Təmiz və saz vəziyyətdədir, sistem donmur | Sifariş köşkü təmiz və saz vəziyyətdədir, sistem donmur. |
| `service-kfc-r34` / B34 / 3.2 | Bütün məhsullar menuya uyğundur və şəkilləri mövcuddur | Bütün məhsullar menyuya uyğundur və məhsulların şəkilləri mövcuddur. |
| `service-kfc-r35` / B35 / 3.3 | Kassadan ödəniş mümkündür, kartla ödəniş keçir | Kassada ödəniş mümkündür və kartla ödəniş həyata keçirilir. |
| `service-kfc-r36` / B36 / 3.4 | Printer işləkdir, çek lenti mövcuddur, çeklər oxunaqlıdır | Printer işləkdir, çek lenti mövcuddur, çeklər oxunaqlıdır. |
| `service-kfc-r37` / B37 / 3.5 | ƏDV stikeri mövcuddur və zədəli deyil, qonaqlara ƏDV çeki təqdim olunur | ƏDV stikeri mövcuddur, zədəsizdir və qonaqlara ƏDV çeki təqdim olunur. |
| `service-kfc-s38` / B38 | Servis zonası (piştaxta): | Xidmət sahəsi (piştaxta) |
| `service-kfc-r39` / B39 / 4.1 | Rəflər, masalar, qablar, döşəmə, isitmə avadanlıqları və s., təmizdir,   zədəsizdir | Rəflər, masalar, qablar, döşəmə, isitmə avadanlıqları və digər elementlər təmiz və zədəsizdir. |
| `service-kfc-r40` / B40 / 4.2 | İş səthləri təmiz (piştaxta, terminallar və s.) və zədəsizdir | İş səthləri (piştaxta, terminallar və s.) təmiz və zədəsizdir. |
| `service-kfc-r41` / B41 / 4.3 | Monitorlar,shelf tocker təmiz və işləkdir, aktual menu mövcuddur | Monitorlar və rəf üzərindəki məlumat lövhələri təmiz və işləkdir, menyu aktualdır. |
| `service-kfc-r42` / B42 / 4.4 | Qonaqlar üçün məlumat panosu informasiyalar aktualdır, təmizdir | Qonaqlar üçün məlumat lövhəsi təmizdir və üzərindəki məlumatlar aktualdır. |
| `service-kfc-s43` / B43 | Əməkdaşın Geyim və Görünüş Prosedurası (Şəxsi Gigiyena) | Əməkdaşın iş geyimi, xarici görünüşü və şəxsi gigiyenası |
| `service-kfc-r44` / B44 / 5.1 | Forma standartlara uyğundur (qonaq tərəfindən istehsalat görünürsə qiymətləndirilir), təmiz, ütülüdür | Forma standartlara uyğundur (qonaq tərəfindən istehsal sahəsi görünürsə qiymətləndirilir), təmiz, ütülüdür. |
| `service-kfc-r45` / B45 / 5.2 | İşçi brendə uyğun ad nişanı taxır | Əməkdaş brendə uyğun ad nişanı taxır. |
| `service-kfc-r46` / B46 / 5.3 | Hər stansiyada baş geyimi standartlara uyğundur (qonaq tərəfindən istehsalat görünürsə qiymətləndirilir), saçlar səliqəli şəkildə kepkanın (və ya bandananın) altına yığılıb | Hər stansiyada baş geyimi standartlara uyğundur (qonaq tərəfindən istehsal sahəsi görünürsə qiymətləndirilir), saçlar səliqəli şəkildə papağın (və ya bandananın) altına yığılıb. |
| `service-kfc-r47` / B47 / 5.5 | Ayaqqabılar qapalı, düz, altı rezin və qara dəridir (dabansız) | Ayaqqabılar qapalı, dabansız, düz rezin altlıqlı və qara dəridəndir. |
| `service-kfc-r48` / B48 / 5.6 | Əməkdaşlar corablarının rəngi qaradır  | Əməkdaşların corabları qara rəngdədir. |
| `service-kfc-r49` / B49 / 5.7 | Kişilər : üz qırxılı, dırnaqlar qısa və təmizdir | Kişi əməkdaşların üzü qırxılıb, dırnaqları qısa və təmizdir. |
| `service-kfc-r50` / B50 / 5.8 | Qadınlar: sadə makiyajlı, saxta kirpiklər yoxdur, dırnaqlar qısa və təmizdir | Qadın əməkdaşların makiyajı sadədir, süni kirpikləri yoxdur, dırnaqları qısa və təmizdir. |
| `service-kfc-r51` / B51 / 5.9 | Zinət əşyaları yoxdur və plasterlə gizlədilməyib (sırğa, pirsinq və s.) | Zinət əşyaları yoxdur və yapışqan sarğı ilə gizlədilməyib (sırğa, pirsinq və s.). |
| `service-kfc-s52` / B52 | Qarşılama və ünsiyyət: | Qarşılama və ünsiyyət |
| `service-kfc-r53` / B53 / 6.1 | Kassir qonağı gülər üzlə, üzünə baxaraq qarşılayır (göz təması) | Kassir qonağı gülər üzlə, üzünə baxaraq qarşılayır (göz təması). |
| `service-kfc-r54` / B54 / 6.2 | Standart ifadələr istifadə olunur : Salam, xoş gəlmisiniz / Salam, hər vaxtınız xeyir, sizə necə kömək edə bilərəm? | “Salam, xoş gəlmisiniz” və ya “Salam, hər vaxtınız xeyir, sizə necə kömək edə bilərəm?” standart ifadələrindən istifadə olunur. |
| `service-kfc-r55` / B55 / 6.3 | İşçi seçimdə kömək edir | Əməkdaş seçimdə kömək edir. |
| `service-kfc-r56` / B56 / 6.4 | Ünsiyyətcil, nəzakətli və mehribandır | Ünsiyyətcil, nəzakətli və mehribandır. |
| `service-kfc-r57` / B57 / 6.5 | Qonağa çekin üzərində olan nömrəni göstərib, gözləmə zonasına göndərib, təvil monitorundan nömrəsinə baxmağı xahiş edir | Qonağa çekdəki nömrə göstərilir, gözləmə sahəsinə keçməsi və sifarişin təhvil monitorunda nömrəsini izləməsi xahiş olunur. |
| `service-kfc-s58` / B58 | Kassa xidməti (Sales & Service): | Kassa xidməti və satış |
| `service-kfc-r59` / B59 / 7.1 | Əlavə satış təklif olunur (kombo, əlavə məhsullar və s.) | Əlavə satış təklif olunur (kombo, əlavə məhsullar və s.). |
| `service-kfc-r60` / B60 / 7.2 | Sistemlə sürətli və səfsiz işlənir, ödənişlər gecikmədən aparılır | Sistemdə sürətli və səhvsiz işlənir, ödənişlər gecikmədən aparılır. |
| `service-kfc-r61` / B61 / 7.3 | Sifariş detalları dəqiqləşdirilir | Sifariş detalları dəqiqləşdirilir. |
| `service-kfc-r62` / B62 / 7.4 | Nağd ödəniş: Pul qonağın qarşısında sayılır, böyük əskinaslar detektorda yoxlanılır və ümumi məbləğ aydın deyilir. | Nağd ödəniş: Pul qonağın qarşısında sayılır, böyük əskinaslar detektorda yoxlanılır və ümumi məbləğ aydın deyilir. |
| `service-kfc-r63` / B63 / 7.5 | Əməkdaş düzgün əlyuma prosedurlarını icra edir | Əməkdaş düzgün əl yuma prosedurlarını icra edir. |
| `service-kfc-r64` / B64 / 7.6 | Zalda yoxsa Paket olacağını soruşulur | Sifarişin zalda istifadə, yoxsa özü ilə aparmaq üçün olduğu soruşulur. |
| `service-kfc-r65` / B65 / 7.7 | Əməkdaşın məsulla bağlı bilgisi vardır | Əməkdaş məhsul barədə məlumatlıdır. |
| `service-kfc-r66` / B66 / 7.8 | Menecer və ya səlahiyyətli şəxs (təlimçi) kassada dayanıb proseslərə nəzarət edir, pik saatlarda Sİ-SO qaydasına əməl edir  | Menecer və ya səlahiyyətli şəxs (təlimçi) kassada dayanıb proseslərə nəzarət edir, pik saatlarda Sİ-SO qaydasına əməl edir. |
| `service-kfc-r67` / B67 / 7.9 | Sifariş yığan (Paker) zonası düzgün təşkil edilməyib | Sifarişi komplektləşdirən əməkdaşın iş sahəsi düzgün təşkil edilməyib. |
| `service-kfc-r68` / B68 / 7.10 | Fusion əməliyyat standartlarının icrası və rəqəmsal sistemlərin (monitorların) idarəedilməsi | Fusion əməliyyat standartlarının icrası və rəqəmsal sistemlərin (monitorların) idarə edilməsi. |
| `service-kfc-s69` / B69 | Xidmət vaxtı (KFC): | Xidmət vaxtı (KFC) |
| `service-kfc-r71` / B71 / 8.1 | Növbədə gözləmə – 2 d. | Növbədə gözləmə – 2 dəqiqə. |
| `service-kfc-r72` / B72 / 8.2 | Göz təması – 2 s. | Göz təması – 2 saniyə. |
| `service-kfc-r73` / B73 / 8.3 | Qarşılama – 5 s. | Qarşılama – 5 saniyə. |
| `service-kfc-r74` / B74 / 8.4 | Sifariş qəbulu – 30 s. | Sifariş qəbulu – 30 saniyə. |
| `service-kfc-r75` / B75 / 8.5 | Hazırlanma – 60 s. | Hazırlanma – 60 saniyə. |
| `service-kfc-r76` / B76 / 8.6 | Təqdim – 15 saniyə | Təqdim – 15 saniyə. |
| `service-kfc-r77` / B77 / 8.7 | Ümumi vaxt – 01:15/02:00 | Ümumi vaxt – 01:15/02:00. |
| `service-kfc-r78` / B78 / 8.8 | Sifariş tam təqdim olunur | Sifariş tam təqdim olunur. |
| `service-kfc-s80` / B80 | Sifarişin yığılması | Sifarişin yığılması |
| `service-kfc-r81` / B81 / 9.1 | Yığılma ardıcıllığı qorunur: Ləvazimatlar → İçki → İsti yeməklər → Desert → Kartof fri | Yığılma ardıcıllığı qorunur: Ləvazimatlar → İçki → İsti yeməklər → Desert → Kartof fri. |
| `service-kfc-r82` / B82 / 9.2 | İsti və soyuq sahələr qaydası tətbiq edilir  | İsti və soyuq sahələr qaydası tətbiq edilir. |
| `service-kfc-r83` / B83 / 9.3 | Bütün loqotiplər (o cümlədən padnos üzərindəki flayer) qonağa tərəf qoyulur | Bütün loqotiplər (o cümlədən sini üzərindəki reklam vərəqi) qonağa tərəf qoyulur. |
| `service-kfc-r84` / B84 / 9.4 | Ləvazimatlar qonağın sağ əlinə yaxın yerdə, padnosun küncündə yerləşdirilir | Ləvazimatlar qonağın sağ əlinə yaxın yerdə, sinin küncündə yerləşdirilir. |
| `service-kfc-r85` / B85 / 9.5 | İçki stəkanının kənarlarına toxunulmur (əgər içki zonası görünürsə) | İçki stəkanının kənarlarına toxunulmur (əgər içki zonası görünürsə). |
| `service-kfc-r86` / B86 / 9.6 | Ləvazimatlar sifarişə uyğun sayda və qaydada qoyulur | Ləvazimatlar sifarişə uyğun sayda və qaydada qoyulur. |
| `service-kfc-s87` / B87 | Məhsul keyfiyyəti: | Məhsul keyfiyyəti |
| `service-kfc-r88` / B88 / 10.1 | Məhsul standartlara uyğundur, təqdimat səliqəlidir, yeməklər isti təqdim olunur | Məhsul standartlara uyğundur, təqdimat səliqəlidir, yeməklər isti təqdim olunur. |
| `service-kfc-r89` / B89 / 10.2 | Bütün məhsulların qablaşdırılması təmizdir, standartlara uyğundur, yağ ləkələri yoxdur, qutular bağlı şəkildə təqdim olunur | Bütün məhsulların qablaşdırılması təmizdir, standartlara uyğundur, yağ ləkələri yoxdur, qutular bağlı şəkildə təqdim olunur. |
| `service-kfc-r90` / B90 / 10.3 | Porsiya standartlarına əməl olunur | Porsiya standartlarına əməl olunur. |
| `service-kfc-s91` / B91 | Təqdim edən (Prezentor): | Sifarişi təqdim edən əməkdaş |
| `service-kfc-r92` / B92 / 11.1 | Sifarişin çek üzrə tamlığı və düzgünlüyü yoxlanılaraq, qonaq sifarişi təhvil almaq üçün piştaxtaya (və ya təhvil vermə zonasına) dəvət olunur | Sifarişin çek üzrə tamlığı və düzgünlüyü yoxlanılaraq, qonaq sifarişi təhvil almaq üçün piştaxtaya (və ya təhvil vermə zonasına) dəvət olunur. |
| `service-kfc-r93` / B93 / 11.2 | İfadədən istifadə edir: “Mən şəxsən sizin sifarişinizi yoxladım. Buyurun, nuş olsun.” | “Mən şəxsən sizin sifarişinizi yoxladım. Buyurun, nuş olsun” ifadəsindən istifadə olunur. |
| `service-kfc-s94` / B94 | Daxili Kamunikasiya və Onlayn Reputasiya  | Daxili kommunikasiya və onlayn nüfuz |
| `service-kfc-r95` / B95 / 12.1 | Listens lövhəsi doldurulur və işçilərin məlumatı var | Listens lövhəsi doldurulur və əməkdaşlar məlumatlıdırlar. |
| `service-kfc-r96` / B96 / 12.2 | Satış hədəfləri geyd olunduğu lövhə mövcuddur və geydlər var | Satış hədəfləri üçün məlumat lövhəsi mövcuddur və hədəflər orada qeyd olunur. |
| `service-kfc-r97` / B97 / 12.3 | Google və s. reytinqinin dinamikası | Google və digər platformalardakı reytinqlərin dinamikası. |
| `service-kfc-r98` / B98 / 12.4 | Qonaqpərvərlik və Atmosfer (Hospitality / Guest Experience) | Qonaqpərvərlik, atmosfer və qonaq təcrübəsi. |
| `service-kfc-s99` / B99 | İşçilərə əlavə suallar | Əməkdaşlara əlavə suallar |
| `service-kfc-r100` / B100 / 13.1 | Şikayətlər hansı mənbədən gəlir?     | Şikayətlər hansı mənbələrdən daxil olur? |
| `service-kfc-r101` / B101 / 13.2 | Gələn mənfi rəylər nə ilə bağlıdır?  | Daxil olan mənfi rəylər nə ilə bağlıdır? |
| `service-kfc-r102` / B102 / 13.3 | Bunlar harada qeyd olunur (Listens, bizim xəbərlər lövhəsi) | Bunlar harada qeyd olunur (Listens, bizim xəbərlər lövhəsi). |
| `service-kfc-r103` / B103 / 13.4 | Menecer PLEASE proseduru bilir | Menecer PLEASE prosedurunu bilir. |
| `service-kfc-r104` / B104 / 13.5 | Satış (DP) üzrə hədəfləri bilir? | Satış (DP) üzrə hədəfləri bilir? |
| `service-kfc-r105` / B105 / 13.6 | Orta çek üzrə hədəfləri bilir? | Orta çek üzrə hədəfləri bilir? |
| `service-kfc-r106` / B106 / 13.7 | İşçi dolğunluğ/orta dəyər üzrə hədəfləri bilir? | Əməkdaş dolğunluq və orta dəyər üzrə hədəfləri bilirmi? |
| `service-kfc-r107` / B107 / 13.8 | Reytinqləri smen/gün bilir | Növbə və gün üzrə reytinqləri bilir. |
| `service-kfc-r108` / B108 / 13.9 | Yeniliklərdən və aksiyalardan məlumatlıdır | Yeniliklər və kampaniyalar barədə məlumatlıdır. |
| `service-kfc-r110` / B110 / 13.10 | KFC abreviaturiyası nə deməkdir? | KFC qısaltması nə deməkdir? |
| `service-kfc-r111` / B111 / 13.11 | Brendi kim yaradıb? | Brendi kim yaradıb? |
| `service-kfc-r112` / B112 / 13.12 | KFC-nin ən populyar üç yeməyini qeyd edin | KFC-nin ən populyar üç yeməyini qeyd edin. |
| `service-kfc-r113` / B113 / 13.13 | Satış (DP) üzrə hədəfləri bilir? | Satış (DP) üzrə hədəfləri bilir? |
| `service-kfc-r114` / B114 / 13.14 | Orta çek üzrə hədəfləri bilir? | Orta çek üzrə hədəfləri bilir? |
| `service-kfc-r115` / B115 / 13.15 | İşçi dolğunluğ/orta dəyər üzrə hədəfləri bilir? | Əməkdaş dolğunluq və orta dəyər üzrə hədəfləri bilirmi? |
| `service-kfc-r116` / B116 / 13.16 | Reytinqləri smen/gün bilir | Növbə və gün üzrə reytinqləri bilir. |
| `service-kfc-r117` / B117 / 13.17 | Yeniliklərdən və aksiyalardan məlumatlıdır | Yeniliklər və kampaniyalar barədə məlumatlıdır. |
| `service-kfc-r79` / B79 | Orta göstərici: | Orta göstərici — bal verilmir |
| `service-pizza-hut-s7` / B7 | İlk təəssürat | İlk təəssürat |
| `service-pizza-hut-r8` / B8 / 1.1 | Fasad təmizdir və brend standartlarına uyğundur | Fasad təmizdir və brend standartlarına uyğundur. |
| `service-pizza-hut-r9` / B9 / 1.2 | Ətraf ərazi təmizdir (zibil qabları və giriş zonası daxil olmaqla) | Ətraf ərazi təmizdir (zibil qabları və giriş zonası daxil olmaqla). |
| `service-pizza-hut-r10` / B10 / 1.3 | Giriş hissəsi (qapılar, tutacaqlar, şüşələr) təmizdir | Giriş hissəsi (qapılar, tutacaqlar, şüşələr) təmizdir. |
| `service-pizza-hut-r11` / B11 / 1.4 | Reklam materialları, lightings təmiz və saz vəziyyətdədir | Reklam materialları, işıqlandırma avadanlıqları təmiz və saz vəziyyətdədir. |
| `service-pizza-hut-r12` / B12 / 1.5 | Dekorasiyalar və güllər səliqəlidir - solmayıb, dibçəyin içərisində kənar əşyalar və ya zibil yoxdur, təmizdir | Dekorasiyalar və güllər səliqəlidir - solmayıb, dibçəyin içərisində kənar əşyalar və ya zibil yoxdur, təmizdir. |
| `service-pizza-hut-s13` / B13 | Texniki vəziyyət, restoranın təmizliyi və qonaqlar üçün komfort | Texniki vəziyyət, restoranın təmizliyi və qonaqların rahatlığı |
| `service-pizza-hut-r14` / B14 / 2.1 | Döşəmə təmiz, qurudur və sürüşkən deyil | Döşəmə təmiz və qurudur, sürüşkən deyil. |
| `service-pizza-hut-r15` / B15 / 2.2 | Mebel, şüşə arakəsmələr və interyer elementləri təmizdir, zədələr yoxdur (plitə, mebel və s.) | Mebel, şüşə arakəsmələr və interyer elementləri təmizdir; plitə, mebel və digər elementlərdə zədə yoxdur. |
| `service-pizza-hut-r16` / B16 / 2.3 | Masalar hər qonaqdan sonra təmizlənir (2 dəqiqə ərzində) | Masalar hər qonaqdan sonra təmizlənir (2 dəqiqə ərzində). |
| `service-pizza-hut-r17` / B17 / 2.4 | Zibil qabları dolu deyil (ümumi təmizlik və sazlıq qorunur) | Zibil qabları dolu deyil (ümumi təmizlik və sazlıq qorunur). |
| `service-pizza-hut-r18` / B18 / 2.5 | İşıqlandırma tam işləkdir (yanmış lampalar yoxdur), təmizdir | İşıqlandırma avadanlıqları təmiz və tam işləkdir; yanmış lampa yoxdur. |
| `service-pizza-hut-r19` / B19 / 2.6 | Kondisioner/ventilyasiya  təmiz və düzgün işləyir (qonaqlara birbaşa yönəlmir) | Kondisioner/ventilyasiya təmiz və düzgün işləyir (qonaqlara birbaşa yönəlmir). |
| `service-pizza-hut-r20` / B20 / 2.7 | Həşərat və zərərvericilər və onların izləri yoxdur | Həşəratlar, zərərvericilər və onların izləri yoxdur. |
| `service-pizza-hut-r21` / B21 / 2.8 | Pis qoxular yoxdur | Pis qoxular yoxdur. |
| `service-pizza-hut-r22` / B22 / 2.9 | Uşaq masaları təmiz və saz vəziyyətdədir | Uşaq masaları təmiz və saz vəziyyətdədir. |
| `service-pizza-hut-r23` / B23 / 2.10 | Komfort temperatur və fon musiqi təmin olunub | Rahat temperatur və fon musiqisi təmin olunub. |
| `service-pizza-hut-r24` / B24 / 2.11 | Kimyəvi maddələr, süpürgələr, moplar və s. kimi əşyalar qonaq ərazisində nəzarətsiz qoyulmayıb, təmizlik otaqları bağlıdır | Kimyəvi maddələr, süpürgələr, döşəmə silən alətlər və s. kimi əşyalar qonaq ərazisində nəzarətsiz qoyulmayıb, təmizlik otaqları bağlıdır. |
| `service-pizza-hut-r26` / B26 / 2.11 | Döşəmələr, zibil qabları, sabun dispensorları, havalandırma və s. təmiz, saz vəziyyətdədir | Döşəmələr, zibil qabları, sabun dispenserləri, havalandırma və s. təmiz, saz vəziyyətdədir. |
| `service-pizza-hut-r27` / B27 / 2.12 | Tualet kağızı və salfetlər mövcuddur | Tualet kağızı və salfetlər mövcuddur. |
| `service-pizza-hut-r28` / B28 / 2.13 | Quruducular/dispenserlər işləyir | Quruducular/dispenserlər işləyir. |
| `service-pizza-hut-r29` / B29 / 2.14 | Təmizlik qrafiki var və aparılır, məlumat stikerləri var və səliqəlidir | Təmizlik qrafiki mövcuddur və icra olunur; məlumat stikerləri mövcuddur və səliqəlidir. |
| `service-pizza-hut-r30` / B30 / 2.15 | İşıqlandırma işləkdir | İşıqlandırma işləkdir. |
| `service-pizza-hut-r31` / B31 / 2.16 | Pis qoxular yoxdur | Pis qoxular yoxdur. |
| `service-pizza-hut-s32` / B32 | Servis zonası (piştaxta): | Xidmət sahəsi (piştaxta) |
| `service-pizza-hut-r33` / B33 / 3.1 | Rəflər, masalar, qablar, döşəmə və isitmə avadanlıqları təmizdir | Rəflər, masalar, qablar, döşəmə və isitmə avadanlıqları təmizdir. |
| `service-pizza-hut-r34` / B34 / 3.2 | İş səthləri təmiz və zədəsizdir | İş səthləri təmiz və zədəsizdir. |
| `service-pizza-hut-r35` / B35 / 3.3 | Monitorlar,shelf tocker təmiz və işləkdir, aktual menu mövcuddur | Monitorlar və rəf üzərindəki məlumat lövhələri təmiz və işləkdir, menyu aktualdır. |
| `service-pizza-hut-r36` / B36 / 3.4 | Qonaqlar üçün məlumat panosu informasiyalar aktualdır, təmizdir | Qonaqlar üçün məlumat lövhəsi təmizdir və üzərindəki məlumatlar aktualdır. |
| `service-pizza-hut-s37` / B37 | Əməkdaşın Geyim və Görünüş Prosedurası (Şəxsi Gigiyena) | Əməkdaşın iş geyimi, xarici görünüşü və şəxsi gigiyenası |
| `service-pizza-hut-r38` / B38 / 4.1 | Forma təmiz və ütülüdür | Forma təmiz və ütülüdür. |
| `service-pizza-hut-r39` / B39 / 4.2 | İşçi brendə uyğun ad nişanı taxır | Əməkdaş brendə uyğun ad nişanı taxır. |
| `service-pizza-hut-r40` / B40 / 4.3 | Baş geyimi standartlara uyğundur | Baş geyimi standartlara uyğundur. |
| `service-pizza-hut-r41` / B41 / 4.4 | Ayaqqabılar qapalı, qara dəridir (dabansız), qara rəngli corablar geyinirlər | Ayaqqabılar qapalı, dabansız və qara dəridəndir; corablar qara rəngdədir. |
| `service-pizza-hut-r42` / B42 / 4.5 | Kişilər: üz qırxılı, dırnaqlar qısa və təmizdir | Kişi əməkdaşların üzü qırxılıb, dırnaqları qısa və təmizdir. |
| `service-pizza-hut-r43` / B43 / 4.6 | Qadınlar: sadə makiyaja icazə verilir, saxta kirpiklər yoxdur, dırnaqlar qısa və təmizdir | Qadın əməkdaşlara sadə makiyaja icazə verilir; süni kirpiklər yoxdur, dırnaqlar qısa və təmizdir. |
| `service-pizza-hut-r44` / B44 / 4.7 | Zinət əşyaları yoxdur (sırğa, pirsinq və s.) | Zinət əşyaları yoxdur (sırğa, pirsinq və s.). |
| `service-pizza-hut-s45` / B45 | Qarşılama və ünsiyyət: | Qarşılama və ünsiyyət |
| `service-pizza-hut-r46` / B46 / 5.1 | Kassir qonağı gülər üzlə, üzünə baxaraq qarşılayır ( göz təması) | Kassir qonağı gülər üzlə, üzünə baxaraq qarşılayır (göz təması). |
| `service-pizza-hut-r47` / B47 / 5.2 | Standart ifadələr istifadə olunur : Salam, xoş gəlmisiniz / Salam, hər vaxtınız xeyir, sizə necə kömək edə bilərəm? | “Salam, xoş gəlmisiniz” və ya “Salam, hər vaxtınız xeyir, sizə necə kömək edə bilərəm?” standart ifadələrindən istifadə olunur. |
| `service-pizza-hut-r48` / B48 / 5.3 | İşçi təşəbbüs göstərir (seçimdə kömək edir) | Əməkdaş təşəbbüs göstərir (seçimdə kömək edir). |
| `service-pizza-hut-r49` / B49 / 5.4 | Ünsiyyət nəzakətli və mehribandır | Ünsiyyət nəzakətli və mehribandır. |
| `service-pizza-hut-s50` / B50 | Kassa xidməti (Sales & Service): | Kassa xidməti və satış |
| `service-pizza-hut-r51` / B51 / 6.1 | Əlavə satış təklif olunur (kombo, əlavə məhsullar və s.) | Əlavə satış təklif olunur (kombo, əlavə məhsullar və s.). |
| `service-pizza-hut-r52` / B52 / 6.2 | Sistem qüsursuz və sürətli işləyir | Sistem qüsursuz və sürətli işləyir. |
| `service-pizza-hut-r53` / B53 / 6.3 | Sifariş detalları dəqiqləşdirilir | Sifariş detalları dəqiqləşdirilir. |
| `service-pizza-hut-r54` / B54 / 6.4 | Nağd ödəniş: Pul qonağın qarşısında sayılır, böyük əskinaslar detektorda yoxlanılır və ümumi məbləğ aydın deyilir. | Nağd ödəniş: Pul qonağın qarşısında sayılır, böyük əskinaslar detektorda yoxlanılır və ümumi məbləğ aydın deyilir. |
| `service-pizza-hut-r55` / B55 / 6.5 | Əməkdaş düzgün əlyuma prosedurlarını icra edir | Əməkdaş düzgün əl yuma prosedurlarını icra edir. |
| `service-pizza-hut-r56` / B56 / 6.6 | Zalda yoxsa Paket olacağını soruşulur | Sifarişin zalda istifadə, yoxsa özü ilə aparmaq üçün olduğu soruşulur. |
| `service-pizza-hut-r57` / B57 / 6.7 | Əməkdaşın məhsulla bağlı bilgisi vardır | Əməkdaş məhsul barədə məlumatlıdır. |
| `service-pizza-hut-r58` / B58 / 6.8 | Ödəniş üsulunu soruşur (nağd yoxsa kart) | Ödəniş üsulu soruşulur: nağd, yoxsa kartla. |
| `service-pizza-hut-s59` / B59 | Xidmət vaxtı (Pizza Hut): | Xidmət vaxtı (Pizza Hut) |
| `service-pizza-hut-r61` / B61 / 7.1 | Sifariş qəbulu – 75 saniyə | Sifariş qəbulu – 75 saniyə. |
| `service-pizza-hut-r62` / B62 / 7.2 | Hazırlama – 9 dəqiqə 30 saniyə | Hazırlama – 9 dəqiqə 30 saniyə. |
| `service-pizza-hut-r63` / B63 / 7.3 | Təqdim – 60 saniyə | Təqdim – 60 saniyə. |
| `service-pizza-hut-r64` / B64 / 7.4 | Ümumi vaxt – 14 dəqiqə | Ümumi vaxt – 14 dəqiqə. |
| `service-pizza-hut-s65` / B65 | Sifarişin yığılması | Sifarişin yığılması |
| `service-pizza-hut-r66` / B66 / 8.1 | Yığılma ardıcıllığı qorunur: Ləvazimatlar → İçki → İsti yeməklər → Desert → Kartof fri | Yığılma ardıcıllığı qorunur: Ləvazimatlar → İçki → İsti yeməklər → Desert → Kartof fri. |
| `service-pizza-hut-r67` / B67 / 8.2 | İsti və soyuq sahələr qaydası tətbiq edilir  | İsti və soyuq sahələr qaydası tətbiq edilir. |
| `service-pizza-hut-r68` / B68 / 8.3 | Bütün loqotiplər (o cümlədən padnos üzərindəki flayer) qonağa tərəf qoyulur | Bütün loqotiplər (o cümlədən sini üzərindəki reklam vərəqi) qonağa tərəf qoyulur. |
| `service-pizza-hut-r69` / B69 / 8.4 | Ləvazimatlar qonağın sağ əlinə yaxın yerdə, padnosun küncündə yerləşdirilir | Ləvazimatlar qonağın sağ əlinə yaxın yerdə, sinin küncündə yerləşdirilir. |
| `service-pizza-hut-r70` / B70 / 8.5 | İçki stəkanının kənarlarına (içilən hissəsinə) toxunulmur | İçki stəkanının kənarlarına (içilən hissəsinə) toxunulmur. |
| `service-pizza-hut-r71` / B71 / 8.6 | Ləvazimatlar sifarişə uyğun sayda və qaydada qoyulur | Ləvazimatlar sifarişə uyğun sayda və qaydada qoyulur. |
| `service-pizza-hut-r72` / B72 / 8.7 | Sifarişin təhvil etdikdə çek üzrə yoxlayır | Sifariş təhvil verilərkən çek üzrə yoxlanılır. |
| `service-pizza-hut-s73` / B73 | Məhsul keyfiyyəti və Pizzanın görünüş standartlara uyğun olması: | Məhsulun keyfiyyəti və pizzanın görünüşünün standartlara uyğunluğu |
| `service-pizza-hut-r74` / B74 / 9.1 | Məhsul standartlara uyğundur, yeməklər isti təqdim olunur | Məhsul standartlara uyğundur, yeməklər isti təqdim olunur. |
| `service-pizza-hut-r75` / B75 / 9.2 | Sifariş düzgün yığılır, düzgün qablaşdırma istifadə olunur | Sifariş düzgün yığılır, düzgün qablaşdırma istifadə olunur. |
| `service-pizza-hut-r76` / B76 / 9.3 | Məhsul səliqəli hazırlanır, sifarişdə çatışmazlıq yoxdur | Məhsul səliqəli hazırlanır, sifarişdə çatışmazlıq yoxdur. |
| `service-pizza-hut-r77` / B77 / 9.4 | Bortlar təmizdir (yanmayıb, bortların üzərinə sous yayılmayıb) | Pizzanın kənarları təmizdir: yanmayıb və üzərinə sous yayılmayıb. |
| `service-pizza-hut-r78` / B78 / 9.5 | Xəmir çiy qalmayıb, pizzanın üzərində olan pendir yanmayıb | Xəmir çiy qalmayıb, pizzanın üzərində olan pendir yanmayıb. |
| `service-pizza-hut-s79` / B79 | İşçilər üçün məlumat: | Əməkdaşlar üçün məlumat |
| `service-pizza-hut-r80` / B80 / 10.1 | Ges lövhəsi doldurulur və işçilərin məlumatı var | GES lövhəsi doldurulur və əməkdaşlar məlumatlıdırlar. |
| `service-pizza-hut-r81` / B81 / 10.2 | Satış hədəfləri geyd olunduğu lövhə mövcuddur və geydlər var | Satış hədəfləri üçün məlumat lövhəsi mövcuddur və hədəflər orada qeyd olunur. |
| `service-pizza-hut-r82` / B82 / 10.3 | Google və s. reytinqinin dinamikası | Google və digər platformalardakı reytinqlərin dinamikası. |
| `service-pizza-hut-r83` / B83 / 10.4 | Qonaqpərvərlik və Atmosfer (Hospitality / Guest Experience) | Qonaqpərvərlik, atmosfer və qonaq təcrübəsi. |
| `service-pizza-hut-s84` / B84 | İşçilərə əlavə suallar | Əməkdaşlara əlavə suallar |
| `service-pizza-hut-r86` / B86 / 11.1 | Şikayətlər hansı mənbədən gəlir?     | Şikayətlər hansı mənbələrdən daxil olur? |
| `service-pizza-hut-r87` / B87 / 11.2 | Gələn mənfi rəylər nə ilə bağlıdır?  | Daxil olan mənfi rəylər nə ilə bağlıdır? |
| `service-pizza-hut-r88` / B88 / 11.3 | Bunlar harada qeyd olunur (Ges, bizim xəbərlər lövhəsi) | Bunlar harada qeyd olunur (GES, bizim xəbərlər lövhəsi). |
| `service-pizza-hut-r89` / B89 / 11.4 | Menecer LASTER proseduru bilir | Menecer LASTER prosedurunu bilir. |
| `service-pizza-hut-r90` / B90 / 11.5 | Satış (DP) üzrə hədəfləri bilir? | Satış (DP) üzrə hədəfləri bilir? |
| `service-pizza-hut-r91` / B91 / 13.6 | Orta çek üzrə hədəfləri bilir? | Orta çek üzrə hədəfləri bilir? |
| `service-pizza-hut-r92` / B92 / 13.8 | Reytinqləri smen/ay bilir | Növbə və ay üzrə reytinqləri bilir. |
| `service-pizza-hut-r93` / B93 / 13.9 | Yeniliklərdən və aksiyalardan məlumatlıdır | Yeniliklər və kampaniyalar barədə məlumatlıdır. |
| `service-pizza-hut-r95` / B95 / 11.6 | Brendi kim yaradıb? | Brendi kim yaradıb? |
| `service-pizza-hut-r96` / B96 / 11.7 | PH ən populyar üç yeməyini qeyd edin | Pizza Hut-ın ən populyar üç yeməyini qeyd edin. |
| `service-pizza-hut-r97` / B97 / 11.8 | İşçilər satış (DP) üzrə hədəfləri bilirlərmi? | Əməkdaşlar satış (DP) üzrə hədəfləri bilirlərmi? |
| `service-pizza-hut-r98` / B98 / 11.9 | Orta çek üzrə hədəfləri bilir? | Orta çek üzrə hədəfləri bilir? |
| `service-pizza-hut-r99` / B99 / 11.10 | Reytinqləri smen/ay bilir | Növbə və ay üzrə reytinqləri bilir. |
| `service-pizza-hut-r100` / B100 / 11.11 | Yeniliklərdən və aksiyalardan məlumatlıdır | Yeniliklər və kampaniyalar barədə məlumatlıdır. |
| `service-simit-sarayi-s4` / B4 | İlk təəssürat | İlk təəssürat |
| `service-simit-sarayi-r5` / B5 / 1.1 | Fasad təmizdir və brend standartlarına uyğundur | Fasad təmizdir və brend standartlarına uyğundur. |
| `service-simit-sarayi-r6` / B6 / 1.2 | Ətraf ərazi təmizdir (zibil qabları və giriş zonası daxil olmaqla) | Ətraf ərazi təmizdir (zibil qabları və giriş zonası daxil olmaqla). |
| `service-simit-sarayi-r7` / B7 / 1.3 | Giriş hissəsi (qapılar, tutacaqlar, şüşələr) təmizdir | Giriş hissəsi (qapılar, tutacaqlar, şüşələr) təmizdir. |
| `service-simit-sarayi-r8` / B8 / 1.4 | Reklam materialları, lightings təmiz və saz vəziyyətdədir | Reklam materialları, işıqlandırma avadanlıqları təmiz və saz vəziyyətdədir. |
| `service-simit-sarayi-r9` / B9 / 1.5 | Dekorasiyalar və güllər səliqəlidir - solmayıb, dibçəyin içərisində kənar əşyalar və ya zibil yoxdur, təmizdir | Dekorasiyalar və güllər səliqəlidir - solmayıb, dibçəyin içərisində kənar əşyalar və ya zibil yoxdur, təmizdir. |
| `service-simit-sarayi-s10` / B10 | Texniki vəziyyət, restoranın təmizliyi və qonaqlar üçün komfort | Texniki vəziyyət, restoranın təmizliyi və qonaqların rahatlığı |
| `service-simit-sarayi-r11` / B11 / 2.1 | Döşəmə təmiz, qurudur və sürüşkən deyil | Döşəmə təmiz və qurudur, sürüşkən deyil. |
| `service-simit-sarayi-r12` / B12 / 2.2 | Mebel, şüşə arakəsmələr və interyer elementləri təmizdir, zədələr yoxdur (plitə, mebel və s.) | Mebel, şüşə arakəsmələr və interyer elementləri təmizdir; plitə, mebel və digər elementlərdə zədə yoxdur. |
| `service-simit-sarayi-r13` / B13 / 2.3 | Masalar hər qonaqdan sonra təmizlənir | Masalar hər qonaqdan sonra təmizlənir. |
| `service-simit-sarayi-r14` / B14 / 2.4 | Zibil qabları dolu deyil (ümumi təmizlik və sazlıq qorunur) | Zibil qabları dolu deyil (ümumi təmizlik və sazlıq qorunur). |
| `service-simit-sarayi-r15` / B15 / 2.5 | İşıqlandırma tam işləkdir (yanmış lampalar yoxdur), təmizdir | İşıqlandırma avadanlıqları təmiz və tam işləkdir; yanmış lampa yoxdur. |
| `service-simit-sarayi-r16` / B16 / 2.6 | Kondisioner/ventilyasiya  təmiz və düzgün işləyir (qonaqlara birbaşa yönəlmir) | Kondisioner/ventilyasiya təmiz və düzgün işləyir (qonaqlara birbaşa yönəlmir). |
| `service-simit-sarayi-r17` / B17 / 2.7 | Həşərat və zərərvericilər və onların izləri yoxdur | Həşəratlar, zərərvericilər və onların izləri yoxdur. |
| `service-simit-sarayi-r18` / B18 / 2.8 | Pis qoxular yoxdur | Pis qoxular yoxdur. |
| `service-simit-sarayi-r19` / B19 / 2.9 | Komfort temperatur və fon musiqi təmin olunub | Rahat temperatur və fon musiqisi təmin olunub. |
| `service-simit-sarayi-r20` / B20 / 2.10 | Kimyəvi maddələr, süpürgələr, moplar və s. kimi əşyalar qonaq ərazisində nəzarətsiz qoyulmayıb | Kimyəvi maddələr, süpürgələr, döşəmə silən alətlər və s. kimi əşyalar qonaq ərazisində nəzarətsiz qoyulmayıb. |
| `service-simit-sarayi-s21` / B21 | Servis zonası (piştaxta/vitrin): | Xidmət sahəsi (piştaxta və vitrin) |
| `service-simit-sarayi-r22` / B22 / 3.1 | Paketləmə zonası səliqəlidir və təmizdir | Paketləmə zonası səliqəlidir və təmizdir. |
| `service-simit-sarayi-r23` / B23 / 3.2 | Rəflər, masalar, qablar, servant və isitmə avadanlıqları təmizdir | Rəflər, masalar, qablar, servis dolabı və isitmə avadanlıqları təmizdir. |
| `service-simit-sarayi-r24` / B24 / 3.3 | Monitorlar təmiz və işləkdir, aktual menyu göstərilir | Monitorlar təmiz və işləkdir, aktual menyu göstərilir. |
| `service-simit-sarayi-r25` / B25 / 3.4 | Vitrində qiymətlərin mövcudluğu və düzgünlüyü təmin olunur | Vitrində qiymətlərin mövcudluğu və düzgünlüyü təmin olunur. |
| `service-simit-sarayi-r26` / B26 / 3.5 | Kassa qarşısındakı kondimentlar tamdır (şəkər, salfetka və s.) | Kassanın qarşısında şəkər, salfet və digər təqdimat ləvazimatları tamdır. |
| `service-simit-sarayi-s27` / B27 | Əməkdaşın Geyim və Görünüş Prosedurası (Şəxsi Gigiyena) | Əməkdaşın iş geyimi, xarici görünüşü və şəxsi gigiyenası |
| `service-simit-sarayi-r28` / B28 / 4.1 | Forma təmiz və ütülüdür, brendə uyğun ad nişanı taxır | İş geyimi təmiz və ütülüdür, əməkdaş brendə uyğun ad nişanı taxır. |
| `service-simit-sarayi-r29` / B29 / 4.2 | Dırnaqlar qısa və təmizdir; dırnaq boyası, saxta dırnaqlar və yapışdırmalar yoxdur. | Dırnaqlar qısa və təmizdir; dırnaq boyası, saxta dırnaqlar və yapışdırmalar yoxdur. |
| `service-simit-sarayi-r30` / B30 / 4.3 | Ayaqqabılar qapalı, qara dəridir (dabansız), qara rəngli corablar geyinirlər | Ayaqqabılar qapalı, dabansız və qara dəridəndir; corablar qara rəngdədir. |
| `service-simit-sarayi-r31` / B31 / 4.4 | Saçlar səliqəlidir, saat, pirsinq və digər aksesuarlar yoxdur  | Saçlar səliqəlidir, saat, pirsinq və digər aksesuarlar yoxdur. |
| `service-simit-sarayi-r32` / B32 / 4.5 | Mətbəx əməkdaşları iş geyimi və kalpakla işləyir. | Mətbəx əməkdaşları iş geyimi və aşpaz papağı ilə işləyirlər. |
| `service-simit-sarayi-r33` / B33 / 4.6 | İş zamanı mətbəx sahəsində saqqız çeynənilmir | İş zamanı mətbəxdə saqqız çeynənilmir. |
| `service-simit-sarayi-r34` / B34 / 4.7 | Əməkdaş düzgün əlyuma prosedurlarını icra edir | Əməkdaş düzgün əl yuma prosedurlarını icra edir. |
| `service-simit-sarayi-s35` / B35 | Dəzgah Xidmət Addımları (Vitrin Xidməti) | Piştaxta və vitrin üzrə xidmət addımları |
| `service-simit-sarayi-r36` / B36 / 5.1 | Standart ifadələr istifadə olunur : Salam, xoş gəlmisiniz | “Salam, xoş gəlmisiniz” standart qarşılama ifadəsindən istifadə olunur. |
| `service-simit-sarayi-r37` / B37 / 5.2 | Zalda yoxsa Paket olacağını soruşulur | Sifarişin zalda istifadə, yoxsa özü ilə aparmaq üçün olduğu soruşulur. |
| `service-simit-sarayi-r38` / B38 / 5.3 | Məsulun isidib doğranılmasını soroşulur | Qonaqdan məhsulun isidilməsini və doğranmasını istəyib-istəmədiyi soruşulur. |
| `service-simit-sarayi-r39` / B39 / 5.4 | Əməkdaşın məsulla bağlı bilgisi vardır | Əməkdaş məhsul barədə məlumatlıdır. |
| `service-simit-sarayi-s40` / B40 | Kassa Xidmət Addımları | Kassa üzrə xidmət addımları |
| `service-simit-sarayi-r41` / B41 / 6.1 | Standart ifadələr istifadə olunur : Salam, xoş gəlmisiniz | “Salam, xoş gəlmisiniz” standart qarşılama ifadəsindən istifadə olunur. |
| `service-simit-sarayi-r42` / B42 / 6.2 | Kassir qonağı gülər üzlə, üzünə baxaraq qarşılayır ( göz təması) | Kassir qonağı gülər üzlə, üzünə baxaraq qarşılayır (göz təması). |
| `service-simit-sarayi-r43` / B43 / 6.3 | Sifariş dərhal, tam və səhvsiz qəbul edib, təkrar edir | Sifariş dərhal, tam və səhvsiz qəbul edilir və qonağa təkrar deyilir. |
| `service-simit-sarayi-r44` / B44 / 6.4 | Kassada tövsiyə satış edilir (məsələn: kiçik çayı böyüyə çevirmə, kassa önü stendindən məhsul təklifi). | Kassada əlavə satış təklif olunur (məsələn, kiçik çay əvəzinə böyük çay və ya kassa qarşısındakı stenddən məhsul təklifi). |
| `service-simit-sarayi-r45` / B45 / 6.5 | Nağd ödəniş: Pul qonağın qarşısında sayılır, böyük əskinaslar detektorda yoxlanılır və ümumi məbləğ aydın deyilir. | Nağd ödəniş: Pul qonağın qarşısında sayılır, böyük əskinaslar detektorda yoxlanılır və ümumi məbləğ aydın deyilir. |
| `service-simit-sarayi-r46` / B46 / 6.6 | Düzgün yola salma ifadələri ("Gününüz xoş keçsin...", "Nuş olun...") istifadə edilir. | “Gününüz xoş keçsin”, “Nuş olsun” kimi uyğun yola salma ifadələrindən istifadə olunur. |
| `service-simit-sarayi-s47` / B47 | Xidmət vaxtı (Simit Sarayı): | Xidmət vaxtı (Simit Sarayı) |
| `service-simit-sarayi-r49` / B49 / 7.1 | Sifariş qəbulu – 1 d. | Sifariş qəbulu – 1 dəqiqə. |
| `service-simit-sarayi-r50` / B50 / 7.2 | Hazırlanma – 2 d. | Hazırlanma – 2 dəqiqə. |
| `service-simit-sarayi-r51` / B51 / 7.3 | Təhvil - 30 s. | Təhvil - 30 saniyə. |
| `service-simit-sarayi-r52` / B52 / 7.4 | Ümumi vaxt – 5:45 | Ümumi vaxt – 5:45. |
| `service-simit-sarayi-s53` / B53 | Məhsul keyfiyyəti: | Məhsul keyfiyyəti |
| `service-simit-sarayi-r54` / B54 / 8.1 | Məhsul standartlara uyğundur, yeməklər isti təqdim olunur | Məhsul standartlara uyğundur, yeməklər isti təqdim olunur. |
| `service-simit-sarayi-r55` / B55 / 8.2 | Sifariş düzgün yığılır, düzgün qablaşdırma istifadə olunur | Sifariş düzgün yığılır, düzgün qablaşdırma istifadə olunur. |
| `service-simit-sarayi-r56` / B56 / 8.3 | Məhsul səliqəli hazırlanır, sifarişdə çatışmazlıq yoxdur | Məhsul səliqəli hazırlanır, sifarişdə çatışmazlıq yoxdur. |
| `service-simit-sarayi-s57` / B57 | İşçilərə əlavə suallar | Əməkdaşlara əlavə suallar |
| `service-simit-sarayi-r59` / B59 / 9.1 | Şikayətlər hansı mənbədən gəlir?     | Şikayətlər hansı mənbələrdən daxil olur? |
| `service-simit-sarayi-r60` / B60 / 9.2 | Gələn mənfi rəylər nə ilə bağlıdır?  | Daxil olan mənfi rəylər nə ilə bağlıdır? |
| `service-simit-sarayi-r61` / B61 / 9.3 | Menecer LASTER proseduru bilir | Menecer LASTER prosedurunu bilir. |
| `service-simit-sarayi-r62` / B62 / 9.4 | Satış (DP) üzrə hədəfləri bilir? | Satış (DP) üzrə hədəfləri bilir? |
| `service-simit-sarayi-r63` / B63 / 9.5 | Orta çek üzrə hədəfləri bilir? | Orta çek üzrə hədəfləri bilir? |
| `service-simit-sarayi-r64` / B64 / 9.6 | Reytinqləri smen/ay bilir | Növbə və ay üzrə reytinqləri bilir. |
| `service-simit-sarayi-r65` / B65 / 9.7 | Yeniliklərdən və aksiyalardan məlumatlıdır | Yeniliklər və kampaniyalar barədə məlumatlıdır. |
| `service-simit-sarayi-r67` / B67 / 9.8 | Brendi kim yaradıb? | Brendi kim yaradıb? |
| `service-simit-sarayi-r68` / B68 / 9.9 | SS ən populyar üç yeməyini qeyd edin | Simit Sarayının ən populyar üç yeməyini qeyd edin. |
| `service-simit-sarayi-r69` / B69 / 9.10 | İşçilər satış (DP) üzrə hədəfləri bilirlərmi? | Əməkdaşlar satış (DP) üzrə hədəfləri bilirlərmi? |
| `service-simit-sarayi-r70` / B70 / 9.11 | Orta çek üzrə hədəfləri bilir? | Orta çek üzrə hədəfləri bilir? |
| `service-simit-sarayi-r71` / B71 / 9.12 | Reytinqləri smen/ay bilir | Növbə və ay üzrə reytinqləri bilir. |
| `service-simit-sarayi-r72` / B72 / 9.13 | Yeniliklərdən və aksiyalardan məlumatlıdır | Yeniliklər və kampaniyalar barədə məlumatlıdır. |
| `service-simit-sarayi-s73` / B73 | İşçilər üçün məlumat: | Əməkdaşlar üçün məlumat |
| `service-simit-sarayi-r74` / B74 / 10.1 | Ges lövhəsi doldurulur və işçilərin məlumatı var | GES lövhəsi doldurulur və əməkdaşlar məlumatlıdırlar. |
| `service-simit-sarayi-r75` / B75 / 10.2 | Satış hədəfləri geyd olunduğu lövhə mövcuddur və geydlər var | Satış hədəfləri üçün məlumat lövhəsi mövcuddur və hədəflər orada qeyd olunur. |
| `service-simit-sarayi-r76` / B76 / 10.3 | Google və s. reytinqinin dinamikası | Google və digər platformalardakı reytinqlərin dinamikası. |
| `service-simit-sarayi-r77` / B77 / 10.4 | Qonaqpərvərlik və Atmosfer (Hospitality / Guest Experience) | Qonaqpərvərlik, atmosfer və qonaq təcrübəsi. |

Read-only verifier: `python3 Backend/scripts/verifyServiceAuditSources.py KFC.xlsx PizzaHut.xlsx SimitSarayi.xlsx`. SHA-256, bütün worksheet, section/source text/row/number, answer column və nömrələnmiş sətirlərin tamlığı yoxlanır.
