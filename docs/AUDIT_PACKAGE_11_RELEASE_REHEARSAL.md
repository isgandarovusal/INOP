# Paket 11 — offline release rehearsal və release gate

## Faktiki sərhəd

Yalnız offline metadata fixture-ləri və təsadüfi adlı owned localhost QA bazaları istifadə olunub. Production snapshot, transaction topology, ingress, storage, backup və restore yoxlanmayıb. Yeni migration/index/validator tətbiq olunmayıb. Mövcud fixture-in öz test bazasındakı indeks hazırlığı production migration deyil.

`auditReleaseDryRun.cjs --snapshot LOCAL_JSON` artıq restoran mapping, legacy direction və bound revision cədvəlləri də verir. GFC ana təşkilatdır; yalnız KFC, Pizza Hut, Simit Sarayı. Ad əsaslı uyğunluq yalnız namizəddir, yazı və təsdiq deyil. Naməlum istiqamət null, unbound revision manual-review qalır. Context/revision/restaurant katalogu, parent template və published pointer uyğunluğu, profil version/active/provenance və duplicate restoran konfliktləri release gate-ə daxildir. Snapshot dəyişmir, writes=0, productionVerified=false.

İki real offline CLI rehearsal: uyğun metadata fixture exit 0; brend/context konflikti, ambiguous restoran və legacy safety alias/unbound revision fixture exit 2. Reports `/workspace/work/audit-technical/rehearsal-*-report.json` daxilində Git xaricindədir. Fixture-lərdə sual, bal, threshold və real data yoxdur. Schema/snapshot və ya raw DB administrator yazısının tam ekvivalentliyi iddia edilmir.

Seçilmiş frontend regression fixture-ləri də mövcud kontrakta uyğunlaşdırıldı: unversioned execution oxunur, submit 409; bound snapshot immutable mənbədir, client score authority deyil; unknown source təşkilat/brend qəbul edilmir; silmə arxivləşdirir; approval designated müstəqil reviewer və async nəticə ilə test olunur. Create-only template testi öz localhost roluna kataloq read grant verir; production grant-ları dəyişmir. Real şablon sualları və scoring əlavə olunmur; yalnız əvvəlki sintetik fixture-lərdir. İlkin uğursuz log silinməyib.

## Tətbiqdən əvvəl addım-addım plan — ayrıca approval tələb edir

1. Hazırkı remote/backend/frontend SHA-ları, native Render Node versiyası/start/build, Auto-Deploy Off və health konfiqurasiyasını faktiki sübutla qeyd et. Node/package lock compatibility və `npm ci --omit=dev` ayrıca staging-də yoxlanmalıdır. Bu task Render konfiqurasiyasını dəyişmir.
2. Səlahiyyətli operator audit yazıları üçün maintenance pəncərəsi və in-flight job drain planı hazırlasın. Backup manifest-i, collection/index/validator siyahısı və fayl/object custody snapshot-u alınsın. İzolə staging-də restore tamamlanmadan migration approval verilməsin.
3. Operatorun icazəli read-only metadata export-u offline analyzer-ə verilsin. GFC/brend/restoran əlaqələri mövcud ID-lərlə manual təsdiqlənsin; unknown/duplicate/orphan silinməsin. Legacy direction alias-ları ayrıca review, naməlum adlar təxmin edilməsin.
4. User/profile/assignment vəziyyəti və promotion siyasəti ayrıca qərara bağlansın. Aktiv profil management rolunda da scope-u daraldır; bypass yoxdur. Deaktivləşdirmə, aktiv assignment-lərin taleyi və provenance atomik qərar tələb edir; avtomatik rol dəyişmə yoxdur.
5. Replica-set/mongos transaction imkanını faktiki `hello`, staging transaction/abort və concurrent assignment/revision/closure sınaqları ilə təsdiqlə. Standalone üçün writes təhlükəsiz 503 qalır; transaction-sız fallback etmə.
6. Mövcud indeksləri proposed definition-larla müqayisə et; duplicate active assignment, bound execution, template revision və evidence key konfliktlərini əvvəl həll planına sal. Yalnız ayrıca təsdiqdən sonra indeks yaratma əmrləri operator runbook-unda hazırlanıb staging-də tətbiq edilə bilər. `_id` profile uniqueness hazırdır; başqa production index-in mövcudluğu burada təsdiqlənmir.
7. Restaurant/Profile/Revision validator namizədlərini actual BSON dump üzrə staging-də validate et. Version/revision integer semantics, nullable legacy fields, schema bypass privileges və immutable revision üçün DB ACL ayrıca qiymətləndirilsin. Validation səviyyəsini avtomatik seçmə; mövcud qeydləri reject edən strict rollout approval tələb edir. Raw admin dəyişikliklərini JSON schema tam bloklamır.
8. Legacy auditləri bağlamaq üçün revision/context uydurma. Tarixi template snapshot etibarlılığı təsdiqlənmirsə unversioned/legacy status qalsın; historical rescore etmə. Direction/restoran/revision backfill ayrı manifest və approval tələb edir.
9. Staging-də bütün backend/frontend regression və permission smoke keçsin. External consumers nullable averages, additive pagination və yeni 409/503-ləri qəbul etməlidir. Sonra ayrıca push/deploy approval istənilir.

## Private provider contract və staging planı

Provider seçilməyib, credentials yaradılmayıb, production upload 503-dür. Evidence üçün seam var; source documents üçün durable adapter ayrıca lazımdır. Approved factory server-only qeydiyyat, validated credentialsReady, durable/private/versioned/conditionalWrites, immutable key/version, ifAbsent write, AbortSignal, bounded stream və private receipt təmin etməlidir. Public ACL/URL və user-defined endpoint qadağandır.

Staging matrisi: auth olmayan və cross-direction/brand/restaurant request; MIME/magic/ölçü; iki paralel iş limiti; abort-a əməl etməyən timeout; ownership/key/version tampering; SHA/read-back uyğunsuzluğu; URL/redirect SSRF; credential log redaction; role/profile revoke zamanı download/upload; 503 config failure; DB uncertainty zamanı original retention. Test bucket yalnız sintetik prefix, encryption/least privilege/region/retention/backup sübutu ilə. Cleanup yalnız exact minted version və definitely-uncommitted iş üçün; uncertain commit və archived/history reference varsa original saxlanır. Reconciliation əvvəl read-only report, sonra ayrıca deletion approval.

## Render ingress checklist

- `trust proxy=1` yalnız bir faktiki son proxy hop və birbaşa Node ingress-in olmaması ilə təhlükəsizdir. Render istifadəçi təsdiqi bu topologiyanın ölçülmüş sübutu deyil.
- Last-hop X-Forwarded-For overwrite/append, IPv4/IPv6, spoofed left-most chain, extra CDN/proxy və direct access staging-də yoxlanmalıdır. IP/rate-limit key real client-ə uyğun olmalıdır.
- Regression testləri lokal hop/spoofing davranışını yoxlayır; canlı ingress təsdiqlənməyib. Blanket true/proxy bypass/keepalive əlavə edilmir.

## Dependency reassessment

`npm audit --omit=dev --json` yenidən icra edildi: **4 affected package, 1 high / 3 moderate**, fixAvailable=false. Lockfile/dependency dəyişməyib.

| Paket / real yol | Risk və release gate |
|---|---|
| xlsx 0.18.5, root → xlsx | High: GHSA-4r6h-8v6p-xvw6 və GHSA-5pgg-2g8v-p4x9. Audit/candidate export write yolu var; untrusted XLSX parser tapılmayıb, source processing XLSX üçün 415. Bu mitigasiya patch deyil; supported patched distribution/replacement və regression qərarı lazımdır. |
| mammoth → argparse → sprintf-js | 3 moderate package entry, əsas advisory GHSA-hp3w-g68c-fv3c (sprintf-js precision DoS). DOCX extractRawText bounded library worker istifadə edir, CLI/argparse işə salınmır. Zəncir installed/audit-visible qalır; approved patch yolu və ya explicit risk acceptance lazımdır. |

## Deploy ardıcıllığı və rollback

Release hazır **deyil**. Ayrıca təsdiqdən sonra: ingress/restore/storage/migration gate-ləri → staging backend və compatible frontend → backend deployment və health/auth/legacy/503 smoke → uyğun frontend deployment → read-only smoke → yalnız təsdiqlənmiş synthetic staging yazı sınaqları. Nullable result göstərən frontend köhnə backend-lə də sınaqdan keçirilməli, yeni backend köhnə external consumer-lə avtomatik uyğun sayılmamalıdır. Current permission/API route adları saxlanır; scoring kontraktları dəyişməyib.

Frontend rollback əvvəlki təsdiqlənmiş deployment artefaktına operator seçimi ilə, backend rollback əvvəlki pinned SHA/artefakta koordinasiyalı aparılsın. Yeni revision/context/evidence yazıları olduqda köhnə backend-in onları oxuma uyğunluğu əvvəl sübut edilməlidir; uyğunsuzdursa yazıları dayandır və forward-fix planını seç. Git rollback normal revert commit ola bilər; force/reset/rebase yoxdur. DB rollback avtomatik delete/drop/backfill reverse deyil: reviewed backup/restore manifest, write freeze, yeni history/object custody reconciliation və ayrıca operator təsdiqi tələb edir. Validator/index dəyişikliklərini əvvəlki manifestə qaytarmaq da ayrıca approval tələb edir. Storage original/version-ları qorunur. Bu task rollback/deploy icra etmir.

## Qalan release bloklayıcıları

Orijinal favicon PNG; approved real HR/başqa istiqamət şablonları və scoring; management profile promotion siyasəti; concrete private evidence/source storage; production restore/topology/mapping/index/validator sübutu; Render ingress; XLSX və DOCX dependency risk qərarı; external nullable consumers; production browser allowlist. Mövcud allowlist-də Vercel/Render yoxdur, production cəhdi edilməyib.
