# First-load audit — local and production kept separate

Production URL `https://inop-ruby.vercel.app/` was opened using the existing Chromium with the inherited proxy. Navigation failed with ERR_TUNNEL_CONNECTION_FAILED; the proxy previously returned 403 CONNECT. No production DNS/TLS/TTFB/LCP, auth or Render timing is available. This is an environment access limitation, not an application diagnosis. No policy bypass, synthetic keepalive, production login or data mutation was attempted.

Local comparison uses the actual App/route tree and real AuthProvider in source-only production bundles. One browser/server process, five interleaved pairs per cold/warm mode, no backend traffic or competing workloads. Anonymous `/` redirects through the actual route tree to login. Warm is a warmed document navigation, not SPA. Both phases share the new visual/wordmark so the controlled comparison isolates code/CSS loading changes.

A static AppShell import made workspace CSS and code part of the anonymous load. AppShell is now a lazy route component; dashboard/recruitment/audit/HR CSS lives with that component and retains its relative order. Common token/layout/control/status styles stay global. HR selector bodies and token values are unchanged. The tiny, unique core status-dot rules have no competing definitions. No protected API/permission checks are skipped.

| Metric | Before | After |
|---|---:|---:|
| Cold form usable median ms | 608.6 | 584.9 |
| Cold usable min–max ms | 513.7–851.4 | 513.3–764.4 |
| Warm usable median ms | 158.6 | 153.4 |
| Warm usable min–max ms | 138.0–207.0 | 151.6–166.8 |
| Cold FCP / observed LCP median ms | 792 / 792 | 780 / 780 |
| Warm FCP / observed LCP median ms | 188 / 188 | 192 / 192 |
| Cold script execution median ms | 292.5 | 241.3 |
| Warm script execution median ms | 32.1 | 36.2 |
| Initial workspace/global CSS bytes | 198,787 | 63,073 |
| Login CSS bytes | 3,869 | 3,869 |
| Loaded JS bytes | 625,138 | 614,240 |
| Anonymous auth API requests | 0 | 0 |

Bytes are decoded/uncompressed localhost assets, not Vercel Brotli transfer sizes. CSS reduction is measured; small timing changes overlap variance and are not a production speedup claim. Warm paint/execution did not improve. CDP ScriptDuration measures execution; isolated JS parsing is not measured. DNS/TCP use localhost reuse, TLS is absent, so these do not approximate production network phases. Local cold HTML TTFB median was 2.4→2.3 ms; warm 1.0→1.0 ms. LCP is the last observed buffered entry after network-idle and image decoding, not a hosted Web Vitals SLA.

The first preliminary probe had an incorrect image MIME type; it is retained separately and excluded. A shell-only experiment saved ~11 KB JS but did not improve cold timing, so it was not accepted as a speed gain. Early warm CDP counters incorrectly subtracted counters across navigation reset; these CPU readings are excluded. The final controlled run uses per-document counters and waits for images. Raw resources, samples and ranges: `/workspace/work/critical-login/first-load-controlled.json`.

Existing sessions still require real auth/session verification and can wait on the free Render backend; hosted cold-start is plausible but unmeasured. Fresh anonymous login does not require that API in this local trace. Free hosting limits cannot be resolved with fabricated readiness or keepalive traffic. New architecture asset is ~50 KB and is not requested on mobile.
