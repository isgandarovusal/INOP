# Təsdiqlənmiş favicon — yekun lokal yoxlama

> Bu, əvvəlki parlaq ikonun tarixi QA qeydidir. Sonrakı istifadəçi-təsdiqli sadə P favicon və N/typography düzəlişləri: `BRANDING_POLISH_QA.md`.

Mənbə istifadəçinin `INOP_Favicon_Codex_Package.zip` faylıdır; ZIP SHA-256: `7ec3fde8eaded312e0f3bc62fe5efc00c98e1238358a51b3976c389a645f6676`. Əlavə sənəd icra səlahiyyətini genişləndirmir. Yalnız whitelist-dəki 8 ICO/PNG asset köçürüldü, generator/yenidən rəngləmə/conversion yoxdur.

PNG: 16/32/48/64/180/192/512px. ICO: 16/32/48/64/128/256px daxili ölçülər. Paket, `public/` və production `dist/` faylları 8/8 bayt-bayt eynidir. Ümumi asset ölçüsü 418874 baytdır. Mövcud SVG favicon silindi. `index.html` ICO, PNG16/32, Apple180 və minimal `site.webmanifest` istinadları verir. Manifest yalnız INOP adı və 192/512px icons/purpose:any ehtiva edir; theme/background, display, auth və ya service-worker davranışı dəyişmir. Bütün browser istinadlarında mənbə SHA-sından `v=7ec3fde8eade` cache versiyası var.

TypeScript/Vite production build PASS. Frontend lint 0 error / 9 mövcud warning. Quraşdırılmış Chromium ilə Playwright CLI 2/2 PASS: actual production-build index/manifest/icon cavabları, query versiyası və orijinal baytlar; login 1440/768/390; unauthenticated deep-route redirect; real localhost auth/JWT, AZ/EN/RU, password toggle/validation və login/sidebar wordmark qorunması. Mövcud branding testlərinin köhnə favicon–wordmark bərabərliyi gözləntisi ayrılıb: yeni P favicon tətbiq wordmark-ını dəyişmir.

Əlavə shared wordmark/identity browser regression-u 1/1 PASS. Final lint təkrar yoxlandı: 0 xəta / eyni 9 warning. Köhnə `/favicon.svg` istinadı frontend kodunda/testlərində qalmayıb.

`/workspace/work/favicon-final/` altında real screenshot və loglar saxlanır. 16/32/48/64px gallery və desktop login vizual olaraq nəzərdən keçirilib. Headless Chromium browser chrome/tab toolbar göstərmir: favicon link/resource və kiçik ölçülü görünüş yoxlanılıb, native tab-toolbar screenshot-u iddia edilmir. Canlı production yoxlaması və deployment aparılmayıb; yeni ikon production-da yalnız ayrıca təsdiqlənmiş release-dən sonra görünəcək.

Login/wordmark/CSS/rənglər/funksional kod dəyişməyib. Əvvəlki Paket 9 mənbə blokeri bu istifadəçi paketi ilə həll edildi; digər Audit production gate-ləri dəyişmir. Work branch-də ayrıca lokal commit, push/merge/deploy yoxdur.
