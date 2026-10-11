# HR department access boundary

Non-admin HR access requires exact server-loaded `departmentId=dep_hr` AND the existing resource/action/scope grant. Admin remains exempt from the department constraint, with existing active role/grants still required. No role/name/wildcard/body/JWT department claim grants membership; no extra ObjectId has been admitted. No existing users/roles are rewritten.

Backend permission middleware, independent parent resource filters, fresh JWT authority, approved worker identity and both canonical/legacy CV reads enforce membership. `/auth/login` and `/auth/me` expose additive `hrAccess` metadata. UI uses canonical department plus metadata and existing grant; context changes cancel/reset HR resources and hide menu/routes/summaries. Backend remains authoritative. Audit-source-document authorization is unchanged.

Evidence: hrDepartmentAccess strict production predicate + owned HTTP/Mongo coverage, all/own/department/assigned/none grants, wildcard non-HR actor, unrelated Audit route200, Admin200, anonymous401, current department with old JWT, legacy alias and withheld CV bytes when department changes during simulated storage IO. Real storage/scanner remain unverified; the delayed provider test is synthetic. Existing scope fixtures separately simulate known test HR memberships without modifying production policy.

Remaining: generic activity descriptions must be independently parent-scoped; Candidate archive/restore is approved; retention duration/permanent erasure and real provider activation remain blocked. No migration, secret change, production push or deployment.
