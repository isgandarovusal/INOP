# Explicit private Source approval and ATS trust

Source approval requires `confirmed: true`, the exact original hash and current
Source revision, current independently checked Candidate/Application/Job grants,
and an editable HR profile. Correcting extracted facts is evidence of a change;
the explicit approval is the separate act that confirms those facts.

The receipt now stores `cvReview.reviewStatus: confirmed` for this explicit act
while retaining `correctedFields`, `reviewedBy`, `reviewedAt`, extraction version
and provenance. It does not confirm a draft, a legacy merely corrected profile,
or automatically migrate any existing record. Unknown experience stays null;
empty Job requirements never earn 100. Explicitly reviewed empty skills can earn
a real zero, distinct from absent/unreviewed skills.

Owned local Source → HR approval → Candidate → Application → HTTP score tests
cover corrected facts with 100, reviewed absence with zero, unknown experience,
empty requirements and unconfirmed legacy profiles. Synthetic storage/scanner
are clearly separate from the real durable-storage/AV release gates.
