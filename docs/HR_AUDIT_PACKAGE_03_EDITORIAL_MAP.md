# HR auditi — mənbə və redaktə edilmiş mətn uyğunluğu

Təqdimat versiyası: `editorial-v1`. Bu xəritə biznes qaydasını və saxlanmış source snapshot-u dəyişdirmir. Sistem ID-ləri, bölmə/meyar sırası, cavab variantları, required/active flag-lər və scoring əvvəlki kimidir. Hər orijinal mətn `Backend/config/hrAuditEditorial.json` faylında AZ/EN/RU təqdimatı ilə yanaşı saxlanır. Mənbə SHA və worksheet/cell xəritəsi `HR_AUDIT_PACKAGE_03_SOURCE_MAP.md` sənədindədir.

| Brend | Bölmə | Meyar | Təlimat |
|---|---:|---:|---:|
| kfc | 8 | 66 | 4 |
| pizza-hut | 8 | 71 | 71 |
| simit-sarayi | 4 | 35 | 0 |

Bütün 20 başlıq, 172 meyar və 75 təlimat dil baxımından redaktə edilib. PH r41-də eyni cümlənin bir meyar daxilində təkrar yazılması aradan qaldırılıb; meyar silinməyib və başqa meyarla birləşdirilməyib. Hüquqi/şirkətdaxili qısaltmaların açıqlanmayan mənaları təxmin edilməyib. PH “>90%”, KFC “90%-dən yüksək”, 5 dəqiqə, 30 gün, iki təlimçi/iki əməkdaş, dörd və beş mərhələ fərqləri qorunub.

## Açıq terminlər və təsdiq

Klikun və Skaut adlarının saxlanması istifadəçi tərəfindən təsdiqlənib; funksiyaları yenidən tərif edilmir. Skaut/brend-şef təlimatlarındakı xostes istinadlarının müvafiq vəzifənin öhdəlikləri ilə düzəldilməsi də ayrıca təsdiqlənib. Digər açıq ifadələr:
- `pizza-hut-s81`: YT qısaltmasının rəsmi açılışı təsdiqlənməlidir.
- `kfc-r76`: Ə.M-Э qısaltmasının açılışı mənbədə təsdiqlənmir.
- `kfc-r79`: Klikun vəzifəsinin rəsmi Azərbaycan dili adı təsdiqlənməyib; istifadəçi mənbə adının saxlanmasını təsdiqləyib.
- `kfc-r80`: Skaut vəzifəsinin rəsmi Azərbaycan dili adı təsdiqlənməyib; istifadəçi mənbə adının saxlanmasını təsdiqləyib.
- `pizza-hut-r33`: ƏM/YT qısaltmalarının rəsmi açılışı təsdiqlənməlidir.
- `pizza-hut-r63`: Resurs vasitəsinin adı və təyinatı mənbədə açıqlanmır.
- `pizza-hut-r80`: ƏM qısaltmasının bu meyardakı rəsmi açılışı təsdiqlənməlidir.

FTR, ROCC, GES, DP, 4P, BSC, PPR, DR, BÜ, RGM/ARGM/SM/NM, G&R, IDP, ABR, ACE, L3, COL və EES şirkətdaxili mənbə terminləri kimi saxlanır; təsdiqlənməmiş açılışları və yeni yoxlama qaydaları əlavə edilməyib.

## Bölmə və meyar xəritəsi

| Sistem ID / xana | Orijinal mətn | Redaktə edilmiş AZ mətn |
|---|---|---|
| `kfc-s7` / HRTR Yeni | Customer Experience və Brand Protection  | Qonaq təcrübəsi və brendin qorunması |
| `kfc-s16` / HRTR Yeni | Seçim və qəbul | Namizədlərin seçilməsi və işə qəbulu |
| `kfc-s25` / HRTR Yeni | İşçilərin adaptasiyası | Əməkdaşların işə uyğunlaşması |
| `kfc-s34` / HRTR Yeni | Vizual məlumatlar  | Vizual məlumatlandırma |
| `kfc-s49` / HRTR Yeni | İşçilərin təlimi və inkişafı | Əməkdaşların təlimi və inkişafı |
| `kfc-s67` / HRTR Yeni | Mədəniyyət, ünsiyyət və işçilərə qayğı | Mədəniyyət, ünsiyyət və əməkdaşlara qayğı |
| `kfc-s71` / HRTR Yeni | Kadrların idarə olunması | Heyətin idarə edilməsi |
| `kfc-s77` / HRTR Yeni | Əlavə pozisiyalar | Əlavə vəzifələr |
| `pizza-hut-s7` / HRTR Yeni | Brand Protection | Brendin qorunması |
| `pizza-hut-s17` / HRTR Yeni | Seçim və qəbul | Namizədlərin seçilməsi və işə qəbulu |
| `pizza-hut-s25` / HRTR Yeni | İşçilərin adaptasiyası | Əməkdaşların işə uyğunlaşması |
| `pizza-hut-s40` / HRTR Yeni | İşçilərin saxlanması | Əməkdaşların işdə saxlanması |
| `pizza-hut-s46` / HRTR Yeni | İşçilərin təlimi və inkişafı | Əməkdaşların təlimi və inkişafı |
| `pizza-hut-s70` / HRTR Yeni | Mədəniyyət, ünsiyyət və işçilərə qayğı | Mədəniyyət, ünsiyyət və əməkdaşlara qayğı |
| `pizza-hut-s77` / HRTR Yeni | Kadrların idarə olunması | Heyətin idarə edilməsi |
| `pizza-hut-s81` / HRTR Yeni | ƏM və YT + Tibbi müayinə | Əməyin mühafizəsi, YT və tibbi müayinə |
| `simit-sarayi-s11` / Sheet1 | İŞƏ QƏBUL VƏ ORİYENTASİYA | İşə qəbul və ilkin uyğunlaşma |
| `simit-sarayi-s18` / Sheet1 | TƏLİM VƏ İNKİŞAF | Təlim və inkişaf |
| `simit-sarayi-s36` / Sheet1 | MOTİVASİYA VƏ SAXLANMA | Motivasiya və əməkdaşların işdə saxlanması |
| `simit-sarayi-s47` / Sheet1 | SƏNƏDLƏŞDİRMƏ VƏ HÜQUQİ UYĞUNLUQ | Sənədləşdirmə və hüquqi tələblərə uyğunluq |
| `kfc-r9` / C9 | İşçilər qonaqpərvərdir, sifarişlər düzgün yığılır, xidmət müddəti 5 dəqiqəni keçmir | Əməkdaşlar qonaqpərvərdir, sifarişlər düzgün hazırlanır və xidmət müddəti 5 dəqiqəni keçmir. |
| `kfc-r10` / C10 | İşçilərin xarici görünüşü standartlara uyğundur | Əməkdaşların xarici görünüşü standartlara uyğundur. |
| `kfc-r11` / C11 | Kassir yenilikləri və sifarişə əlavələri təklif edir | Kassir yeni məhsulları və sifarişə əlavələri təklif edir. |
| `kfc-r12` / C12 | Kassada çalışan hər bir işçi iş standartlarına əməl edir, kimyəvi vasitələrlə işləməyi bacarır və qida təhlükəsizliyi qaydalarına riayət edir | Kassada çalışan hər bir əməkdaş iş standartlarına əməl edir, kimyəvi vasitələrlə işləməyi bacarır və qida təhlükəsizliyi qaydalarına riayət edir. |
| `kfc-r13` / C13 | İşçilər Qonaqların nədən şikayət etdiklərini bilirlər | Əməkdaşlar qonaqların şikayətlərinin səbəblərini bilirlər. |
| `kfc-r14` / C14 | Unlama stansiyasında çalışan hər bir işçi QT əsaslarını bilir, kimyəvi vasitələrlə işləmə qaydaları  bələddir və bütün məhsulların unlanma qaydasına əməl edir | Unlama stansiyasında çalışan hər bir əməkdaş qida təhlükəsizliyinin əsaslarını və kimyəvi vasitələrlə işləmə qaydalarını bilir, bütün məhsulların unlanma qaydasına əməl edir. |
| `kfc-r15` / C15 | Mətbəx stansiyasında çalışan hər bir işçi QT əsaslarını bilir, kimyəvi vasitələrlə işləmə qaydaları bələddir və sendviçlərin hazırlanma qaydalarına əməl edir | Mətbəx stansiyasında çalışan hər bir əməkdaş qida təhlükəsizliyinin əsaslarını və kimyəvi vasitələrlə işləmə qaydalarını bilir, sendviçlərin hazırlanma qaydalarına əməl edir. |
| `kfc-r17` / C17 | Restoranın cari period üçün FTR nəticəsi 90%-dən yüksəkdir. | Restoranın cari dövr üzrə FTR nəticəsi 90%-dən yüksəkdir. |
| `kfc-r18` / C18 | Menecer işə qəbul namizədlərinə necə cavab verməli olduğunu və müsahibəni kimin keçirməli olduğunu bilir | Menecer işə qəbul namizədlərinə necə cavab verməli olduğunu və müsahibəni kimin keçirməli olduğunu bilir. |
| `kfc-r19` / C19 | Müsahibənin keçirilməsi üzrə yaddaş kitabı mövcuddur. | Müsahibənin keçirilməsinə dair yaddaş kitabçası mövcuddur. |
| `kfc-r20` / C20 | Briqada üzvləri cari vakansiyalardan xəbərdardır, işçilər işə qəbul namizədinin suallarına necə cavab verməli olduqlarını bilirlər | Komanda üzvləri mövcud vakansiyalar barədə məlumatlıdır və işə qəbul namizədlərinin suallarına necə cavab verməli olduqlarını bilirlər. |
| `kfc-r21` / C21 | İşə qəbul anketləri kifayət qədərdir və namizədlər üçün əlçatan yerdədir | İşə qəbul anketləri kifayət qədərdir və namizədlər üçün əlçatandır. |
| `kfc-r22` / C22 | Reklam materialları keyfiyyətlidir, əmək haqqı ilə bağlı məlumatlar düzgündür | Reklam materialları keyfiyyətlidir və əməkhaqqı barədə məlumatlar düzgündür. |
| `kfc-r23` / C23 | "Dostunu gətir" plakatı mövcuddur (işçilərin görməsi üçün asılmışdır və yaxşı vəziyyətdədir), işçilər proqram haqqında məlumatlandırılmışdır | “Dostunu gətir” plakatı əməkdaşların görə biləcəyi yerdə asılıb, yaxşı vəziyyətdədir və əməkdaşlar proqram barədə məlumatlıdırlar. |
| `kfc-r24` / C24 | Bütün şəxsi qovluqlar düzgün yığılır, məlumatlar düzgündür, şəkillər əlavə olunub. | Bütün şəxsi iş qovluqları düzgün tərtib olunub, məlumatlar düzgündür və fotoşəkillər əlavə edilib. |
| `kfc-r26` / C26 | İşçiyə işə başladığı ilk gün təlimçi/instruktor təyin edilib. | Əməkdaşa işə başladığı ilk gün təlimçi və ya instruktor təyin edilib. |
| `kfc-r27` / C27 | İşçi son yenilikləri bilir. | Əməkdaş son yeniliklər barədə məlumatlıdır. |
| `kfc-r28` / C28 | İşçi bir modul üzrə sertifikasiyadan keçmişdir | Əməkdaş bir modul üzrə sertifikasiyadan keçib. |
| `kfc-r29` / C29 | İşçi neçə saat işlədiyini və müvafiq məlumatı haradan əldə etməli olduğunu bilir. | Əməkdaş neçə saat işlədiyini və bu məlumatı haradan əldə edə biləcəyini bilir. |
| `kfc-r30` / C30 | İşçi növbəti pilləyə keçmək üçün nə etməli və öyrənməli olduğunu bilir | Əməkdaş növbəti vəzifə pilləsinə keçmək üçün nə etməli və nəyi öyrənməli olduğunu bilir. |
| `kfc-r31` / C31 | İşçi bütün karyera imkanlarını bilir  | Əməkdaş bütün karyera imkanları barədə məlumatlıdır. |
| `kfc-r32` / C32 | İşçi restoranın bütün motivasiya proqramlarını bilir | Əməkdaş restoranın bütün motivasiya proqramları barədə məlumatlıdır. |
| `kfc-r33` / C33 | İşçinin uniforması standartlara uyğundur | Əməkdaşın iş geyimi standartlara uyğundur. |
| `kfc-r35` / C35 | Lövhələr və yaddaş kitabçası üçün nəzərdə tutulmuş ciblər təmizdir | Məlumat lövhələri və yaddaş kitabçaları üçün nəzərdə tutulmuş ciblər təmizdir. |
| `kfc-r36` / C36 | Bütün işçilər üçün məlumatlar əlçatandır: ROCC nəticələri, GES, DP üzrə nəticələr, cari yarışlar, 4P üzrə məqsəd və nəticələr. İşçilər məlumatlandırılıb | ROCC, GES və DP nəticələri, cari müsabiqələr, 4P üzrə məqsəd və nəticələr bütün əməkdaşlar üçün əlçatandır; əməkdaşlar bu məlumatlardan xəbərdardırlar. |
| `kfc-r37` / C37 | Menecerlər cari BSC nəticələrini və əsas göstəricilər üzrə tədbirlər planını bilirlər | Menecerlər cari BSC nəticələrini və əsas göstəricilər üzrə tədbirlər planını bilirlər. |
| `kfc-r38` / C38 | Restoran komandası ilə ayda 1 dəfə iclas keçirilir | Restoran komandası ilə ayda bir dəfə iclas keçirilir. |
| `kfc-r39` / C39 | Motivasiya proqramları üzrə plakat mövcuddur və işçilərin görə biləcəyi yerdədir, məlumatlar aktualdır, işçilər məlumatlıdır. | Motivasiya proqramları üzrə plakat əməkdaşların görə biləcəyi yerdədir, məlumatlar aktualdır və əməkdaşlar proqramlardan xəbərdardırlar. |
| `kfc-r40` / C40 | SUSMA! Plakatı mövcuddur və işçilərin görə biləcəyi yerdədir. RGM və ƏM nömrələri qeyd olunub və işçilər məlumatlandırılıb | “SUSMA!” plakatı əməkdaşların görə biləcəyi yerdədir; RGM və ƏM nömrələri qeyd olunub və əməkdaşlar məlumatlandırılıblar. |
| `kfc-r41` / C41 | Restoranda EES sorğusunun nəticələri üzrə iclas keçirilib. Tədbirlər planı tərtib olunub və işçilərin görə biləcəyi yerdə asılıb | Restoranda EES sorğusunun nəticələri üzrə iclas keçirilib, tədbirlər planı hazırlanıb və əməkdaşların görə biləcəyi yerdə asılıb. |
| `kfc-r42` / C42 | Bütün işçilər sosial şəbəkələr və KİV ilə davranış qaydalarını bilirlər | Bütün əməkdaşlar sosial şəbəkələrdə və kütləvi informasiya vasitələri ilə ünsiyyətdə davranış qaydalarını bilirlər. |
| `kfc-r43` / C43 | Uniforma standartları üzrə məlumatlar işçilər üçün əlçatan yerdədir | İş geyimi standartları barədə məlumatlar əməkdaşlar üçün əlçatandır. |
| `kfc-r44` / C44 | Restoranda işçilər ad günləri və şəxsi nailiyyətləri münasibətilə təbrik olunur. | Restoranda əməkdaşlar ad günləri və şəxsi nailiyyətləri münasibətilə təbrik olunurlar. |
| `kfc-r45` / C45 | "Şirkət mədəniyyəti" plakatı yaxşı vəziyyətdədir | “Şirkət mədəniyyəti” plakatı yaxşı vəziyyətdədir. |
| `kfc-r46` / C46 | Menecer ABR nə olduğunu bilir, işçilərin tanış olması üçün ABR kartları mövcuddur | Menecer ABR-nin nə olduğunu bilir və əməkdaşların tanış olması üçün ABR kartları mövcuddur. |
| `kfc-r47` / C47 | "Sənin karyera yolun" plakatı mövcuddur, işçilərin görə biləcəkləri yerdədir, məlumatlar aktualdır | “Sənin karyera yolun” plakatı əməkdaşların görə biləcəyi yerdədir və məlumatlar aktualdır. |
| `kfc-r48` / C48 | "Özün haqqında danış" plakatı mövcuddur, işçilərin görə biləcəyi yerdədir | “Özün haqqında danış” plakatı əməkdaşların görə biləcəyi yerdədir. |
| `kfc-r50` / C50 | İşçilərin müdir/modul təlimçisi tərəfindən hazırlanmış təlim planı vard | Əməkdaşlar üçün müdir və ya modul təlimçisi tərəfindən hazırlanmış təlim planı mövcuddur. |
| `kfc-r51` / C51 | PPR üzrə tədbirlər planı The Vault sistemində təyin olunmuş modullara uyğun gəlir  | PPR üzrə tədbirlər planı The Vault sistemində təyin edilmiş modullara uyğundur. |
| `kfc-r52` / C52 | The Vaultda əsas və  əlavə təlim  tamamlanıb | The Vault sistemində əsas və əlavə təlimlər tamamlanıb. |
| `kfc-r53` / C53 | Təlimlərin izlənmə blankı düzgün doldurulur (bütün vəzifələr üçün ) | Təlimlərin izlənməsi forması bütün vəzifələr üzrə düzgün doldurulur. |
| `kfc-r54` / C54 | Menecerlərin şəxsi qovluğunda DR blankı mövcuddur (RGM, ARGM, SM). | Menecerlərin (RGM, ARGM, SM) şəxsi iş qovluqlarında DR forması mövcuddur. |
| `kfc-r55` / C55 | Təlimçilər BÜ təlim əsaslarını, modullar üzrə müddətləri və 4 mərhələli təlim prosesini bilirlər | Təlimçilər BÜ üçün təlimin əsaslarını, modullar üzrə müddətləri və dördmərhələli təlim prosesini bilirlər. |
| `kfc-r56` / C56 | Restoranda müdir daxil olmaqla, ən az 2 modul təlimçisi vardır. Bir modul təlimçisi eyni vaxtda 2-dən çox işçiyə təlim keçə bilməz. | Restoranda müdir də daxil olmaqla ən azı iki modul təlimçisi var. Bir modul təlimçisi eyni vaxtda ikidən çox əməkdaşa təlim keçə bilməz. |
| `kfc-r57` / C57 | Modul təlimçisi təlim standartlarını bilir | Modul təlimçisi təlim standartlarını bilir. |
| `kfc-r58` / C58 | Menecerlər fərdi planlarını və cari il üçün G&R-nı bilirlər | Menecerlər fərdi planlarını və cari il üzrə G&R-ni bilirlər. |
| `kfc-r59` / C59 | Menecerlər üzərində çalışmalı olduqları səriştələrdən xəbərdardır və öz inkişaf planları haqqında danışa bilirlər (IDP)  | Menecerlər inkişaf etdirməli olduqları səriştələri bilirlər və fərdi inkişaf planlarını (IDP) izah edə bilirlər. |
| `kfc-r60` / C60 | Kassa stansiyasında çalışan bütün işçilər müvafiq modul üzrə sertifikasiyadan keçiblər | Kassa stansiyasında çalışan bütün əməkdaşlar müvafiq modul üzrə sertifikasiyadan keçiblər. |
| `kfc-r61` / C61 | Mətbəx stansiyasında çalışan bütün işçilər müvafiq modul üzrə sertifikasiyadan keçiblər | Mətbəx stansiyasında çalışan bütün əməkdaşlar müvafiq modul üzrə sertifikasiyadan keçiblər. |
| `kfc-r62` / C62 | Unlama stansiyasında çalışan bütün işçilər müvafiq modul üzrə sertifikasiyadan keçiblər | Unlama stansiyasında çalışan bütün əməkdaşlar müvafiq modul üzrə sertifikasiyadan keçiblər. |
| `kfc-r63` / C63 | Yeni qəbul olunmuş işçilərin Şirkətlə tanışlıq və Qida təhlükəsizliyi təlimində 30 gün ərzində iştirakı təmin olunur (təlimlərdə iştirak faizi nəzərə alınmaqla). | Yeni işə qəbul olunan əməkdaşların 30 gün ərzində “Şirkətlə tanışlıq” və “Qida təhlükəsizliyi” təlimlərində iştirakı təmin olunur; təlimlərdə iştirak faizi nəzərə alınır. |
| `kfc-r64` / C64 | Restoranda 1 ildən artıq çalışan işçilərin BÜ-dən ARGM-ə qədər illik resertifikasiyası keçirilir və müvafiq qeydiyyat aparılır | Restoranda bir ildən artıq çalışan əməkdaşların BÜ-dən ARGM-ə qədər illik təkrar sertifikasiyası keçirilir və qeydiyyatı aparılır. |
| `kfc-r65` / C65 | İşçilərin sertifikasiyadan keçmələri təmin olunmuşdur | Əməkdaşların sertifikasiyadan keçməsi təmin olunub. |
| `kfc-r66` / C66 | Menecerlərin sertifikasiyadan və resertifikasiyadan keçmələri təmin olunmuşdur | Menecerlərin sertifikasiyadan və təkrar sertifikasiyadan keçməsi təmin olunub. |
| `kfc-r68` / C68 | Restoranda etiraf sistemi çalışır, etiraf kartları mövcuddur | Restoranda əməkdaşların nailiyyətlərinin təqdir edilməsi sistemi işləyir və təqdir kartları mövcuddur. |
| `kfc-r69` / C69 | İşçilər əsas KFC faktlarından xəbərdardır | Əməkdaşlar KFC haqqında əsas məlumatları bilirlər. |
| `kfc-r70` / C70 | İşçilər üçün ərazilər (qarderob otağı, tualet otağı və yemək otağı) təmizdir, səliqəlidir, texniki cəhətdən işləkdir, temperatur normaldır, ütü və ütü masası vardır | Əməkdaşlar üçün nəzərdə tutulmuş geyim, tualet və yemək otaqları təmiz, səliqəli və texniki cəhətdən işləkdir; temperatur normaldır, ütü və ütü masası mövcuddur. |
| `kfc-r72` / C72 | Cari il üçün məzuniyyət qrafikinin mövcudluğu. Restoran müdiri işçilərin məzuniyyət günlərinin sayına nəzarət edir | Cari il üzrə məzuniyyət qrafiki mövcuddur və restoran müdiri əməkdaşların məzuniyyət günlərinin sayına nəzarət edir. |
| `kfc-r73` / C73 | Cari kvartal üzrə işçi dövriyyəsi plana uyğundur | Cari rüb üzrə əməkdaş dövriyyəsi plana uyğundur. |
| `kfc-r74` / C74 | İş cədvəlində işçilərin cədvəllə tanış olmasını təsdiqləyən imzaları mövcuddur, işçilərin cədvəl üzrə istəkləri nəzərə alınır, iş cədvəli həftənin cümə axşamından gec olmayaraq asılır. | İş qrafiki ilə tanışlığı təsdiqləyən əməkdaş imzaları mövcuddur, əməkdaşların qrafiklə bağlı istəkləri nəzərə alınır və qrafik cümə axşamından gec olmayaraq asılır. |
| `kfc-r75` / C75 | İşçilər çalışma saatlarına harada baxa biləcəklərini bilirlər | Əməkdaşlar işlədikləri saatlara haradan baxa biləcəklərini bilirlər. |
| `kfc-r76` / C76 | İş cədvəlinin hazırlanması Ə.M-Э  uyğun şəkildə həyata keçirilir | İş qrafiki mənbədə “Ə.M-Э” kimi göstərilən tələbə uyğun hazırlanır. |
| `kfc-r78` / C78 | Xostes  həyata keçirdiyi təlimin standartlarını bilir. Xostes  sertifikasiyadan keçmələri təmin olunmuşdur | Qonaqları qarşılayan əməkdaş (mənbədə “Xostes”) keçdiyi təlimin standartlarını bilir və sertifikasiyadan keçib. |
| `kfc-r79` / C79 | Klikun  həyata keçirdiyi təlimin standartlarını bilir. Klikun sertifikasiyadan keçmələri təmin olunmuşdur | Mənbədə “Klikun” adlandırılan vəzifəni tutan əməkdaş keçdiyi təlimin standartlarını bilir və sertifikasiyadan keçib. |
| `kfc-r80` / C80 | Skaut  həyata keçirdiyi təlimin standartlarını bilir. Skaut sertifikasiyadan keçmələri təmin olunmuşdur | Mənbədə “Skaut” adlandırılan vəzifəni tutan əməkdaş keçdiyi təlimin standartlarını bilir və sertifikasiyadan keçib. |
| `kfc-r81` / C81 | Brend Şef həyata keçirdiyi təlimin standartlarını bilir. Brend Şef sertifikasiyadan keçmələri təmin olunmuşdur | Brend üzrə baş aşpaz keçdiyi təlimin standartlarını bilir və sertifikasiyadan keçib. |
| `pizza-hut-r8` / B8 | Xəmir hazırlanma qaydalarını əks etdirən yaddaş kitabçaları mövcuddur | Xəmirin hazırlanma qaydalarını əks etdirən yaddaş kitabçaları mövcuddur. |
| `pizza-hut-r9` / B9 | Doğrama zona üçün yaddaş kitabçaları mövcuddur | Doğrama sahəsi üçün yaddaş kitabçaları mövcuddur. |
| `pizza-hut-r10` / B10 | Kassa zona üçün yaddaş kitabçaları mövcuddur | Kassa sahəsi üçün yaddaş kitabçaları mövcuddur. |
| `pizza-hut-r11` / B11 | Pizza hazırlama stansiyası üçün yaddaş kitabçaları mövcuddur | Pizza hazırlama stansiyası üçün yaddaş kitabçaları mövcuddur. |
| `pizza-hut-r12` / B12 | Restoranda Ecolab üzrə yaddaş kitabçaları mövcuddur | Restoranda Ecolab üzrə yaddaş kitabçaları mövcuddur. |
| `pizza-hut-r13` / B13 | Əməkdaşlar kimyəvi vasitələrlə iş qaydalarına riayət edilər | Əməkdaşlar kimyəvi vasitələrlə işləmə qaydalarına riayət edirlər. |
| `pizza-hut-r14` / B14 | Restoran təmzidir, qonaqlar üçün nəzərdə tutulmuş sahələr səliqəlidir, istehzal zona təmizdir | Restoran və istehsal sahəsi təmizdir, qonaqlar üçün nəzərdə tutulmuş sahələr səliqəlidir. |
| `pizza-hut-r15` / B15 | Hut bot "5 Star" üzrə ortalam qiymət 3-dən yuxarıdır | Hut bot sistemində “5 Star” üzrə orta qiymət 3-dən yüksəkdir. |
| `pizza-hut-r16` / B16 | Bütün işçilər sosial şəbəkələr və KİV ilə davranış qaydalarını bilirlər | Bütün əməkdaşlar sosial şəbəkələrdə və kütləvi informasiya vasitələri ilə ünsiyyətdə davranış qaydalarını bilirlər. |
| `pizza-hut-r18` / B18 | İşə qəbul zamanı bütün qəbul pillələrindən istifadə olunur | İşə qəbul prosesinin bütün mərhələləri tətbiq olunur. |
| `pizza-hut-r19` / B19 | Menecer işə qəbul namizədlərinə necə cavab verməli olduğunu və müsahibəni kimin keçirməli olduğunu bilir | Menecer işə qəbul namizədlərinə necə cavab verməli olduğunu və müsahibəni kimin keçirməli olduğunu bilir. |
| `pizza-hut-r20` / B20 | Əmək haqqı ilə bağlı məlumatlar düzgündür | Əməkhaqqı barədə məlumatlar düzgündür. |
| `pizza-hut-r21` / B21 | İşə qəbul anketləri kifayət qədərdir və namizədlər üçün əlçatan yerdədir | İşə qəbul anketləri kifayət qədərdir və namizədlər üçün əlçatandır. |
| `pizza-hut-r22` / B22 | Reklam materialları keyfiyyətlidir (Qovluqlar)  | Reklam materialları (qovluqlar) keyfiyyətlidir. |
| `pizza-hut-r23` / B23 | On - boarding istifadə olunur | Yeni əməkdaşların işə uyğunlaşması prosesi tətbiq olunur. |
| `pizza-hut-r24` / B24 | "Dostunu gətir" plakatı mövcuddur (işçilərin görməsi üçün asılmışdır və yaxşı vəziyyətdədir), işçilər proqram haqqında məlumatlandırılmışdır | “Dostunu gətir” plakatı əməkdaşların görə biləcəyi yerdə asılıb, yaxşı vəziyyətdədir və əməkdaşlar proqram barədə məlumatlıdırlar. |
| `pizza-hut-r26` / B26 | İşçiyə işə başladığı ilk gün Təlimçi  təyin edilib | Əməkdaşa işə başladığı ilk gün təlimçi təyin edilib. |
| `pizza-hut-r27` / B27 | Hər bir işçi ən azı 1 modül üzrə sertifikasiyadan keçib | Hər bir əməkdaş ən azı bir modul üzrə sertifikasiyadan keçib. |
| `pizza-hut-r28` / B28 | İşçi növbəti pilləyə keçmək üçün nə etməli və öyrənməli olduğunu bilir, İşçi bütün karyera imkanlarını bilir  | Əməkdaş növbəti vəzifə pilləsinə keçmək üçün nə etməli və nəyi öyrənməli olduğunu bilir, bütün karyera imkanlarından xəbərdardır. |
| `pizza-hut-r29` / B29 |  "Sənin karyera yolun" plakatı mövcuddur, işçilərin görə biləcəkləri yerdədir, məlumatlar aktualdır | “Sənin karyera yolun” plakatı əməkdaşların görə biləcəyi yerdədir və məlumatlar aktualdır. |
| `pizza-hut-r30` / B30 | Əməkdaşlar (BÜ) son yeniləkləri bilir | Əməkdaşlar (BÜ) son yeniliklər barədə məlumatlıdırlar. |
| `pizza-hut-r31` / B31 | İşçi neçə saat işlədiyini və müvafiq məlumatı hardan əldən etməli olduğunu bilir | Əməkdaş neçə saat işlədiyini və bu məlumatı haradan əldə edə biləcəyini bilir. |
| `pizza-hut-r32` / B32 | İşçi Qid Təhülkəsizliyi qaydaları bilir | Əməkdaş qida təhlükəsizliyi qaydalarını bilir. |
| `pizza-hut-r33` / B33 | İşçi ƏM/YT qayldalarını bilir | Əməkdaş ƏM/YT qaydalarını bilir. |
| `pizza-hut-r34` / B34 | İşçi satış üzrə məqsədləri bilir | Əməkdaş satış üzrə hədəfləri bilir. |
| `pizza-hut-r35` / B35 | İşçi Hut university  sisteminin nə olduğunu və necə işləmək lazım olduğunu bilir | Əməkdaş Hut University sisteminin nə olduğunu və ondan necə istifadə etməli olduğunu bilir. |
| `pizza-hut-r36` / B36 | İşçi ACE nə olduğunu bilir. L3 sapmaları bilir | Əməkdaş ACE-nin nə olduğunu və L3 üzrə kənarlaşmaları bilir. |
| `pizza-hut-r37` / B37 | İşçi restoranın bütün motivasiya proqramlarını bilir | Əməkdaş restoranın bütün motivasiya proqramları barədə məlumatlıdır. |
| `pizza-hut-r38` / B38 | İşçi uniforması standartlarını bilir | Əməkdaş iş geyimi standartlarını bilir. |
| `pizza-hut-r39` / B39 | Geyim otağında uniforma standartları ilə bağlı yaddaş kitabçaları mövcuddur | Geyim otağında iş geyimi standartlarına dair yaddaş kitabçaları mövcuddur. |
| `pizza-hut-r41` / B41 |  İşçilər üçün ərazilər (qarderob otağı, tualet otağı və yemək otağı) təmizdir, səliqəlidir, texniki cəhətdən işləkdir, temperatur yaxşıdır, ütü və ütü masası vardır İşçilər üçün ərazilər (qarderob otağı, tualet otağı və yemək otağı) təmizdir, səliqəlidir, texniki cəhətdən işləkdir, temperatur yaxşıdır, ütü və ütü masası vardır | Əməkdaşlar üçün nəzərdə tutulmuş geyim, tualet və yemək otaqları təmiz, səliqəli və texniki cəhətdən işləkdir; temperatur normaldır, ütü və ütü masası mövcuddur. |
| `pizza-hut-r42` / B42 |   Cari rüb üzrə işçi dövriyyəsi plana uyğundur | Cari rüb üzrə əməkdaş dövriyyəsi plana uyğundur. |
| `pizza-hut-r43` / B43 | Cari il üçün məzuniyyət qrafikinin mövcuddur. Restoran müdiri işçilərin məzuniyyət günlənin sayına nəzarət edir | Cari il üzrə məzuniyyət qrafiki mövcuddur və restoran müdiri əməkdaşların məzuniyyət günlərinin sayına nəzarət edir. |
| `pizza-hut-r44` / B44 | Məlumatlar əlçatandır: Məlumat löhvəsində ACE nəticələri, Satış, Reytinq nəticə və məqsədləri qeyd edilib  | ACE nəticələri, satış və reytinq üzrə nəticə və hədəflər məlumat lövhəsində göstərilir və əməkdaşlar üçün əlçatandır. |
| `pizza-hut-r45` / B45 | Restoran komandası ilə ayda 1 dəfə iclas keçirilir. İclasın keçirilməsi üzrə protokol mövcuddur | Restoran komandası ilə ayda bir dəfə iclas keçirilir və iclas protokolu mövcuddur. |
| `pizza-hut-r47` / B47 | Kadr ehtiyatının saxlanması üzrə restoranda iş aparılır | Restoranda kadr ehtiyatının saxlanması üzrə iş aparılır. |
| `pizza-hut-r48` / B48 | PPR kadr ehtiyatı planı aylıq yenilənir | PPR kadr ehtiyatı planı hər ay yenilənir. |
| `pizza-hut-r49` / B49 | İdarə heyəti əməkdaşlarının (NM, ARGM, RGM) şəxsi qovluğu var, lazım olan sənədlər mövcuddur | İdarəetmə heyəti üzvlərinin (NM, ARGM, RGM) şəxsi iş qovluqları və tələb olunan sənədləri mövcuddur. |
| `pizza-hut-r50` / B50 | Təlimçilər BÜ təlim əsaslarını, modullar üzrə müddətləri və 4 mərhələli təlim prosesini bilirlər | Təlimçilər BÜ üçün təlimin əsaslarını, modullar üzrə müddətləri və dördmərhələli təlim prosesini bilirlər. |
| `pizza-hut-r51` / B51 | Kassa stansiyasında çalışan bütün işçilər müvafiq modul üzrə sertifikasiyadan keçiblər | Kassa stansiyasında çalışan bütün əməkdaşlar müvafiq modul üzrə sertifikasiyadan keçiblər. |
| `pizza-hut-r52` / B52 | Xəmir stansiyasında çalışan bütün işçilər müvafiq modul üzrə sertifikasiyadan keçiblər | Xəmir stansiyasında çalışan bütün əməkdaşlar müvafiq modul üzrə sertifikasiyadan keçiblər. |
| `pizza-hut-r53` / B53 | Pizza hazırlama stansiyasında çalışan bütün işçilər müvafiq modul üzrə sertifikasiyadan keçiblər | Pizza hazırlama stansiyasında çalışan bütün əməkdaşlar müvafiq modul üzrə sertifikasiyadan keçiblər. |
| `pizza-hut-r54` / B54 | Doğrama stansiyasında çalışan bütün işçilər müvafiq modul üzrə sertifikasiyadan keçiblər | Doğrama stansiyasında çalışan bütün əməkdaşlar müvafiq modul üzrə sertifikasiyadan keçiblər. |
| `pizza-hut-r55` / B55 | Təlimçi restoran göstəricilərini bilir (Satış, ACE, L3, son yeniliklər) | Təlimçi restoranın satış, ACE və L3 göstəricilərini, eləcə də son yenilikləri bilir. |
| `pizza-hut-r56` / B56 | Təlimci son dəyişiklikləri bilir (təlim, aksiyalar, məqsəd) | Təlimçi təlimlər, kampaniyalar və hədəflərlə bağlı son dəyişiklikləri bilir. |
| `pizza-hut-r57` / B57 | Təlimçi Hut university proqramda işləyə bilir | Təlimçi Hut University sistemindən istifadə edə bilir. |
| `pizza-hut-r58` / B58 | BÜ şəxsi qovluqları var, lazım olan sənədlər mövcuddur  | BÜ üçün şəxsi iş qovluqları və tələb olunan sənədlər mövcuddur. |
| `pizza-hut-r59` / B59 | Təlimçi şəxsi qovluqda təlimçi çek-listi var | Təlimçinin şəxsi iş qovluğunda təlimçi yoxlama siyahısı mövcuddur. |
| `pizza-hut-r60` / B60 | İdarə Heyəti əməkdaşı (NM, ARGM, RGM) restoranın əsas satış üzrə məqsədləri və nəticiləri bilir | İdarəetmə heyəti üzvü (NM, ARGM, RGM) restoranın əsas satış hədəflərini və nəticələrini bilir. |
| `pizza-hut-r61` / B61 | İdarə Heyəti əməkdaşı (NM, ARGM, RGM) BSC/GES/ACE nə olduğunu və nəticələri bilir | İdarəetmə heyəti üzvü (NM, ARGM, RGM) BSC/GES/ACE-nin nə olduğunu və nəticələrini bilir. |
| `pizza-hut-r62` / B62 | İdarə Heyəti əməkdaşı (NM, ARGM, RGM) Silinmə/işçi axını/COL nəticələrini bilir | İdarəetmə heyəti üzvü (NM, ARGM, RGM) silinmə, əməkdaş dövriyyəsi və COL nəticələrini bilir. |
| `pizza-hut-r63` / B63 | Resurs açılır və istifadə olunur | Mənbədə “Resurs” adlandırılan vasitə açılır və istifadə olunur. |
| `pizza-hut-r64` / B64 | Komandanın >90% "Şirkətlə Tanışlıq" seminarında iştirak edib | Komandanın 90%-dən çoxu “Şirkətlə tanışlıq” seminarında iştirak edib. |
| `pizza-hut-r65` / B65 | Komandanın >90% "Qida Təhlükəsizliyi" təlimində iştirak edib | Komandanın 90%-dən çoxu “Qida təhlükəsizliyi” təlimində iştirak edib. |
| `pizza-hut-r66` / B66 | İdarə Heyəti əməkdaşı (NM, ARGM) "ABR" təlimində iştirak edib | İdarəetmə heyəti üzvü (NM, ARGM) “ABR” təlimində iştirak edib. |
| `pizza-hut-r67` / B67 | İdarə Heyəti əməkdaşı (NM, ARGM, RGM) "Əməyin Mühafizəsi" təlimində iştirak edib | İdarəetmə heyəti üzvü (NM, ARGM, RGM) “Əməyin mühafizəsi” təlimində iştirak edib. |
| `pizza-hut-r68` / B68 | Təlim keçmiş əməkdaşların qeydiyyatı aparılır və (Təlim izlənmə blankı) aktualdır | Təlim keçmiş əməkdaşların qeydiyyatı aparılır və təlimlərin izlənməsi forması aktualdır. |
| `pizza-hut-r69` / B69 | İdarə Heyəti əməkdaşı (NM, ARGM, RGM) Hut University proqramda işləyə bilir | İdarəetmə heyəti üzvü (NM, ARGM, RGM) Hut University sistemindən istifadə edə bilir. |
| `pizza-hut-r71` / B71 |  SUSMA! Plakatı mövcuddur və işçilərin görə biləcəyi yerdədir. | “SUSMA!” plakatı əməkdaşların görə biləcəyi yerdədir. |
| `pizza-hut-r72` / B72 | Restoranda işçilər ad günləri və şəxsi nailiyyətlərinə görə təbrik olunur | Restoranda əməkdaşlar ad günləri və şəxsi nailiyyətləri münasibətilə təbrik olunurlar. |
| `pizza-hut-r73` / B73 | Əməkdaşlarla mütəmadi əks-əlaqə (və ya Tet-a-tet) söhbətləri aparılır | Əməkdaşlarla mütəmadi fərdi əks-əlaqə söhbətləri aparılır. |
| `pizza-hut-r74` / B74 | İşdən çıxan əməkdaşlarla şifahi exit-müsahibə aparır və səbəbi bilir (NM, ARGM, RGM) | İdarəetmə heyəti üzvü (NM, ARGM, RGM) işdən ayrılan əməkdaşlarla şifahi yekun müsahibə aparır və ayrılma səbəbini bilir. |
| `pizza-hut-r75` / B75 | Restoran EES nədir bilir, nəticələrindən xəbərdardır və fəaliyyət planı mövcuddur | Restoran komandası EES-in nə olduğunu və nəticələrini bilir, fəaliyyət planı mövcuddur. |
| `pizza-hut-r76` / B76 | Restoranda etiraf sistemi çalışır, etiraf kartları mövcuddur | Restoranda əməkdaşların nailiyyətlərinin təqdir edilməsi sistemi işləyir və təqdir kartları mövcuddur. |
| `pizza-hut-r78` / B78 |  İş cədvəlində işçilərin cədvəllə tanış olmasını təsdiqləyən imzaları mövcuddur | İş qrafiki ilə tanışlığı təsdiqləyən əməkdaş imzaları mövcuddur. |
| `pizza-hut-r79` / B79 | İşçilərin cədvəl üzrə istəkləri nəzərə alınır, iş cədvəli həftənin cümə axşamından gec olmayaraq asılır | Əməkdaşların iş qrafiki ilə bağlı istəkləri nəzərə alınır və qrafik cümə axşamından gec olmayaraq asılır. |
| `pizza-hut-r80` / B80 | İş cədvələnin hazırlanması ƏM uyğun şəkildə həyata keçirilir. İşçilər iş saatlarına harada baxa biləcəklərini bilirlər | İş qrafiki ƏM tələblərinə uyğun hazırlanır və əməkdaşlar iş saatlarına haradan baxa biləcəklərini bilirlər. |
| `pizza-hut-r82` / B82 | Bütün yeni işçilər ilk iş günlərində əməyin mühafizəsi və təhlükəsizlik texnikası üzrə təlim keçmişdir və daha sonra mütəmadi olaraq kompleks təlim keçir | Bütün yeni əməkdaşlar ilk iş günlərində əməyin mühafizəsi və təhlükəsizlik texnikası üzrə təlim keçirlər, sonra isə mütəmadi kompleks təlimlərdə iştirak edirlər. |
| `pizza-hut-r83` / B83 |  Fərdi Qorunma Vasitələri (FQV) yerli tələblərə və ya normativ-hüquqi aktlara uyğun olaraq mövcuddur və yaxşı vəziyyətdədir | Fərdi qorunma vasitələri (FQV) yerli tələblərə və ya normativ hüquqi aktlara uyğun şəkildə mövcuddur və yaxşı vəziyyətdədir. |
| `pizza-hut-r84` / B84 | İşçilər təxliyyə qaydaları və toplanış məntəqəsinin harada olduğunu bilirlər | Əməkdaşlar təxliyə qaydalarını və toplanış məntəqəsinin yerini bilirlər. |
| `pizza-hut-r85` / B85 | "Fövqəladə hallar" plakatı işçilərin görəcəyi yerdə yerləşir, işçilər məlumatlıdır.  | “Fövqəladə hallar” plakatı əməkdaşların görə biləcəyi yerdədir və əməkdaşlar məlumatlıdırlar. |
| `simit-sarayi-r12` / B12 | İşə qəbul zamanı bütün qəbul pillələrindən istifadə olunur | İşə qəbul prosesinin bütün mərhələləri tətbiq olunur. |
| `simit-sarayi-r13` / B13 | Menecer vakantlarla müsahibəni necə keçirməli olduğunu bilir | Menecer vakansiyalara müraciət edən namizədlərlə müsahibəni necə keçirməli olduğunu bilir. |
| `simit-sarayi-r14` / B14 | İşə qəbul anketləri kifayət qədərdir və namizədlər üçün əlçatandır | İşə qəbul anketləri kifayət qədərdir və namizədlər üçün əlçatandır. |
| `simit-sarayi-r15` / B15 | Əməkdaşlar "Dostunu gətir" proqramı haqqında məlumatlandırılmışdır | Əməkdaşlar “Dostunu gətir” proqramı barədə məlumatlıdırlar. |
| `simit-sarayi-r16` / B16 | Bütün işçilər sosial şəbəkələr və KİV ilə davranış qaydalarını bilirlər | Bütün əməkdaşlar sosial şəbəkələrdə və kütləvi informasiya vasitələri ilə ünsiyyətdə davranış qaydalarını bilirlər. |
| `simit-sarayi-r19` / B19 | Yeni əməkdaş işə başladığı ilk gün Təlimçi/İnstruktor təyin edilib | Yeni əməkdaşa işə başladığı ilk gün təlimçi və ya instruktor təyin edilib. |
| `simit-sarayi-r20` / B20 | Əməkdaşlar sertifikasiyadan keçmişdir | Əməkdaşlar sertifikasiyadan keçiblər. |
| `simit-sarayi-r21` / B21 | Əməkdaşlar resertifikasiyadan keçmişdir | Əməkdaşlar təkrar sertifikasiyadan keçiblər. |
| `simit-sarayi-r22` / B22 | Əməkdaşlar növbəti pilləyə keçmək üçün nə etməli və öyrənməli olduğunu bilir | Əməkdaşlar növbəti vəzifə pilləsinə keçmək üçün nə etməli və nəyi öyrənməli olduqlarını bilirlər. |
| `simit-sarayi-r23` / B23 | Təlimçilər BÜ təlim əsaslarını, modullar üzrə 5 mərhələli təlim prosesini bilir | Təlimçilər BÜ üçün təlimin əsaslarını və modullar üzrə beşmərhələli təlim prosesini bilirlər. |
| `simit-sarayi-r24` / B24 | Əməkdaşlar əsas Simit Sarayı faktların bilirlər | Əməkdaşlar Simit Sarayı haqqında əsas məlumatları bilirlər. |
| `simit-sarayi-r25` / B25 | Əməkdaşlar bütün karyera imkanlarını bilir (Karyera yolu blankı var) | Əməkdaşlar bütün karyera imkanlarını bilirlər və “Karyera yolu” forması mövcuddur. |
| `simit-sarayi-r26` / B26 | Əməkdaşlar "Şirkətlə Tanışlıq" seminarında iştirak edib | Əməkdaşlar “Şirkətlə tanışlıq” seminarında iştirak ediblər. |
| `simit-sarayi-r27` / B27 | Əməkdaşlar "Qida Təhlükəsizlik" təlimində iştirak edib | Əməkdaşlar “Qida təhlükəsizliyi” təlimində iştirak ediblər. |
| `simit-sarayi-r28` / B28 | Əməkdaşlar "Satış" təlimində iştirak edib | Əməkdaşlar “Satış” təlimində iştirak ediblər. |
| `simit-sarayi-r29` / B29 | Təlimçi "Təlimçi" seminarında iştirak edib | Təlimçi “Təlimçi” seminarında iştirak edib. |
| `simit-sarayi-r30` / B30 | İdarə Heyəti əməkdaşı (NM, ARGM) "Menecer" seminarında iştirak edib | İdarəetmə heyəti üzvü (NM, ARGM) “Menecer” seminarında iştirak edib. |
| `simit-sarayi-r31` / B31 | İdarə Heyəti əməkdaşı (NM, ARGM) "Liderlik" təlimində iştirak edib | İdarəetmə heyəti üzvü (NM, ARGM) “Liderlik” təlimində iştirak edib. |
| `simit-sarayi-r32` / B32 | İdarə Heyəti əməkdaşı (NM, ARGM) "ABR" təlimində iştirak edib | İdarəetmə heyəti üzvü (NM, ARGM) “ABR” təlimində iştirak edib. |
| `simit-sarayi-r33` / B33 | İdarə Heyəti əməkdaşı (NM, ARGM) "Əməyin Mühafizəsi" təlimində iştirak edib | İdarəetmə heyəti üzvü (NM, ARGM) “Əməyin mühafizəsi” təlimində iştirak edib. |
| `simit-sarayi-r34` / B34 | Təlim keçmiş əməkdaşların qeydiyyatı aparılır və (Təlim izlənmə blankı) aktualdır | Təlim keçmiş əməkdaşların qeydiyyatı aparılır və təlimlərin izlənməsi forması aktualdır. |
| `simit-sarayi-r37` / B37 | Aylıq iclas keçirilir | Hər ay iclas keçirilir. |
| `simit-sarayi-r38` / B38 | Əməkdaşlarla mütəmadi əks-əlaqə (və ya Tet-a-tet) söhbətləri aparılır | Əməkdaşlarla mütəmadi fərdi əks-əlaqə söhbətləri aparılır. |
| `simit-sarayi-r39` / B39 | Əməkdaşlar restoranın bütün motivasiya proqramlarını bilir | Əməkdaşlar restoranın bütün motivasiya proqramları barədə məlumatlıdırlar. |
| `simit-sarayi-r40` / B40 | Cari kvartal üzrə işçi dövriyyəsi plana uyğundur | Cari rüb üzrə əməkdaş dövriyyəsi plana uyğundur. |
| `simit-sarayi-r41` / B41 | İşdən çıxan əməkdaşlarla şifahi exit-müsahibə aparır və səbəbi bilir (NM, ARGM) | İdarəetmə heyəti üzvü (NM, ARGM) işdən ayrılan əməkdaşlarla şifahi yekun müsahibə aparır və ayrılma səbəbini bilir. |
| `simit-sarayi-r42` / B42 | Restoranda əməkdaşların ad günləri və şəxsi nailiyyətlərinə görə təbrik olunur | Restoranda əməkdaşlar ad günləri və şəxsi nailiyyətləri münasibətilə təbrik olunurlar. |
| `simit-sarayi-r43` / B43 | Restoranda etiraf sistemi çalışır, etiraf kartları mövcuddur | Restoranda əməkdaşların nailiyyətlərinin təqdir edilməsi sistemi işləyir və təqdir kartları mövcuddur. |
| `simit-sarayi-r44` / B44 | Restoran EES nədir bilir, nəticələrindən xəbərdardır və fəaliyyət planı mövcuddur | Restoran komandası EES-in nə olduğunu və nəticələrini bilir, fəaliyyət planı mövcuddur. |
| `simit-sarayi-r45` / B45 | Elan lövhəsi/daxili kommunikasiya kanalı aktual məlumatla yenilənir | Elan lövhəsində və ya daxili kommunikasiya kanalında məlumatlar yenilənir və aktual saxlanılır. |
| `simit-sarayi-r48` / B48 | Cari il üçün məzuniyyət qrafikinin mövcudluğu | Cari il üzrə məzuniyyət qrafiki mövcuddur. |
| `simit-sarayi-r49` / B49 | Şəxsi işlər qaydasındadır | Əməkdaşların şəxsi işləri qaydasındadır. |
| `simit-sarayi-r50` / B50 | SUSMA! Plakatı mövcuddur və işçilərin görə biləcəyi yerdədir | “SUSMA!” plakatı əməkdaşların görə biləcəyi yerdədir. |
| `simit-sarayi-r51` / B51 | Daxili İntizam Qaydaları ilə əməkdaş tanış edilib və imza vərəqi mövcuddur | Əməkdaş daxili intizam qaydaları ilə tanış edilib və bunu təsdiqləyən imza vərəqi mövcuddur. |
| `simit-sarayi-r52` / B52 | İş qrafiki Əmək Məcəlləsinə uyğundur (həftəlik saat limiti, istirahət günləri) | İş qrafiki həftəlik iş saatı limiti və istirahət günləri baxımından Əmək Məcəlləsinə uyğundur. |

## Auditor təlimatları

| Meyar | Orijinal təlimat | Redaktə edilmiş AZ təlimat |
|---|---|---|
| `kfc-r78` | Xostesdən soruşmaq : xostesdən öhdəlikləri; onun məsul olduğunu təlim mərhələləri. Təlim üzrə modul keçirilmişdir və qiymətləndirmə vərəqini yoxlamaq | Qonaqları qarşılayan əməkdaşdan vəzifə öhdəliklərini və cavabdeh olduğu təlim mərhələlərini soruşun. Təlim modulunun keçirildiyini və qiymətləndirmə vərəqini yoxlayın. |
| `kfc-r79` | Klikundan soruşmaq: klikun öhdəlikləri; onun məsul olduğunu təlim mərhələləri və KPİ. Təlim üzrə modul keçirilmişdirvə qiymətləndirmə vərəqini yoxlamaq | “Klikun” vəzifəsini tutan əməkdaşdan öhdəliklərini, cavabdeh olduğu təlim mərhələlərini və KPI göstəricilərini soruşun. Təlim modulunun keçirildiyini və qiymətləndirmə vərəqini yoxlayın. |
| `kfc-r80` | Skautdan soruşmaq : xostesdən öhdəlikləri; onun məsul olduğunu təlim mərhələləri və KPİ. Təlim üzrə modul keçirilmişdir. The Vault sistemini və qiymətləndirmə vərəqini yoxlamaq | Skautdan vəzifə öhdəliklərini, cavabdeh olduğu təlim mərhələlərini və KPI göstəricilərini soruşun. Təlim modulunun keçirildiyini, The Vault sistemini və qiymətləndirmə vərəqini yoxlayın. |
| `kfc-r81` | Brend Şefden soruşmaq: xostesdən öhdəlikləri; onun məsul olduğunu təlim mərhələləri və KPİ. Təlim üzrə modul keçirilmişdir  və qiymətləndirmə vərəqini yoxlamaq | Brend üzrə baş aşpazdan vəzifə öhdəliklərini, cavabdeh olduğu təlim mərhələlərini və KPI göstəricilərini soruşun. Təlim modulunun keçirildiyini və qiymətləndirmə vərəqini yoxlayın. |
| `pizza-hut-r8` | Yaddaş kitabçaları yerindədir, işçilərdən lazımi məlumatları hardan əldə edəcəklərini bilib-bilmədiklərini soruşmaq | Yaddaş kitabçalarının yerində olduğunu yoxlayın və əməkdaşlardan lazımi məlumatı haradan əldə edə biləcəklərini soruşun. |
| `pizza-hut-r9` | Yaddaş kitabçaları yerindədir, işçilərdən lazımi məlumatları hardan əldə edəcəklərini bilib-bilmədiklərini soruşmaq | Yaddaş kitabçalarının yerində olduğunu yoxlayın və əməkdaşlardan lazımi məlumatı haradan əldə edə biləcəklərini soruşun. |
| `pizza-hut-r10` | Yaddaş kitabçaları yerindədir, işçilərdən lazımi məlumatları hardan əldə edəcəklərini bilib-bilmədiklərini soruşmaq | Yaddaş kitabçalarının yerində olduğunu yoxlayın və əməkdaşlardan lazımi məlumatı haradan əldə edə biləcəklərini soruşun. |
| `pizza-hut-r11` | Yaddaş kitabçaları yerindədir, işçilərdən lazımi məlumatları hardan əldə edəcəklərini bilib-bilmədiklərini soruşmaq | Yaddaş kitabçalarının yerində olduğunu yoxlayın və əməkdaşlardan lazımi məlumatı haradan əldə edə biləcəklərini soruşun. |
| `pizza-hut-r12` | İşçiləri müşahidə etmək və iş qaydalarına necə riayət etdiklərini yoxlamaq mətbəx stansiyası işçisinin öhdəlikləri, əl yuma qaydaları, kimyəvi vasitələrlə iş və s.) | Əməkdaşların iş qaydalarına, o cümlədən mətbəx stansiyasındakı vəzifələrə, əl yuma və kimyəvi vasitələrlə işləmə qaydalarına riayət etmələrini müşahidə edin. |
| `pizza-hut-r13` | İşçiləri müşahidə etmək və iş qaydalarına necə riayət etdiklərini yoxlamaq mətbəx stansiyası işçisinin öhdəlikləri, əl yuma qaydaları, kimyəvi vasitələrlə iş və s.) | Əməkdaşların iş qaydalarına, o cümlədən mətbəx stansiyasındakı vəzifələrə, əl yuma və kimyəvi vasitələrlə işləmə qaydalarına riayət etmələrini müşahidə edin. |
| `pizza-hut-r14` | Yoxlamaq | Yoxlayın. |
| `pizza-hut-r15` | Sistemdə yoxlamaq | Sistemdə yoxlayın. |
| `pizza-hut-r16` | İşçilər sosial şəbəkələr və KİV ilə davranış qaydalarını, necə reaksiya verməli olduqlarını bilirlər, restoranın hər kəsə açıq sosial şəbəkə hesabı yoxdur | Əməkdaşların sosial şəbəkələrdə və KİV ilə ünsiyyətdə davranış və reaksiya qaydalarını bildiklərini, restoranın hər kəsə açıq sosial şəbəkə hesabının olmadığını yoxlayın. |
| `pizza-hut-r18` |  RGM/ARGM-dən işə qəbul pillələrini soruşmaq | RGM/ARGM-dən işə qəbul mərhələlərini soruşun. |
| `pizza-hut-r19` | Menecerdən iş şərtləri və əmək haqqı, həmçinin namizədə hansı sualları verməli olduğu (yaddaş kitabçası üzrə) haqda soruşmaq | Menecerdən iş şərtləri, əməkhaqqı və yaddaş kitabçasına əsasən namizədə verilməli suallar barədə soruşun. |
| `pizza-hut-r20` | Bir neçə işçidən soruşmaq | Bir neçə əməkdaşdan soruşun. |
| `pizza-hut-r21` | Yoxlama,Restoranda kifayət qədər materialın olub-olmamasını və işə qəbul məlumatlarının Qonaqlara əlçatan olmasını qiymətləndirmək | Restoranda materialların kifayət qədər olduğunu və işə qəbul məlumatlarının qonaqlar üçün əlçatanlığını qiymətləndirin. |
| `pizza-hut-r22` | Yoxlama,Restoranda kifayət qədər materialın olub-olmamasını və işə qəbul məlumatlarının Qonaqlara əlçatan olmasını qiymətləndirmək | Restoranda materialların kifayət qədər olduğunu və işə qəbul məlumatlarının qonaqlar üçün əlçatanlığını qiymətləndirin. |
| `pizza-hut-r23` | Təzə işçidən soruşmaq | Yeni əməkdaşdan soruşun. |
| `pizza-hut-r24` | Bir neçə işçidən soruşmaq və plakatın vəziyyətini yoxlamaq | Bir neçə əməkdaşdan soruşun və plakatın vəziyyətini yoxlayın. |
| `pizza-hut-r26` | İşçidən soruşmaq  | Əməkdaşdan soruşun. |
| `pizza-hut-r27` | Hut university sistemı yoxlamaq (OCL) | Hut University sistemində yoxlayın (OCL). |
| `pizza-hut-r28` | Bir necə işçidən soruşmaq | Bir neçə əməkdaşdan soruşun. |
| `pizza-hut-r29` | Yoxlamaq | Yoxlayın. |
| `pizza-hut-r30` | Bir necə işçidən soruşmaq | Bir neçə əməkdaşdan soruşun. |
| `pizza-hut-r31` |  Yeni işçidən soruşmaq, onun problem yarandıqda kimə müraciət etməli olduğunu bildiyindən əmin olmaq. İşçi əmək haqqının hesablanmasına dair nümunə göstərə bilir, həftəlik iş cədvəlinə harada baxmalı olduğunu bilir | Yeni əməkdaşdan soruşun və problem yarandıqda kimə müraciət etməli olduğunu bildiyini yoxlayın. Əməkdaş əməkhaqqının hesablanmasına dair nümunə göstərə və həftəlik iş qrafikinə haradan baxmalı olduğunu izah edə bilməlidir. |
| `pizza-hut-r32` | Bir necə işçidən soruşmaq | Bir neçə əməkdaşdan soruşun. |
| `pizza-hut-r33` | Bir necə işçidən soruşmaq | Bir neçə əməkdaşdan soruşun. |
| `pizza-hut-r34` | Bir necə işçidən soruşmaq | Bir neçə əməkdaşdan soruşun. |
| `pizza-hut-r35` | Bir necə işçidən soruşmaq | Bir neçə əməkdaşdan soruşun. |
| `pizza-hut-r36` | Bir necə işçidən soruşmaq | Bir neçə əməkdaşdan soruşun. |
| `pizza-hut-r37` | Bir necə işçidən soruşmaq | Bir neçə əməkdaşdan soruşun. |
| `pizza-hut-r38` | İşçidə yeni uniforma komplekti var | Əməkdaşda yeni iş geyimi dəstinin olduğunu yoxlayın. |
| `pizza-hut-r39` | Yaddaş kitabçaları yerindədir, işçilərdən lazımi məlumatları hardan əldə edəcəklərini bilir | Yaddaş kitabçalarının yerində olduğunu və əməkdaşların lazımi məlumatı haradan əldə edə biləcəklərini bildiklərini yoxlayın. |
| `pizza-hut-r41` | Ərazini yoxlamaq | Əməkdaşlar üçün nəzərdə tutulmuş sahələri yoxlayın. |
| `pizza-hut-r42` | Menecerdən işçinin işdən çıxarılmasının əsas qaydalarını soruşmaq | Menecerdən əməkdaşın işdən çıxarılmasının əsas qaydalarını soruşun. |
| `pizza-hut-r43` | Yoxlamaq | Yoxlayın. |
| `pizza-hut-r44` | İşçilər cari yeniliklərdən, Qonaqların nədən şikayət etdiklərindən, DP yerinə yetirilib-yetirilməməsindən, ACE yoxlamasının nəticələri və əsas pozuntulardan xəbərdardır | Əməkdaşların cari yenilikləri, qonaqların şikayət səbəblərini, DP-nin yerinə yetirilməsini, ACE yoxlamasının nəticələrini və əsas pozuntuları bildiklərini yoxlayın. |
| `pizza-hut-r45` | Bir neçə menecer və işçidən nəyin müzakirə olunduğunu və kimlərin etiraf edildiyini soruşmaq | Bir neçə menecer və əməkdaşdan iclasda nələrin müzakirə olunduğunu və kimlərin nailiyyətlərinin təqdir edildiyini soruşun. |
| `pizza-hut-r47` | Növbədəki işçilərlə söhbət etmək. İşçi təlimdəki məlumatlardan xəbərdardır və qarşıdakı sertifikasiya tarixini bilir  | Növbədəki əməkdaşlarla söhbət edin; onların təlim məlumatlarını və qarşıdakı sertifikasiya tarixini bildiklərini yoxlayın. |
| `pizza-hut-r48` | Aktual PPR mövcuddur, aylıq mütəmadi ƏM ilə görüşlər aparılır, işçilərin inkişaf planı mövcuddur, gələcək tədbirlərin müddətləri təyin olunmuşdur, restoran müdiri kadr ehtiyatı üzrə məqsədlərdən xəbərdardır | Aktual PPR-ni, ƏM ilə aylıq görüşləri, əməkdaşların inkişaf planını və gələcək tədbirlərin müddətlərini yoxlayın; restoran müdirinin kadr ehtiyatı hədəflərini bildiyinə əmin olun. |
| `pizza-hut-r49` | Menecer həyatının şəxsi qovluqlarını yoxlamaq | Menecerlərin şəxsi iş qovluqlarını yoxlayın. |
| `pizza-hut-r50` | Bir neçə təlimçidən soruşmaq | Bir neçə təlimçidən soruşun. |
| `pizza-hut-r51` | Hut university sistemı yoxlamaq (OCL) | Hut University sistemində yoxlayın (OCL). |
| `pizza-hut-r52` | Hut university sistemı yoxlamaq (OCL) | Hut University sistemində yoxlayın (OCL). |
| `pizza-hut-r53` | Hut university sistemı yoxlamaq (OCL) | Hut University sistemində yoxlayın (OCL). |
| `pizza-hut-r54` | Hut university sistemı yoxlamaq (OCL) | Hut University sistemində yoxlayın (OCL). |
| `pizza-hut-r55` | Təlimçidən soruşmaq | Təlimçidən soruşun. |
| `pizza-hut-r56` | Təlimçidən soruşmaq | Təlimçidən soruşun. |
| `pizza-hut-r57` | Təlimçidən soruşmaq | Təlimçidən soruşun. |
| `pizza-hut-r58` | BÜ şəxsi qovluqlarını soruşmaq | BÜ üçün şəxsi iş qovluqlarını istəyin. |
| `pizza-hut-r59` | Təlimçi şəxsi qovluqunu yoxlamaq | Təlimçinin şəxsi iş qovluğunu yoxlayın. |
| `pizza-hut-r60` | Növbə menecerdən soruşmaq | Növbə menecerindən soruşun. |
| `pizza-hut-r61` | Növbə menecerdən soruşmaq | Növbə menecerindən soruşun. |
| `pizza-hut-r62` | Növbə menecerdən soruşmaq | Növbə menecerindən soruşun. |
| `pizza-hut-r63` | Növbə menecerdən soruşmaq | Növbə menecerindən soruşun. |
| `pizza-hut-r64` | Təlim izlənmə blankını yoxla | Təlimlərin izlənməsi formasını yoxlayın. |
| `pizza-hut-r65` | Təlim izlənmə blankını yoxla | Təlimlərin izlənməsi formasını yoxlayın. |
| `pizza-hut-r66` | Təlim izlənmə blankını yoxla | Təlimlərin izlənməsi formasını yoxlayın. |
| `pizza-hut-r67` | Təlim izlənmə blankını yoxla | Təlimlərin izlənməsi formasını yoxlayın. |
| `pizza-hut-r68` | Təlim izlənmə blankını yoxla | Təlimlərin izlənməsi formasını yoxlayın. |
| `pizza-hut-r69` | Növbə menecerdən soruşmaq | Növbə menecerindən soruşun. |
| `pizza-hut-r71` | Bir neçə işçidən soruşmaq  | Bir neçə əməkdaşdan soruşun. |
| `pizza-hut-r72` | Bir neçə işçidən məlumatlı olub-olmamalarını soruşmaq | Bir neçə əməkdaşın bu barədə məlumatlı olub-olmadığını soruşun. |
| `pizza-hut-r73` | Bir neçə işçidən soruşmaq  | Bir neçə əməkdaşdan soruşun. |
| `pizza-hut-r74` | İdarə heyəti əməkdaşlarında soruş | İdarəetmə heyəti üzvlərindən soruşun. |
| `pizza-hut-r75` | Bir neçə işçidən soruşmaq  | Bir neçə əməkdaşdan soruşun. |
| `pizza-hut-r76` | Bir neçə işçidən kimlərin uğurlarını etiraf etdiklərini soruşun, onlardan etiraf kartlarını hardan götürmək mümkün olduğunu soruşun | Bir neçə əməkdaşdan kimlərin nailiyyətlərini təqdir etdiklərini və təqdir kartlarını haradan əldə edə biləcəklərini soruşun. |
| `pizza-hut-r78` | İş cədvəli arxivinə baxmaq, Restoran müdirindən cədvəli necə yoxladığını və nəzarət etdiyini soruşmaq | İş qrafiki arxivini yoxlayın, restoran müdirindən qrafiki necə yoxladığını və onun icrasına necə nəzarət etdiyini soruşun. |
| `pizza-hut-r79` | Bir neçə işçidən soruşmaq | Bir neçə əməkdaşdan soruşun. |
| `pizza-hut-r80` | Bir neçə işçidən soruşmaq. İş cədvəli arxivinə baxma, Restoran müdirindən cədvəli necə yoxladığını və nəzarət etdiyini soruşma. İşçilərdən əmək haqqının necə hesablanması, hansı bonusların olması və problem yarandığı halda kimə müraciət etməli olduqlarını bilib-bilmədiklərini soruşmaq | Bir neçə əməkdaşdan soruşun. İş qrafiki arxivini yoxlayın və restoran müdirindən qrafikə necə nəzarət etdiyini soruşun. Əməkdaşların əməkhaqqının hesablanmasını, bonusları və problem yarandıqda kimə müraciət etməli olduqlarını bildiklərini yoxlayın. |
| `pizza-hut-r82` | Jurnalları yoxlamaq | Jurnalları yoxlayın. |
| `pizza-hut-r83` |  FQV olmasını və keyfiyyətini, həmçinin işçilərin şəxsi işlərində FQV verilməsi blankının olmasını, FQV jurnalının düzgün doldurulmasını yoxlamaq | FQV-nin mövcudluğunu və keyfiyyətini, şəxsi işlərdə FQV-nin verilməsi formasını və FQV jurnalının düzgün doldurulmasını yoxlayın. |
| `pizza-hut-r84` | Bir neçə işçidən soruşmaq  | Bir neçə əməkdaşdan soruşun. |
| `pizza-hut-r85` | Bir neçə işçidən soruşmaq  | Bir neçə əməkdaşdan soruşun. |
