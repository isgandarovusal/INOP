# HR design and action inventory

Existing sources:App.css imports variables/layout/components/recruitment/hr-workspace; HR keeps its scoped product rules instead of a new override stylesheet. Audit/core variables and module sources are preserved. PostCSS audit removes277later-shadowed declarations in fixed allowed HR scopes; rule order, at-rule context and importance remain. Scope script default is read-only; --write is explicit. No new dependency.

Reusable primitives remain PageHeader, HRFilterPanel, HRHistogram, HRResourceState, HRConfirmDialog, TagInput, CvHistoryEditor and existing table/board. Tokens --hr-navy/hover/ink/slate/border/white/subtle/danger/focus live in the existing variables.css. Navy is primary, white/slate secondary, red archive/destructive, transparent row-title/ghost, contextual icon actions; not all buttons become navy. Tested AA text contrast, hover/focus/disabled/confirmation.

| Screen/action | Existing implementation and purpose | Verification target |
|---|---|---|
| Analytics |HRAnalytics.tsx brand/filter/tab/explicit refresh; compact contextual score loading |hrAnalyticsUI, actual production stability profile |
| Jobs create/edit/detail/list |JobForm/JobDetail/JobsList; AI proposal+configuration notice, draft save, brand/branch filters, applications/ranking |hrLifecycle/hrDailyWorkspace/hrPremiumWorkspace/hrJobArchiveUI |
| Candidate create/edit/profile/list |CandidateForm/CandidateDetail/CandidatesList; manual fields, CV replacement/review, authenticated export/download, archive/restore |cvReviewUI/privateFiles/hrCandidateArchiveUI/hrFormGeometry |
| Applications/detail/board |ApplicationsList/ApplicationDetail/ApplicationKanban; independent status per vacancy, DnD/CAS409/order/interview scheduling, history and explicit review |applicationLifecycleUI/hrBoardUI/hrBoardCode |
| Source/CV review |SourceDocuments, SourceDocumentDetail, CvProcessingPanel, CvReviewAssistant and human-approval panels; safe file access and finite processing/recovery |cvIntakeSourceReviewUI/hrCvApprovalUI/hrCvDocumentErrorsUI/sourceDocuments/sourceDownloadRace |
| Dialog/filter/table/mobile |HRConfirmDialog/HRFilterPanel/shared grid; keyboard focus/trap/Escape/retry/empty states and bounds |hrDesignSemantics/hrDailyWorkspace/hrPremiumWorkspace |
| AI actions |Existing HR_AI_ACTIONS_AND_CONFIGURATION inventory; provider/prerequisites/consent visible, on-demand metadata; no fake result |hrAiAvailability/hrAiUI/hrAiCvUI; real E2E BLOCKED_EXTERNAL |

UI styling is not authorization. Admin or canonical dep_hr plus each independent resource permission/scope remains required; Audit department wildcard does not grant HR. Archive retains related records, permanent deletion remains off until retention policy. RealCV/scanner/durable storage/recovery/provider/Graph/site activation remains blocked/disabled. Mock transports are not operational evidence.

Screenshots supplied by the user guide actual Candidate form/transparent wordmark work; geometry and actual label association are measured separately. New findings are added to the tracker, not silently omitted. Existing legacy bitmap assets are retained even when an inline SVG replaces their use.
