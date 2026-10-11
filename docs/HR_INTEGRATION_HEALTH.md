# Truthful integration configuration metadata

HR analytics now uses the existing AI adapter's local `health()` instead of the fixed `not_integrated` string. The only AI states returned are `not_configured`, `configuration_required` or `configured_not_verified`. This read makes no external request, budget reservation, usage record, provider credential disclosure or live-readiness claim. Unsupported/incomplete configuration is represented explicitly rather than throwing the whole analytics request. AZ/EN/RU translations include the new configuration-required state.

Graph, external intake and Source storage profiles remain disabled by default and their hosted activation is not inferred from local mocks. SMTP configured metadata likewise does not prove delivery. Real AI/provider/tenant/storage/scanner/recovery checks stay separate release gates.

Actual local analytics HTTP tests exercise missing/unsupported/incomplete/complete synthetic configuration with zero provider calls and no key/model disclosure. Initial baseline5fail (four states plus parent) reproduces the fixed string. Current backend78/78 and existing analytics browser13/13; all build/typecheck/lint/smoke/authorization gates pass. No external provider or production configuration is changed.
