# Reconstructed journal fixes — fresh acceptance

Base: `77262852fb63807ea4cbe3a40de724b2e1ecfba8`.
The missing temporary patch was not recovered; these changes were reconstructed
from the retained defect specifications and repository contracts.

Both original failures reproduced against unchanged base code:
[before](journal-before.txt): missing configuration left an empty receipt;
array actor/command identity fields reported malformed=0 instead of 2.

[Final acceptance](journal-after.txt): 4/4 including the parent test, actual
MongoDB 7.0.45, owned random database on loopback27018. Includes missing-config
refusal, malformed-array refusal/no receipt, injected failure after reservation
before DDL/no empty receipt, apply→verify→rollback, no receipt overwrite and
identical documents before/after. The injected failure is explicitly a CLI fault
injection; apply/rollback and scalar validation use actual MongoDB, not mocks.
The existing service rollout test also ran freshly and passed (1/1), verifying
uniqueness/conflict refusal/namespace rollback/nonunique-index refusal.
No deployed collection was inspected or migrated. Operator backup and writer-pause
requirements remain unchanged; no automatic deduplication exists.
