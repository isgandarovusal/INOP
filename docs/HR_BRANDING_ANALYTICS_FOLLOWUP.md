# Branding follow-up: Analytics diagnostics

Production's reported 4–5 second delay remains **unverified and unresolved**. This task has no authenticated production browser session or Render timing/log access. No production records, credentials or database were accessed. Local timings below must not be presented as production timings or a cold-start diagnosis.

## Measured dependency and minimal change

The existing frontend already starts overview and scores independently, renders genuine KPI data when overview finishes, and loads operations only when its tab opens. Brands, branches and vacancy choices arrive in the overview envelope; there is no separate frontend catalog fetch. Auth must resolve before permission-protected requests begin. Refresh/filter/authority isolation and score consistency checks remain in place; no settled-response cache was added.

The local query waterfall identified a needless backend barrier: a scoped vacancy list finished at 30.28 ms, while the branch query waited until 54.79 ms for the independent Application aggregation. The catalog now resolves branches as soon as its own vacancy list is available. An empty branch identity list returns an empty catalog without a database round trip. All resource filters, bounded limits, token/role revalidation and current-cohort checks are preserved. No response contract or database index changed.

A concurrency regression holds the Application aggregate and proves that the actual scoped branch query can finish before that gate is released. Existing authorization, consistency, large-cohort and stale-response tests also passed.

## Controlled local comparison

Same owned localhost database and backend/browser process throughout: 20 vacancies, 200 synthetic candidates, 4,000 unique applications. One scores warmup per phase, five API samples per endpoint, three client navigations per phase. Existing Chromium and one reused Vite cache; no concurrent test suite. Before loads the controller from the preceding local commit; after loads the modified controller. Query records contain model/operation/timing only, not query arguments or record contents.

| Median | Before | After |
| --- | ---: | ---: |
| Overview API | 44.69 ms | 37.90 ms |
| Scores API (unchanged path) | 135.56 ms | 120.49 ms |
| Navigation to genuine primary KPI | 451.26 ms | 373.25 ms |
| Navigation to score content | 563.63 ms | 403.59 ms |
| Summed React Profiler render time | 108.80 ms | 84.40 ms |
| Overview query executions | 16 | 15 |
| Initial analytics API requests | 2 | 2 |
| Overview / scores payload | 3,287 / 389 B | 3,287 / 389 B |

The dataset has no branch assignments, so its guaranteed improvement is the eliminated empty branch read. The separate concurrency test covers assigned branches. Scores and React code did not change; their timing differences reflect cache/order/runtime noise and cannot be attributed to this optimization. Small development samples do not establish production speedup. An initial baseline run showed KPI median 971.40 ms and render median 319.10 ms, demonstrating development-run variability.

## Separate real local auth/startup trace

A second trace used the actual AuthProvider, localhost `/auth/me`, synthetic JWT and the same 20/200/4,000 dataset. Three full document loads recorded request paths, start times and durations only. Median auth request duration was 24.41 ms; overview and scores started at 991.54 and 991.97 ms from document navigation, confirming parallel startup after auth. Their browser request durations were 131.09 and 253.65 ms. The first React mount cost was 14.50 ms; genuine KPI and score content were observed at 1,614.00 and 1,619.80 ms. These browser timings include Vite development module loading, local routing/fixture overhead and render scheduling. They are separate from the same-process client-navigation comparison above and must not be compared as identical methodologies. Backend token/role revalidation is included in the API query waterfall. No production cold-start measurement exists.

## Production investigation still required

Capture an authorized production navigation trace without exporting response bodies or PII. Separate route chunk loading, `/auth/me`, overview and scores timing, time to hide each loading region, and redundant requests. Correlate overview/scores request durations with Render startup and server/query timings using the same synthetic permitted tenant dataset. Compare a cold and warm backend. Without that evidence, network latency, auth startup and Render cold-start remain possibilities, not confirmed root causes.

The backend change is backward compatible. Its catalog scheduling improvement requires a separately approved Render release; frontend branding and sections require the separately approved frontend release. This task makes local commits only.
