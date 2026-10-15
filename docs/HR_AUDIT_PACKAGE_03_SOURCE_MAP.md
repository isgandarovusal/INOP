# Paket 03 — HR Audit mənbə uyğunluğu

Baza: `1238cc8207a9cebdf21157a85ab5abfdc2cd944b`. Orijinal Excel faylları, imza şəkilləri və şəxsi məlumatlar commit edilmir. Yalnız boş formalardakı meyarlar, təlimatlar və mənbə identifikatorları çıxarılıb.

## Scoring qərarı

İstifadəçinin bu sessiyadakı açıq təsdiqi: yalnız HR üçün 0 / 0.5 / 1 / N/A; tətbiq olunan hər meyar maksimum 1; N/A həm surətdən, həm məxrəcdən çıxır. Pizza Hut və Simit Sarayı yekunu = bal cəmi / tətbiq olunan meyar sayı × 100. Bütün N/A və boş/incomplete cavablar yekun bal almır. Pass/fail həddi və çəki uydurulmur.

**KFC BLOCKED:** 66 meyarı əhatə edən SUM-lar və 47 böləni arasında ziddiyyət qalır. Mənbədə 47-nin mənası və daxil ediləcək alt meyar dəsti izah olunmur. Suallar və cavablar saxlanır; section/overall/earned bal null qalır. 47 əvəzinə 66 qoyulmur. Formanı yekun bal olmadan tamamlamaq mümkündür; təsdiq və bağlanma scoring sertifikasiyası kimi göstərilmir.

Pizza Hut və Simit Sarayı workbook-larında yekun düstur yoxdur; formula Excel-dən götürülmüş kimi təqdim edilmir, məhz istifadəçinin əlavə təsdiqinə əsaslanır.

UI idarəetmə mətnləri AZ/EN/RU-dur. Orijinal sual, bölmə və təlimat mətnləri immutable mənbədə dəyişmədən qalır; auditor ekranları ayrıca `editorial-v1` AZ/EN/RU təqdimatını göstərir. Pizza Hut `Лист1` müsahibə bələdçisidir; 48 dolu xana yalnız mənbə istinadında saxlanır, forma/panel/mərhələ və əlavə scoring meyarı deyil. Simit Sarayı workbook-dakı şəkil loqodur; scoring qaydası ehtiva etmir və repo-ya köçürülmür.

## KFC

SHA-256: `d9535bb74d6078b0f75fab9969b6f28ffc868218c4879ad4e0d66cf65b4b6aa8`

Worksheet-lər: `HRTR Yeni`

| Bölmə (mənbədəki ardıcıllıq) | Say | Excel xanaları | Sistem ID-ləri |
|---|---:|---|---|
| Customer Experience və Brand Protection  | 7 | C9 … C15 | `kfc-r9` … `kfc-r15` |
| Seçim və qəbul | 8 | C17 … C24 | `kfc-r17` … `kfc-r24` |
| İşçilərin adaptasiyası | 8 | C26 … C33 | `kfc-r26` … `kfc-r33` |
| Vizual məlumatlar  | 14 | C35 … C48 | `kfc-r35` … `kfc-r48` |
| İşçilərin təlimi və inkişafı | 17 | C50 … C66 | `kfc-r50` … `kfc-r66` |
| Mədəniyyət, ünsiyyət və işçilərə qayğı | 3 | C68 … C70 | `kfc-r68` … `kfc-r70` |
| Kadrların idarə olunması | 5 | C72 … C76 | `kfc-r72` … `kfc-r76` |
| Əlavə pozisiyalar | 4 | C78 … C81 | `kfc-r78` … `kfc-r81` |

Hər meyarın tam mətni, qeydi, sourceCell və ardıcıllığı: `Backend/config/hrAuditSources.json`.

| Worksheet / xana | Orijinal düstur (icra edilmir) |
|---|---|
| HRTR Yeni / E85 | `=SUM(E9:E15)` |
| HRTR Yeni / E86 | `=SUM(E17:E24)` |
| HRTR Yeni / E87 | `=SUM(E26:E33)` |
| HRTR Yeni / E88 | `=SUM(E35:E48)` |
| HRTR Yeni / E89 | `=SUM(E50:E66)` |
| HRTR Yeni / E90 | `=SUM(E68:E70)` |
| HRTR Yeni / E91 | `=SUM(E72:E76)` |
| HRTR Yeni / E92 | `=SUM(E78:E81)` |
| HRTR Yeni / E93 | `=(SUM(E85:E92)/47)` |

## Pizza Hut

SHA-256: `14dace01b68395de1e1c1e89253778b4182338c7f4a75360651acc0aa0d13c49`

Worksheet-lər: `HRTR Yeni`, `Лист1`

| Bölmə (mənbədəki ardıcıllıq) | Say | Excel xanaları | Sistem ID-ləri |
|---|---:|---|---|
| Brand Protection | 9 | B8 … B16 | `pizza-hut-r8` … `pizza-hut-r16` |
| Seçim və qəbul | 7 | B18 … B24 | `pizza-hut-r18` … `pizza-hut-r24` |
| İşçilərin adaptasiyası | 14 | B26 … B39 | `pizza-hut-r26` … `pizza-hut-r39` |
| İşçilərin saxlanması | 5 | B41 … B45 | `pizza-hut-r41` … `pizza-hut-r45` |
| İşçilərin təlimi və inkişafı | 23 | B47 … B69 | `pizza-hut-r47` … `pizza-hut-r69` |
| Mədəniyyət, ünsiyyət və işçilərə qayğı | 6 | B71 … B76 | `pizza-hut-r71` … `pizza-hut-r76` |
| Kadrların idarə olunması | 3 | B78 … B80 | `pizza-hut-r78` … `pizza-hut-r80` |
| ƏM və YT + Tibbi müayinə | 4 | B82 … B85 | `pizza-hut-r82` … `pizza-hut-r85` |

Hər meyarın tam mətni, qeydi, sourceCell və ardıcıllığı: `Backend/config/hrAuditSources.json`.

Orijinal workbook-da düstur yoxdur.

## Simit Sarayı

SHA-256: `f19580b2fa3d2a3ab0d6aae07987023d6fc3e054f2d1bf83cf90e6a5d3fdb37a`

Worksheet-lər: `Sheet1`

| Bölmə (mənbədəki ardıcıllıq) | Say | Excel xanaları | Sistem ID-ləri |
|---|---:|---|---|
| İŞƏ QƏBUL VƏ ORİYENTASİYA | 5 | B12 … B16 | `simit-sarayi-r12` … `simit-sarayi-r16` |
| TƏLİM VƏ İNKİŞAF | 16 | B19 … B34 | `simit-sarayi-r19` … `simit-sarayi-r34` |
| MOTİVASİYA VƏ SAXLANMA | 9 | B37 … B45 | `simit-sarayi-r37` … `simit-sarayi-r45` |
| SƏNƏDLƏŞDİRMƏ VƏ HÜQUQİ UYĞUNLUQ | 5 | B48 … B52 | `simit-sarayi-r48` … `simit-sarayi-r52` |

Hər meyarın tam mətni, qeydi, sourceCell və ardıcıllığı: `Backend/config/hrAuditSources.json`.

Orijinal workbook-da düstur yoxdur.

## Offline yoxlama

`python Backend/scripts/verifyHrAuditSources.py KFC.xlsx PH.xlsx SS.xlsx` hər üç faylın SHA-sını, worksheet siyahısını, bütün 172 sualın tam mətnini/xanasını/ardıcıllığını, qiymətləndirici təlimatlarını, KFC-nin 9 düsturunu və PH ikinci worksheet-in 48 dolu xanasını yoxlayır. Yalnız Python standart kitabxanasından istifadə edir; DB-yə qoşulmur, heç nə yazmır.

Blank restoran/müdir/menecer/imza sahələri real şəxsi məlumat sayılaraq nümunə ilə doldurulmur. Restoran və tarix mövcud auditdən, qiymətləndirici/provenance server actor-dan gəlir; müdir/menecer adları və qeydlər istifadəçi tərəfindən daxil olunur. İmza təsviri yaradılmır; mövcud independent approval rəqəmsal imza iddiası deyil.


## Yekun mənbə uyğunluğu yoxlaması

15 oktyabr 2026-da orijinal attachment-lərlə verifier yenidən icra edildi: KFC 8/66, Pizza Hut 8/71 və ayrıca 48 xanadan ibarət müsahibə worksheet-i, Simit Sarayı 4/35 — PASS. Bütün sual/bölmə mətnləri, sıra, source cell, guidance, worksheet siyahısı, 9 KFC düsturu və workbook SHA-256 əvvəlki mənbəyə tam uyğundur. Suallar və scoring qaydaları bu QA-da dəyişdirilməyib. PH/SS yekun düsturu Excel-dən deyil, istifadəçinin ayrıca təsdiqindən gəlir. KFC E93-dəki 47 icra edilmir və 66 ilə əvəz edilmir. N/A saxlanma/analitika/export uyğunluğu əlavə real-server regression testi ilə təsdiqlənib; all-N/A yekun null, mixed 0/0.5/1/N/A yekun 50%-dir.


## Peşəkar dil redaktəsi və son təsdiqlər

`HR_AUDIT_PACKAGE_03_EDITORIAL_MAP.md` bütün original → AZ mətnləri və auditor təlimatlarını göstərir. `Backend/config/hrAuditEditorial.json` eyni xəritənin AZ/EN/RU, brandId, worksheet, sourceCell, sectionId və criterion ID-ləri ilə maşın tərəfindən yoxlanan formasıdır. Redaktə: KFC 8 başlıq/66 meyar/4 təlimat; Pizza Hut 8/71/71; Simit Sarayı 4/35/0. Original source JSON və workbook hash-ləri dəyişməyib.

İstifadəçinin son təsdiqi: Klikun və Skaut adları saxlanır, yeni funksiya təyin edilmir. Skaut təlimatındakı “xostesdən öhdəlikləri” → “Skautun vəzifə öhdəlikləri”; brend-şef üçün də həmin düzəliş təsdiqlənib. KPI, təlim mərhələləri, modul və sertifikasiya yoxlamaları saxlanır. Mövcud olmayan əlavə vəzifənin cavabı N/A-dır; KFC 47 ziddiyyəti bu qayda ilə həll edilmiş sayılmır.

Ə.M-Э, YT və “Resurs” kimi açıqlanmayan ifadələr map-də ayrıca dəqiqləşdirilməli qeyd olunub. Şirkətdaxili qısaltmaların yeni mənaları, bal, çəki, threshold və məcburi meyar əlavə edilmir. PH/SS scoring əvvəlki istifadəçi təsdiqinə əsaslanır; mənbə Excel-də yekun düstur yoxdur.


Frontend build context-i üçün editorial JSON-un eyni nüsxəsi `Frontend/src/i18n/hrAuditEditorial.json`-da saxlanır; eynilik avtomatik testlə qorunur. Mənbə verifier + original-to-editorial mapping testi birlikdə original Excel → source config → təqdimat → sistem ID zəncirini yoxlayır.
