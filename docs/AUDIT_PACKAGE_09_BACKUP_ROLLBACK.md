# Paket 09 — backup, restore və rollback

## Lokal rehearsal

`auditBackupRestore.test.cjs` yalnız label-i `inop.task=audit-p09` /audit-ci olan konteyneri və port 27018-i qəbul edir. Source random `inop_audit_test_*`, restore isə yeni `inop_audit_restore_*` DB-dir. Mövcud restore DB üzərinə yazmaq və source `--drop` yoxdur.

Real mongodump gzip archive → mongorestore namespace mapping → bütün collection/document canonical digest və index key/name/unique müqayisəsi → copied private evidence SHA-256 və audit metadata əlaqəsi icra edilir. Yalnız həmin owned generated archive/restore DB/evidence copy təmizlənir. Əvvəlki rehearsal 15 collection/45 sənəddə keçib; final təkrar icra və digest QA sənədindədir. Bu, production backup strategiyasının yoxlanması deyil.

## Production prerequisites — icra edilməyib

- Approved immutable backup ID, timestamp, scope və operator; DB + evidence object versions eyni logical snapshot-a uyğun olmalıdır. Məxfi dump və provider keys repoya/loga daxil edilmir.
- Restore target izolə edilmiş, mövcud məlumatı olmayan staging DB/bucket olmalıdır. Encryption, access, storage capacity və checksum manifest yoxlanmalıdır.
- Quiescent source və ya approved consistent replica backup/oplog strategiyası seçilməlidir. Bu testin quiescent mongodump-ı live multi-writer production consistent backup sertifikatı deyil.
- Restore sonrası source revisions, saves, scoring snapshots, audit/finding/action/evidence/approval/closure/history əlaqələri, indexes və RBAC yoxlanır. Backup mövcuddur deyə integrity PASS sayılmır.

## Rollback və incident proseduru

1. Release SHA və compatible app versiyası, source/catalog binding və index change-log saxlanır. Operator incident qərarı olmadan avtomatik rollback yoxdur.
2. Yeni revision istifadə edən audit varsa həmin history silinmir; application rollback əvvəlki code-un həmin snapshot-u oxuya bilməsini tələb edir. Blind pointer rewrite/seed overwrite qadağandır.
3. Index rollback yalnız bu release-də approved yaradılmış nonunique indeksə aiddir; əvvəlki unique constraint saxlanır.
4. DB və evidence versiyaları ayrıca rollback edilməməlidir. Referential integrity və hash manifest birlikdə verifikasiya edilməlidir.
5. Release verification: health/ready, current grants, six source forms/reports, private upload/download, approval/closure, analytics count/null, request/error telemetry.
6. Incident zamanı public/private URL bypass bağlanır, approved operational procedure ilə trafik/işlər idarə edilir, request ID və redacted status qeydləri saxlanır. Təsdiqlənməmiş SLA, retention və alert həddi yaradılmır.

Production backup/restore/retention, monitoring və staged rollback operator rehearsal-ı NOT TESTED/BLOCKED qalır. Production DB, backup və storage üzərində bu task əməliyyat aparmır.
