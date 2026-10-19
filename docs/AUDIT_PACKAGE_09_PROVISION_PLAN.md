# Paket 09 — provision planı

> Cari final closure: **PARTIAL** (lokal texniki). Production readiness: **BLOCKED**. Əvvəlki nəticələr tarixidir; aşağıdakı final closure bölməsi cari vəziyyətdir.


Production DB-də icra yoxdur. Mövcud source endpoint/binding və read-only `auditProvisionDryRun.cjs` təkmilləşdirilib; yeni seed/replace sistemi yaradılmır.

## İnventar

12 source family: HR 3 brend, Servis 3, Standart 3, HSE restoran/ofis/anbar 3. GFC restoran/brand master data yenidən yaradılmır. Ofis/anbar real canonical registry-dən gəlməlidir; saxta restoran deyil. User/profile, explicit direction, restaurant assignment və HSE object grants approved matrix ilə müqayisə edilməlidir.

Snapshot: templates/revisions/bindings `{hr,service,standard,hse}` /objects/grants/profiles/users/restaurants. Password/token/secrets/file bytes olmamalıdır. Lokal fayl maksimum 32MiB; CLI Mongo-ya qoşulmur, URL/apply qəbul etmir. Output input SHA-256, verified source digest/version/published pointer, no-op/provision/manual-review qərarı verir.

Yeni yoxlamalar: duplicate/missing identity, canonical `userId:objectId` grant identity, active GFC object/profile/user əlaqəsi. Binding-siz eyni source revision varsa duplicate yaratmaq əvəzinə manual reconciliation. `writes=0`, `applyEnabled=false`, `productionVerified=false`; operator prerequisites açıqdır. Boş obyekt inventarı production-ready deyil.

```bash
node Backend/scripts/auditProvisionDryRun.cjs --snapshot APPROVED_LOCAL_INVENTORY.json
```

## Operator gate və idempotent tətbiq

1. Current read-only inventory və integrity-verified DB/storage backup receipt hazırlanır. Plan digest-i, operator kimliyi, approval/change-ticket və rollback planı audit change-log-da saxlanır.
2. Yalnız approved absent source binding üçün mövcud `/audit-{hr,service,standard}/templates/:brandId` və `/audit-hse/templates/:objectType` işlədilir. Eyni hash/version no-op/idempotent-dir; pointer/digest ziddiyyəti manual review/409 tələb edir. Timeout-da blind retry deyil, binding yenidən oxunur.
3. Approved ofis/anbar ID registry istifadə edilir. Mövcud object ID qorunur; ad oxşarlığına görə duplicate create və restaurant conversion edilmir. Object POST nəticəsi qeyri-müəyyəndirsə əvvəl inventory reconciliation.
4. HSE grant canonical userId:objectId ilə yenilənir. Direction dəyişikliyi reason +expectedVersion ilə; department/brand və restaurant icazəsi təxmin edilmir. Aktiv assignment-lar yoxlanmadan grant silinmir.
5. Hər addımdan sonra hash/pointer/count/grant status verifikasiyası və request ID/audit history qeyd edilir. Dry-run təkrarı no-op/PASS olmalıdır; returned assignment status revoked-dursa active kimi təqdim edilmir.

Rollback source revision/history-ni silmir. Yeni auditin bağlandığı revision istifadə olunursa pointer downgrade və ya blind delete olmaz; əvvəl compatible app və reviewed rollback yolu tələb edilir. Canlı inventar/operator approval/backup əlçatan olmadığından production provision BLOCKED qalır.


## Final closure — 19 oktyabr 2026

Final read-only CLI təkrarlandı: synthetic filled inventory 12/12 PASS/no-op, exit0/writes0; empty inventory 12 NOT PROVISIONED, exit2/writes0. Full backend-də source version/idempotency/duplicate preservation/grant və parent tenant testləri keçir. Bu source plan validator sübutudur, production inventarının mövcudluğu deyil. Real ofis/anbar, role/auditor və grant matrix verilməyib. Production apply yoxdur; backup/digest/operator approval/rollback proseduru FINAL_OPERATOR_CHECKLIST-dədir.
