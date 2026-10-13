# HR local commit ledger

Release baseline `c74c49f41bb3a8a54566324c8902576a48a88e8f`. Branch `work`. All 78 HR/checkpoint commits through `02890cac3b364060bd53c67b58b4d0000ff4d2e4` preserved; original65 baseline entries retained. This document inventories actual Git objects and their changed paths; development push is separately verified by ls-remote; this inventory never implies production deployment or external provider verification. Per-increment test evidence/limitations are retained in HR_IMPLEMENTATION_TRACKER. The final report-only commit is identified by its actual SHA in the final user report/Git log; a document cannot contain its own future SHA.

## `a832bd76f918d6a142e3086c1a5be108935a0000`

fix(hr): enforce independent recruitment resource scopes

6 changed paths:

- `M Backend/controllers/applications.controller.js`
- `M Backend/controllers/candidateExport.controller.js`
- `M Backend/controllers/candidatePipeline.controller.js`
- `A Backend/services/hrResourceScope.service.js`
- `A Backend/tests/hrResourceScopes.test.cjs`
- `A docs/HR_IMPLEMENTATION_TRACKER.md`

## `80fa2d709b3213a7f6a3abc60072cebeb5a57562`

fix(hr): preserve recruitment service contracts and CV replacement

10 changed paths:

- `M Backend/controllers/candidates.controller.js`
- `M Backend/controllers/dashboardSummary.controller.js`
- `M Backend/routes/route.js`
- `M Backend/tests/dashboardSummaries.test.cjs`
- `M Frontend/src/Services/applicationsService.ts`
- `M Frontend/src/Services/candidatesService.ts`
- `M Frontend/src/Services/jobsService.ts`
- `M Frontend/src/Types/recruitment.ts`
- `A Frontend/tests/hrContracts.test.cjs`
- `M docs/HR_IMPLEMENTATION_TRACKER.md`

## `10f01026948e8b2bc0ad2b2f9fcd018d144b668e`

fix(hr): isolate recruitment page lifecycle and permissions

21 changed paths:

- `A Frontend/src/Components/HRResourceState.tsx`
- `M Frontend/src/Hooks/useAuditResource.ts`
- `A Frontend/src/Hooks/useMounted.ts`
- `M Frontend/src/Layouts/AppShell/Sidebar.tsx`
- `M Frontend/src/Pages/Recruitment/Applications/ApplicationsList.tsx`
- `M Frontend/src/Pages/Recruitment/Candidates/CandidateDetail.tsx`
- `M Frontend/src/Pages/Recruitment/Candidates/CandidateForm.tsx`
- `M Frontend/src/Pages/Recruitment/Candidates/CandidatesList.tsx`
- `M Frontend/src/Pages/Recruitment/Jobs/JobDetail.tsx`
- `M Frontend/src/Pages/Recruitment/Jobs/JobForm.tsx`
- `M Frontend/src/Pages/Recruitment/Jobs/JobsList.tsx`
- `A Frontend/src/Routes/HRRoute.tsx`
- `M Frontend/src/Routes/Routes.tsx`
- `M Frontend/src/Services/candidatesService.ts`
- `M Frontend/src/Utils/permissions.ts`
- `M Frontend/src/i18n/locales/az.json`
- `M Frontend/src/i18n/locales/en.json`
- `M Frontend/src/i18n/locales/ru.json`
- `M Frontend/tests/hrContracts.test.cjs`
- `A Frontend/tests/hrLifecycle.test.cjs`
- `M docs/HR_IMPLEMENTATION_TRACKER.md`

## `bb561691b0faafd635bcc7b217b24a9455c3d7fe`

feat(hr): add evidence-based CV extraction and review

30 changed paths:

- `M Backend/controllers/candidateExport.controller.js`
- `M Backend/controllers/candidatePipeline.controller.js`
- `M Backend/controllers/candidates.controller.js`
- `M Backend/controllers/cv.controller.js`
- `M Backend/models/candidate.model.js`
- `M Backend/services/cvParser.service.js`
- `A Backend/services/cvReview.service.js`
- `M Backend/services/cvStructuredParser.service.js`
- `A Backend/tests/cvConcurrency.test.cjs`
- `A Backend/tests/cvExtraction.test.cjs`
- `A Backend/tests/cvReview.test.cjs`
- `A Backend/tests/helpers/cvDocuments.cjs`
- `A Frontend/src/Components/CvHistoryEditor.tsx`
- `A Frontend/src/Components/CvReviewEvidence.tsx`
- `M Frontend/src/Components/KanbanBoard.tsx`
- `M Frontend/src/Components/PrivateFilePreview.tsx`
- `M Frontend/src/Components/TagInput.tsx`
- `M Frontend/src/Hooks/usePrivateFile.ts`
- `M Frontend/src/Pages/Recruitment/Candidates/CandidateDetail.tsx`
- `M Frontend/src/Pages/Recruitment/Candidates/CandidateForm.tsx`
- `M Frontend/src/Pages/Recruitment/Candidates/CandidatesList.tsx`
- `M Frontend/src/Pages/Recruitment/Jobs/JobDetail.tsx`
- `M Frontend/src/Services/candidatesService.ts`
- `M Frontend/src/Services/rankingService.ts`
- `M Frontend/src/Types/recruitment.ts`
- `M Frontend/src/i18n/locales/az.json`
- `M Frontend/src/i18n/locales/en.json`
- `M Frontend/src/i18n/locales/ru.json`
- `A Frontend/tests/cvReviewUI.test.cjs`
- `M docs/HR_IMPLEMENTATION_TRACKER.md`

## `942df3fc87fe8bda9c148fcb12e267b9c0165c84`

feat(hr): add scoped brand and workplace catalogs

24 changed paths:

- `M Backend/controllers/applications.controller.js`
- `M Backend/controllers/jobs.controller.js`
- `A Backend/controllers/recruitmentCatalog.controller.js`
- `M Backend/models/job.model.js`
- `A Backend/models/recruitmentBranch.model.js`
- `A Backend/models/recruitmentBrand.model.js`
- `M Backend/routes/route.js`
- `M Backend/services/hrResourceScope.service.js`
- `A Backend/services/recruitmentCatalog.service.js`
- `A Backend/tests/recruitmentCatalog.test.cjs`
- `A Frontend/src/Components/RecruitmentLocationFields.tsx`
- `M Frontend/src/Pages/Recruitment/Applications/ApplicationsList.tsx`
- `M Frontend/src/Pages/Recruitment/Jobs/JobDetail.tsx`
- `M Frontend/src/Pages/Recruitment/Jobs/JobForm.tsx`
- `M Frontend/src/Pages/Recruitment/Jobs/JobsList.tsx`
- `M Frontend/src/Services/jobsService.ts`
- `A Frontend/src/Services/recruitmentCatalogService.ts`
- `M Frontend/src/Types/recruitment.ts`
- `M Frontend/src/i18n/locales/az.json`
- `M Frontend/src/i18n/locales/en.json`
- `M Frontend/src/i18n/locales/ru.json`
- `A Frontend/tests/recruitmentCatalogUI.test.cjs`
- `A docs/HR_CATALOG_CONTRACT.md`
- `M docs/HR_IMPLEMENTATION_TRACKER.md`

## `2d2cb13af787542756437af20213edfc6ed4c9c9`

feat(hr): version contextual Application matching

33 changed paths:

- `A Backend/controllers/applicationMatching.controller.js`
- `M Backend/controllers/applications.controller.js`
- `M Backend/controllers/candidateExport.controller.js`
- `M Backend/controllers/candidatePipeline.controller.js`
- `M Backend/controllers/candidates.controller.js`
- `M Backend/controllers/jobs.controller.js`
- `M Backend/models/application.model.js`
- `M Backend/models/candidate.model.js`
- `M Backend/models/job.model.js`
- `M Backend/routes/route.js`
- `M Backend/services/applicationMatch.service.js`
- `A Backend/services/applicationScoreState.service.js`
- `A Backend/tests/applicationMatching.test.cjs`
- `A Backend/tests/applicationScoreState.test.cjs`
- `A Frontend/src/Components/ApplicationKanban.tsx`
- `A Frontend/src/Components/CandidateApplicationMatches.tsx`
- `M Frontend/src/Components/MatchScoreBadge.tsx`
- `M Frontend/src/Pages/Recruitment/Applications/ApplicationsList.tsx`
- `M Frontend/src/Pages/Recruitment/Candidates/CandidateDetail.tsx`
- `M Frontend/src/Pages/Recruitment/Jobs/JobDetail.tsx`
- `M Frontend/src/Pages/Recruitment/Jobs/JobForm.tsx`
- `M Frontend/src/Services/aiMatchService.ts`
- `M Frontend/src/Services/applicationsService.ts`
- `M Frontend/src/Services/jobsService.ts`
- `M Frontend/src/Services/rankingService.ts`
- `M Frontend/src/Types/recruitment.ts`
- `M Frontend/src/i18n/locales/az.json`
- `M Frontend/src/i18n/locales/en.json`
- `M Frontend/src/i18n/locales/ru.json`
- `A Frontend/tests/applicationMatchingUI.test.cjs`
- `M Frontend/tests/hrLifecycle.test.cjs`
- `M docs/HR_IMPLEMENTATION_TRACKER.md`
- `A docs/HR_MATCHING_CONTRACT.md`

## `659084198ed19a8f23ae8a186eb35b47dc85165d`

feat(hr): persist scoped Application lifecycle and history

16 changed paths:

- `M Backend/controllers/activityLog.controller.js`
- `M Backend/controllers/applicationMatching.controller.js`
- `A Backend/controllers/applicationWorkflow.controller.js`
- `M Backend/controllers/applications.controller.js`
- `M Backend/controllers/candidatePipeline.controller.js`
- `M Backend/models/activityLog.model.js`
- `M Backend/models/application.model.js`
- `M Backend/routes/route.js`
- `M Backend/services/activityLog.service.js`
- `A Backend/services/applicationLifecycle.service.js`
- `M Backend/services/applicationScoreState.service.js`
- `A Backend/tests/applicationLifecycle.test.cjs`
- `M Backend/tests/applicationScoreState.test.cjs`
- `M Frontend/tests/hrContracts.test.cjs`
- `A docs/HR_APPLICATION_LIFECYCLE.md`
- `M docs/HR_IMPLEMENTATION_TRACKER.md`

## `b23d77674c0f6a4ed41f91e2c99eea8be900d0dc`

feat(hr): add Application Kanban and interview workflow UI

21 changed paths:

- `M Backend/controllers/applicationWorkflow.controller.js`
- `M Backend/routes/route.js`
- `M Backend/services/applicationLifecycle.service.js`
- `A Backend/tests/applicationInterviewers.test.cjs`
- `M Frontend/src/Components/ApplicationKanban.tsx`
- `A Frontend/src/Hooks/useHRActionContext.ts`
- `A Frontend/src/Pages/Recruitment/Applications/ApplicationDetail.tsx`
- `M Frontend/src/Pages/Recruitment/Applications/ApplicationsList.tsx`
- `M Frontend/src/Pages/Recruitment/Candidates/CandidatesList.tsx`
- `M Frontend/src/Pages/Recruitment/Jobs/JobDetail.tsx`
- `M Frontend/src/Routes/Routes.tsx`
- `M Frontend/src/Services/applicationsService.ts`
- `M Frontend/src/Styles/recruitment.css`
- `M Frontend/src/Types/recruitment.ts`
- `A Frontend/src/Utils/applicationWorkflow.ts`
- `M Frontend/src/i18n/locales/az.json`
- `M Frontend/src/i18n/locales/en.json`
- `M Frontend/src/i18n/locales/ru.json`
- `A Frontend/tests/applicationLifecycleUI.test.cjs`
- `M docs/HR_APPLICATION_LIFECYCLE.md`
- `M docs/HR_IMPLEMENTATION_TRACKER.md`

## `121fc7196571114c1d070de4e4d25dfeffe72e55`

fix(hr): deliver Application notifications through a scoped outbox

9 changed paths:

- `M Backend/controllers/applicationWorkflow.controller.js`
- `M Backend/server.js`
- `A Backend/services/applicationNotificationWorker.service.js`
- `M Backend/services/candidateNotification.service.js`
- `M Backend/services/email.service.js`
- `A Backend/tests/applicationNotifications.test.cjs`
- `M Frontend/tests/applicationLifecycleUI.test.cjs`
- `M docs/HR_APPLICATION_LIFECYCLE.md`
- `M docs/HR_IMPLEMENTATION_TRACKER.md`

## `2e44f1321dad611c42677b88b2bade1f5b3fff8b`

feat(hr): add scoped GFC recruitment analytics

19 changed paths:

- `M Backend/controllers/applications.controller.js`
- `M Backend/controllers/candidatePipeline.controller.js`
- `A Backend/controllers/hrAnalytics.controller.js`
- `M Backend/models/application.model.js`
- `M Backend/routes/route.js`
- `M Backend/services/hrResourceScope.service.js`
- `A Backend/tests/hrAnalytics.test.cjs`
- `M Frontend/src/Layouts/AppShell/Sidebar.tsx`
- `A Frontend/src/Pages/Recruitment/Analytics/HRAnalytics.tsx`
- `M Frontend/src/Routes/Routes.tsx`
- `A Frontend/src/Services/hrAnalyticsService.ts`
- `M Frontend/src/Styles/recruitment.css`
- `M Frontend/src/i18n/locales/az.json`
- `M Frontend/src/i18n/locales/en.json`
- `M Frontend/src/i18n/locales/ru.json`
- `A Frontend/tests/hrAnalyticsUI.test.cjs`
- `M Frontend/tests/hrContracts.test.cjs`
- `A docs/HR_ANALYTICS_CONTRACT.md`
- `M docs/HR_IMPLEMENTATION_TRACKER.md`

## `4c0a4eee3e735d0f5c8abe70b37a0e6bfc5f7bad`

feat(hr): add scoped recruitment page APIs

8 changed paths:

- `A Backend/controllers/hrPaged.controller.js`
- `M Backend/models/application.model.js`
- `M Backend/models/candidate.model.js`
- `M Backend/models/job.model.js`
- `M Backend/routes/route.js`
- `A Backend/tests/hrPagination.test.cjs`
- `M docs/HR_IMPLEMENTATION_TRACKER.md`
- `A docs/HR_PAGINATION_CONTRACT.md`

## `148fa8171a7b98744dca507c13abcb7feea77717`

feat(hr): consume bounded recruitment pages and lazy evidence

28 changed paths:

- `M Backend/controllers/hrPaged.controller.js`
- `M Backend/routes/route.js`
- `M Backend/services/recruitmentCatalog.service.js`
- `M Backend/tests/hrPagination.test.cjs`
- `M Frontend/src/Components/CandidateApplicationMatches.tsx`
- `A Frontend/src/Components/HRPageControls.tsx`
- `A Frontend/src/Components/HRScopeFilters.tsx`
- `M Frontend/src/Components/MatchScoreBadge.tsx`
- `A Frontend/src/Hooks/useHRPage.ts`
- `M Frontend/src/Pages/Recruitment/Applications/ApplicationsList.tsx`
- `M Frontend/src/Pages/Recruitment/Candidates/CandidatesList.tsx`
- `M Frontend/src/Pages/Recruitment/Jobs/JobDetail.tsx`
- `M Frontend/src/Pages/Recruitment/Jobs/JobsList.tsx`
- `M Frontend/src/Services/applicationsService.ts`
- `M Frontend/src/Services/candidatesService.ts`
- `A Frontend/src/Services/hrPageService.ts`
- `M Frontend/src/Services/jobsService.ts`
- `M Frontend/src/Styles/recruitment.css`
- `M Frontend/src/Types/recruitment.ts`
- `M Frontend/src/i18n/locales/az.json`
- `M Frontend/src/i18n/locales/en.json`
- `M Frontend/src/i18n/locales/ru.json`
- `M Frontend/tests/applicationLifecycleUI.test.cjs`
- `M Frontend/tests/applicationMatchingUI.test.cjs`
- `M Frontend/tests/hrLifecycle.test.cjs`
- `A Frontend/tests/hrPaginationUI.test.cjs`
- `M docs/HR_IMPLEMENTATION_TRACKER.md`
- `M docs/HR_PAGINATION_CONTRACT.md`

## `37b90bf63a1d16bdaea3124367183558b67fc264`

fix(hr): cancel stale Candidate detail actions

4 changed paths:

- `M Frontend/src/Pages/Recruitment/Candidates/CandidateDetail.tsx`
- `M Frontend/src/Services/candidatesService.ts`
- `A Frontend/tests/candidateActions.test.cjs`
- `M docs/HR_IMPLEMENTATION_TRACKER.md`

## `7dea767c7ed38150bd5ae3ece07d4c89c0edf56e`

perf(hr): isolate bounded CV processing from HTTP workers

19 changed paths:

- `M Backend/controllers/cv.controller.js`
- `M Backend/middleware/privateUpload.middleware.js`
- `M Backend/services/cvParser.service.js`
- `M Backend/services/cvReview.service.js`
- `M Backend/services/cvStructuredParser.service.js`
- `A Backend/services/cvTextExtraction.service.js`
- `A Backend/services/document.worker.cjs`
- `A Backend/services/documentWorkerPool.service.js`
- `A Backend/services/uploadContent.service.js`
- `M Backend/tests/cvReview.test.cjs`
- `A Backend/tests/documentProcessing.test.cjs`
- `A Backend/tests/helpers/documentTestWorker.cjs`
- `M Frontend/src/Components/CvReviewEvidence.tsx`
- `M Frontend/src/i18n/locales/az.json`
- `M Frontend/src/i18n/locales/en.json`
- `M Frontend/src/i18n/locales/ru.json`
- `M Frontend/tests/cvReviewUI.test.cjs`
- `A docs/HR_DOCUMENT_PROCESSING.md`
- `M docs/HR_IMPLEMENTATION_TRACKER.md`

## `5d0b56435682cf76ed9eaf18ff2c87fca6ea015a`

perf(hr): preview scoped original CVs without reuploading

8 changed paths:

- `M Backend/controllers/privateFiles.controller.js`
- `M Backend/routes/route.js`
- `A Backend/tests/candidatePreview.test.cjs`
- `M Frontend/src/Pages/Recruitment/Candidates/CandidateDetail.tsx`
- `M Frontend/src/Services/candidatesService.ts`
- `M Frontend/tests/cvReviewUI.test.cjs`
- `A docs/HR_CV_PREVIEW_CONTRACT.md`
- `M docs/HR_IMPLEMENTATION_TRACKER.md`

## `b5c32126d8d44f8534aa84fc23ac6999fbe09f62`

fix(hr): rank the complete scoped vacancy cohort

17 changed paths:

- `M Backend/controllers/hrPaged.controller.js`
- `A Backend/controllers/hrRanking.controller.js`
- `M Backend/models/application.model.js`
- `M Backend/routes/route.js`
- `M Backend/services/applicationScoreState.service.js`
- `A Backend/tests/hrRanking.test.cjs`
- `A Frontend/src/Hooks/useHRRankingPage.ts`
- `M Frontend/src/Pages/Recruitment/Jobs/JobDetail.tsx`
- `M Frontend/src/Services/hrPageService.ts`
- `M Frontend/src/Styles/recruitment.css`
- `M Frontend/src/i18n/locales/az.json`
- `M Frontend/src/i18n/locales/en.json`
- `M Frontend/src/i18n/locales/ru.json`
- `A Frontend/tests/hrRankingUI.test.cjs`
- `M docs/HR_IMPLEMENTATION_TRACKER.md`
- `M docs/HR_PAGINATION_CONTRACT.md`
- `A docs/HR_RANKING_CONTRACT.md`

## `10e3114d032797237972cee3ae73c5cf8cfdbc94`

feat(hr): persist scoped application card ordering

9 changed paths:

- `M Backend/controllers/applicationWorkflow.controller.js`
- `M Backend/models/application.model.js`
- `M Backend/package-lock.json`
- `M Backend/package.json`
- `M Backend/services/applicationLifecycle.service.js`
- `A Backend/services/applicationOrdering.service.js`
- `A Backend/tests/applicationOrdering.test.cjs`
- `A docs/HR_BOARD_ORDERING_CONTRACT.md`
- `M docs/HR_IMPLEMENTATION_TRACKER.md`

## `1c1ba805ed33091774bfe5706b3b764138cd2836`

feat(hr): add bounded scoped application board pages

6 changed paths:

- `A Backend/controllers/hrBoard.controller.js`
- `M Backend/controllers/hrPaged.controller.js`
- `M Backend/routes/route.js`
- `A Backend/tests/hrBoard.test.cjs`
- `A docs/HR_BOARD_PAGINATION_CONTRACT.md`
- `M docs/HR_IMPLEMENTATION_TRACKER.md`

## `92e7282a8da5bddd5af8a2f57921aea5d546b70e`

fix(hr): classify same-stage placements as reorder

3 changed paths:

- `M Backend/controllers/applicationWorkflow.controller.js`
- `M Backend/tests/applicationOrdering.test.cjs`
- `M docs/HR_IMPLEMENTATION_TRACKER.md`

## `d337755196aa17c8f7a83c508a3bea6d2a6880b6`

feat(hr): page and persist application kanban ordering

12 changed paths:

- `M Frontend/src/Components/ApplicationKanban.tsx`
- `A Frontend/src/Hooks/useHRBoard.ts`
- `M Frontend/src/Pages/Recruitment/Applications/ApplicationsList.tsx`
- `M Frontend/src/Services/applicationsService.ts`
- `A Frontend/src/Services/hrBoardService.ts`
- `M Frontend/src/Types/recruitment.ts`
- `M Frontend/src/i18n/locales/az.json`
- `M Frontend/src/i18n/locales/en.json`
- `M Frontend/src/i18n/locales/ru.json`
- `A Frontend/tests/hrBoardUI.test.cjs`
- `A docs/HR_BOARD_UI_CONTRACT.md`
- `M docs/HR_IMPLEMENTATION_TRACKER.md`

## `13b0245f9d9c552b5aa4a9d714ebec429fcdc680`

perf(hr): bound analytics scoring and recheck current authority

6 changed paths:

- `M Backend/controllers/hrAnalytics.controller.js`
- `A Backend/scripts/benchmarkHr.cjs`
- `A Backend/tests/helpers/hrSyntheticDataset.cjs`
- `A Backend/tests/hrAnalyticsScale.test.cjs`
- `M docs/HR_IMPLEMENTATION_TRACKER.md`
- `A docs/HR_PERFORMANCE_MEASUREMENTS.md`

## `8f08c3b063ed102769770acae3f822ef69a3312d`

test(hr): measure bounded production UI at 50k records

4 changed paths:

- `A Frontend/scripts/benchmarkHrUI.cjs`
- `A Frontend/tests/helpers/productionBrowser.cjs`
- `M docs/HR_IMPLEMENTATION_TRACKER.md`
- `M docs/HR_PERFORMANCE_MEASUREMENTS.md`

## `ee41a48e1fbf4dd7af2bd9591f1207f85ea5bde0`

fix(hr): improve keyboard access and bounded loading states

19 changed paths:

- `M Frontend/src/Components/ApplicationKanban.tsx`
- `M Frontend/src/Components/CvHistoryEditor.tsx`
- `M Frontend/src/Components/HRResourceState.tsx`
- `M Frontend/src/Components/MatchScoreBadge.tsx`
- `M Frontend/src/Pages/Recruitment/Applications/ApplicationsList.tsx`
- `M Frontend/src/Pages/Recruitment/Candidates/CandidateForm.tsx`
- `M Frontend/src/Pages/Recruitment/Candidates/CandidatesList.tsx`
- `M Frontend/src/Pages/Recruitment/Jobs/JobDetail.tsx`
- `M Frontend/src/Pages/Recruitment/Jobs/JobForm.tsx`
- `M Frontend/src/Pages/Recruitment/Jobs/JobsList.tsx`
- `M Frontend/src/Styles/recruitment.css`
- `M Frontend/src/i18n/locales/az.json`
- `M Frontend/src/i18n/locales/en.json`
- `M Frontend/src/i18n/locales/ru.json`
- `M Frontend/tests/cvReviewUI.test.cjs`
- `M Frontend/tests/helpers/browser.cjs`
- `A Frontend/tests/hrAccessibility.test.cjs`
- `M docs/HR_IMPLEMENTATION_TRACKER.md`
- `A docs/HR_UI_STABILITY.md`

## `bb7ff48edf76f3a2fb2b12caacc18ec3d13e9e4c`

feat(hr): add bounded structured AI provider adapter

7 changed paths:

- `A Backend/models/hrAiUsage.model.js`
- `A Backend/services/hrAiBudget.service.js`
- `A Backend/services/hrAiProvider.service.js`
- `A Backend/services/hrAiSchema.service.js`
- `A Backend/tests/hrAiProvider.test.cjs`
- `A docs/HR_AI_PROVIDER_CONTRACT.md`
- `M docs/HR_IMPLEMENTATION_TRACKER.md`

## `0b8c4d2f0154ab04580eb5257942d092ac469def`

feat(hr): authorize and review contextual job skill proposals

17 changed paths:

- `A Backend/controllers/hrAi.controller.js`
- `M Backend/routes/route.js`
- `M Backend/services/hrAiProvider.service.js`
- `M Backend/services/hrAiSchema.service.js`
- `A Backend/tests/hrAiAuthorization.test.cjs`
- `M Backend/tests/hrAiProvider.test.cjs`
- `A Frontend/src/Components/JobSkillsAssistant.tsx`
- `M Frontend/src/Pages/Recruitment/Jobs/JobForm.tsx`
- `A Frontend/src/Services/hrAiService.ts`
- `M Frontend/src/Styles/recruitment.css`
- `M Frontend/src/api/axios.ts`
- `M Frontend/src/i18n/locales/az.json`
- `M Frontend/src/i18n/locales/en.json`
- `M Frontend/src/i18n/locales/ru.json`
- `A Frontend/tests/hrAiUI.test.cjs`
- `M docs/HR_AI_PROVIDER_CONTRACT.md`
- `M docs/HR_IMPLEMENTATION_TRACKER.md`

## `d84c7301c51e6c770d4d8eb8898070a24d5331d9`

feat(hr): add minimized evidence-backed AI CV review adapter

5 changed paths:

- `A Backend/services/hrAiCvReview.service.js`
- `M Backend/services/hrAiProvider.service.js`
- `A Backend/tests/hrAiCvReview.test.cjs`
- `A docs/HR_AI_CV_REVIEW_CONTRACT.md`
- `M docs/HR_IMPLEMENTATION_TRACKER.md`

## `f4dd3a5d5881f3672fef3a783cbee879eb70def5`

feat(hr): authorize human-reviewed CV evidence proposals

20 changed paths:

- `M Backend/controllers/hrAi.controller.js`
- `A Backend/controllers/hrAiCvReview.controller.js`
- `M Backend/controllers/privateFiles.controller.js`
- `M Backend/routes/route.js`
- `M Backend/services/hrAiCvReview.service.js`
- `M Backend/tests/hrAiAuthorization.test.cjs`
- `A Backend/tests/hrAiCvAuthorization.test.cjs`
- `M Backend/tests/hrAiCvReview.test.cjs`
- `A Frontend/src/Components/CvReviewAssistant.tsx`
- `M Frontend/src/Components/JobSkillsAssistant.tsx`
- `M Frontend/src/Pages/Recruitment/Candidates/CandidateForm.tsx`
- `M Frontend/src/Services/hrAiService.ts`
- `M Frontend/src/Styles/recruitment.css`
- `M Frontend/src/i18n/locales/az.json`
- `M Frontend/src/i18n/locales/en.json`
- `M Frontend/src/i18n/locales/ru.json`
- `A Frontend/tests/hrAiCvUI.test.cjs`
- `M Frontend/tests/hrAiUI.test.cjs`
- `M docs/HR_AI_CV_REVIEW_CONTRACT.md`
- `M docs/HR_IMPLEMENTATION_TRACKER.md`

## `65b86c2a5afafe3e0b585a6c83ec9760448caa25`

fix(hr): keep private error payloads out of logs

10 changed paths:

- `M Backend/controllers/applications.controller.js`
- `M Backend/controllers/candidateExport.controller.js`
- `M Backend/controllers/candidatePipeline.controller.js`
- `M Backend/controllers/candidates.controller.js`
- `M Backend/controllers/jobs.controller.js`
- `M Backend/middleware/error.middleware.js`
- `A Backend/services/safeErrorLog.service.js`
- `A Backend/tests/hrErrorPrivacy.test.cjs`
- `A docs/HR_ERROR_PRIVACY.md`
- `M docs/HR_IMPLEMENTATION_TRACKER.md`

## `c87c7dc41a80e830a48e1f7fc73fd46dd8cc7fa4`

feat(hr): prepare bounded private object storage adapter

4 changed paths:

- `A Backend/services/hrPrivateObjectStorage.service.js`
- `A Backend/tests/hrPrivateObjectStorage.test.cjs`
- `M docs/HR_IMPLEMENTATION_TRACKER.md`
- `A docs/HR_PRIVATE_STORAGE_CONTRACT.md`

## `c720a841b40573c4ef6cffee4b1e8c4575825db6`

fix(hr): recheck private CV ownership after storage reads

7 changed paths:

- `M Backend/controllers/candidates.controller.js`
- `M Backend/controllers/hrAiCvReview.controller.js`
- `M Backend/controllers/privateFiles.controller.js`
- `M Backend/models/candidate.model.js`
- `A Backend/tests/hrPrivateStorageAuthorization.test.cjs`
- `M docs/HR_IMPLEMENTATION_TRACKER.md`
- `M docs/HR_PRIVATE_STORAGE_CONTRACT.md`

## `dddd640d7e699a5309588bd1a391f50d37ee7581`

feat(hr): add scoped audited notification retry and diagnostics

15 changed paths:

- `A Backend/controllers/applicationDelivery.controller.js`
- `M Backend/controllers/applicationWorkflow.controller.js`
- `M Backend/routes/route.js`
- `M Backend/services/applicationNotificationWorker.service.js`
- `A Backend/tests/applicationDeliveryRetry.test.cjs`
- `A Frontend/src/Components/ApplicationDelivery.tsx`
- `M Frontend/src/Pages/Recruitment/Applications/ApplicationDetail.tsx`
- `M Frontend/src/Services/applicationsService.ts`
- `M Frontend/src/Types/recruitment.ts`
- `M Frontend/src/i18n/locales/az.json`
- `M Frontend/src/i18n/locales/en.json`
- `M Frontend/src/i18n/locales/ru.json`
- `A Frontend/tests/applicationDeliveryUI.test.cjs`
- `M docs/HR_IMPLEMENTATION_TRACKER.md`
- `A docs/HR_NOTIFICATION_RETRY_CONTRACT.md`

## `d3e036f54f7718fef71d301bbead248ed721334e`

feat(hr): prepare bounded durable CV parsing jobs

5 changed paths:

- `A Backend/models/hrCvProcessingJob.model.js`
- `A Backend/services/hrCvProcessing.service.js`
- `A Backend/tests/hrCvProcessing.test.cjs`
- `A docs/HR_CV_PROCESSING_CONTRACT.md`
- `M docs/HR_IMPLEMENTATION_TRACKER.md`

## `89fb9017d73c605a86f9831d7341a6622f61d8ba`

feat(hr): expose scoped CV processing status and review

15 changed paths:

- `A Backend/controllers/hrCvProcessing.controller.js`
- `M Backend/routes/route.js`
- `M Backend/server.js`
- `M Backend/services/hrCvProcessing.service.js`
- `A Backend/tests/hrCvProcessingHttp.test.cjs`
- `A Frontend/src/Components/CvProcessingPanel.tsx`
- `M Frontend/src/Pages/Recruitment/Candidates/CandidateDetail.tsx`
- `A Frontend/src/Services/cvProcessingService.ts`
- `M Frontend/src/Styles/recruitment.css`
- `M Frontend/src/i18n/locales/az.json`
- `M Frontend/src/i18n/locales/en.json`
- `M Frontend/src/i18n/locales/ru.json`
- `A Frontend/tests/hrCvProcessingUI.test.cjs`
- `M docs/HR_CV_PROCESSING_CONTRACT.md`
- `M docs/HR_IMPLEMENTATION_TRACKER.md`

## `bd7b5789fbcf73e08e4c1972333ce33b3d1c0f52`

feat(hr): add scoped bounded CV processing repair retry

13 changed paths:

- `M Backend/controllers/hrCvProcessing.controller.js`
- `M Backend/models/hrCvProcessingJob.model.js`
- `M Backend/routes/route.js`
- `M Backend/services/hrCvProcessing.service.js`
- `A Backend/tests/hrCvProcessingRetry.test.cjs`
- `M Frontend/src/Components/CvProcessingPanel.tsx`
- `M Frontend/src/Services/cvProcessingService.ts`
- `M Frontend/src/i18n/locales/az.json`
- `M Frontend/src/i18n/locales/en.json`
- `M Frontend/src/i18n/locales/ru.json`
- `A Frontend/tests/hrCvProcessingRetryUI.test.cjs`
- `M docs/HR_CV_PROCESSING_CONTRACT.md`
- `M docs/HR_IMPLEMENTATION_TRACKER.md`

## `62cb10a201e313af1382beb69ea4db5a3ed5b2ce`

feat(hr): approve CV processing results with server provenance

18 changed paths:

- `M Backend/controllers/candidates.controller.js`
- `M Backend/controllers/hrCvProcessing.controller.js`
- `M Backend/models/candidate.model.js`
- `A Backend/services/hrCvApproval.service.js`
- `A Backend/tests/hrCvApproval.test.cjs`
- `A Frontend/src/Components/CvProcessingApprovalReview.tsx`
- `M Frontend/src/Components/CvProcessingPanel.tsx`
- `M Frontend/src/Components/CvReviewEvidence.tsx`
- `M Frontend/src/Pages/Recruitment/Candidates/CandidateForm.tsx`
- `M Frontend/src/Services/candidatesService.ts`
- `M Frontend/src/Services/cvProcessingService.ts`
- `M Frontend/src/Types/recruitment.ts`
- `M Frontend/src/i18n/locales/az.json`
- `M Frontend/src/i18n/locales/en.json`
- `M Frontend/src/i18n/locales/ru.json`
- `A Frontend/tests/hrCvApprovalUI.test.cjs`
- `M docs/HR_CV_PROCESSING_CONTRACT.md`
- `M docs/HR_IMPLEMENTATION_TRACKER.md`

## `e477943ca9884e5178f00edca8f09054f15252f8`

fix(hr): preserve approval drafts across rejected CV selections

6 changed paths:

- `M Backend/tests/hrCvApproval.test.cjs`
- `M Frontend/src/Components/CvProcessingApprovalReview.tsx`
- `M Frontend/src/Pages/Recruitment/Candidates/CandidateForm.tsx`
- `A Frontend/tests/hrCvApprovalDraftUI.test.cjs`
- `M docs/HR_CV_PROCESSING_CONTRACT.md`
- `M docs/HR_IMPLEMENTATION_TRACKER.md`

## `a932580b5da3b670aca592361c5519166b94de63`

feat(hr): prepare scoped CV migration dry-run inventory

4 changed paths:

- `A Backend/services/hrCvMigrationInventory.service.js`
- `A Backend/tests/hrCvMigrationInventory.test.cjs`
- `A docs/HR_CV_MIGRATION_PREPARATION.md`
- `M docs/HR_IMPLEMENTATION_TRACKER.md`

## `4f487005c8fb630a33cf6778c81a439e74ce23e8`

feat(hr): prepare source-bound private CV original manifests

5 changed paths:

- `A Backend/models/hrCvOriginalManifest.model.js`
- `A Backend/services/hrCvOriginalArchive.service.js`
- `A Backend/tests/hrCvOriginalArchive.test.cjs`
- `A docs/HR_CV_ORIGINAL_MANIFEST.md`
- `M docs/HR_IMPLEMENTATION_TRACKER.md`

## `aa11a9d6155fdebdbff9b970ef86eba306578856`

feat(hr): prepare durable source-bound AI review jobs

6 changed paths:

- `M Backend/models/hrCvProcessingJob.model.js`
- `A Backend/services/hrCvAiProcessing.service.js`
- `M Backend/services/hrCvProcessing.service.js`
- `A Backend/tests/hrCvAiProcessing.test.cjs`
- `A docs/HR_CV_AI_PROCESSING.md`
- `M docs/HR_IMPLEMENTATION_TRACKER.md`

## `04e73a11af33151fd460eb61db80d3b921cce4d6`

feat(hr): prepare bounded source-bound OCR review jobs

8 changed paths:

- `A Backend/scripts/prepareOcrTestModels.cjs`
- `A Backend/services/hrCvOcrEngine.service.js`
- `A Backend/services/hrCvOcrProcessing.service.js`
- `A Backend/services/hrCvOcrRender.worker.cjs`
- `M Backend/tests/hrCvApproval.test.cjs`
- `A Backend/tests/hrCvOcrProcessing.test.cjs`
- `A docs/HR_CV_OCR_PROCESSING.md`
- `M docs/HR_IMPLEMENTATION_TRACKER.md`

## `e93ab040bb949099d9c0a81ae478901144043f5f`

fix(hr): guard archived originals and pre-provider authorization

13 changed paths:

- `M Backend/controllers/candidates.controller.js`
- `M Backend/controllers/hrAiCvReview.controller.js`
- `M Backend/controllers/hrCvProcessing.controller.js`
- `M Backend/controllers/privateFiles.controller.js`
- `M Backend/models/candidate.model.js`
- `M Backend/services/hrCvApproval.service.js`
- `M Backend/services/hrCvMigrationInventory.service.js`
- `M Backend/services/hrCvOriginalArchive.service.js`
- `A Backend/services/hrCvOriginalAttachment.service.js`
- `M Backend/services/hrCvProcessing.service.js`
- `A Backend/tests/hrCvOriginalAttachment.test.cjs`
- `A docs/HR_CV_ORIGINAL_ATTACHMENT.md`
- `M docs/HR_IMPLEMENTATION_TRACKER.md`

## `3653430831434ac4f9b286ddce5c2eeb33974849`

feat(hr): integrate bounded OCR review workflow

18 changed paths:

- `M Backend/controllers/hrCvProcessing.controller.js`
- `M Backend/server.js`
- `M Backend/services/hrCvApproval.service.js`
- `M Backend/services/hrCvProcessing.service.js`
- `A Backend/services/hrCvTaskProfiles.service.js`
- `A Backend/tests/helpers/scannedCv.cjs`
- `A Backend/tests/hrCvOcrHttp.test.cjs`
- `M Backend/tests/hrCvOcrProcessing.test.cjs`
- `M Frontend/src/Components/CvProcessingApprovalReview.tsx`
- `M Frontend/src/Components/CvProcessingPanel.tsx`
- `M Frontend/src/Components/CvReviewEvidence.tsx`
- `M Frontend/src/Services/cvProcessingService.ts`
- `M Frontend/src/i18n/locales/az.json`
- `M Frontend/src/i18n/locales/en.json`
- `M Frontend/src/i18n/locales/ru.json`
- `A Frontend/tests/hrCvOcrUI.test.cjs`
- `A docs/HR_CV_OCR_HTTP_REVIEW.md`
- `M docs/HR_IMPLEMENTATION_TRACKER.md`

## `42c1a4a65e1a5bfd2dcc7df1fa49c887a76ee0f1`

feat(hr): integrate source-bound AI review jobs and provenance

24 changed paths:

- `M Backend/controllers/hrCvProcessing.controller.js`
- `M Backend/models/candidate.model.js`
- `M Backend/server.js`
- `M Backend/services/hrAiCvReview.service.js`
- `M Backend/services/hrCvAiProcessing.service.js`
- `M Backend/services/hrCvApproval.service.js`
- `M Backend/services/hrCvProcessing.service.js`
- `M Backend/services/hrCvTaskProfiles.service.js`
- `M Backend/tests/hrAiCvReview.test.cjs`
- `A Backend/tests/hrCvAiHttp.test.cjs`
- `A Backend/tests/hrCvTaskLifecycle.test.cjs`
- `M Frontend/src/Components/CvProcessingApprovalReview.tsx`
- `M Frontend/src/Components/CvProcessingPanel.tsx`
- `M Frontend/src/Components/CvReviewEvidence.tsx`
- `M Frontend/src/Pages/Recruitment/Candidates/CandidateForm.tsx`
- `M Frontend/src/Services/cvProcessingService.ts`
- `M Frontend/src/Services/hrAiService.ts`
- `M Frontend/src/Types/recruitment.ts`
- `M Frontend/src/i18n/locales/az.json`
- `M Frontend/src/i18n/locales/en.json`
- `M Frontend/src/i18n/locales/ru.json`
- `A Frontend/tests/hrCvAiProcessingUI.test.cjs`
- `A docs/HR_CV_AI_HTTP_REVIEW.md`
- `M docs/HR_IMPLEMENTATION_TRACKER.md`

## `0b8531500ad99c26896007a3429077ec3b0eb057`

fix(hr): localize CV parsing errors and fail closed on auth loss

9 changed paths:

- `M Frontend/src/Pages/Recruitment/Candidates/CandidateForm.tsx`
- `M Frontend/src/Services/candidatesService.ts`
- `A Frontend/src/Utils/hrDocumentError.ts`
- `M Frontend/src/i18n/locales/az.json`
- `M Frontend/src/i18n/locales/en.json`
- `M Frontend/src/i18n/locales/ru.json`
- `A Frontend/tests/hrCvDocumentErrorsUI.test.cjs`
- `A docs/HR_CV_DOCUMENT_ERROR_STATES.md`
- `M docs/HR_IMPLEMENTATION_TRACKER.md`

## `d65d5e312cf8764402e9da6081d0d775231ffaf3`

docs(hr): save validated P10 checkpoint and remaining program backlog

1 changed paths:

- `M docs/HR_IMPLEMENTATION_TRACKER.md`

## `d4ade8350317fda2ef2e5603f098a72d86d02e44`

fix(hr): preserve CV creation outcomes after uncertain writes

13 changed paths:

- `M Backend/controllers/candidatePipeline.controller.js`
- `M Backend/controllers/candidates.controller.js`
- `M Backend/middleware/privateUpload.middleware.js`
- `A Backend/services/hrCreateRecovery.service.js`
- `A Backend/tests/hrCvCreateRecovery.test.cjs`
- `M Frontend/src/Pages/Recruitment/Candidates/CandidateForm.tsx`
- `M Frontend/src/Services/candidatesService.ts`
- `M Frontend/src/i18n/locales/az.json`
- `M Frontend/src/i18n/locales/en.json`
- `M Frontend/src/i18n/locales/ru.json`
- `A Frontend/tests/hrCvCreateRecoveryUI.test.cjs`
- `A docs/HR_CV_CREATE_RECOVERY.md`
- `M docs/HR_IMPLEMENTATION_TRACKER.md`

## `ae10bb791375e5279af3731901c748cc0b449db0`

feat(hr): prepare private idempotent CV intake queue

5 changed paths:

- `A Backend/models/hrCvIntake.model.js`
- `A Backend/services/hrCvIntake.service.js`
- `A Backend/tests/hrCvIntake.test.cjs`
- `A docs/HR_CV_INTAKE_FOUNDATION.md`
- `M docs/HR_IMPLEMENTATION_TRACKER.md`

## `d987f3f2fd4bd3ae38f0163f40f047f1e8420526`

feat(hr): authorize explicit idempotent CV source approval

20 changed paths:

- `M Backend/controllers/candidates.controller.js`
- `M Backend/controllers/hrAiCvReview.controller.js`
- `M Backend/controllers/hrCvProcessing.controller.js`
- `M Backend/controllers/privateFiles.controller.js`
- `M Backend/models/candidate.model.js`
- `M Backend/models/hrCvIntake.model.js`
- `A Backend/routes/hrCvIntake.routes.js`
- `M Backend/routes/route.js`
- `M Backend/services/hrCvApproval.service.js`
- `M Backend/services/hrCvIntake.service.js`
- `A Backend/services/hrCvIntakeApproval.service.js`
- `A Backend/services/hrCvIntakeProfiles.service.js`
- `A Backend/services/hrCvIntakeScope.service.js`
- `M Backend/services/hrCvMigrationInventory.service.js`
- `M Backend/services/hrCvOriginalArchive.service.js`
- `M Backend/services/hrCvOriginalAttachment.service.js`
- `M Backend/services/hrCvProcessing.service.js`
- `A Backend/tests/hrCvIntakeApproval.test.cjs`
- `A docs/HR_CV_INTAKE_APPROVAL.md`
- `M docs/HR_IMPLEMENTATION_TRACKER.md`

## `38da456760144bdd2a5aab5b734e3be073a330f4`

feat(hr): review and recover private CV intake without reupload

9 changed paths:

- `M Frontend/src/Pages/Recruitment/Candidates/CandidateForm.tsx`
- `A Frontend/src/Services/cvIntakeService.ts`
- `M Frontend/src/api/readRequest.ts`
- `M Frontend/src/i18n/locales/az.json`
- `M Frontend/src/i18n/locales/en.json`
- `M Frontend/src/i18n/locales/ru.json`
- `A Frontend/tests/cvIntakeUI.test.cjs`
- `A docs/HR_CV_INTAKE_UI.md`
- `M docs/HR_IMPLEMENTATION_TRACKER.md`

## `c1e63c6078df109e87034360dc5abef043664d5b`

feat(hr): add scoped private CV review queue

15 changed paths:

- `M Backend/models/hrCvIntake.model.js`
- `M Backend/routes/hrCvIntake.routes.js`
- `M Backend/services/hrCvIntake.service.js`
- `A Backend/services/hrCvIntakeList.service.js`
- `A Backend/tests/hrCvIntakeList.test.cjs`
- `M Frontend/src/Pages/Recruitment/Candidates/CandidatesList.tsx`
- `A Frontend/src/Pages/Recruitment/Candidates/CvIntakeQueue.tsx`
- `M Frontend/src/Routes/Routes.tsx`
- `M Frontend/src/Services/cvIntakeService.ts`
- `M Frontend/src/i18n/locales/az.json`
- `M Frontend/src/i18n/locales/en.json`
- `M Frontend/src/i18n/locales/ru.json`
- `A Frontend/tests/cvIntakeQueueUI.test.cjs`
- `A docs/HR_CV_INTAKE_QUEUE.md`
- `M docs/HR_IMPLEMENTATION_TRACKER.md`

## `204167a4236a3c7eca82018883955f7d37f7ac82`

feat(hr): prepare approved Outlook Graph transport

4 changed paths:

- `A Backend/services/hrGraphAdapter.service.js`
- `A Backend/tests/hrGraphAdapter.test.cjs`
- `M docs/HR_IMPLEMENTATION_TRACKER.md`
- `A docs/HR_OUTLOOK_ADAPTER.md`

## `bbfcbad9f0b9c0cbdae711d5dab70af353e69882`

feat(hr): persist approved Outlook source checkpoints

10 changed paths:

- `M Backend/models/hrCvIntake.model.js`
- `A Backend/models/hrGraphReceipt.model.js`
- `A Backend/models/hrGraphSync.model.js`
- `M Backend/services/hrCvIntake.service.js`
- `M Backend/services/hrCvIntakeApproval.service.js`
- `A Backend/services/hrCvSourceOrigin.service.js`
- `A Backend/services/hrGraphSync.service.js`
- `A Backend/tests/hrGraphSync.test.cjs`
- `M docs/HR_IMPLEMENTATION_TRACKER.md`
- `A docs/HR_OUTLOOK_SYNC.md`

## `263501b84c9d33f236dafc16b1da9842344286fc`

feat(hr): review scoped CV source and duplicate hints

13 changed paths:

- `M Backend/routes/hrCvIntake.routes.js`
- `M Backend/services/hrCvIntake.service.js`
- `A Backend/services/hrCvSourceReview.service.js`
- `A Backend/tests/hrCvSourceReview.test.cjs`
- `A Frontend/src/Components/CvIntakeSourceReview.tsx`
- `M Frontend/src/Pages/Recruitment/Candidates/CandidateForm.tsx`
- `M Frontend/src/Services/cvIntakeService.ts`
- `M Frontend/src/i18n/locales/az.json`
- `M Frontend/src/i18n/locales/en.json`
- `M Frontend/src/i18n/locales/ru.json`
- `A Frontend/tests/cvIntakeSourceReviewUI.test.cjs`
- `A docs/HR_CV_SOURCE_REVIEW.md`
- `M docs/HR_IMPLEMENTATION_TRACKER.md`

## `a57b2d7bb8de539cf0659c43fe0e08c51b92dd86`

feat(hr): prepare current-scope recruitment background workers

6 changed paths:

- `A Backend/services/hrBackgroundActor.service.js`
- `M Backend/services/hrCreateRecovery.service.js`
- `A Backend/services/hrIntegrationWorker.service.js`
- `A Backend/tests/hrBackgroundActor.test.cjs`
- `A docs/HR_BACKGROUND_IDENTITY.md`
- `M docs/HR_IMPLEMENTATION_TRACKER.md`

## `2edc863b31dd7491e2886dc5042ce28967fb877a`

feat(hr): prepare signed private career intake relay

10 changed paths:

- `A Backend/models/hrExternalRate.model.js`
- `A Backend/models/hrExternalReceipt.model.js`
- `A Backend/routes/hrCareerIntake.routes.js`
- `M Backend/routes/route.js`
- `A Backend/services/hrSignedSource.service.js`
- `A Backend/services/hrSignedSourceProfiles.service.js`
- `A Backend/tests/hrSignedSource.test.cjs`
- `A Backend/tests/hrSignedSourceHttp.test.cjs`
- `A docs/HR_EXTERNAL_SOURCE_CAPABILITIES.md`
- `M docs/HR_IMPLEMENTATION_TRACKER.md`

## `209c9259686dbd4915cc1f97e77dc13be9ee6387`

fix(hr): trust explicitly confirmed source corrections

5 changed paths:

- `M Backend/services/hrCvIntakeApproval.service.js`
- `M Backend/tests/hrCvIntakeApproval.test.cjs`
- `A Backend/tests/hrCvSourceScore.test.cjs`
- `M docs/HR_IMPLEMENTATION_TRACKER.md`
- `A docs/HR_SOURCE_SCORE_CONFIRMATION.md`

## `ee4b4f8e817cf57fa7724bdfe14374705b54ddeb`

fix(hr): version protected criteria and incomplete score guards

8 changed paths:

- `M Backend/services/applicationMatch.service.js`
- `M Backend/services/hrAiSchema.service.js`
- `M Backend/tests/applicationMatching.test.cjs`
- `M Backend/tests/applicationScoreState.test.cjs`
- `M Backend/tests/hrCvSourceScore.test.cjs`
- `A Backend/tests/hrMatchingFairness.test.cjs`
- `A docs/HR_ATS_V2_COMPATIBILITY.md`
- `M docs/HR_IMPLEMENTATION_TRACKER.md`

## `ff450ae94b6123b5acd9f4db06d97aac15fb1399`

feat(hr): prepare fail-closed native document scanning

4 changed paths:

- `A Backend/services/hrClamScan.service.js`
- `A Backend/tests/hrClamScan.test.cjs`
- `M docs/HR_IMPLEMENTATION_TRACKER.md`
- `A docs/HR_NATIVE_MALWARE_SCANNER.md`

## `7f4f5068028482fc2c4601ebd133a6a46f50ca18`

feat(hr): review scanned private sources with bounded OCR

7 changed paths:

- `M Backend/services/hrCvIntake.service.js`
- `M Backend/services/hrCvOcrProcessing.service.js`
- `A Backend/tests/hrCvSourceOcr.test.cjs`
- `M Frontend/src/Services/cvIntakeService.ts`
- `A Frontend/tests/cvIntakeOcrUI.test.cjs`
- `M docs/HR_IMPLEMENTATION_TRACKER.md`
- `A docs/HR_PRIVATE_SOURCE_OCR.md`

## `8ec6ae10b1261f904a074e69c42ad2c1ff7472d0`

fix(hr): localize safe CRUD failures and lost access states

16 changed paths:

- `M Frontend/src/Pages/Recruitment/Applications/ApplicationDetail.tsx`
- `M Frontend/src/Pages/Recruitment/Applications/ApplicationsList.tsx`
- `M Frontend/src/Pages/Recruitment/Candidates/CandidateDetail.tsx`
- `M Frontend/src/Pages/Recruitment/Candidates/CandidateForm.tsx`
- `M Frontend/src/Pages/Recruitment/Candidates/CandidatesList.tsx`
- `M Frontend/src/Pages/Recruitment/Jobs/JobDetail.tsx`
- `M Frontend/src/Pages/Recruitment/Jobs/JobForm.tsx`
- `M Frontend/src/Pages/Recruitment/Jobs/JobsList.tsx`
- `A Frontend/src/Utils/hrCrudError.ts`
- `M Frontend/src/api/axios.ts`
- `M Frontend/src/i18n/locales/az.json`
- `M Frontend/src/i18n/locales/en.json`
- `M Frontend/src/i18n/locales/ru.json`
- `A Frontend/tests/hrCrudErrorsUI.test.cjs`
- `A docs/HR_CRUD_ERROR_PRESENTATION.md`
- `M docs/HR_IMPLEMENTATION_TRACKER.md`

## `087f19a5ab483a6aee7ad08ca49fabfc43fca765`

test(hr): verify joined recruitment flows and local release indexes

6 changed paths:

- `A Backend/scripts/hrReleaseIndexInventory.cjs`
- `A Backend/services/hrReleaseIndexes.service.js`
- `A Backend/tests/hrRecruitmentE2E.test.cjs`
- `A Backend/tests/hrReleaseIndexes.test.cjs`
- `A docs/HR_DB_RELEASE_PREPARATION.md`
- `M docs/HR_IMPLEMENTATION_TRACKER.md`

## `47c41321f3320de0ebc96f1e5682fda3953fc2e7`

feat(hr): retry scoped private sources without reupload

17 changed paths:

- `M Backend/models/hrCvIntake.model.js`
- `M Backend/routes/hrCvIntake.routes.js`
- `M Backend/services/hrCvIntake.service.js`
- `A Backend/services/hrCvIntakeRetry.service.js`
- `A Backend/tests/hrCvSourceRetry.test.cjs`
- `M Frontend/src/Pages/Recruitment/Candidates/CandidateForm.tsx`
- `A Frontend/src/Pages/Recruitment/Candidates/CvIntakeDetail.tsx`
- `M Frontend/src/Pages/Recruitment/Candidates/CvIntakeQueue.tsx`
- `M Frontend/src/Routes/Routes.tsx`
- `M Frontend/src/Services/cvIntakeService.ts`
- `M Frontend/src/i18n/locales/az.json`
- `M Frontend/src/i18n/locales/en.json`
- `M Frontend/src/i18n/locales/ru.json`
- `M Frontend/tests/cvIntakeQueueUI.test.cjs`
- `A Frontend/tests/cvIntakeRepairUI.test.cjs`
- `M docs/HR_IMPLEMENTATION_TRACKER.md`
- `A docs/HR_SOURCE_RETRY_AND_READ_ONLY_REVIEW.md`

## `5ec33144fdf6d76b9edb1b4bebd439913c2fd22b`

fix(files): isolate downloads from preview refetch races

7 changed paths:

- `M Frontend/src/Components/PrivateFilePreview.tsx`
- `M Frontend/src/Pages/Audit/ChecklistBuilder/AuditTemplateBuilder.tsx`
- `M Frontend/src/Utils/downloadFile.ts`
- `M Frontend/tests/sourceDocuments.test.cjs`
- `A Frontend/tests/sourceDownloadRace.test.cjs`
- `M docs/HR_IMPLEMENTATION_TRACKER.md`
- `A docs/HR_SOURCE_DOWNLOAD_RACE.md`

## `2f246042873cf95156c95ed7cbbf742091cbed35`

fix(hr): report unverified AI configuration accurately

9 changed paths:

- `M Backend/controllers/hrAnalytics.controller.js`
- `M Backend/services/hrAiProvider.service.js`
- `M Backend/tests/hrAnalytics.test.cjs`
- `A Backend/tests/hrIntegrationHealth.test.cjs`
- `M Frontend/src/i18n/locales/az.json`
- `M Frontend/src/i18n/locales/en.json`
- `M Frontend/src/i18n/locales/ru.json`
- `M docs/HR_IMPLEMENTATION_TRACKER.md`
- `A docs/HR_INTEGRATION_HEALTH.md`

## `0903b744127165448781d1605f9424b24610b07a`

fix(hr): translate explicit review validation messages

5 changed paths:

- `M Frontend/src/Pages/Recruitment/Candidates/CandidateForm.tsx`
- `M Frontend/tests/hrCvApprovalUI.test.cjs`
- `M Frontend/tests/hrPaginationUI.test.cjs`
- `A docs/HR_FINAL_REGRESSION_CORRECTIONS.md`
- `M docs/HR_IMPLEMENTATION_TRACKER.md`


## `f735acb47d27e4a93f0eeb3336af79d4209fbdd2`

docs(hr): finalize verified E2E matrix and external release gates

6 changed paths:

- `A docs/HR_AUDIT_FINDING_DISPOSITION.md`
- `A docs/HR_FINAL_API_BENCHMARK.md`
- `A docs/HR_IMPLEMENTATION_COMPLETION.md`
- `M docs/HR_IMPLEMENTATION_TRACKER.md`
- `A docs/HR_LOCAL_COMMIT_LEDGER.md`
- `A docs/HR_RELEASE_E2E_MATRIX.md`

## `65e64daba6dcb112fb384efcd69650d4d8aad73e`

fix(hr): enforce canonical department access independently of grants

21 changed paths:

- `M Backend/controllers/auth.controller.js`
- `M Backend/controllers/privateFiles.controller.js`
- `M Backend/middleware/auth.middleware.js`
- `M Backend/services/hrBackgroundActor.service.js`
- `M Backend/services/hrCreateRecovery.service.js`
- `A Backend/services/hrDepartmentAccess.service.js`
- `M Backend/services/hrResourceScope.service.js`
- `M Backend/tests/helpers/auditFixture.cjs`
- `M Backend/tests/hrBackgroundActor.test.cjs`
- `A Backend/tests/hrDepartmentAccess.test.cjs`
- `M Backend/tests/hrResourceScopes.test.cjs`
- `M Frontend/src/Hooks/useAuditAction.ts`
- `M Frontend/src/Hooks/useAuditResource.ts`
- `M Frontend/src/Hooks/useHRActionContext.ts`
- `M Frontend/src/Routes/HRRoute.tsx`
- `M Frontend/src/Types/auth.ts`
- `M Frontend/src/Utils/permissions.ts`
- `M Frontend/tests/helpers/browser.cjs`
- `A Frontend/tests/hrDepartmentAccessUI.test.cjs`
- `A docs/HR_DEPARTMENT_ACCESS.md`
- `M docs/HR_IMPLEMENTATION_TRACKER.md`

## `feacace3f59bda485addc8f17f124236b47575b8`

fix(hr): scope recruitment activity descriptions to readable parents

4 changed paths:

- `M Backend/controllers/activityLog.controller.js`
- `A Backend/services/hrActivityVisibility.service.js`
- `A Backend/tests/hrActivityPrivacy.test.cjs`
- `M docs/HR_IMPLEMENTATION_TRACKER.md`

## `7110d2e63c58b1e23c00d2be7783e30ed477c9be`

feat(hr): archive and restore candidates without erasing history

26 changed paths:

- `M Backend/controllers/applications.controller.js`
- `A Backend/controllers/candidateArchive.controller.js`
- `M Backend/controllers/candidateExport.controller.js`
- `M Backend/controllers/candidates.controller.js`
- `M Backend/controllers/dashboardSummary.controller.js`
- `M Backend/controllers/hrPaged.controller.js`
- `M Backend/models/candidate.model.js`
- `M Backend/routes/route.js`
- `M Backend/services/hrCvApproval.service.js`
- `M Backend/services/hrCvIntakeScope.service.js`
- `M Backend/services/hrCvProcessing.service.js`
- `A Backend/tests/hrCandidateArchive.test.cjs`
- `A Frontend/src/Components/CandidateArchiveHistory.tsx`
- `A Frontend/src/Components/HRConfirmDialog.tsx`
- `M Frontend/src/Pages/Recruitment/Candidates/CandidateDetail.tsx`
- `M Frontend/src/Pages/Recruitment/Candidates/CandidateForm.tsx`
- `M Frontend/src/Pages/Recruitment/Candidates/CandidatesList.tsx`
- `M Frontend/src/Services/candidatesService.ts`
- `M Frontend/src/Services/hrPageService.ts`
- `M Frontend/src/Types/recruitment.ts`
- `M Frontend/src/i18n/locales/az.json`
- `M Frontend/src/i18n/locales/en.json`
- `M Frontend/src/i18n/locales/ru.json`
- `A Frontend/tests/hrCandidateArchiveUI.test.cjs`
- `A docs/HR_CANDIDATE_ARCHIVE.md`
- `M docs/HR_IMPLEMENTATION_TRACKER.md`

## `02fdfa3dd3ae0cc3b89814aa5f7941926a48997f`

feat(hr): unify responsive recruitment workspace design

19 changed paths:

- `M Frontend/src/App.css`
- `M Frontend/src/Components/HRResourceState.tsx`
- `M Frontend/src/Layouts/AppShell/AppShell.tsx`
- `M Frontend/src/Pages/Dashboard/Dashboard.tsx`
- `M Frontend/src/Pages/Recruitment/Analytics/HRAnalytics.tsx`
- `M Frontend/src/Pages/Recruitment/Applications/ApplicationDetail.tsx`
- `M Frontend/src/Pages/Recruitment/Applications/ApplicationsList.tsx`
- `M Frontend/src/Pages/Recruitment/Candidates/CandidateDetail.tsx`
- `M Frontend/src/Pages/Recruitment/Candidates/CandidateForm.tsx`
- `M Frontend/src/Pages/Recruitment/Candidates/CandidatesList.tsx`
- `M Frontend/src/Pages/Recruitment/Candidates/CvIntakeDetail.tsx`
- `M Frontend/src/Pages/Recruitment/Candidates/CvIntakeQueue.tsx`
- `M Frontend/src/Pages/Recruitment/Jobs/JobDetail.tsx`
- `M Frontend/src/Pages/Recruitment/Jobs/JobForm.tsx`
- `M Frontend/src/Pages/Recruitment/Jobs/JobsList.tsx`
- `A Frontend/src/Styles/hr-workspace.css`
- `A Frontend/tests/hrWorkspaceUI.test.cjs`
- `M docs/HR_IMPLEMENTATION_TRACKER.md`
- `A docs/HR_WORKSPACE_DESIGN.md`

## `ebaf0859898efa3e177ff79de3342a10233817e0`

test(hr): align action race coverage with candidate archival

2 changed paths:

- `M Frontend/tests/candidateActions.test.cjs`
- `M docs/HR_IMPLEMENTATION_TRACKER.md`

## `fcceff65fdeb908a4eb41d92853b5e8e82356a7f`

test(hr): require readable parents in activity lifecycle fixtures

2 changed paths:

- `M Backend/tests/applicationLifecycle.test.cjs`
- `M docs/HR_IMPLEMENTATION_TRACKER.md`

## `fadd19e0ea25272722c291deac2575989ec14171`

docs(hr): record development verification and remaining release gates

8 changed paths:

- `M docs/HR_AUDIT_FINDING_DISPOSITION.md`
- `M docs/HR_DEPARTMENT_ACCESS.md`
- `A docs/HR_DEVELOPMENT_FINAL_REPORT.md`
- `M docs/HR_FINAL_API_BENCHMARK.md`
- `M docs/HR_IMPLEMENTATION_COMPLETION.md`
- `M docs/HR_IMPLEMENTATION_TRACKER.md`
- `M docs/HR_LOCAL_COMMIT_LEDGER.md`
- `M docs/HR_RELEASE_E2E_MATRIX.md`

## `a95401ad22d364804dea8dfbaed5b8a2fca91bea`

fix(hr): archive jobs without deleting applications or history

28 changed paths:

- `M Backend/controllers/applications.controller.js`
- `M Backend/controllers/candidatePipeline.controller.js`
- `M Backend/controllers/dashboardSummary.controller.js`
- `M Backend/controllers/hrAi.controller.js`
- `M Backend/controllers/hrAnalytics.controller.js`
- `M Backend/controllers/hrPaged.controller.js`
- `A Backend/controllers/jobArchive.controller.js`
- `M Backend/controllers/jobs.controller.js`
- `M Backend/models/job.model.js`
- `M Backend/routes/route.js`
- `M Backend/services/hrCvIntakeApproval.service.js`
- `M Backend/services/hrCvSourceReview.service.js`
- `M Backend/services/hrGraphSync.service.js`
- `M Backend/services/hrSignedSource.service.js`
- `M Backend/tests/hrCandidateArchive.test.cjs`
- `A Backend/tests/hrJobArchive.test.cjs`
- `A Frontend/src/Components/JobArchiveHistory.tsx`
- `M Frontend/src/Pages/Recruitment/Jobs/JobDetail.tsx`
- `M Frontend/src/Pages/Recruitment/Jobs/JobForm.tsx`
- `M Frontend/src/Pages/Recruitment/Jobs/JobsList.tsx`
- `M Frontend/src/Services/jobsService.ts`
- `M Frontend/src/Types/recruitment.ts`
- `M Frontend/src/i18n/locales/az.json`
- `M Frontend/src/i18n/locales/en.json`
- `M Frontend/src/i18n/locales/ru.json`
- `A Frontend/tests/hrJobArchiveUI.test.cjs`
- `M docs/HR_IMPLEMENTATION_TRACKER.md`
- `A docs/HR_JOB_ARCHIVE.md`

## `a4d008cf02f6c3498fe8ed5d83884abbd26aa4a1`

perf(hr): bound analytics parent work and score hashing

4 changed paths:

- `M Backend/controllers/hrAnalytics.controller.js`
- `M Backend/services/applicationMatch.service.js`
- `A Backend/tests/hrAnalyticsOptimization.test.cjs`
- `M docs/HR_IMPLEMENTATION_TRACKER.md`

## `777a88f86df189f9cefdf4c2c5983e9eaebe71b5`

fix(release): disable automatic schema creation and worker activation

4 changed paths:

- `M Backend/server.js`
- `A Backend/tests/hrNativeReleaseGate.test.cjs`
- `M docs/HR_DB_RELEASE_PREPARATION.md`
- `M docs/HR_IMPLEMENTATION_TRACKER.md`

## `7309cb72ca5f1f9d160a23bc3af66c30d4f500e5`

test(hr): wait for source duplicate readiness before language measurement

2 changed paths:

- `M Frontend/tests/cvIntakeOcrUI.test.cjs`
- `M docs/HR_IMPLEMENTATION_TRACKER.md`

## `02890cac3b364060bd53c67b58b4d0000ff4d2e4`

docs(hr): record archive analytics and main release verification

8 changed paths:

- `M docs/HR_AUDIT_FINDING_DISPOSITION.md`
- `M docs/HR_DB_RELEASE_PREPARATION.md`
- `M docs/HR_DEVELOPMENT_FINAL_REPORT.md`
- `M docs/HR_FINAL_API_BENCHMARK.md`
- `M docs/HR_IMPLEMENTATION_COMPLETION.md`
- `M docs/HR_IMPLEMENTATION_TRACKER.md`
- `M docs/HR_LOCAL_COMMIT_LEDGER.md`
- `A docs/HR_MAIN_RELEASE_REPORT.md`

Main fast-forward and remote development deletion are verified in HR_MAIN_RELEASE_REPORT. The subsequent report-only confirmation is identified by its actual SHA in Git/final output; it cannot embed its own future SHA. No prior Git object is removed.

##16 — HR premium UI and measured loading/render packages

### cfed60344fed9d5caaf4c11b242fe2c64c0bbb27

fix(hr): bound loading and parallelize authorized job ranking

13 changed paths:

- `A Frontend/scripts/profileHRWorkspace.cjs`
- `M Frontend/src/Components/AuditResourceState.tsx`
- `M Frontend/src/Components/HRResourceState.tsx`
- `M Frontend/src/Hooks/useAuditResource.ts`
- `M Frontend/src/Pages/Recruitment/Jobs/JobDetail.tsx`
- `M Frontend/src/Styles/hr-workspace.css`
- `M Frontend/src/i18n/locales/az.json`
- `M Frontend/src/i18n/locales/en.json`
- `M Frontend/src/i18n/locales/ru.json`
- `M Frontend/tests/helpers/productionBrowser.cjs`
- `M Frontend/tests/hrAccessibility.test.cjs`
- `A Frontend/tests/hrLoadingLifecycle.test.cjs`
- `M docs/HR_IMPLEMENTATION_TRACKER.md`

### a1d2b76b998b44b843d6bdd65040687d6286bec9

feat(hr): unify premium workspace and real analytics charts

16 changed paths:

- `A Frontend/src/Components/HRHistogram.tsx`
- `A Frontend/src/Components/HRNavigation.tsx`
- `M Frontend/src/Layouts/AppShell/AppShell.tsx`
- `M Frontend/src/Pages/Recruitment/Analytics/HRAnalytics.tsx`
- `M Frontend/src/Pages/Recruitment/Candidates/CandidateDetail.tsx`
- `M Frontend/src/Pages/Recruitment/Candidates/CandidatesList.tsx`
- `M Frontend/src/Pages/Recruitment/Candidates/CvIntakeDetail.tsx`
- `M Frontend/src/Pages/Recruitment/Candidates/CvIntakeQueue.tsx`
- `M Frontend/src/Pages/Recruitment/Jobs/JobsList.tsx`
- `M Frontend/src/Styles/hr-workspace.css`
- `M Frontend/src/i18n/locales/az.json`
- `M Frontend/src/i18n/locales/en.json`
- `M Frontend/src/i18n/locales/ru.json`
- `A Frontend/tests/hrPremiumWorkspace.test.cjs`
- `M docs/HR_IMPLEMENTATION_TRACKER.md`
- `A docs/HR_PREMIUM_WORKSPACE_REPORT.md`

### d5ffbe7ebf8e166be027f2b828add10c3a91ee86

perf(hr): defer offscreen cards and preserve analytics grid

3 changed paths:

- `M Frontend/src/Styles/hr-workspace.css`
- `M Frontend/tests/hrPremiumWorkspace.test.cjs`
- `M docs/HR_IMPLEMENTATION_TRACKER.md`

Full source/test proof belongs to d5ffbe7; subsequent report-only commits do not change the532 frozen source inputs. Existing main push proof follows once verified. No development branch is recreated.

###2b89bb67b8883b098a4cc6acfc261a1686deb30d

docs(hr): record premium UI regression and production-build measurements

4 changed paths:

- `M docs/HR_IMPLEMENTATION_TRACKER.md`
- `M docs/HR_AUDIT_FINDING_DISPOSITION.md`
- `M docs/HR_LOCAL_COMMIT_LEDGER.md`
- `M docs/HR_PREMIUM_WORKSPACE_REPORT.md`

Normal fast-forward existing-main push and exact remote parity verified. Post-push hosting remains proxy-blocked; final report-only confirmation is identified by its actual Git SHA after commit. All532 tested source inputs remain unchanged.

##17 — Premium daily workflows and measured navigation

### 55753e864fb5cb80dbd98869a031c0fbe52eb1e1

perf(hr): preload public route code and coalesce focus refreshes

9 changed paths:

- `A Frontend/scripts/profileHRTransitions.cjs`
- `M Frontend/src/Components/HRNavigation.tsx`
- `M Frontend/src/Hooks/useAuditResource.ts`
- `M Frontend/src/Layouts/AppShell/Sidebar.tsx`
- `A Frontend/src/Routes/hrRouteModules.ts`
- `M Frontend/tests/helpers/productionBrowser.cjs`
- `A Frontend/tests/hrNavigationPerformance.test.cjs`
- `M Frontend/vite.config.ts`
- `M docs/HR_IMPLEMENTATION_TRACKER.md`

### 59bb4d6a4a946d72534e0fa5bad2556985b7ea92

feat(hr): refine daily workspace filters analytics and keyboard flows

25 changed paths:

- `M Frontend/scripts/profileHRTransitions.cjs`
- `M Frontend/src/Components/ApplicationKanban.tsx`
- `A Frontend/src/Components/HRFilterPanel.tsx`
- `M Frontend/src/Components/HRHistogram.tsx`
- `M Frontend/src/Components/HRNavigation.tsx`
- `M Frontend/src/Components/HRScopeFilters.tsx`
- `M Frontend/src/Layouts/AppShell/Sidebar.tsx`
- `M Frontend/src/Pages/Recruitment/Analytics/HRAnalytics.tsx`
- `M Frontend/src/Pages/Recruitment/Applications/ApplicationsList.tsx`
- `M Frontend/src/Pages/Recruitment/Candidates/CandidateDetail.tsx`
- `M Frontend/src/Pages/Recruitment/Candidates/CandidatesList.tsx`
- `M Frontend/src/Pages/Recruitment/Jobs/JobsList.tsx`
- `M Frontend/src/Routes/hrRouteModules.ts`
- `M Frontend/src/Styles/hr-workspace.css`
- `M Frontend/src/i18n/locales/az.json`
- `M Frontend/src/i18n/locales/en.json`
- `M Frontend/src/i18n/locales/ru.json`
- `M Frontend/tests/hrAnalyticsUI.test.cjs`
- `M Frontend/tests/hrBoardUI.test.cjs`
- `A Frontend/tests/hrDailyWorkspace.test.cjs`
- `M Frontend/tests/hrNavigationPerformance.test.cjs`
- `M Frontend/tests/hrPaginationUI.test.cjs`
- `M Frontend/tests/hrPremiumWorkspace.test.cjs`
- `M Frontend/tests/recruitmentCatalogUI.test.cjs`
- `M docs/HR_IMPLEMENTATION_TRACKER.md`

### 70a345e74b8cddf8a8137436b64be2f52438ecc1

perf(hr): defer closed score evidence and review controls

5 changed paths:

- `A Frontend/scripts/profileHRRender.cjs`
- `M Frontend/scripts/profileHRTransitions.cjs`
- `M Frontend/src/Components/MatchScoreBadge.tsx`
- `A Frontend/tests/hrScoreDisclosure.test.cjs`
- `M docs/HR_IMPLEMENTATION_TRACKER.md`

### dedd4497af276a43c5ae816be608d58ca411e236

fix(hr): display locale-safe analytics update timestamps

3 changed paths:

- `M Frontend/src/Pages/Recruitment/Analytics/HRAnalytics.tsx`
- `M Frontend/tests/hrAnalyticsUI.test.cjs`
- `M docs/HR_IMPLEMENTATION_TRACKER.md`

### 997844757731b92cd093200682540fab0ff30319

fix(hr): distinguish unresolved list totals from zero

4 changed paths:

- `M Frontend/src/Pages/Recruitment/Applications/ApplicationsList.tsx`
- `M Frontend/src/Pages/Recruitment/Jobs/JobsList.tsx`
- `A Frontend/tests/hrHeaderCounts.test.cjs`
- `M docs/HR_IMPLEMENTATION_TRACKER.md`

Every source package passed its targeted tests and TSapp/node, production build, lint0errors/9existingwarnings, smoke13 and authorization632 gates. Source packages introduce no backend/env/model/permission/seed/migration/provider activation changes. Final source-bound full regression/measurement and exact existing-main remote proof are recorded in HR_PREMIUM_REFINEMENT_REPORT.md and the final execution response; a report-only commit cannot truthfully record its own future SHA.

##18 — Systematic auth, bundle, cleanup, AI setup and capacity refinement

### eecc311ff58ef9f2d8fe165f21aa84e196ef0610

perf(auth): coalesce paired pending session refreshes

5targets; TS/build/lint0/9/smoke13/auth632

4 changed paths:

- `A Frontend/scripts/profileHRSession.cjs`
- `M Frontend/src/Context/AuthContextProvider.tsx`
- `A Frontend/tests/authFocusCoalescing.test.cjs`
- `M docs/HR_IMPLEMENTATION_TRACKER.md`

### 406ac4f6cff0cb7275b0469c3a87bb85ee238b72

perf(hr): load Kanban runtime only for board workflows

50targets; all gates

3 changed paths:

- `M Frontend/src/Pages/Recruitment/Applications/ApplicationsList.tsx`
- `A Frontend/tests/hrBoardCode.test.cjs`
- `M docs/HR_IMPLEMENTATION_TRACKER.md`

### 93bc13fe0628489e9078943eebf2a1ce82a85b9c

refactor(ui): unify INOP branding and remove duplicate shell styles

107targets incl. actual Audit style equality; all gates

18 changed paths:

- `M Frontend/scripts/profileHRTransitions.cjs`
- `M Frontend/src/App.css`
- `A Frontend/src/Components/INOPLogo.tsx`
- `A Frontend/src/Components/LanguageSwitcher.tsx`
- `M Frontend/src/Layouts/AppShell/Sidebar.tsx`
- `M Frontend/src/Pages/Auth/Login/Login.tsx`
- `M Frontend/src/Styles/admin.css`
- `M Frontend/src/Styles/auth.css`
- `M Frontend/src/Styles/components.css`
- `M Frontend/src/Styles/hr-workspace.css`
- `M Frontend/src/Styles/layout.css`
- `M Frontend/src/Styles/recruitment.css`
- `A Frontend/src/assets/brand/inop-320.webp`
- `A Frontend/src/assets/brand/inop-640.webp`
- `M Frontend/tests/hrNavigationPerformance.test.cjs`
- `A Frontend/tests/hrUnifiedBrand.test.cjs`
- `M docs/HR_IMPLEMENTATION_TRACKER.md`
- `A docs/INOP_BRAND_ASSETS.md`

### 36a465846bdd2d76587a33bc4b93b763c53e12e3

feat(hr): expose honest AI configuration and action prerequisites

98backend/56frontend; all gates, real provider unverified

15 changed paths:

- `M Backend/controllers/hrAi.controller.js`
- `M Backend/routes/route.js`
- `A Backend/tests/hrAiStatus.test.cjs`
- `A Frontend/src/Components/AIAvailability.tsx`
- `M Frontend/src/Components/CvProcessingPanel.tsx`
- `M Frontend/src/Components/CvReviewAssistant.tsx`
- `M Frontend/src/Components/JobSkillsAssistant.tsx`
- `M Frontend/src/Pages/Recruitment/Jobs/JobForm.tsx`
- `M Frontend/src/Services/hrAiService.ts`
- `M Frontend/src/i18n/locales/az.json`
- `M Frontend/src/i18n/locales/en.json`
- `M Frontend/src/i18n/locales/ru.json`
- `A Frontend/tests/hrAiAvailability.test.cjs`
- `A docs/HR_AI_ACTIONS_AND_CONFIGURATION.md`
- `M docs/HR_IMPLEMENTATION_TRACKER.md`

### e661eceab1ce50d0981589aa6d9b614de052303d

test(hr): verify hundred-branch scopes and native startup performance

11targets and all gates

5 changed paths:

- `A Backend/tests/hrHundredBranches.test.cjs`
- `M Backend/tests/hrNativeReleaseGate.test.cjs`
- `M Frontend/scripts/profileHRSession.cjs`
- `M Frontend/scripts/profileHRWorkspace.cjs`
- `M docs/HR_IMPLEMENTATION_TRACKER.md`

### 353042a83191a2b43ebe47b1b7988973a83164f0

fix(hr): bound stalled Kanban code loading and recovery

16targets/late reply/reload; all gates

3 changed paths:

- `M Frontend/src/Pages/Recruitment/Applications/ApplicationsList.tsx`
- `M Frontend/tests/hrBoardCode.test.cjs`
- `M docs/HR_IMPLEMENTATION_TRACKER.md`

### db6b560315ff4ad2a9aa150de0f1c0f0a0fa3195

fix(auth): expire rejected inactive sessions safely

6targets/current permissions/transient500; all gates

3 changed paths:

- `M Frontend/src/Services/authService.ts`
- `M Frontend/tests/authFocusCoalescing.test.cjs`
- `M docs/HR_IMPLEMENTATION_TRACKER.md`

##19 — Focused analytics and limited branding

### 55d22c83b5e65b94ac8437154f842f41142df188

perf(hr): separate analytics summary from expensive detail work

Analytics60Backend/16final UI, hr19arelease gates; real App/session production9before+9after, no hosted proof.

10 changed paths:

- `M Backend/controllers/hrAnalytics.controller.js`
- `M Backend/routes/route.js`
- `A Backend/tests/hrAnalyticsViews.test.cjs`
- `A Frontend/scripts/profileHRAnalytics.cjs`
- `M Frontend/src/Pages/Recruitment/Analytics/HRAnalytics.tsx`
- `M Frontend/src/Services/hrAnalyticsService.ts`
- `M Frontend/tests/hrAnalyticsUI.test.cjs`
- `M Frontend/tests/hrDailyWorkspace.test.cjs`
- `M Frontend/tests/hrPremiumWorkspace.test.cjs`
- `M docs/HR_IMPLEMENTATION_TRACKER.md`

### 0a7fe62be477f4aedebc2d9ce3ecd51d8b338590

style(hr): refine sidebar branding and navy login contrast

Visual30combined/15final, final116workspace, hr19b gates;8strict actual Audit CSS comparisons; exact remote main parity.

5 changed paths:

- `M Frontend/src/Styles/auth.css`
- `M Frontend/src/Styles/layout.css`
- `A Frontend/tests/hrAnalyticsBrandRefinement.test.cjs`
- `M Frontend/tests/hrUnifiedBrand.test.cjs`
- `M docs/HR_IMPLEMENTATION_TRACKER.md`

## `3b6489ff1f3b8fe485a1fd78047fa14133af4d2f`

fix(hr): stop unsolicited analytics reloads and retain refresh KPIs

5 changed paths:

- `A Frontend/scripts/profileHRStability.cjs`
- `M Frontend/src/Hooks/useAuditResource.ts`
- `M Frontend/src/Pages/Recruitment/Analytics/HRAnalytics.tsx`
- `M Frontend/tests/hrAnalyticsUI.test.cjs`
- `M docs/HR_IMPLEMENTATION_TRACKER.md`

## `ade69dc0dbcbc28e429549659f52ecbfc0abdbaa`

refactor(hr): consolidate scoped styles and semantic action tokens

8 changed paths:

- `A Frontend/scripts/auditHRStyles.cjs`
- `M Frontend/src/Pages/Recruitment/Candidates/CandidateDetail.tsx`
- `M Frontend/src/Styles/hr-workspace.css`
- `M Frontend/src/Styles/recruitment.css`
- `M Frontend/src/Styles/variables.css`
- `A Frontend/tests/hrDesignSemantics.test.cjs`
- `A docs/HR_DESIGN_AND_ACTION_INVENTORY.md`
- `M docs/HR_IMPLEMENTATION_TRACKER.md`

## `c1bf5cd2f9c614cbd197e3c71c3736299353a626`

fix(hr): align candidate fields and responsive review forms

8 changed paths:

- `M Frontend/src/Components/CvHistoryEditor.tsx`
- `M Frontend/src/Components/TagInput.tsx`
- `M Frontend/src/Pages/Recruitment/Candidates/CandidateForm.tsx`
- `M Frontend/src/Styles/components.css`
- `M Frontend/src/Styles/hr-workspace.css`
- `M Frontend/src/Styles/recruitment.css`
- `A Frontend/tests/hrFormGeometry.test.cjs`
- `M docs/HR_IMPLEMENTATION_TRACKER.md`

## `f5db6ffbaf221918829f863f23fdb5c2622b158c`

fix(hr): preserve multiline textarea reading height

4 changed paths:

- `M Frontend/src/Styles/components.css`
- `M Frontend/src/Styles/hr-workspace.css`
- `M Frontend/tests/hrFormGeometry.test.cjs`
- `M docs/HR_IMPLEMENTATION_TRACKER.md`

## `ccf24e55baa35265b680ed341d079220fda027c4`

feat(brand): use approved transparent INOP vector wordmark

8 changed paths:

- `M Frontend/src/Components/INOPLogo.tsx`
- `M Frontend/src/Styles/auth.css`
- `M Frontend/src/Styles/layout.css`
- `M Frontend/tests/hrUnifiedBrand.test.cjs`
- `A Frontend/tests/hrVectorBrand.test.cjs`
- `M docs/HR_DESIGN_AND_ACTION_INVENTORY.md`
- `M docs/HR_IMPLEMENTATION_TRACKER.md`
- `M docs/INOP_BRAND_ASSETS.md`

## `ffd7de5fa3a574f900d6610a568f76c4d671260a`

test(hr): verify final workflows and paired analytics stability

5 changed paths:

- `M Frontend/scripts/profileHRStability.cjs`
- `M docs/HR_AUDIT_FINDING_DISPOSITION.md`
- `A docs/HR_FINAL_STABILITY_REPORT.md`
- `M docs/HR_IMPLEMENTATION_TRACKER.md`
- `M docs/HR_LOCAL_COMMIT_LEDGER.md`

Existingmain release confirmed by normalfast-forward and exactls-remote atffd7de5fa3a574f900d6610a568f76c4d671260a. Final confirmation-onlycommit follows; its SHA is reported by Git/finaluserreport, never guessed. Runtime/frontend source remainsccf24e55baa35265b680ed341d079220fda027c4, Backend unchanged from2243d68. Hosted/external certification is separate.


## Phase21 — local ordered packages

### 8b38320612bb01e4a467357ac064be9941dd0fd4

fix(hr): stop list and board focus reloads without weakening auth

```text
M	Frontend/src/Components/CandidateArchiveHistory.tsx
M	Frontend/src/Components/HRPageControls.tsx
M	Frontend/src/Components/JobArchiveHistory.tsx
M	Frontend/src/Hooks/useHRBoard.ts
M	Frontend/src/Hooks/useHRPage.ts
M	Frontend/src/Hooks/useHRRankingPage.ts
M	Frontend/src/Pages/Recruitment/Applications/ApplicationDetail.tsx
M	Frontend/src/Pages/Recruitment/Applications/ApplicationsList.tsx
M	Frontend/src/Pages/Recruitment/Candidates/CandidateDetail.tsx
M	Frontend/src/Pages/Recruitment/Candidates/CandidatesList.tsx
M	Frontend/src/Pages/Recruitment/Jobs/JobDetail.tsx
M	Frontend/src/Pages/Recruitment/Jobs/JobsList.tsx
M	Frontend/tests/helpers/productionBrowser.cjs
A	Frontend/tests/helpers/productionHRFixture.cjs
A	Frontend/tests/hrAllRouteStability.test.cjs
M	Frontend/tests/hrNavigationPerformance.test.cjs
M	Frontend/tests/hrPaginationUI.test.cjs
M	docs/HR_IMPLEMENTATION_TRACKER.md
A	docs/HR_LIVE_SCREENSHOT_CHECKLIST.md
```

### d1fcbdd9f4b72de3b0fee353f765004e7c306dd1

fix(hr): unify candidate toolbar and remove duplicate create action

```text
M	Frontend/src/Pages/Recruitment/Candidates/CandidatesList.tsx
M	Frontend/src/Styles/admin.css
M	Frontend/src/Styles/hr-workspace.css
M	Frontend/src/Styles/recruitment.css
A	Frontend/tests/hrLiveScreenshotUI.test.cjs
M	docs/HR_IMPLEMENTATION_TRACKER.md
M	docs/HR_LIVE_SCREENSHOT_CHECKLIST.md
```

### 1f099e71ecc800536f9850c8fdf78f9a48a365cf

fix(hr): align application controls and clarify scoped sorting

```text
M	Frontend/src/Pages/Recruitment/Applications/ApplicationsList.tsx
M	Frontend/src/Styles/hr-workspace.css
M	Frontend/src/i18n/locales/az.json
M	Frontend/src/i18n/locales/en.json
M	Frontend/src/i18n/locales/ru.json
M	docs/HR_IMPLEMENTATION_TRACKER.md
M	docs/HR_LIVE_SCREENSHOT_CHECKLIST.md
```

### 4f153e75d0b0d480ff9fb6284ff13abd5b77a1ef

fix(hr): keep empty application content inside mobile viewport

```text
M	Frontend/src/Pages/Recruitment/Applications/ApplicationsList.tsx
M	Frontend/tests/hrLiveScreenshotUI.test.cjs
M	docs/HR_IMPLEMENTATION_TRACKER.md
M	docs/HR_LIVE_SCREENSHOT_CHECKLIST.md
```

### 99ede1fd8ec6747446cc6a57fcc874242e418393

fix(hr): compose job forms and preserve explicit draft and publish actions

```text
M	Frontend/src/Components/JobSkillsAssistant.tsx
M	Frontend/src/Components/RecruitmentLocationFields.tsx
M	Frontend/src/Pages/Recruitment/Jobs/JobForm.tsx
M	Frontend/src/Styles/hr-workspace.css
M	Frontend/src/Styles/recruitment.css
M	Frontend/src/i18n/locales/az.json
M	Frontend/src/i18n/locales/en.json
M	Frontend/src/i18n/locales/ru.json
M	Frontend/tests/hrAiUI.test.cjs
M	Frontend/tests/hrLifecycle.test.cjs
M	Frontend/tests/hrLiveScreenshotUI.test.cjs
M	Frontend/tests/recruitmentCatalogUI.test.cjs
M	docs/HR_IMPLEMENTATION_TRACKER.md
M	docs/HR_LIVE_SCREENSHOT_CHECKLIST.md
```

### 9c028170c6225d12a411a5ba225f67d6fda8597c

fix(hr): clarify AI setup and prevent competing CV review actions

```text
M	Frontend/src/Components/AIAvailability.tsx
M	Frontend/src/Components/CvProcessingPanel.tsx
M	Frontend/src/Components/CvReviewAssistant.tsx
M	Frontend/src/Components/JobSkillsAssistant.tsx
M	Frontend/src/Pages/Recruitment/Candidates/CandidateForm.tsx
M	Frontend/src/i18n/locales/az.json
M	Frontend/src/i18n/locales/en.json
M	Frontend/src/i18n/locales/ru.json
M	Frontend/tests/hrAiAvailability.test.cjs
M	Frontend/tests/hrAiCvUI.test.cjs
M	Frontend/tests/hrLiveScreenshotUI.test.cjs
A	docs/HR_AI_ACTION_VERIFICATION.md
M	docs/HR_IMPLEMENTATION_TRACKER.md
M	docs/HR_LIVE_SCREENSHOT_CHECKLIST.md
```

### c91604e9426d9ef19f12feb8943b3cc2b7e804cd

style(hr): align analytics and professional review state presentation

```text
M	Frontend/src/Components/CvReviewAssistant.tsx
M	Frontend/src/Pages/Recruitment/Analytics/HRAnalytics.tsx
M	Frontend/src/Pages/Recruitment/Jobs/JobForm.tsx
M	Frontend/src/Styles/hr-workspace.css
M	Frontend/src/Styles/recruitment.css
M	Frontend/src/i18n/locales/az.json
M	Frontend/src/i18n/locales/en.json
M	Frontend/src/i18n/locales/ru.json
M	docs/HR_IMPLEMENTATION_TRACKER.md
M	docs/HR_LIVE_SCREENSHOT_CHECKLIST.md
```

### 9cc8e19416943a729ccf17a1e15a75791c0ba6a6

fix(auth): remove business brand text from login and verify shell

```text
M	Frontend/src/Pages/Auth/Login/Login.tsx
M	Frontend/src/Styles/auth.css
M	docs/HR_IMPLEMENTATION_TRACKER.md
M	docs/HR_LIVE_SCREENSHOT_CHECKLIST.md
A	docs/qa/hr21/login-1440.jpg
A	docs/qa/hr21/login-390.jpg
A	docs/qa/hr21/login-768.jpg
A	docs/qa/hr21/sidebar-1440.jpg
A	docs/qa/hr21/sidebar-390.jpg
A	docs/qa/hr21/sidebar-768.jpg
```

### 93017e7635f76cdc567656a7421e98909f0dd271

fix(hr): align application detail actions and workflow form

```text
M	Frontend/src/Pages/Recruitment/Applications/ApplicationDetail.tsx
M	Frontend/src/Styles/hr-workspace.css
M	Frontend/src/i18n/locales/az.json
M	Frontend/src/i18n/locales/en.json
M	Frontend/src/i18n/locales/ru.json
M	Frontend/tests/hrLiveScreenshotUI.test.cjs
M	docs/HR_IMPLEMENTATION_TRACKER.md
```

## d9e81b3952f9dee0e522c1748c6972ec2497c813

test(hr): preserve final screenshot and lifecycle release evidence

```text
M	Frontend/tests/helpers/productionBrowser.cjs
M	Frontend/tests/helpers/productionHRFixture.cjs
M	Frontend/tests/hrAllRouteStability.test.cjs
M	Frontend/tests/hrDepartmentAccessUI.test.cjs
M	Frontend/tests/hrLiveScreenshotUI.test.cjs
M	docs/HR_AUDIT_FINDING_DISPOSITION.md
M	docs/HR_IMPLEMENTATION_TRACKER.md
A	docs/HR_LIVE_REFINEMENT_REPORT.md
M	docs/HR_LIVE_SCREENSHOT_CHECKLIST.md
M	docs/HR_LOCAL_COMMIT_LEDGER.md
A	docs/qa/hr21/analytics-filled.jpg
A	docs/qa/hr21/analytics-operations.jpg
A	docs/qa/hr21/analytics-route-1910.jpg
A	docs/qa/hr21/analytics-route-390.jpg
A	docs/qa/hr21/analytics-route-768.jpg
A	docs/qa/hr21/analytics-zero-1875.jpg
A	docs/qa/hr21/analytics-zero-390.jpg
A	docs/qa/hr21/analytics-zero-768.jpg
A	docs/qa/hr21/application-board-route-1910.jpg
A	docs/qa/hr21/application-board-route-390.jpg
A	docs/qa/hr21/application-board-route-768.jpg
A	docs/qa/hr21/application-detail-route-1910.jpg
A	docs/qa/hr21/application-detail-route-390.jpg
A	docs/qa/hr21/application-detail-route-768.jpg
A	docs/qa/hr21/applications-board.jpg
A	docs/qa/hr21/applications-empty-1910.jpg
A	docs/qa/hr21/applications-empty-390.jpg
A	docs/qa/hr21/applications-empty-768.jpg
A	docs/qa/hr21/applications-filled.jpg
A	docs/qa/hr21/applications-page-two.jpg
A	docs/qa/hr21/applications-route-1910.jpg
A	docs/qa/hr21/applications-route-390.jpg
A	docs/qa/hr21/applications-route-768.jpg
A	docs/qa/hr21/candidate-create-route-1910.jpg
A	docs/qa/hr21/candidate-create-route-390.jpg
A	docs/qa/hr21/candidate-create-route-768.jpg
A	docs/qa/hr21/candidate-create.jpg
A	docs/qa/hr21/candidate-detail-route-1910.jpg
A	docs/qa/hr21/candidate-detail-route-390.jpg
A	docs/qa/hr21/candidate-detail-route-768.jpg
A	docs/qa/hr21/candidate-edit-1910.jpg
A	docs/qa/hr21/candidate-edit-390.jpg
A	docs/qa/hr21/candidate-edit-768.jpg
A	docs/qa/hr21/candidate-edit-route-1910.jpg
A	docs/qa/hr21/candidate-edit-route-390.jpg
A	docs/qa/hr21/candidate-edit-route-768.jpg
A	docs/qa/hr21/candidates-empty-1910.jpg
A	docs/qa/hr21/candidates-empty-390.jpg
A	docs/qa/hr21/candidates-empty-768.jpg
A	docs/qa/hr21/candidates-filled.jpg
A	docs/qa/hr21/candidates-route-1910.jpg
A	docs/qa/hr21/candidates-route-390.jpg
A	docs/qa/hr21/candidates-route-768.jpg
A	docs/qa/hr21/candidates-table.jpg
A	docs/qa/hr21/cv-ai-unconfigured-az.jpg
A	docs/qa/hr21/cv-ai-unconfigured-en.jpg
A	docs/qa/hr21/cv-ai-unconfigured-ru.jpg
A	docs/qa/hr21/cv-one-processing-review.jpg
A	docs/qa/hr21/gallery.html
A	docs/qa/hr21/intake-detail-disabled-route-1910.jpg
A	docs/qa/hr21/intake-detail-disabled-route-390.jpg
A	docs/qa/hr21/intake-detail-disabled-route-768.jpg
A	docs/qa/hr21/intake-disabled-route-1910.jpg
A	docs/qa/hr21/intake-disabled-route-390.jpg
A	docs/qa/hr21/intake-disabled-route-768.jpg
A	docs/qa/hr21/job-ai-configuration.jpg
A	docs/qa/hr21/job-ai-unconfigured.jpg
A	docs/qa/hr21/job-create-1711.jpg
A	docs/qa/hr21/job-create-390.jpg
A	docs/qa/hr21/job-create-768.jpg
A	docs/qa/hr21/job-create-route-1910.jpg
A	docs/qa/hr21/job-create-route-390.jpg
A	docs/qa/hr21/job-create-route-768.jpg
A	docs/qa/hr21/job-detail-route-1910.jpg
A	docs/qa/hr21/job-detail-route-390.jpg
A	docs/qa/hr21/job-detail-route-768.jpg
A	docs/qa/hr21/job-edit-route-1910.jpg
A	docs/qa/hr21/job-edit-route-390.jpg
A	docs/qa/hr21/job-edit-route-768.jpg
A	docs/qa/hr21/job-edit.jpg
A	docs/qa/hr21/jobs-route-1910.jpg
A	docs/qa/hr21/jobs-route-390.jpg
A	docs/qa/hr21/jobs-route-768.jpg
A	docs/qa/hr21/release-gates.json
A	docs/qa/hr21/requests-after.json
A	docs/qa/hr21/requests-before.json
A	docs/qa/hr21/states-geometry.json
```

Normalmainpush and remote exactSHA verified. Final documentation confirmation commit follows; runtime93017e7 unchanged, deploymentsUNVERIFIED.


## Phase22 A–E enterprise design packages

### 66d84410a1564430ba28492104dca5d2e59311e0

style(hr): establish reference-led semantic controls and palette

```text
M	Frontend/src/Pages/Recruitment/Jobs/JobForm.tsx
M	Frontend/src/Styles/hr-workspace.css
M	Frontend/src/Styles/variables.css
A	Frontend/tests/hrEnterpriseDesign.test.cjs
M	Frontend/tests/hrLiveScreenshotUI.test.cjs
M	docs/HR_IMPLEMENTATION_TRACKER.md
A	docs/qa/hr22/A/before-job-create-1440.jpg
A	docs/qa/hr22/A/controls-1440.jpg
A	docs/qa/hr22/A/controls-390.jpg
A	docs/qa/hr22/A/controls-768.jpg
A	docs/qa/hr22/A/styles.json
```

### 6de4a7f160a054bbae570cce066c6a39c7b98aab

style(hr): balance compact branding and dark active navigation

```text
M	Frontend/src/Components/INOPLogo.tsx
M	Frontend/src/Layouts/AppShell/Sidebar.tsx
M	Frontend/src/Styles/hr-workspace.css
M	docs/HR_IMPLEMENTATION_TRACKER.md
A	docs/qa/hr22/B/before-sidebar-1440.jpg
A	docs/qa/hr22/B/controls-1440.jpg
A	docs/qa/hr22/B/controls-390.jpg
A	docs/qa/hr22/B/controls-768.jpg
```

### 7703069df6fb17efb6c71d2bd8fe19b1e470c24d

style(hr): unify recruitment tables and remove legacy table decorations

```text
M	Frontend/src/Components/PageHeader.tsx
M	Frontend/src/Pages/Recruitment/Applications/ApplicationsList.tsx
M	Frontend/src/Pages/Recruitment/Candidates/CandidatesList.tsx
M	Frontend/src/Styles/hr-workspace.css
M	Frontend/src/Styles/recruitment.css
M	Frontend/tests/hrLiveScreenshotUI.test.cjs
M	Frontend/tests/hrPaginationUI.test.cjs
M	docs/HR_IMPLEMENTATION_TRACKER.md
A	docs/qa/hr22/C/applications-empty-390.jpg
A	docs/qa/hr22/C/applications-filled.jpg
A	docs/qa/hr22/C/before-applications-1440.jpg
A	docs/qa/hr22/C/before-candidates-1440.jpg
A	docs/qa/hr22/C/candidates-empty-390.jpg
A	docs/qa/hr22/C/candidates-filled.jpg
A	docs/qa/hr22/C/candidates-table.jpg
```

### ed437a3e35af065068cc45205a7430a7d55e9e48

style(hr): align professional forms and compact workflow actions

```text
M	Frontend/src/Pages/Recruitment/Applications/ApplicationDetail.tsx
M	Frontend/src/Pages/Recruitment/Candidates/CandidateDetail.tsx
M	Frontend/src/Pages/Recruitment/Candidates/CandidateForm.tsx
M	Frontend/src/Pages/Recruitment/Jobs/JobDetail.tsx
M	Frontend/src/Pages/Recruitment/Jobs/JobForm.tsx
M	Frontend/src/Pages/Recruitment/Jobs/JobsList.tsx
M	Frontend/src/Styles/hr-workspace.css
M	Frontend/tests/hrLiveScreenshotUI.test.cjs
M	docs/HR_IMPLEMENTATION_TRACKER.md
A	docs/qa/hr22/D/application-detail-1440.jpg
A	docs/qa/hr22/D/before-application-detail-1440.jpg
A	docs/qa/hr22/D/before-candidate-create-1440.jpg
A	docs/qa/hr22/D/before-candidate-detail-1440.jpg
A	docs/qa/hr22/D/before-candidate-edit-1440.jpg
A	docs/qa/hr22/D/before-job-edit-1440.jpg
A	docs/qa/hr22/D/candidate-create-1440.jpg
A	docs/qa/hr22/D/candidate-detail-1440.jpg
A	docs/qa/hr22/D/candidate-edit-1440.jpg
A	docs/qa/hr22/D/job-create-390.jpg
A	docs/qa/hr22/D/job-edit-1440.jpg
A	docs/qa/hr22/D/job-edit.jpg
```

### ccdd4e1dce8acc0337c4e4dc5c0e58c0b6e27aa6

style(hr): distinguish real analytics metrics and human-reviewed AI actions

```text
M	Frontend/src/Components/CvProcessingPanel.tsx
M	Frontend/src/Components/CvReviewAssistant.tsx
M	Frontend/src/Components/HRHistogram.tsx
M	Frontend/src/Components/JobSkillsAssistant.tsx
M	Frontend/src/Pages/Recruitment/Analytics/HRAnalytics.tsx
M	Frontend/src/Styles/hr-workspace.css
M	Frontend/tests/hrEnterpriseDesign.test.cjs
M	Frontend/tests/hrLiveScreenshotUI.test.cjs
M	docs/HR_IMPLEMENTATION_TRACKER.md
A	docs/qa/hr22/E/ai-configuration-required.jpg
A	docs/qa/hr22/E/analytics-filled.jpg
A	docs/qa/hr22/E/analytics-operations.jpg
A	docs/qa/hr22/E/analytics-zero-390.jpg
A	docs/qa/hr22/E/before-analytics-1440.jpg
A	docs/qa/hr22/E/cv-ai-unconfigured-az.jpg
A	docs/qa/hr22/E/cv-one-processing-review.jpg
```

## 6716105805da2287383726b0f1bbe1edd7b86813

fix(hr): verify enterprise layouts and correct archive modal layering

```text
M	Frontend/src/Pages/Recruitment/Candidates/CandidatesList.tsx
M	Frontend/src/Styles/hr-workspace.css
M	Frontend/src/Styles/recruitment.css
M	Frontend/tests/hrAllRouteStability.test.cjs
M	Frontend/tests/hrEnterpriseDesign.test.cjs
M	docs/HR_AUDIT_FINDING_DISPOSITION.md
A	docs/HR_ENTERPRISE_DESIGN_REPORT.md
M	docs/HR_IMPLEMENTATION_TRACKER.md
M	docs/HR_LOCAL_COMMIT_LEDGER.md
A	docs/qa/hr22/F/analytics-route-1440.jpg
A	docs/qa/hr22/F/analytics-route-390.jpg
A	docs/qa/hr22/F/analytics-route-768.jpg
A	docs/qa/hr22/F/application-board-route-1440.jpg
A	docs/qa/hr22/F/application-board-route-390.jpg
A	docs/qa/hr22/F/application-board-route-768.jpg
A	docs/qa/hr22/F/application-detail-route-1440.jpg
A	docs/qa/hr22/F/application-detail-route-390.jpg
A	docs/qa/hr22/F/application-detail-route-768.jpg
A	docs/qa/hr22/F/applications-route-1440.jpg
A	docs/qa/hr22/F/applications-route-390.jpg
A	docs/qa/hr22/F/applications-route-768.jpg
A	docs/qa/hr22/F/archive-modal-1440.jpg
A	docs/qa/hr22/F/archive-modal-390.jpg
A	docs/qa/hr22/F/before-analytics-route-1440.jpg
A	docs/qa/hr22/F/before-application-board-route-1440.jpg
A	docs/qa/hr22/F/before-application-detail-route-1440.jpg
A	docs/qa/hr22/F/before-applications-route-1440.jpg
A	docs/qa/hr22/F/before-candidate-create-route-1440.jpg
A	docs/qa/hr22/F/before-candidate-detail-route-1440.jpg
A	docs/qa/hr22/F/before-candidate-edit-route-1440.jpg
A	docs/qa/hr22/F/before-candidates-route-1440.jpg
A	docs/qa/hr22/F/before-intake-detail-disabled-route-1440.jpg
A	docs/qa/hr22/F/before-intake-disabled-route-1440.jpg
A	docs/qa/hr22/F/before-job-create-route-1440.jpg
A	docs/qa/hr22/F/before-job-detail-route-1440.jpg
A	docs/qa/hr22/F/before-job-edit-route-1440.jpg
A	docs/qa/hr22/F/before-jobs-route-1440.jpg
A	docs/qa/hr22/F/before-modal-in-flow-1440.jpg
A	docs/qa/hr22/F/bundle-after-1.json
A	docs/qa/hr22/F/bundle-after-2.json
A	docs/qa/hr22/F/bundle-before-1.json
A	docs/qa/hr22/F/bundle-before-2.json
A	docs/qa/hr22/F/candidate-create-route-1440.jpg
A	docs/qa/hr22/F/candidate-create-route-390.jpg
A	docs/qa/hr22/F/candidate-create-route-768.jpg
A	docs/qa/hr22/F/candidate-detail-route-1440.jpg
A	docs/qa/hr22/F/candidate-detail-route-390.jpg
A	docs/qa/hr22/F/candidate-detail-route-768.jpg
A	docs/qa/hr22/F/candidate-edit-route-1440.jpg
A	docs/qa/hr22/F/candidate-edit-route-390.jpg
A	docs/qa/hr22/F/candidate-edit-route-768.jpg
A	docs/qa/hr22/F/candidates-route-1440.jpg
A	docs/qa/hr22/F/candidates-route-390.jpg
A	docs/qa/hr22/F/candidates-route-768.jpg
A	docs/qa/hr22/F/geometry.json
A	docs/qa/hr22/F/intake-detail-disabled-route-1440.jpg
A	docs/qa/hr22/F/intake-detail-disabled-route-390.jpg
A	docs/qa/hr22/F/intake-detail-disabled-route-768.jpg
A	docs/qa/hr22/F/intake-disabled-route-1440.jpg
A	docs/qa/hr22/F/intake-disabled-route-390.jpg
A	docs/qa/hr22/F/intake-disabled-route-768.jpg
A	docs/qa/hr22/F/job-create-route-1440.jpg
A	docs/qa/hr22/F/job-create-route-390.jpg
A	docs/qa/hr22/F/job-create-route-768.jpg
A	docs/qa/hr22/F/job-detail-route-1440.jpg
A	docs/qa/hr22/F/job-detail-route-390.jpg
A	docs/qa/hr22/F/job-detail-route-768.jpg
A	docs/qa/hr22/F/job-edit-route-1440.jpg
A	docs/qa/hr22/F/job-edit-route-390.jpg
A	docs/qa/hr22/F/job-edit-route-768.jpg
A	docs/qa/hr22/F/jobs-route-1440.jpg
A	docs/qa/hr22/F/jobs-route-390.jpg
A	docs/qa/hr22/F/jobs-route-768.jpg
A	docs/qa/hr22/F/release-gates.json
A	docs/qa/hr22/F/requests-after-1.json
A	docs/qa/hr22/F/requests-after-2.json
A	docs/qa/hr22/F/requests-before-1.json
A	docs/qa/hr22/F/requests-before-2.json
A	docs/qa/hr22/comparison.html
```

Normal mainFF and exactremoteSHA verified; finaldocs-onlyconfirmation follows. Runtime/backend gates remain valid, hosteddeployUNVERIFIED.


23 focused visual polish: c9796600510090e75d07200ec26e928e6937557f — analytics EmptyState/KPI/filters/canonicalCSS/locales/targeted tests/tracker/paired screenshots. 1ac3b13960a5ce5fedf1c90b3efb55d62aac4c7a — HR-only sidebar grouping, production group/contrast tests/tracker/screenshots. Runtime frozen after second commit; final QA/report/test-evidence commit follows. Full paths via git show --stat; no Backend/Audit/API/auth/dependency/asset/migration changes. Normal main push pending exact remote confirmation.

23 finalQA:9e194e7ad2c72fc726250ecb2160541c12376f51 — real calculated0production test, all42route images/galleries, two paired measurements per side, gate certificate, tracker/report. Normal pushattemptfailedGitHubauth; remote16848763e3bdd6dd0a4b8c335d3130edc2692b68unchanged. Docs-onlytransportcheckpointfollows; no new runtime/gates. P23-008 BLOCKED_EXTERNAL; retryauthorizednormalpushafterenvironmentGitHubwriteaccess restored.
