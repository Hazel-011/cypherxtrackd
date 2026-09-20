# Track D — Incident Triage Prototype

A MERN pipeline that takes raw, messy incident reports (English or Pidgin) and returns:
incident type, severity, key technical details, recommended routing, a redacted/shareable
version, and grouping of duplicate reports of the same incident. Sorted into an
urgency-ordered queue.

## Why rule-based, not a black-box model

The dataset is 50 examples — too small to train a reliable ML classifier, and a rule-based
approach lets every decision come with a plain-English explanation ("classified as Phishing
because the report contains: clicked the link, entered my password"), which is one of the
track's explicit requirements. Every rule is inspectable in `backend/src/services/classifier.js`.

## Architecture

```
backend/          Express API + Mongoose + classification pipeline
  src/
    data/incidents.seed.json       the 50 organizer-labeled cases
    data/incidents.generated.json  318 synthetically generated cases (see DATASET_METHODOLOGY.md)
    services/classifier.js     type + severity + technical detail rules
    services/redact.js         PII scrubbing for the "safe to share" version
    services/dedup.js          Jaccard-similarity grouping of repeat reports
    models/Report.js           Mongoose schema
    controllers/, routes/      REST API
  scripts/
    seed.js                    loads sample cases into MongoDB for the live demo
    evaluate.js                accuracy check against the organizer's 50 (no DB needed)
    evaluate-full.js           accuracy check across all 368 cases, split by source
    generate-dataset.js        regenerates the 318 synthetic cases (reproducible, fixed seed)
frontend/          React (Vite) triage queue dashboard
DATASET_METHODOLOGY.md  full writeup of how the 318 generated cases were built and why
```

## Running it

Requires Node.js and a local MongoDB instance (or update `MONGO_URI` to Atlas).

```bash
# 1. Backend
cd backend
cp .env.example .env
npm install
npm run seed        # loads the 50 sample cases through the pipeline
npm start            # API on http://localhost:5000

# 2. Frontend (separate terminal)
cd frontend
npm install
npm run dev           # UI on http://localhost:5173
```

Open http://localhost:5173 — this is the **reporter view**: a plain submit form. Submit a raw
report and you'll see your own triage result (type/severity/routing), nothing else.

For the **admin/triage view**, go to http://localhost:5173/#admin and enter the passcode you
set as `ADMIN_PASSCODE` in `backend/.env`. You'll see the full urgency-sorted queue, seeded
reports included, with status controls and duplicates grouped.

## Accuracy against the labeled dataset

The dataset now has **368 labeled reports**: the organizer's 50 plus 318 generated
synthetically (see `DATASET_METHODOLOGY.md` for exactly how, and why the split matters).

```bash
cd backend
npm run evaluate        # organizer's 50 only, prints every mistake
npm run evaluate:full    # organizer's 50 + generated 318, split by source
```

| Set | n | Type accuracy | Severity accuracy | Routing accuracy |
|---|---|---|---|---|
| Organizer-provided (used while designing rules) | 50 | 96.0% | 70.0% | 76.0% |
| Generated (held-out generalization test) | 318 | 86.2% | 68.9% | 85.5% |
| **Combined** | **368** | **87.5%** | **69.0%** | **84.2%** |

We report the organizer set and generated set separately, not just combined, because the
classifier's rules were designed while looking at the organizer's 50 cases — testing only
against those would overstate real-world accuracy. The generated set uses independently
templated phrasing for the same incident types, so its accuracy is a fairer measure of
generalization to report wording the rules weren't tuned on.

**Where it fails, honestly:** severity is the weakest link, plateauing around 69% even after
tuning. The rule-based scorer applies a flat +1/-1 band shift when *any* escalating or
de-escalating phrase is present, but can't weigh how strong one signal is relative to another
— "BVN requested" and "multiple accounts affected" both just add +1, even though a judge would
likely treat financial-data theft as more severe than the account count alone. A production
version would need either a learned severity model trained on a much larger labeled set, or a
weighted-rule scheme where different escalators contribute different amounts. Full per-case
mistake lists are printed by both `evaluate` scripts.

Type classification (87.5% combined, 96% on the organizer set) is the strongest result —
phrase-level keyword matching generalizes reasonably well because most reports have 1-2
distinguishing phrases regardless of exact wording or English/Pidgin register.

## Design decisions worth calling out in the write-up

- **Reporter vs. Admin split**: Two views, one app. The reporter view (default, `/`) is a plain
  submit form — a reporter submits and sees only their own triage result, never anyone else's
  reports. The admin/triage view (`/#admin`) is passcode-gated and shows the full urgency-sorted
  queue with status controls. This is enforced server-side, not just hidden in the UI: `GET
  /api/reports/queue`, `GET /api/reports`, and the status-update endpoint all require an
  `x-admin-key` header matching `ADMIN_PASSCODE`; only submission is open to anyone
  (`backend/src/middleware/requireAdmin.js`). Be upfront if asked: this is a prototype-level
  shared passcode, not production auth (no per-user accounts, no session expiry, no
  rate-limiting) — a real deployment would need role-based accounts. **Change
  `ADMIN_PASSCODE` in `.env` before demoing**; the example value is intentionally not a secret.
- **Redaction**: regex/heuristic-based (email, phone, BVN/ID-length numbers, card numbers, and
  personal names after a title like "Dr." or a phrase like "my name is..."), applied
  before the cleaned text is ever shown on the triage queue. The raw, unredacted text is kept
  in the database but hidden behind a "Show raw report" toggle, for authorized staff only.
- **Dedup**: Jaccard similarity on tokenized text, restricted to same-type reports within a
  48-hour window (`backend/src/services/dedup.js`). Threshold and window are both named
  constants, easy to defend or tune live for judges.
- **Offline / power-cut behaviour**: the pipeline requires no external API calls or internet
  connection — everything (classification, redaction, dedup) runs locally in Node. The one
  dependency, MongoDB, can run locally; if it's unreachable the API fails closed with a clear
  error rather than silently losing reports. A production version would queue reports locally
  (e.g. IndexedDB / local file) and sync when connectivity returns — noted here as a scoped-out
  extension, not built for the prototype.
- **Explainability**: every classified report stores an `explanation` field naming the exact
  phrases that drove the decision — this is what's shown under each card in the dashboard.

## What's intentionally out of scope for the prototype

- Real per-user authentication/roles for the admin view (currently a single shared passcode —
  see "Reporter vs. Admin split" above; would need proper accounts for production).
- A learned model for severity (see accuracy discussion above).
- Full NER-based redaction (current redaction catches structured PII and names that follow a
  title or an identifying phrase; a bare name with no such lead-in won't be caught).
