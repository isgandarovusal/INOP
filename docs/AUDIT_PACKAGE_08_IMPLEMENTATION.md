# Paket 08 — Audit Mərkəzinin yekun inteqrasiyası

Baza: `ac983548bda02cf11a3775f7ba94c85068942444`, `inop-main`. Mənbə sualları, kataloqlar, scoring xidmətləri, istifadə olunmuş revision-lar və real audit məlumatları dəyişdirilmir. Lokal funksional nəticə QA sənədində, production hazırlığı ayrıca readiness gate-də verilir.

## Arxitektura və real düzəlişlər

1. **Dörd müstəqil istiqamət.** Audit Home dörd permission-scoped kartı saxlayır. HR, Servis, Standart və HSE-nin create/list/form/analytics yolları ayrıdır. Shared execution/detail/report/export immutable parent context və eyni backend permission müqaviləsinə bağlıdır. Recruitment və Main Dashboard dəyişmir.
2. **Explicit çoxistiqamətli icazə.** Mövcud `AuditorProfile.direction` primary sahəsi geriyə uyğun saxlanır. Optional `directions` olmadıqda yalnız primary etibarlıdır; boş, təkrarlanan, qeyri-kanonik və primary-ni istisna edən array fail-closed rədd edilir. `PATCH /auditor-profiles/:userId/directions` yalnız səlahiyyətli mərkəzi idarəçi, reason və `expectedVersion` ilə işləyir. Aktiv assignment olduğu halda həmin istiqamətin silinməsi 409-dur. Profil tarixi əvvəlki və son grant dəstlərini saxlayır. Bu, əlavə brend/restoran/obyekt icazəsi vermir.
3. **Əməliyyat zamanı scope.** Create əvvəl və transaction daxilində direction + restoran assignment-ı ilə yoxlanır; Servis assignment-ı HR create hüququ deyil. HSE ayrıca obyekt grant lock-ını saxlayır. Read/update/complete/approve/close/analytics/report/export/evidence mövcud parent permission və current profilə bağlıdır. Grant revocation-dan sonra backend giriş rədd edilir; frontend resource cache açarı `auditDirections` dəstini də nəzərə alır. UI auth refresh-dən sonra icazəsi ləğv olunmuş menyu və rəqəmlər silinir.
4. **Ümumi Audit Mərkəzi.** Yeni `GET /audit-analytics/center` real audit sayı, tamamlanmış formalar, davam edən auditlər, pending approvals, closure, coverage, açıq/gecikmiş actions, critical findings, istiqamət/brend/obyekt/status/ay paylanması və ilk 20 təkrarlanan meyarı göstərir. Child scope ayrıca kəsişdirilir; icazəsiz child KPI null-dur. Ümumi faiz/orta score həmişə null-dur. Coverage audit görülmüş unikal obyekt sayıdır; təsdiqlənməmiş bütün obyektlərə nisbət deyil. Pending/closure sayları unikal auditə görədir.
5. **500+ Standart/HSE.** Əvvəlki 501 audit/execution-un JS-ə yüklənməsi və 500 limiti server-side aggregation ilə əvəz edilib. Tenant/direction/assignment/object `$match` əvvəl, uyğun completed execution + revision lookup sonra gəlir. Latest tamamlanmış snapshot auditə bir dəfə daxil edilir. Standard say əsaslı təsdiqlənmiş düsturla, HSE isə obyekt növünə görə simple/weighted ayrı hesablanır. Bütün N/A null qalır. Server 15s budget və Mongo memory limitində 422 qaytarır; qismən nəticə qaytarılmır.
6. **Metodologiya qarışmasının qarşısı.** Generic `/audit-analytics/service|standard|safety` yolları yalnız legacy auditləri hesablayır və source analytics endpoint-ni göstərir. Direction overview source snapshot olduğu halda raw-score ortalaması qaytarmır. Unfiltered Audit Dashboard ortalaması null-dur; konkret direction üzrə legacy raw-point API geriyə uyğun qalır. Köhnə `/5` HSE cavabı yenidən hesablanmır.
7. **HR/Servis filtrləri.** Auditor və section filtrləri serverdə scalar kimi yoxlanır, yalnız scoped auditlərdən insan adı və section seçimi verilir. Section filtri section/criterion drilldown-u daraldır; ümumi audit nəticəsini yenidən hesablamır. Bu istiqamətlərdə mövcud 5000 audit qoruyucu limiti açıq 422 ilə qalır.
8. **UI.** `/app/audit` compact xülasə, `/app/audit/analytics` və köhnə `/app/audit/dashboard` eyni premium, permission-scoped mərkəzi göstərir. Loading/error/retry/empty vəziyyətləri ayrıdır; server xətasında saxta sıfır KPI yoxdur. AZ/EN/RU və 320/390/768/1440 görünüşləri yoxlanır. Mövcud mənbə formaları/report/evidence komponentləri yenidən istifadə edilir.
9. **Production provision.** `auditProvisionDryRun.cjs` yalnız lokal redacted inventarı oxuyur: 12 source binding, published revision/hash, obyekt/profil/grant əlaqələri, input digest, zero writes. Mövcud source revision bindingsizdirsə blind duplicate yaratmaq əvəzinə manual reconciliation tələb edilir. Heç bir apply/migration/production DB bağlantısı yoxdur.

## Qorunan müqavilələr

| İstiqamət | Mənbə meyar sayı | Dəyişməz metodologiya |
|---|---|---|
| HR | 66 / 71 / 35 | 0 / 0.5 / 1 / N/A; yeni KFC applicable denominator; köhnə KFC v1 rescore yoxdur |
| Servis | 94 / 79 / 61 | Bəli 1 / Orta 0.5 / Xeyr 0 / N/A; KFC B79 istinad, B67 yalnız yeni reviewed versiyada |
| Standart | 190 / 123 / 71 | Tətbiq edilən − uyğunsuz standartlar / tətbiq edilən; N/A səbəbi, blank source risk qorunur |
| HSE | Restoran 52 / ofis 19 / anbar 29 | Restoran simple + ≥85%; ofis/anbar simple və 5/3/1 weighted ayrı; GFC aggregate null |

NA cavabsız deyil. Bütün istiqamətlərdə all-NA nəticəsi null-dur. Formalar, findings/actions, müstəqil approval/closure, altı XLSX report, evidence və üç ayrı sənəd slotu Paket 07 mexanizmləri ilə işləyir. Tamamlanmış snapshot/revision/history avtomatik dəyişmir.

## Sənədlər

- `AUDIT_PACKAGE_08_DIAGNOSTIC.md`: P0/P1/P2 və əvvəlki məhdudiyyətlər.
- `AUDIT_PACKAGE_08_INVENTORY.md`: frontend/backend route/model/security xəritəsi.
- `AUDIT_PACKAGE_08_QA.md`: faktiki qaçışlar, miqyas/performance, test sərhədləri və log digest-ləri.
- `AUDIT_PACKAGE_08_REGRESSION.md`: əvvəlki 44 failure üzrə tam müqayisə.
- `AUDIT_PACKAGE_08_PRODUCTION_READINESS.md`: storage/provision/monitoring/backup/rollout gate və operator addımları.
