# Literal evidence safety veto — not semantic inference

Existing fact proposals were required to cite a same-field literal. That alone
allowed “Does not hold a HACCP certificate” to produce a positive HACCP entry.
A positive citation could also ignore a contradictory same-field quote.

The existing validator now conservatively rejects a proposed positive value
when the same exact label occurs with an explicit adverse/uncertain marker in
its own professional field. Initial bounded markers cover common English,
Azerbaijani and Russian forms, English contractions and Azerbaijani uppercase
DEYİL case folding. Tokens are Unicode-bounded; NoSQL/notebook are not negation.
Counterevidence in another field or about another exact value is not used to
suppress a proposal. Literal zero experience remains a factual zero.

This is a deterministic SAFETY VETO, not multilingual NLI, an entailment proof,
a semantic model or a hiring rule. Complex/implicit negation, chronology, scope,
sarcasm and every linguistic form are not solved. Even an affirmative literal
is not proof of issuer verification/current certification validity. Ambiguous
phrases such as “HACCP certificate; no incidents” are conservatively rejected;
authorized HR can still review the original and enter facts manually. Missing
facts are not converted into negative qualification judgements. ATS, Candidate
status, human hiring decisions, manual edits and permissions remain unchanged.

The same current output policy revalidates stored successful AI proposals before
returning them through the existing processing GET/approval path. Unsafe old
proposals become ineligible, without rewriting/deleting stored jobs or Candidate
records. Authorized metadata remains readable; existing approval validation
cannot use the hidden result. No new endpoint/HTTP request/schema/gate/dependency.
Normal eligible legacy result reads add no DB queries; invalid-result handling
uses the existing final authority refresh. Source-specific current proof and
revocation checks from HR_SOURCE_AI_PROVENANCE.md remain in force.

QA uses synthetic packets and mock provider responses, not new inference:
23/23 focused AZ/EN/RU guard tests, actual local DOCX extraction + queue tests,
and historical-cache fixtures. Genuine English spaCy baseline findings remain
unchanged: false-positive rate40–80% on the existing negative cases. The42-case
AZ/EN/RU corpus/evaluator is retained; no new contextual multilingual model was
executed. Qualification/decision activation remains NO-GO.

Model decision reuses the completed official-distribution assessment: XLM-R
base/tokenizer/vocab are reachable on download.pytorch.org (~1.043GiB), but the
archived TorchText/native ABI/support and safe serialized-artifact verification
still need review. Python3.12 wheels exist; absence of those wheels is not a
blocker. This base encoder is not a trained NLI/evidence verifier, so downloading
it into the current1.5GiB-root/3.9GiB-tmp workspace would not justify repeating an
unsafe cosine-as-qualification experiment. No large checkpoint or extra runtime
was installed. External inference and production gates were not activated.
