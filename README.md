# NurQ

**NurQ turns the wait before a doctor's appointment into a structured medical history — so the doctor walks in already knowing why the patient is there.**

A patient checks in, answers a short guided conversation (by typing or by talking) about what's bringing them in, and by the time they sit down with the clinician, there's already a triaged, structured intake and a concise AI-written summary waiting on the doctor's screen. No paper clipboard, no re-explaining the same history for the third time, and no waiting for someone to type it all up.

> ⚠️ **Proof of concept**, built with synthetic data. Not a certified medical device, not HIPAA/GDPR-certified, and never a source of medical advice or diagnosis on its own — every summary is written for a clinician to read and verify, not to act on unsupervised. See [Disclaimer](#disclaimer).

---

## Why this exists

Intake is the same repetitive, time-consuming step at almost every clinic visit — and it's usually done on paper, or verbally, right before the patient is already anxious to be seen. That costs clinician time on data entry instead of care, and it's where symptoms genuinely get lost: a patient mentioning something concerning to the front desk doesn't reliably make it into the chart before the doctor walks in.

NurQ replaces that step with a conversational interview that a patient can complete on their own device while waiting — by voice or by text — and pairs it with a safety net that's always running in the background: every message is screened for red-flag symptoms in parallel with the interview itself, so something like "there's an elephant sitting on my chest" gets flagged exactly as fast as "I'm having chest pain," even though the patient never used the clinical term.

## What it does

- **Conversational intake interview** — an AI-guided interview collects the chief complaint, history of present illness, current medications, allergies, past medical history, family history, social history, and review of systems, one natural question at a time — by text or by voice.
- **Emergency detection that runs the whole time** — every single message is screened for red flags (chest pain, stroke signs, suicidal ideation, severe bleeding, and more) independently of what's being asked. The screen is deliberately tuned to over-flag rather than miss something: a false alarm is an acceptable cost, a missed emergency is not. If the screen itself ever fails to run, the session is flagged for manual review rather than silently treated as "clear."
- **Acuity-based triage** — every visit is classified CRITICAL / URGENT / SEMI-URGENT / ROUTINE / NON-CLINICAL, upgrade-only (a visit can get more urgent as new information comes in, never less), and the clinician's queue is sorted by that acuity automatically.
- **A doctor's dashboard built around the actual visit** — the day's queue sorted by urgency, a session view with the full structured history, an AI-generated clinical summary with flags for review, clinician notes, a verification workflow, prescriptions, and a returning patient's prior visits — all one click away, loaded only when a clinician actually opens that tab.
- **Continuity across visits** — a returning patient can say "same issue as last time" or "something new," and either way the doctor sees the full history, not a blank form.
- **A record of what was actually said** — every turn of the conversation and everything the AI extracted from it is kept, so a clinician (or an audit) can always see exactly where a piece of information in the chart came from.

## How it works

```
Patient app ──► FastAPI ──► Orchestrator ──► [ Emergency screen ─ runs in parallel with ─ Field extraction ]
                               │                        │
                               ▼                        ▼
                        State machine ──► Next question / spoken reply
                               │
                               ▼
                 PostgreSQL (sessions, transcripts, patient records)  ◄── Doctor app (queue, summary, notes)
```

A deterministic, plain-Python state machine — not the AI — decides what to ask next and when the interview is complete. The AI's job is narrower: phrase the next question naturally, pull structured fields out of a free-text answer, and separately, screen every message for anything safety-critical. Keeping that control flow out of the model's hands means the one thing that must never be wrong — noticing an emergency, or knowing when to stop asking questions — never depends on a model behaving predictably.

The AI layer itself is provider-agnostic (interfaces + dependency injection): four distinct roles — field extraction, emergency detection, question generation, and summarization — currently run on Groq-hosted Llama 3.x models, with Whisper for speech-to-text and neural text-to-speech for spoken replies. Swapping providers is a config change, not a rewrite.

## Applications

| App | Stack | Role |
|-----|-------|------|
| [Backend/](Backend/) | Python, FastAPI, PostgreSQL (JSONB), SQLAlchemy (async), Alembic, Redis, Pydantic | REST API, AI orchestration, triage, persistence |
| [Patient-Frontend/](Patient-Frontend/) | React, TypeScript, Vite, Tailwind CSS, TanStack Query, React Router | Patient check-in and the guided interview (text + voice) |
| [Doctor-Frontend/](Doctor-Frontend/) | React, TypeScript, Vite, Tailwind CSS, TanStack Query | The clinician's queue, session review, and AI summary |

## Getting started

**Prerequisites**: Python 3.12+, Node 18+, Docker (for PostgreSQL), a Groq API key (free tier).

```bash
# Backend
cd Backend
docker-compose up -d                 # PostgreSQL
python -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
cp .env.example .env                 # set DATABASE_URL, GROQ_API_KEY
alembic upgrade head
uvicorn app.main:app --reload        # http://localhost:8000/docs

# Patient app
cd Patient-Frontend && npm install && npm run dev    # http://localhost:5173

# Doctor app
cd Doctor-Frontend && npm install && npm run dev     # http://localhost:5174
```

### Running the backend tests

```bash
cd Backend
tests/run_tests.sh              # everything, including live db/redis pings
tests/run_tests.sh unit         # fast, no external services required
tests/run_tests.sh integration  # API-level tests against an in-memory DB
tests/run_tests.sh regression   # guards for specific previously-fixed bugs
tests/run_tests.sh connections  # only the live db/redis/Groq/TTS pings
```

`connections` needs Postgres and Redis actually reachable (and a valid `GROQ_API_KEY`) — everything else runs offline against an in-memory database.

## Project plans & roadmap

Design documents live in [Plan/](Plan/):

- [backend-plan.md](Plan/backend-plan.md) — API, orchestration pipeline, provider abstraction
- [frontend-planning.md](Plan/frontend-planning.md) — both frontend architectures
- [data-layer-split-plan.md](Plan/data-layer-split-plan.md) — normalized patient records, per-section clinician APIs, prescriptions, multi-clinician support, cached AI summaries

Deferred beyond this stage: full OAuth/RBAC, rate limiting, WebSocket streaming, PDF/FHIR export, EHR/EMR integration, prescription e-signing.

## Disclaimer

This software is a **technology demonstration**. It does not provide medical advice, diagnosis, or treatment recommendations, and it must not be used with real patient data or protected health information (PHI). All AI/speech calls run on free-tier APIs for development with synthetic data only. Production use in a clinical setting would require regulatory review, security hardening, compliance certification (e.g. HIPAA), and clinical validation.

---

*Maintained by Mrlionbyte. Issues and discussion welcome.*
