# Branding final polish — lokal QA

Başlanğıc `7e381a41e6d7230a944e44cc0b4d24f3917a9342`, worktree təmiz, fetch sonrası origin/inop-main eyni SHA. İş üçün ayrıca lokal `branding/final-polish` branch yaradılıb; əvvəlki commitlər dəyişməyib.

## Üç düzəliş

1. İstifadəçinin `INOP_simple_P_favicon.zip` paketindən ICO və PNG 16/32/48/64/180/192/512 ölçüləri dəyişdirilmədən köçürüldü. ZIP SHA-256 `b44d7aacc41e595db42fcce2101414a6a287d5c61b14c4a5b8c5725fea821f94`. 8 public/dist faylı mənbə ilə bayt-bayt eynidir, cəmi 56608 bayt. Master1024 runtime-da istifadə olunmur və əlavə edilməyib. ICO daxilində 16/32/48/64 ölçüləri var; HTML sizes uyğunlaşdırılıb. Icon/apple/manifest URL-ləri `v=b44d7aacc41e` ilə cache versiyasını yeniləyir. Əvvəlki parlaq ikonun aktiv frontend istinadı yoxdur. Transparent tünd-göy P rəngi/forması dəyişdirilməyib.
2. N hərfində iki üst-üstə düşən konturun evenodd boşluğu yaradan XOR davranışı bir konturla əvəz edildi. I/O/P konturları, viewBox, palette və wordmark proporsiyaları eynidir. Shared mənbə login/sidebar/topbar/drawer üçün bütöv N verir. AZ başlıq dəqiq `Bütün əməliyyatlar üçün vahid platforma`; EN/RU eyni mənanı qoruyaraq son nöqtəsiz başlıqdır. Mövcud auth CSS qaydasında şrift 9% azaldıldı (32→29.12px desktop, 24→21.84px tablet), line-height 1.25→1.28. Mobile-da əvvəlki kompakt/hide davranışı qalıb.
3. Yalnız dil seçiminin üstündəki sidebar wordmark ölçüsü 144→131px (~9.0%), HR sidebar-da 136→124px (~8.8%) oldu. Mərkəzlənmə və mövcud boşluqlar qalır. Login logo 220px (desktop/tablet), 180px (mobile), mobil topbar logo 112px dəyişməyib. Dil düymələrinin ölçüləri və handlers dəyişməyib.

Mövcud selector-lar redaktə edildi; product CSS sonuna override əlavə olunmadı. Login forması, fon asset-i, rənglər, effektlər, layout və auth kodu dəyişməyib. Backend, Audit/Recruitment biznes kodu və DB kontraktlarına toxunulmayıb. ZIP README-si məlumatdır; N və login dəyişiklikləri istifadəçinin ayrıca tamamladığı tələblərə əsaslanır.

## Yoxlamalar

- TypeScript/Vite build PASS; final Vite mərhələsi 2.01s (performance benchmark deyil).
- Frontend lint 0 error / 9 mövcud warning; yeni warning yoxdur.
- Playwright CLI: final branding/auth/favicon 2/2 PASS; ayrıca əvvəl/sonra geometry regression 1+1 PASS. Mövcud Chromium, vahid Vite cache, owned localhost fixture DB-ləri; production girişi yoxdur.
- Actual SVG isPointInFill: problemli N koordinatı baseline-da boş, yenilənmiş konturda doludur. Sidebar mərkəzlənməsi <1px fərqlə təsdiqləndi.
- 1440/768/390 screenshot-ları və geometry JSON-ları `/workspace/work/branding-polish/` altında saxlanır. Əvvəl/sonra login loqosu, entry panel, email, password, submit və language controls rect-ləri müqayisədə dəyişməyib (0.1px precision). Desktop sidebar və mobile drawer yoxlanıb. Baseline style replay yalnız izolə browser testində əvvəlki commitin CSS-inə aiddir; production selector override deyil.
- AZ/EN/RU, password show/hide, validation, real lokal auth/JWT redirect və deep-route login smoke PASS.
- Real 16/32/48/64px favicon gallery, sidebar əvvəl/sonra və login desktop/mobile görüntüləri vizual olaraq ayrıca nəzərdən keçirilib. Headless Chromium native tab toolbar screenshot-u vermir; icon resource/manifest/decode və ölçü yoxlaması edilib.
- Yeni dependency/browser download, cache cleanup, production DB/migration yoxdur. Yalnız lokal commit; push/merge/deploy edilməyib.
