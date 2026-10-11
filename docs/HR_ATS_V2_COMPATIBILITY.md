# ATS v2 trust boundary

Version `ats-v2` adds a shared conservative AZ/EN/RU lexical guard for explicit
protected traits, including obvious gender/age plurals and synonyms, in Job
criteria, matching and AI proposals. Professional language/restaurant skills
remain usable. This is a guard against known explicit terms, not certification
of universal semantic fairness. HR must approve relevant professional criteria.
Age, gender, nationality and unrelated Candidate identity metadata remain outside
score fingerprints and no calculation hires/rejects a person.

Global `cvReview.confirmed` no longer means every absent field was reviewed.
Positive facts or explicit `reviewedFields` establish coverage for each field.
An explicitly reviewed absence can be real zero; an omitted field is incomplete
and its score null. Source approval retains exactly which submitted fields were
reviewed. Unknown experience remains null as before.

Existing numeric scores and ats-v1 records remain in Mongo unchanged. Current
Application DTOs, ranking and analytics compare to the imported current version
and suppress v1 percentages as legacy until an authorized explicit recalculation.
No automatic bulk migration or hiring decision occurs. Ship this backend and
the existing status-aware frontend together; clients must honor scoreStatus.

Evidence: owned local Job create/update denial, Source approval partial facts,
AI mock schema denials, mixed-scope score state/ranking/analytics, real-zero and
unknown guards. Real AI/provider/hosted performance remain separately blocked.
