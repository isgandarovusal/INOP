# Private Source OCR and human approval

`createIntake({ocrEngine})` accepts an optional approved server OCR engine.
Default profiles do not configure it; clean image-only PDFs remain honestly
`blocked/OCR_REQUIRED`, preserve their original and never create a person.
With the existing bounded Tesseract engine configured, the Source worker scans
the exact private original before OCR, validates engine/version/languages/pages
and bounded output, then uses the same `parseOcrOutput` as Candidate OCR.

The additive result is `parserVersion: ocr-rules-1`, `provider: tesseract-rules`,
pending review, exact source hash, page/engine metadata and null field confidence.
Rule extraction's confidence cannot masquerade as OCR accuracy. Ready Source
approval still requires exact current hash/revision, current independent scopes
and explicit HR confirmation. Unknown facts stay unknown. No original replacement,
person creation, Application decision or automatic hire occurs during OCR.

The existing intake15s deadline/two shared retained slots, worker lease/three
lifetime attempts and current creator grants apply across extraction/OCR.
Late OCR after grant revocation is discarded. Infected/unknown scan never enters
OCR or exposes facts. Invalid output blocks, runtime/language/input unsupported
remains OCR_REQUIRED; transient failures retain bounded retry behavior.

Source API/frontend accept either strict rules-2/rule-based or
ocr-rules-1/tesseract-rules pending evidence. OCR evidence requires null confidence
and the existing AZ/EN/RU review panel shows OCR, not AI/calibrated accuracy.
One original upload and explicit corrected HR confirmation retain provenance.

Real local image-only English PDF/Tesseract/hash-preservation tests are separate
from earlier real AZ/RU OCR fixture suites. Synthetic private object store and
scanner are NOT real durability/AV proof. Native hosted binary/model/resources,
private provider recovery/scan/privacy activation remain external release gates.
