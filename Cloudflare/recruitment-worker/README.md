# INOP Recruitment on Cloudflare — independent foundation

This directory contains the standalone Cloudflare Recruitment Worker. It is deliberately separate from INOP's MongoDB `test` and Render backend. The existing Candidate/ATS records and hiring decisions remain owned by INOP; no records were copied. New Cloudflare D1 database: `inop-recruitment-db` (EU jurisdiction, region EEUR; UUID `fcf33ba3-5698-4690-b6b4-6d43ee6204cb`). Its schema is versioned in `migrations/0001_init.sql`.

Cloudflare Worker `inop-recruitment-api` uses `RECRUITMENT_DB` (D1), `PRIVATE_CV_BUCKET` (existing private R2 bucket `inop-private-cv`) and `AI` (Workers AI). Bindings are present but **CV intake, AI calls, storage writes, and ATS changes are disabled**. Only `GET /health` is publicly safe. All `/v1/` requests require a 32+-character server-to-server Bearer secret `RECRUITMENT_SERVICE_TOKEN`; without it, the service returns 503 rather than granting access. `GET /v1/status` validates D1 schema version, while `GET /v1/sources?tenant=gfc` returns at most 30 metadata-only rows. All mutations return HTTP 423.

A `workers.dev` address could not be activated by API: this account has no initialized Workers subdomain, and the create request returned Cloudflare error 10013 (HTTP 500). It is therefore **deployed but not publicly routed**. Do not report an endpoint as LIVE until a subdomain/domain is configured and authenticated HTTP checks pass.

## Roadmap and blocking gates

1. Account owner opens Cloudflare dashboard's Workers & Pages entry for the first time to initialize workers.dev; then bind a verified route to the script.
2. Provision a dedicated private service secret in Worker and INOP backend secret stores; no secret in GitHub. Verify 401/503 and allowed status on real endpoint, with no CORS/client-side token.
3. Define retention, consent, R2 backup/restore, upload quarantine and separately validated maintained **PDF/DOCX malware scanning**. Never mark CV clean based on MIME, SHA or AI output. Cloudflare WAF upload detection is a paid Enterprise add-on, not a Free-plan substitute.
4. With scanner proof, add private upload, CV source lifecycle/queue, bounded parsing and human-reviewed extraction. Record only metadata and safe digests in D1; actual CV bytes stay private in R2.
5. Run one bounded fictional Workers AI canary; then measured AZ/EN/RU evaluation and human-approved relevance explanations. Never make autonomous hire/reject decisions.
6. Integrate explicit service-to-service API from INOP Render; preserve existing authorization, Candidate provenance and default-off feature gates. Do not change the production database/roles or promote a scanner-less CV acceptance.

## GitHub inspiration

- [cloudflare/cloudflare-retrieval-augmented-generation-example](https://github.com/cloudflare/cloudflare-retrieval-augmented-generation-example) shows Workers AI + D1/Vectorize patterns, **not** a secure CV intake implementation.
- [cloudflare/workers-sdk](https://github.com/cloudflare/workers-sdk) is the maintained Workers toolchain; use only relevant components rather than a second ATS.
- [microsoft/markitdown](https://github.com/microsoft/markitdown) and [docling-project/docling](https://github.com/docling-project/docling) are document extraction research references; running their full native stacks inside a Worker is not a supported assumption.
- [j-256/d1-r2-starter-wrangler](https://github.com/j-256/d1-r2-starter-wrangler) offers a D1/R2 integration pattern, but its example upload/delete endpoints and auth must **not** be copied to a private CV system without scanning and tenant-specific authorization.

The first test is `Backend/tests/cloudflareRecruitmentBoundary.test.cjs`, using only synthetic in-memory data, no external requests or candidate records. The Worker must remain fail-closed pending external acceptance.
