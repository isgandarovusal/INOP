# HR AI action inventory and configuration

Phase18 on the existing INOP architecture. No credential, provider flag, worker, ingestion or external integration is enabled by this package. A visible button is not evidence of a working live provider. Hosted configuration and real AI E2E remain unverified/blocked.

| Active action | UI/service | Backend / actual implementation | Evidence and limits |
|---|---|---|---|
|Vacancy skill recommendations | JobSkillsAssistant / hrAiService.suggestJobSkills | POST /hr/ai/job-skills or /jobs/:id/ai-skills; hrAi.controller; hrAiProvider.service | Real configurable OpenAI adapter, professional structured schema, bounded timeout/retry/capacity/budget, current Job authority and explicit human approval. No hardcoded fallback. Real provider E2E remains P09-023 BLOCKED_EXTERNAL. |
|Professional CV fact review | CvReviewAssistant / suggestCvReview | POST /candidates/:id/ai-review; hrAiCvReview.controller/service | Only reviewed source-bound professional evidence, hash/revision, minimized facts and human approval. Requires HR_AI_CV_REVIEW_APPROVED plus provider configuration. Raw CV full-text external extraction is not promised by this action. |
|Background AI review profile | CvProcessingPanel / startCvProcessing(kind=ai-review) | POST /candidates/:id/processing, hrCvAiProcessing.service | Bounded source-bound task/current authority/lease/retry; processing opt-in and provider approval required. Default-off gates stay unchanged. Existing local transport/task tests do not certify a live worker/provider. |
|Original CV upload/extraction, Source OCR/review | CandidateForm/CvIntakeSourceReview/cvIntakeService | Existing rule-based PDF/DOCX and gated local Tesseract/Source flow | Real parser, not an AI provider. Source intake/storage/scanner remain closed until genuine durability/recovery/AV evidence. No fake extracted facts. |
|ATS matching percentages/recalculation | MatchScoreBadge / aiMatchService/applicationScoreState | Versioned deterministic Application+Job scoring | Not an AI hire/reject decision. Protected attributes excluded; genuine0 differs from missing/insufficient data. Existing tests remain. |

Some unused legacy translation identifiers include the word AI; they are not active provider calls. The active Candidate form subtitle labels extraction rule-based. No dormant label is presented as proof of a implemented external capability.

New additive **GET /hr/ai/status** returns only version/provider/state/realE2EVerified(false)/cvReviewApproved. Existing current-JWT/server-role authorization permits relevant recruitment/candidate create/update grants only inside canonical dep_hr or Admin. own/department/assigned grants never expose foreign record data: this DTO contains no records. Audit/non-HR departments with wildcard grants stay403. Query settings are rejected400; no settings can be changed through this route.

The shared AIAvailability control is deliberately on-demand, not an extra opening request. It distinguishes unchecked, absent, incomplete, configured-but-unverified, and failed configuration reads. CV external approval is separately stated. Language/draft changes issue no status/refetch. Errors stay auxiliary to the manual primary form. The main CV review action remains first and all existing human-approval/current-source tests remain intact.

Required names (no secret values): HR_AI_PROVIDER, HR_AI_MODEL, OPENAI_API_KEY, HR_AI_DAILY_BUDGET_USD, HR_AI_INPUT_USD_PER_MILLION, HR_AI_OUTPUT_USD_PER_MILLION. Optional bounded settings: HR_AI_TIMEOUT_MS, HR_AI_MAX_OUTPUT_TOKENS, HR_AI_DAILY_ACTOR_REQUESTS, HR_AI_RETRIES. CV review additionally needs HR_AI_CV_REVIEW_APPROVED and separate approved processing/runtime gates for background tasks. Setup must use existing hosting secret management and an approved privacy/budget decision; this package does not perform it.

Configured metadata is never labelled a verified live connection. Provider/mock schema tests and honest unavailable/manual UI tests are local proof only. Source storage/scanner/recovery, SMTP, Graph/partner access and real-provider E2E remain BLOCKED_EXTERNAL/operational NO-GO.

Release compatibility: backend-first is preferable for the additive status route. If frontend arrives first,404/503 status reads show the auxiliary setup error while existing manual Job/Candidate editing and established AI POST contracts remain available. No schema/index/migration dependency was added.
