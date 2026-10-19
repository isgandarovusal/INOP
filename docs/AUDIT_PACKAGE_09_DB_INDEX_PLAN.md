# Paket 09 — MongoDB indeks planı

`Backend/config/auditOperationalIndexes.json` real query pattern-lərinə bağlı **7 nonunique** indeks hazırlayır. Runtime model startup onları avtomatik qurmur; server autoIndex/autoCreate=false qalır. Production DDL icra edilməyib.

| İndeks | Query |
|---|---|
| audit_source_latest_v1 | Execution auditId + pinned revision + completed status; updatedAt/_id latest sort |
| audit_direction_date_v1 | Audit direction + archivedAt + date interval |
| audit_restaurant_direction_date_v1 | Assigned restaurant + direction + archivedAt + date |
| audit_hse_object_date_v1 | HSE object + direction + archivedAt + date |
| audit_action_status_due_v1 | Parent action status, closure və overdue |
| audit_finding_status_v1 | Parent finding status/report/closure |
| audit_evidence_parent_v1 | Parent evidence metadata/report |

Birinci indeks owned 5001 HR/5001 Servis test DB-də explicit yaradılıb və real latest query explain-də index scan, ≤1 document examined sübut edilib. Qalan indekslər üçün production cardinality/write-overhead/explain ölçməsi NOT TESTED-dir; təklif olmaları avtomatik rollout icazəsi deyil.

```bash
node Backend/scripts/auditIndexDryRun.cjs --snapshot INDEX_INVENTORY.json
```

Input model adına görə index array-ləridir (`auditExecution`, `audit`, `auditAction`, `auditFinding`, `auditEvidence`). Equivalent full nonunique index no-op-dur; eyni ad/key, lakin partial/sparse/unique/hidden/collation ziddiyyəti manual review/BLOCKED; unknown inventory BLOCKED. Plan writes=0, autoApply=false və approval tələb edir.

Rollout: backup receipt → reviewed staging restore → baseline explain/latency/write/storage ölçməsi → approved inventory digest və operator approval → bir indeksin explicit create-i → build/replication/CPU/disk izlənməsi → eyni sorğu explain və nəticə tamlığının müqayisəsi. İndeks adları operator change-log-da qeyd edilir. Production ağır interval üçün əvvəl maxTimeMS və capacity yoxlanmalıdır.

Rollback yalnız bu approved planla yaradıldığı sübut edilmiş indeksin `dropIndex(name)` əməliyyatıdır. Əvvəlki/unique constraint indeksləri silinmir; istifadə olunan query-nin təhlükəsiz scan/422 davranışı saxlanır. Bu paket production-da create/drop/index migration etmir.

Local compose artıq transaction-capable replica-set init-i və loopback Mongo port-u nəzərdə tutur. Mövcud volume üçün backup/operator review olmadan compose init işlədilməməlidir. Bu task compose up etməyib və mövcud `inop-cloud-mongo` konteynerinə toxunmayıb. QA yalnız `inop-audit-p09-qa`, 127.0.0.1:27018 və random owned DB-lərdədir.
