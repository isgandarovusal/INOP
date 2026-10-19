# Production Mərhələ 3 — provision və inventar

12 source ailəsi/890 meyar, source version/hash qorunub. Aşağıdakı source truth-dur; production active binding mövcudluğu deyil.

| İstiqamət | Target | Versiya | Bölmə | Meyar | SHA256 |
|---|---|---|---:|---:|---|
| hr | kfc | source-v2 | 8 | 66 | d9535bb74d6078b0f75fab9969b6f28ffc868218c4879ad4e0d66cf65b4b6aa8 |
| hr | pizza-hut | source-v1 | 8 | 71 | 14dace01b68395de1e1c1e89253778b4182338c7f4a75360651acc0aa0d13c49 |
| hr | simit-sarayi | source-v1 | 4 | 35 | f19580b2fa3d2a3ab0d6aae07987023d6fc3e054f2d1bf83cf90e6a5d3fdb37a |
| service | kfc | service-source-v2 | 13 | 94 | 2c42c35e5eae628cb75d4a31b4d7b147601b66148f196a447943bb16f558ce49 |
| service | pizza-hut | service-source-v1 | 11 | 79 | 82340f5c838abcc42355a394830db7ba7424a97e0fca03b2e2745a83652de032 |
| service | simit-sarayi | service-source-v1 | 10 | 61 | 5ae33e9224c38bd5ff02cef91159d31531dd9cd8d67798b609739fc8b64dfa64 |
| standard | kfc | standard-source-v1 | 10 | 190 | 66aaa8c423d5066afb664c14dae811db72b5f2061c3a58dca8e7713133c6b9b5 |
| standard | pizza-hut | standard-source-v1 | 10 | 123 | b8bdb1b2138b3518f0f19c862f22ba4516d74f8c9755d6caa9d8353f87179c5a |
| standard | simit-sarayi | standard-source-v1 | 10 | 71 | fb6bca39879fa1896ef314a4d452b460ecabd517329ac1e55f36f07bdc7b117a |
| hse | warehouse | hse-source-v1 | 6 | 29 | db204f4bde2fcae933729a2e914a1a31b5f91dca931703ce91ac9364a609c12e |
| hse | office | hse-source-v1 | 5 | 19 | f2243f51f37a46c1f253152c7aade214e90bb6d0b9c849eee144e7c391631381 |
| hse | restaurant | hse-source-v1 | 6 | 52 | 3f47324b9bd8fd09beab15537a43b106f03fbc975b8ed774a5efc7c6c4fb259c |

Fresh **sintetik** snapshot CLI dry-run:12/12 no-op PASS,writes0;7/7 index no-op PASS,writes0. Bunlar real production provision statusu deyil. Unknown/empty/conflicting inventory BLOCKED/exit2 qalır; JSON report-un özünü input inventory kimi vermək düzgün deyil.

Operatorun təqdim etməli olduğu real inventar: GFC tenant ID; canonical brend ID-ləri və restoranların mövcud ID/brand/tenant/active məlumatları; office/warehouse object ID/type/tenant/active; users ID/isActive və auditor profiles/direction grants; brand/restaurant assignments və HSE object grants. Şəxsi adlar/real obyektlər uydurulmur, recruitment branch-ləri audit restoranı kimi əvəz edilmir.

Hər source üçün templates/revisions/bindings (published IDs/state/content digest/version), mövcud restoran/obyekt/user/grant snapshot-u approved read-only export ilə alınır. Values/PII yalnız approved operator custody-də qalır.

```bash
node Backend/scripts/auditProvisionDryRun.cjs --snapshot APPROVED_INVENTORY.json
node Backend/scripts/auditIndexDryRun.cjs --snapshot APPROVED_INDEX_INVENTORY.json
```

Offline CLI MongoDB-yə qoşulmur, apply/seed rejimi yoxdur; idempotent digest və manual-review verir. KFC HR`source-v2`,Servis`service-source-v2` current binding üçün dəqiq olmalıdır. Historical valid revision current binding kimi sertifikatlaşdırılmır;409 manual review köhnə auditin execution/answers/history-sini dəyişmir.

Production apply yalnız ayrıca operator icazəsi + inventory digest + backup receipt + approved rollback + admin/audit-manager və all-scope səlahiyyəti ilə mövcud provision endpoint-lərindən aparıla bilər. HR/Servis/Standart3brend,HSE3object-target üzrə ilk returned template/revision/binding IDs/hash/version/actor/timestamp/request ID qeyd edilir; təkrar icra eyni bağlanmanı saxlamalıdır. Conflict zamanı overwrite/delete yox, review edilir.

Office/warehouse registry və grants ayrıca approved real inventardan mövcud authorized API-lərlə verilir. Auditor assignment başqa istiqamət/brend/obyektə səlahiyyət yaratmamalıdır. DB yazması bu task-da aparılmayıb.

Rollback istifadə olunmuş revision/binding/audit tarixçəsini silmir. Newly-created unused obyekt üçün də ayrıca review tələb olunur; old approved binding-i geri seçmək və version-compatible app rollback-i rehearsal edilməlidir. Current-source guard-u zəiflətməklə rollback edilmir.
