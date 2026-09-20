# Dataset Methodology

**Total dataset: 368 labeled reports** — 50 provided by the organizers (`INC-001`..`INC-050`)
plus 318 generated synthetically (`GEN-0001`..`GEN-0318`). Generation is fully reproducible
(fixed PRNG seed) via `backend/scripts/generate-dataset.js`.

## How the 318 generated reports were built

1. **Template design, grounded in the real examples.** For each of the 24 incident types
   already present in the organizer set, we hand-wrote 2–4 sentence templates whose phrasing
   patterns were drawn from the actual INC-001..INC-050 reports — both plain English and
   Nigerian Pidgin register, since the real dataset mixes both freely.
2. **Slot-filling, not copy-paste.** Templates use placeholders (`{system}`, `{dept}`, `{role}`,
   `{time}`) filled from small vocabulary lists representative of a Nigerian university /
   public-sector setting (e.g. systems: staff portal, payroll system, VPN, exam portal;
   departments: bursary, registrar's office, ICT unit). No real names, emails, phone numbers,
   or ID numbers appear anywhere — satisfies the "no real personal data" rule by construction.
3. **Ground truth assigned at construction time, not by the classifier.** Each template's type
   *is* the label — we never ran the classifier and copied its output as truth. This keeps the
   answer key trustworthy for grading the classifier against.
4. **Severity tied to content, not drawn independently.** Roughly 25% of generated reports have
   an explicit escalating detail appended (e.g. "the message also asked for BVN details",
   "this affected multiple accounts"), which raises the severity label by one band from the
   type's baseline; about 15% get a de-escalating detail ("I didn't click anything"), which
   lowers it by one band. The rest keep the type's baseline severity. This mirrors how severity
   should actually be inferred from text, and avoids the methodological trap of labeling
   severity randomly and then being surprised a text-based classifier can't predict it.
5. **Deliberate duplicate campaigns.** ~10% of Phishing/Malware reports get a near-identical
   variant appended ("Another colleague reported the exact same message today"), close together
   in the synthetic timeline, so the dedup/grouping logic has more than the organizer's 3
   duplicate examples to prove itself against.
6. **Class balance.** 13 reports per type (24 types × 13 ≈ 312) plus duplicate variants ≈ 318
   total — deliberately balanced rather than mirroring real-world class imbalance (which skews
   heavily toward phishing), so the classifier's accuracy per type is visible rather than hidden
   inside an aggregate dominated by the most common category.

## Why this is a fair test, not a gamed one

The classifier's keyword rules were written and tuned against the organizer's 50 cases only.
The 318 generated cases use independently-written template phrasing — different sentence
structures for the same underlying incident types — so evaluating against them measures
**generalization**, not memorization of the training examples. We report both numbers
separately for exactly this reason (see `backend/scripts/evaluate-full.js` output):

| Set | n | Type accuracy | Severity accuracy | Routing accuracy |
|---|---|---|---|---|
| Organizer-provided (used while designing rules) | 50 | 96.0% | 70.0% | 76.0% |
| Generated (held-out generalization test) | 318 | 86.2% | 68.9% | 85.5% |
| **Combined** | **368** | **87.5%** | **69.0%** | **84.2%** |

## Honest limitations of the generation method

- Templates were written by us with knowledge of the classifier's keyword rules already in
  mind, so some vocabulary overlap between "what a real report says" and "what the classifier
  looks for" is inevitable — this is a limitation of small-team synthetic generation, not
  unique to this project. A stronger validation would involve reports written by people who
  never saw the classifier's rule list.
- The vocabulary lists (departments, systems, roles) are intentionally generic; a real
  production system would need a much larger and more idiomatic phrase bank, ideally sourced
  from real (properly anonymized) incident reports.
- Severity remains the weakest metric (~69%). This is a genuine limitation of fixed-band
  keyword escalation, discussed further in the main README.
