# Paket 10 — inteqrasiya və təhlükəsizlik borcları

## Təsdiqlənmiş düzəlişlər

- Reviewer-in daxili scope hesablanması route middleware-dən keçmirdi: deaktiv custom/management profilindən approval yaradılması mümkün idi. `getAuditScopeFilter` artıq profilin aktivliyi, GFC təşkilatı və məlum istiqamətini fail-closed yoxlayır. Naməlum legacy istiqamət route middleware-də də rədd edilir. Aktiv profilli management hesabı hələ də öz istiqaməti ilə məhduddur; rol adı DB permission-i əvəz etmir.
- Private adapter timeout-u caller-i azad edərkən hələ işləyən provider sorğusunun paralellik slotunu da azad edirdi. Slot faktiki promise/stream bitənədək saxlanır; abort-a əməl etməyən provider iki slotu doldurduqda növbəti əməliyyat təhlükəsiz 503 BUSY alır. Concrete adapter yenə abort müqaviləsini təmin etməlidir.
- Köhnə generic audit siyahısı `overallPercentage` truthiness/fallback ilə real sıfırı və legacy-unscored nəticəni qarışdırırdı. Mövcud shared `auditScore` oxuma adapterindən istifadə edir: `0` sıfırdır, null `—`, seçilməmiş minimum filtr qiymətləndirilməmiş qeydləri gizlətmir. Hesablama/scoring kontraktı dəyişməyib.

## QA

12 backend fokuslu test keçdi: reviewer/direction, storage, lifecycle, legacy analytics/action/source və release dry-run. Yeni real-browser test 1440/390 ölçülərində sıfır/null və minimum filtrini yoxladı. TypeScript/Vite build və lint nəticələri yekun QA sənədində qeyd olunur. Testlər yalnız owned localhost fixture bazaları və quraşdırılmış Chromium istifadə edir.

## Açıq borclar

Management promotion/deactivation biznes siyasəti qərarsızdır: heç bir profil avtomatik deaktiv edilmir və scope genişləndirilmir. Legacy safety form/detail öz tarixi /5 mexanizmini saxlayır; bu mərhələ onun scoring qaydasını dəyişmir. Xarici strictly-number consumers, reviewer-directory N+1 və legacy array endpoint-lərinin unbounded davranışı release review tələb edir; ölçülməmiş performans yaxşılaşması iddia edilmir. Source stale-job recovery və konkret durable storage provider hələ hazır deyil.

HR 0/0.5/1/N/A modeli tətbiq olunmayıb; başqa istiqamətlərə ötürülməyib. CSS, login, wordmark, Recruitment və İdarə Paneli dəyişməyib.
