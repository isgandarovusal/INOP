# Paket 07 — hesabat sahələrinin uyğunluq xəritəsi

Baza: Paket 06 `323c3dbfc42e6a49501c12b18b221222712677a6`. Yeni Excel kataloqu import edilmir; Paket 03–06 source map və verifier nəticələri saxlanır. Source JSON, ID, sual sırası, template/revision və scoring servisləri (HR üçün yalnız optional sectionPhotos normalizer əlavəsi istisna olmaqla) dəyişmir.

| Hesabat | Mənbə snapshot-u / saxlanmış nəticə | Kataloq sayı | Saxlanılan xüsusi vərəqlər |
|---|---|---|---|
| HR KFC/PH/SS | `templateSnapshot.hrSource`, `hrAuditSave.assessment.hrAssessment` | 66 / 71 / 35 | HR Criteria, HR Sections, HR Source, yeni HR History |
| Servis KFC/PH/SS | `serviceSource`, `serviceAuditSave.assessment.serviceAssessment` | 94 / 79 / 61 | Service Criteria, Service Sections, Service Source, Service References, yeni Service History |
| Standart KFC/PH/SS | `standardSource`, `standardAssessment` | 190 / 123 / 71 | Cover, Standards, Observations, History, Findings |
| HSE restoran | `hseSource`, `hseAssessment`, `hseObjectSnapshot` | 6 bölmə / 52 | COVER, HSE Criteria/Observations/History/Applicability |
| HSE ofis | eyni HSE infrastrukturu, ayrıca office revision və çəkili kontrakt | 5 / 19 | Results Summary, HSE Criteria/Observations/History/Applicability |
| HSE anbar | ayrıca warehouse revision və çəkili kontrakt | 6 / 29 | Results Summary, HSE Criteria/Observations/History/Applicability |

## Ortaq sahələrin dəqiq mapping-i

| Model/sahə | API yekun bundle | Excel |
|---|---|---|
| Audit `_id`, `id`, `auditType`, `date`, `status` | metadata.auditId/reference/direction/date/status | Report Metadata; mövcud Audit qalır |
| Snapshot organization/brand, actual HSE və Standart obyekt snapshot-u | organization/brand/objectType/objectId/objectName | Report Metadata və əvvəlki istiqamət Cover/Source |
| `templateRevisionId`, source.version/sha256 | revision/catalogVersion/sourceHash | Report Metadata və mənbə vərəqləri |
| Son completed immutable save.actor/submission | auditorId və məhdud public name | Report Metadata; saxlanmış submission adı varsa prioritetlidir |
| Son completed save.answers, details, assessment | sections.criteria; null qorunur | Mənbə Criteria/Standards və History; yenidən scoring edilmir |
| `sectionNotes`, `sectionPhotos`, question `comment`, `evidenceLinks` | section note/photoId; criterion note/evidenceIds | Criteria, Sections/Cover və Evidence Links |
| `finalEvidence.photoId`, `documentIds[0..2]` | finalEvidence; boş slotun yeri saxlanır | Documents: 3 ayrı sıra, slot 1/2/3; Source/Cover əvvəlki ID-ləri də saxlayır |
| AuditEvidence `_id`, auditId, name, mimeType, size, createdAt, uploadedBy | evidence: yalnız public metadata və authenticated URL | Evidence; storage key/reference/provider credential çıxmır |
| Question/section/final/observation/finding/action evidenceIds | evidence.links: level/target/slot | Evidence Links; real auditə məxsus metadata ilə əlaqələndirilir |
| Finding severity/sourceRisk | ayrı sahələr; sourceRisk null dəyişmir | Findings Severity/SourceRisk; priority ilə qarışdırılmır |
| Action responsible/dueDate/priority/evidenceIds/verificationNote | actions | Actions ResponsibleUser/Deadline/Priority/EvidenceIds/VerificationNote; legacy deadline fallback qalır |
| Approval requestedBy/reviewer/status/comment/applicabilityReview | approvals | Approvals + Applicability Reviews; uzun JSON bir hüceyrəyə yığılmır |
| Closure executionId/finalStatus/approvalStatus/closedBy/closedAt | closures | Closures |
| AuditActivity userId/action/resource/description/createdAt | history | Lifecycle History; arbitrary metadata/private file paths çıxmır |
| Immutable source saves | UI-də versiya/actor/status/tarix; mövcud history endpoint-i qalır | HR/Service History əlavə edilir; Standart/HSE history saxlanır |

Child kolleksiyalar yalnız `auditId` ilə batch oxunur və hər child resource-un read scope-u ayrıca yoxlanır. `null` child kolleksiyası icazə məhdudiyyətidir, real boş siyahı ilə qarışdırılmır; Excel Access vərəqi bunu göstərir. Məhdud istifadəçinin Evidence ID-si audit sahibliyini bypass etmir; download ayrıca mövcud backend auth-dan keçir.

## Dəyişməyən biznes kontraktları

- HR: 0 / 0.5 / 1 / N/A; yeni KFC source-v2 faktiki applicable meyarlar; köhnə blocked source-v1 qorunur.
- Servis: Bəli 1 / Orta 0.5 / Xeyr 0 / N/A. KFC B79/8.36 yalnız references; B67 source-v2 müsbət mətn və köhnə negative kontrakt qoruması dəyişmir.
- Standart: unique noncompliant meyar sayı / applicable denominator; bir meyara iki finding faizi iki dəfə azaltmır. KFC QT!B148 mənbə riski null-dır.
- HSE: restoran sadə 1/0, ≥85% yalnız restoran; ofis/anbar sadə və 5/3/1 çəkili ayrı nəticə; yeni hədd yoxdur. GFC ümumi faiz yoxdur. Köhnə /5 müqaviləsi dəyişmir.
- Bütün N/A hallarında nəticə null-dır; UI “Qiymətləndirilmir”, Excel boş nəticə hüceyrəsi verir. 0 faiz ayrıca həqiqi rəqəmdir.

Original Excel-lər, foto/sənəd baytları, real auditor/restoran nümunələri və production məlumatları commit edilmir. Paket 07 sintetik lokal test kataloqlarını istifadə edir; source kataloqları və əvvəlki auditlərə migration tətbiq edilmir.
