# development.md — Wayfinder: Build Guide

> **Purpose:** Hand this file to Google AI Studio (Build mode) together with the Stitch-generated UI. It tells the builder exactly what to create, in what structure, with which keys, and in what order.
> Companion files: `design.md` (UI spec), `architecture-system.md` (system diagrams), `architecture-ui.md` (user-flow diagrams).

---

## 1. What we are building

A **voice AI travel concierge** that completes a real multi-step task end to end:

| Hackathon stage | What Wayfinder does |
|---|---|
| **Initiate** | User speaks a goal over Agora RTC. Agora Conversational AI handles ASR and turn-taking. Murf Falcon speaks the replies. |
| **Plan** | A Planner agent turns the goal into a dependency graph of steps (what can run in parallel, what must wait). |
| **Execute** | Researcher runs calendar, flights, hotels and weather tools in parallel. Booker, Scheduler and Follow-up agents run later steps. |
| **Adapt** | Sold-out option, API error or user change triggers re-planning. Booking always waits for a human approval (voice or button). |
| **Confirm and follow up** | Verifies the booking record, creates Google Calendar events, emails the confirmation, schedules reminders, and later watches for disruptions and reschedules. |

**Demo goal sentence (use this in the live demo):**
*"Plan me a weekend in Goa next week, under forty thousand rupees. I have a standup on Friday at four."*
(Date context: today is Fri 20 Nov 2026, so "next week" is Fri 27 – Sun 29 Nov 2026.)

---

## 2. Design decisions: simple surface, deep architecture

### 2.1 What we use, and why

| Piece | Choice | Why |
|---|---|---|
| Voice transport, ASR, turn-taking, interruption | **Agora RTC + Agora Conversational AI Engine** | Required by the challenge. Handles barge-in and VAD for us. |
| Voice output | **Murf Falcon TTS** (`vendor: "murf"`, `model: "FALCON"`) | Required. Configured inside the Agora agent's `tts` block. |
| Brain | **Gemini via Google AI Studio API key** (`gemini-2.5-flash` default, configurable) | Fast, supports function calling, same ecosystem as the builder. |
| Agent runtime | **Custom TypeScript loop** (no LangChain or LangGraph) | Fewer moving parts, full control over streaming and latency. |
| Backend | **Node + Express + TypeScript**, single service | One deploy, easy on Cloud Run. |
| Frontend | **React + Vite + TypeScript + Tailwind**, `agora-rtc-sdk-ng` | Matches the Stitch output. |
| Database, auth, realtime, scheduler | **Supabase** (Postgres, Auth, Realtime, `pg_cron`) | One platform for all state, live UI updates, and reminders. |
| Calendar | **Google Calendar API** (OAuth) | A real, verifiable side effect. |
| Email | **Resend** | A real, verifiable side effect. |
| Weather | **Open-Meteo** | Free, no key. |
| Flights and hotels | **Pluggable provider.** Default is a **seeded mock provider**. Optional real flights via Duffel test mode. | See 2.3. |

### 2.2 What we deliberately do NOT use

| Skipped | Reason |
|---|---|
| **MCP server** | Not required for the demo. Instead the tool registry uses MCP-compatible schemas (name, description, JSON-schema input), so it can be exposed as an MCP server later with a thin wrapper. Treat as a stretch goal. |
| Redis, queues, Kafka | `pg_cron` plus a cron endpoint is enough for reminders and disruption checks. |
| Vector DB or RAG | Preferences are small structured data. No retrieval problem to solve. |
| LangChain, CrewAI, AutoGen | Our multi-agent flow is a short, explicit pipeline. A framework adds latency and opacity. |
| Separate microservices | One backend with clean module boundaries is simpler to build, demo and debug. |

### 2.3 Important: travel API reality check
Amadeus Self-Service (the usual free flights and hotels sandbox) has paused new registrations and announced its decommissioning on 17 July 2026, so **do not depend on it**. The travel layer is therefore built behind a `TravelProvider` interface:

- `mock-travel.ts` (default, `USE_MOCK_TRAVEL=true`): deterministic, realistic catalogue for BLR→GOI and a few other routes. It includes a **deliberately sold-out first-choice hotel** so the Adapt stage always demonstrates recovery, plus a **chaos toggle** that forces a failure on demand.
- `duffel.ts` (optional stretch): real flight search in Duffel test mode. Verify access before relying on it. Hotels stay mock.

Everything else (Agora, Murf, Gemini, Supabase, Google Calendar, Resend, Open-Meteo) is real. The *verifiable outcomes* are real: database records, a calendar event in the user's actual Google Calendar, and an email in their inbox. State this honestly in the demo: "booking provider is a sandbox, the calendar and email are live."

### 2.4 The key architectural trick
Agora's Conversational AI Engine calls an **LLM over HTTP using an OpenAI-compatible Chat Completions endpoint**. We point it at **our own backend** (`/api/llm/chat/completions`). That endpoint is the entire agent brain: it runs tool calling, multi-agent orchestration and the approval gate, then streams the final spoken reply back. Agora turns that text into speech through Murf Falcon. This means:

- No custom audio code. Agora and Murf handle everything audio.
- All intelligence, tools and safety rules live in one server-side place.
- The UI gets live plan and tool updates through Supabase Realtime, independent of the audio path.

---

## 3. Accounts and credentials I need from you

Give me these and I will wire them into `.env`. Items marked **Required** are mandatory for the demo.

| # | Service | What to create | Env variables | Required |
|---|---|---|---|---|
| 1 | **Agora** | Project with **App Certificate enabled**; enable **Conversational AI**; get RESTful **Customer ID and Secret** | `AGORA_APP_ID`, `AGORA_APP_CERTIFICATE`, `AGORA_CUSTOMER_ID`, `AGORA_CUSTOMER_SECRET` | Required |
| 2 | **Murf AI** | API key and a voice id (default `Matthew`) | `MURF_API_KEY`, `MURF_VOICE_ID` | Required |
| 3 | **Google AI Studio** | Gemini API key | `GEMINI_API_KEY`, `GEMINI_MODEL` | Required |
| 4 | **Supabase** | New project; copy URL, anon key, service-role key | `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY` | Required |
| 5 | **Google Cloud** | OAuth client (Web). Enable Calendar API. Add your test user. Redirect URI = `PUBLIC_BASE_URL/api/calendar/oauth/callback` | `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET` | Required |
| 6 | **Resend** | API key and a verified sender (or use `onboarding@resend.dev` for testing) | `RESEND_API_KEY`, `EMAIL_FROM` | Required |
| 7 | **Duffel** (optional) | Test-mode access token | `DUFFEL_ACCESS_TOKEN` | Optional |
| 8 | App secrets (I generate these) | Random strings | `LLM_SHARED_SECRET`, `CRON_SECRET`, `TOKEN_ENC_KEY` | Generated |
| 9 | Public URL | Cloud Run URL after deploy, or an ngrok URL while developing (Agora's cloud must reach your LLM endpoint over public HTTPS) | `PUBLIC_BASE_URL` | Required |

### `.env.example`
```bash
# ---------- App ----------
NODE_ENV=development
PORT=8080
PUBLIC_BASE_URL=https://your-public-url        # must be public HTTPS (ngrok or Cloud Run)
LLM_SHARED_SECRET=change-me                    # Agora sends this as the LLM api_key
CRON_SECRET=change-me
TOKEN_ENC_KEY=32-byte-base64-key               # encrypts Google refresh tokens at rest

# ---------- Agora ----------
AGORA_APP_ID=
AGORA_APP_CERTIFICATE=
AGORA_CUSTOMER_ID=
AGORA_CUSTOMER_SECRET=
AGORA_AGENT_UID=0

# ---------- Murf (TTS inside Agora) ----------
MURF_API_KEY=
MURF_VOICE_ID=Matthew
MURF_BASE_URL=wss://global.api.murf.ai/v1/speech/stream-input
MURF_LOCALE=en-US

# ---------- LLM ----------
GEMINI_API_KEY=
GEMINI_MODEL=gemini-2.5-flash

# ---------- Supabase ----------
SUPABASE_URL=
SUPABASE_SERVICE_ROLE_KEY=
VITE_SUPABASE_URL=
VITE_SUPABASE_ANON_KEY=

# ---------- Google Calendar ----------
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=

# ---------- Email ----------
RESEND_API_KEY=
EMAIL_FROM=Wayfinder <onboarding@resend.dev>

# ---------- Travel ----------
USE_MOCK_TRAVEL=true
DUFFEL_ACCESS_TOKEN=
CHAOS_MODE=off                                 # off | hotel_sold_out | flight_api_error | calendar_error
```

---

## 4. Repository structure

**Total: 96 application files + 4 documentation files = 100 files.** (The build tool may add or adjust config files such as `tsconfig` or the Tailwind config; treat the count as exact for source files and approximate for config.)

```
wayfinder/
├── package.json
├── tsconfig.json
├── vite.config.ts
├── tailwind.config.ts
├── postcss.config.js
├── index.html
├── .env.example
├── .gitignore
│
├── docs/                                  # 4 documentation files
│   ├── design.md
│   ├── development.md
│   ├── architecture-system.md
│   └── architecture-ui.md
│
├── supabase/                              # 4 files
│   ├── migrations/
│   │   ├── 001_schema.sql                 # tables
│   │   ├── 002_rls.sql                    # row level security
│   │   └── 003_realtime_and_cron.sql      # realtime publication + pg_cron jobs
│   └── seed.sql                           # demo user prefs, sample trip
│
├── shared/                                # 2 files, imported by both server and client
│   ├── types.ts                           # Plan, PlanStep, ToolCall, Approval, Booking...
│   └── events.ts                          # realtime event names and payload shapes
│
├── server/                                # 44 files
│   ├── index.ts                           # Express bootstrap, routes, static serve
│   ├── config/
│   │   └── env.ts                         # typed, validated env (zod)
│   ├── lib/
│   │   ├── supabase.ts                    # service-role client
│   │   ├── logger.ts                      # structured logs with session id
│   │   └── errors.ts                      # ToolError, ApprovalRequiredError, RetryableError
│   ├── middleware/
│   │   └── auth.ts                        # verifies Supabase JWT; verifies LLM_SHARED_SECRET; CRON_SECRET
│   ├── routes/
│   │   ├── agora.routes.ts                # POST /api/agora/session/start | /stop
│   │   ├── llm.routes.ts                  # POST /api/llm/chat/completions (called by Agora)
│   │   ├── approvals.routes.ts            # POST /api/approvals/:id/resolve
│   │   ├── trips.routes.ts                # GET /api/trips, GET /api/trips/:id
│   │   ├── calendar.routes.ts             # GET /api/calendar/oauth/url | /callback
│   │   ├── demo.routes.ts                 # POST /api/demo/disruption | /chaos
│   │   └── cron.routes.ts                 # POST /api/cron/reminders | /disruptions
│   ├── agora/
│   │   ├── token.ts                       # RtcTokenBuilder (user and agent tokens)
│   │   └── agent.ts                       # build join payload, call Agora REST join/leave
│   ├── agents/
│   │   ├── orchestrator.ts                # main loop: Gemini + tool calls + streaming
│   │   ├── prompts.ts                     # all system prompts in one place
│   │   ├── planner.agent.ts               # goal -> plan graph (structured output)
│   │   ├── research.agent.ts              # parallel tool fan-out + ranking
│   │   ├── booking.agent.ts               # propose -> approval -> confirm
│   │   ├── scheduler.agent.ts             # calendar events + conflict handling
│   │   ├── followup.agent.ts              # email, reminders, disruption handling
│   │   ├── approval-gate.ts               # the only code allowed to flip an approval
│   │   ├── memory.ts                      # session state, prefs, running summary
│   │   └── stream.ts                      # OpenAI-compatible SSE writer
│   ├── tools/
│   │   ├── registry.ts                    # tool list, JSON schemas, dispatcher, logging
│   │   ├── get_user_context.ts
│   │   ├── check_calendar.ts
│   │   ├── search_flights.ts
│   │   ├── search_hotels.ts
│   │   ├── get_weather.ts
│   │   ├── propose_booking.ts
│   │   ├── confirm_booking.ts
│   │   ├── create_calendar_event.ts
│   │   ├── send_confirmation.ts
│   │   ├── schedule_reminders.ts
│   │   └── reschedule_trip.ts
│   ├── providers/
│   │   ├── mock-travel.ts                 # default provider, seeded data, chaos toggle
│   │   ├── duffel.ts                      # optional real flights (test mode)
│   │   ├── google-calendar.ts             # OAuth, freebusy, events insert and update
│   │   ├── resend.ts                      # HTML confirmation email
│   │   └── open-meteo.ts                  # forecast
│   └── jobs/
│       ├── reminders.job.ts               # send due reminders
│       └── disruption.job.ts              # detect changes, create disruption, notify
│
└── src/                                   # 38 files (frontend)
    ├── main.tsx
    ├── App.tsx                            # router and protected routes
    ├── index.css                          # tokens from design.md as CSS variables
    ├── lib/
    │   ├── supabase.ts                    # anon client
    │   ├── api.ts                         # typed fetch wrapper with auth header
    │   └── agora.ts                       # RTC client create, join, publish, subscribe
    ├── hooks/
    │   ├── useAuth.ts
    │   ├── useVoiceSession.ts             # start, stop, mute, connection state
    │   ├── useRealtimeSession.ts          # subscribes to Supabase Realtime for a session
    │   └── useTrips.ts
    ├── store/
    │   └── session.store.ts               # Zustand: orb state, plan, tool calls, approval
    ├── pages/                             # 9 pages (match design.md)
    │   ├── LandingPage.tsx
    │   ├── AuthPage.tsx
    │   ├── OnboardingPage.tsx
    │   ├── DashboardPage.tsx
    │   ├── ConciergePage.tsx              # hero screen
    │   ├── TripDetailPage.tsx
    │   ├── DisruptionPage.tsx
    │   ├── ActivityPage.tsx
    │   └── SettingsPage.tsx
    └── components/
        ├── layout/   AppShell.tsx · Sidebar.tsx · BottomNav.tsx
        ├── voice/    VoiceOrb.tsx · TranscriptPanel.tsx · MicControls.tsx
        ├── agent/    PlanTimeline.tsx · ToolCallFeed.tsx · ApprovalCard.tsx
        ├── travel/   OptionCard.tsx · ComparisonTable.tsx · ItineraryTimeline.tsx · BookingConfirmationCard.tsx
        └── ui/       Button.tsx · Card.tsx · Badge.tsx · Toast.tsx · Skeleton.tsx
```

**File count check:** root 8 + supabase 4 + shared 2 + server 44 + src 38 = **96**, plus 4 docs = **100**.

---

## 5. Database (Supabase)

### 5.1 Schema (`001_schema.sql`, condensed)
```sql
create extension if not exists "pgcrypto";

create table profiles (
  id uuid primary key references auth.users on delete cascade,
  full_name text, home_city text, home_airport text default 'BLR',
  created_at timestamptz default now()
);

create table travel_preferences (
  user_id uuid primary key references profiles(id) on delete cascade,
  default_budget numeric, currency text default 'INR',
  cabin text default 'economy', hotel_stars int default 4,
  interests text[] default '{}', avoid text[] default '{}'
);

create table calendar_connections (
  user_id uuid primary key references profiles(id) on delete cascade,
  provider text default 'google', calendar_id text default 'primary',
  refresh_token_enc text not null, connected_at timestamptz default now()
);

create table voice_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references profiles(id) on delete cascade,
  channel text not null, agent_id text,
  status text default 'active',               -- active | ended | failed
  started_at timestamptz default now(), ended_at timestamptz
);

create table messages (
  id uuid primary key default gen_random_uuid(),
  session_id uuid references voice_sessions(id) on delete cascade,
  role text not null check (role in ('user','assistant')),
  content text not null, created_at timestamptz default now()
);

create table trips (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references profiles(id) on delete cascade,
  title text, destination text, start_date date, end_date date,
  budget numeric, total_cost numeric,
  status text default 'planning',             -- planning | booked | changed | completed | cancelled
  created_at timestamptz default now()
);

create table plans (
  id uuid primary key default gen_random_uuid(),
  session_id uuid references voice_sessions(id) on delete cascade,
  trip_id uuid references trips(id),
  goal text, status text default 'running', created_at timestamptz default now()
);

create table plan_steps (
  id uuid primary key default gen_random_uuid(),
  plan_id uuid references plans(id) on delete cascade,
  ordinal int, key text, title text, agent text,
  depends_on text[] default '{}',
  status text default 'pending',  -- pending | running | done | failed | adapting | awaiting_approval | skipped
  result_summary text, started_at timestamptz, finished_at timestamptz
);

create table tool_calls (
  id uuid primary key default gen_random_uuid(),
  session_id uuid references voice_sessions(id) on delete cascade,
  plan_step_id uuid references plan_steps(id),
  tool text not null, args jsonb, result jsonb,
  status text default 'running',              -- running | ok | error
  latency_ms int, error text, created_at timestamptz default now()
);

create table approvals (
  id uuid primary key default gen_random_uuid(),
  session_id uuid references voice_sessions(id) on delete cascade,
  trip_id uuid references trips(id),
  summary text, payload jsonb not null,       -- full proposed bookings and side effects
  total_cost numeric,
  status text default 'pending',              -- pending | approved | rejected | expired | consumed
  resolved_via text,                          -- ui | voice
  expires_at timestamptz default (now() + interval '5 minutes'),
  resolved_at timestamptz, created_at timestamptz default now()
);

create table bookings (
  id uuid primary key default gen_random_uuid(),
  trip_id uuid references trips(id) on delete cascade,
  approval_id uuid references approvals(id),
  type text check (type in ('flight','hotel')),
  provider text, provider_ref text, details jsonb, price numeric,
  status text default 'confirmed',            -- confirmed | changed | cancelled
  idempotency_key text unique not null, created_at timestamptz default now()
);

create table itinerary_items (
  id uuid primary key default gen_random_uuid(),
  trip_id uuid references trips(id) on delete cascade,
  booking_id uuid references bookings(id),
  kind text, title text, location text,
  starts_at timestamptz, ends_at timestamptz,
  calendar_event_id text, status text default 'scheduled'
);

create table reminders (
  id uuid primary key default gen_random_uuid(),
  trip_id uuid references trips(id) on delete cascade,
  user_id uuid references profiles(id) on delete cascade,
  remind_at timestamptz not null, message text, sent_at timestamptz
);

create table disruptions (
  id uuid primary key default gen_random_uuid(),
  trip_id uuid references trips(id) on delete cascade,
  booking_id uuid references bookings(id),
  type text, detail jsonb, status text default 'open',   -- open | resolved
  detected_at timestamptz default now()
);

create table notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references profiles(id) on delete cascade,
  trip_id uuid references trips(id),
  type text, title text, body text,
  read_at timestamptz, created_at timestamptz default now()
);
```

### 5.2 Security (`002_rls.sql`)
- Enable RLS on every table.
- Policy pattern: users can `select` rows where `user_id = auth.uid()`, or where the row belongs to a session, trip or plan they own (join through `voice_sessions.user_id` or `trips.user_id`).
- Users can `update` only `profiles`, `travel_preferences`.
- **All agent writes use the server's service-role key.** Clients never write to `approvals`, `bookings`, `tool_calls` directly. Approval resolution goes through `POST /api/approvals/:id/resolve`.

### 5.3 Realtime and cron (`003_realtime_and_cron.sql`)
- Add to `supabase_realtime` publication: `messages`, `plan_steps`, `tool_calls`, `approvals`, `bookings`, `itinerary_items`, `notifications`, `disruptions`.
- `pg_cron` + `pg_net`: every minute `POST {PUBLIC_BASE_URL}/api/cron/reminders`, every 5 minutes `POST /api/cron/disruptions`, both with `Authorization: Bearer CRON_SECRET`.
- Add a cron to mark `approvals` past `expires_at` as `expired`.

---

## 6. Backend API surface

| Method and path | Caller | Purpose |
|---|---|---|
| `POST /api/agora/session/start` | Frontend (JWT) | Create `voice_sessions` row, generate user RTC token, call Agora `join` to start the agent, return `{appId, channel, token, uid, sessionId}` |
| `POST /api/agora/session/stop` | Frontend (JWT) | Call Agora `leave`, mark session ended |
| `POST /api/llm/chat/completions?sid=…` | **Agora Engine** (Bearer `LLM_SHARED_SECRET`) | OpenAI-compatible streaming endpoint. Runs the agent loop. |
| `POST /api/approvals/:id/resolve` | Frontend (JWT) | Body `{decision: "approve" \| "reject"}`. The UI path of human approval. |
| `GET /api/trips`, `GET /api/trips/:id` | Frontend | Dashboard and trip detail |
| `GET /api/calendar/oauth/url`, `GET /api/calendar/oauth/callback` | Frontend / Google | Connect calendar |
| `POST /api/demo/disruption` | Frontend (dev only) | Simulate flight delay for a trip |
| `POST /api/demo/chaos` | Frontend (dev only) | Set `CHAOS_MODE` for the session |
| `POST /api/cron/reminders`, `POST /api/cron/disruptions` | `pg_cron` | Follow-up jobs |

### 6.1 Agora agent start (`server/agora/agent.ts`)
Call Agora's Conversational AI REST `join` endpoint (Basic auth with Customer ID and Secret; check the exact path and any newer auth option in the current Agora quickstart before coding). Payload shape:

```jsonc
{
  "name": "wayfinder-<sessionId>",
  "properties": {
    "channel": "<channel>",
    "token": "<agent RTC token>",
    "agent_rtc_uid": "0",
    "remote_rtc_uids": ["<user uid>"],
    "enable_string_uid": false,
    "idle_timeout": 120,
    "llm": {
      "url": "<PUBLIC_BASE_URL>/api/llm/chat/completions?sid=<sessionId>",
      "api_key": "<LLM_SHARED_SECRET>",
      "system_messages": [{ "role": "system", "content": "<short voice persona, the real prompt lives server-side>" }],
      "greeting_message": "Hi, I'm your Wayfinder concierge. Where would you like to go?",
      "failure_message": "Sorry, I hit a snag. Could you say that again?",
      "max_history": 10,
      "params": { "model": "wayfinder-orchestrator" }
    },
    "asr": { "language": "en-US" },
    "tts": {
      "vendor": "murf",
      "params": {
        "api_key": "<MURF_API_KEY>",
        "base_url": "wss://global.api.murf.ai/v1/speech/stream-input",
        "voiceId": "<MURF_VOICE_ID>",
        "locale": "en-US",
        "rate": 0, "pitch": 0,
        "model": "FALCON",
        "sample_rate": 24000
      }
    }
  }
}
```
The `tts` block matches Agora's documented Murf vendor parameters. The `agora-agents` SDK (`Agent`, `MurfTTS`) can be used instead of raw REST if the builder prefers.

Session identity trick: the `sid` query parameter on the LLM URL is how the backend knows which session and user each LLM call belongs to.

---

## 7. The agent brain

### 7.1 Roles (multi-agent orchestration, kept deliberately lean)

| Agent | Type | Job |
|---|---|---|
| **Concierge (Orchestrator)** | LLM, streaming, tool calling | Talks to the user. Decides when to plan, research, propose, confirm. Owns the voice. |
| **Planner** | LLM, one structured-output call | Converts the goal into a plan graph: steps, owner agent, `depends_on`. Re-plans when something fails. |
| **Researcher** | Code fan-out plus one LLM ranking call | Runs `check_calendar`, `search_flights`, `search_hotels`, `get_weather` **in parallel** with `Promise.allSettled`, then ranks options against budget, preferences and calendar. |
| **Booker** | Deterministic, guarded | `propose_booking` → waits on approval → `confirm_booking`. No LLM in the money path. |
| **Scheduler** | Deterministic | Creates calendar events for each booked item. Handles conflicts. |
| **Follow-up** | Deterministic plus small LLM for wording | Sends confirmation email, schedules reminders, later handles disruptions via `reschedule_trip`. |

Only the Concierge speaks. Other agents write status into `plan_steps` and `tool_calls`, which the UI shows live.

### 7.2 Tools (11) and what each guarantees

| Tool | Input (key fields) | Output | Notes |
|---|---|---|---|
| `get_user_context` | none | prefs, home airport, budget default, calendar connected? | Always the first call. |
| `check_calendar` | `start`, `end` | busy blocks, conflicts | Real Google freebusy. If not connected, returns `calendar_unavailable` and the agent says so. |
| `search_flights` | `origin`, `dest`, `depart_date`, `return_date`, `max_price` | ranked offers | Provider adapter. |
| `search_hotels` | `city`, `check_in`, `check_out`, `max_per_night`, `stars` | offers (may include `sold_out`) | Mock includes a sold-out first choice. |
| `get_weather` | `city`, `start`, `end` | daily forecast | Open-Meteo. |
| `propose_booking` | selected flight ids and hotel id | `approval_id`, total, side-effect list | **Creates the Approval Card.** Never books. |
| `confirm_booking` | `approval_id` | booking records, provider refs | **Refuses unless approval is `approved` and unexpired.** Idempotent. |
| `create_calendar_event` | `booking_id` list | event ids | Writes to Google Calendar, stores `calendar_event_id`. |
| `send_confirmation` | `trip_id` | email id | Resend email with itinerary. |
| `schedule_reminders` | `trip_id` | reminder rows | Default: 24h before departure and 3h before check-in. |
| `reschedule_trip` | `trip_id`, `disruption_id`, `choice` | updated bookings and events | Used after a disruption, still approval-gated if money changes. |

Planner-internal functions `create_plan` and `update_step` write `plans` and `plan_steps` and are not exposed to the voice model as tools.

### 7.3 Orchestrator loop (pseudocode)
```ts
async function handleTurn(sessionId, messages, res /* SSE */) {
  const ctx = await memory.load(sessionId);            // prefs, plan, pending approval
  stream.open(res);

  // 1. Speak immediately so the voice never goes silent
  stream.say(res, fillerFor(lastUserMessage));         // "Sure, let me check that for you."

  // 2. Agent loop (max 6 iterations)
  for (let i = 0; i < 6; i++) {
    const reply = await gemini.generate({ system: prompts.concierge(ctx), messages, tools: registry.declarations });
    if (reply.text) stream.say(res, reply.text);       // stream spoken text as it arrives
    if (!reply.toolCalls.length) break;

    const results = await registry.runMany(reply.toolCalls, ctx);   // logs to tool_calls, updates plan_steps
    messages.push(reply, ...results.asToolMessages());
    if (results.some(r => r.kind === 'awaiting_approval')) {
      stream.say(res, approvalPrompt(results));        // "I have a plan ready. Approve on screen or say yes."
      break;                                           // stop and wait for the human
    }
  }
  stream.close(res);
  await memory.save(sessionId, ctx);
}
```

### 7.4 Plan graph for the demo goal
```
1 understand_goal (Planner)
2a check_calendar   ┐
2b search_flights   ├─ run in parallel (Researcher) ── depends_on: 1
2c search_hotels    │
2d get_weather      ┘
3 compare_and_recommend (Researcher + Concierge)      depends_on: 2a 2b 2c 2d
4 get_approval (Booker)                               depends_on: 3   ← human gate
5 book (Booker)                                       depends_on: 4
6a create_calendar_events (Scheduler)  ┐
6b send_confirmation (Follow-up)       ├─ parallel    depends_on: 5
6c schedule_reminders (Follow-up)      ┘
7 verify_and_summarise (Concierge)                    depends_on: 6a 6b 6c
```

### 7.5 Approval gate (human-in-the-loop, enforced in code)
```
pending ──(UI click Approve)────────┐
        ──(voice "yes, book it")────┼──> approved ──(confirm_booking)──> consumed
        ──(UI click / voice "no")───┴──> rejected ──> Planner re-plans
        ──(5 min)─────────────────────> expired
```
Rules:
1. `confirm_booking` accepts only `approved` and unexpired approvals, then marks them `consumed` (single use).
2. **The LLM can never set an approval to `approved` itself.** Only `approval-gate.ts` can, and only from (a) the authenticated UI endpoint, or (b) the voice path, where the server independently checks that the **latest user transcript turn** matches an affirmative intent (small classifier or regex plus a Gemini yes/no call) while an approval is pending.
3. Booking uses an `idempotency_key` (`approval_id + item`) so retries never double-book.

### 7.6 Error recovery policy

| Failure | Detection | Recovery |
|---|---|---|
| Hotel sold out | provider returns `sold_out` | Step goes to `adapting`, Planner picks next-ranked option inside budget, Concierge says so briefly, flow continues. |
| Over budget after change | total above `budget` | Concierge offers a cheaper hotel or different flight times before proposing. |
| Tool timeout or 5xx | exception or >8s | One retry with backoff, then fallback provider (mock), then tell the user plainly. |
| Calendar not connected or errors | `calendar_unavailable` | Continue without conflict check, say so, add the events later. Booking proceeds only if the user agrees. |
| Calendar conflict | busy block overlaps | Shift flight time (for example evening departure after the 4pm standup) and explain. |
| Approval rejected or "change it" | status `rejected` | Re-plan with the user's change, produce a new approval. |
| Partial booking (flight ok, hotel failed) | one booking row missing | Do **not** leave the user half-booked: roll back via provider cancel (mock) or propose a fix, and log it. |
| LLM error | Gemini exception | Stream the configured `failure_message` style apology and keep session alive. |

### 7.7 Voice-first prompt rules (put in `prompts.ts`)
- Replies are **short spoken sentences**. No markdown, no lists, no emojis.
- Say money naturally: "forty-eight fifty rupees", not "₹4,850".
- Never read more than three options aloud. Say "details are on your screen."
- Before any slow tool call, speak one short filler sentence.
- Never claim an action happened unless a tool result confirms it.
- Always ask for approval before spending money, using the Approval Card.
- When a plan step fails, explain it in one sentence and state what you are trying next.
- If the user interrupts, stop and handle the new request. Agora handles barge-in on the audio side.

### 7.8 Latency budget (for a natural conversation)
| Stage | Target |
|---|---|
| First spoken word after the user stops talking | ≤ 1.5 s (filler sentence is streamed first) |
| Parallel research fan-out | ≤ 3 s |
| Full recommendation spoken | ≤ 8 s |
| UI plan-step update after DB write | < 300 ms via Realtime |

---

## 8. Frontend wiring

- **Auth:** Supabase Auth (email and Google). `useAuth` guards all routes except `/` and `/auth`.
- **Start a session:** `useVoiceSession.start()` → `POST /api/agora/session/start` → `agora.ts` creates the `agora-rtc-sdk-ng` client, joins with the returned token, publishes the mic track, subscribes to the agent's audio.
- **Orb state:** derived from RTC volume indicator (user speaking), the agent's audio volume, and `plan_steps` status (thinking when any step is `running`). Stored in `session.store.ts`.
- **Live UI:** `useRealtimeSession(sessionId)` subscribes to Supabase Realtime filtered by `session_id` on `messages`, `plan_steps`, `tool_calls`, `approvals`, `bookings`. Each change updates the Zustand store, and components render from the store.
- **Approve button:** `POST /api/approvals/:id/resolve`.
- **Page to component mapping:** use the exact page names from `design.md` Section 6. Stitch output components should be dropped into `src/pages` and `src/components` with the same names.

---

## 9. Build order for Google AI Studio (prompts to run in sequence)

1. **Scaffold:** "Create the repo structure from Section 4 with empty typed files. Install deps: express, zod, @supabase/supabase-js, agora-token, agora-rtc-sdk-ng, zustand, react-router-dom, tailwindcss, googleapis, resend, @google/genai."
2. **Database:** "Create the three SQL migrations from Section 5 and the seed file."
3. **Auth and shell:** "Implement Supabase auth, `AppShell`, routing, and `AuthPage`, `LandingPage`, `OnboardingPage`, `SettingsPage` using the Stitch screens."
4. **Voice loop first (no tools yet):** "Implement `agora/token.ts`, `agora/agent.ts`, `/api/agora/session/*`, and a minimal `/api/llm/chat/completions` that streams a Gemini reply. Get a spoken round trip working with Murf." **Do not continue until this works.**
5. **Realtime UI:** "Implement `useRealtimeSession`, `session.store.ts`, `VoiceOrb`, `TranscriptPanel`, and persist `messages` from the LLM endpoint."
6. **Tools and providers:** "Implement the registry, all 11 tools, mock-travel with sold-out hotel and chaos toggle, Open-Meteo, Google Calendar and Resend providers."
7. **Agents:** "Implement planner, research (parallel), booking, scheduler, follow-up, approval-gate, and the orchestrator loop from 7.3."
8. **Workbench UI:** "Implement `PlanTimeline`, `ToolCallFeed`, `OptionCard`, `ComparisonTable`, `ApprovalCard`, `BookingConfirmationCard` and wire them into `ConciergePage`."
9. **After-booking:** "Implement `TripDetailPage`, `DashboardPage`, `ActivityPage`, reminders job, disruption job, `DisruptionPage`, and the demo routes."
10. **Harden:** "Add retries, idempotency keys, structured logging, input validation, and the checks in Section 10."

---

## 10. Verification checklist (what makes it "verifiable outcomes")

**Must pass before the demo:**
- [ ] Speak the demo goal. Hear Murf voice reply within about 1.5 s.
- [ ] Plan appears live, parallel steps run together.
- [ ] At least **two coordinated tool calls** visible in the Activity tab (it will be 4+).
- [ ] Hotel first choice returns `sold_out`; agent adapts without user help.
- [ ] Calendar conflict (Friday 4 PM standup) changes the recommended flight.
- [ ] Approval Card appears; saying "yes, book it" **and** clicking Approve both work.
- [ ] Try approving via a voice phrase when **no** approval is pending: nothing happens.
- [ ] `bookings` rows exist with provider refs.
- [ ] A real event appears in Google Calendar.
- [ ] A real email arrives in the inbox.
- [ ] Reminders rows exist; the reminder job sends one.
- [ ] **Simulate disruption** → banner appears → voice reschedule flow works.
- [ ] Reload the page mid-session: UI state recovers from the database.
- [ ] Set `CHAOS_MODE=flight_api_error`: agent retries, falls back, explains.

**Security checklist:** Service-role key only on server. Google refresh tokens encrypted with `TOKEN_ENC_KEY`. `/api/llm/*` requires `LLM_SHARED_SECRET`. `/api/cron/*` requires `CRON_SECRET`. Demo routes disabled when `NODE_ENV=production`. RLS on all tables.

---

## 11. Deployment

- **Runtime:** one container on **Google Cloud Run** (what AI Studio deploys to by default). Express serves the API and the built Vite app.
- **Local development:** run the server locally and expose it with `ngrok http 8080`. Put the ngrok URL in `PUBLIC_BASE_URL`. Agora's cloud must be able to reach `/api/llm/chat/completions`.
- **Cloud Run settings:** min instances 1 (avoids cold start during a live voice call), request timeout 300s (streaming), CPU always allocated.
- **Secrets:** use Cloud Run secret env vars, never commit `.env`.

---

## 12. Demo script (3 minutes, maps to the required flow)

1. **Initiate (0:00):** "Plan me a weekend in Goa next week, under forty thousand rupees. I have a standup on Friday at four."
2. **Plan (0:20):** Plan timeline appears. Narrate: "dependencies identified, four lookups run in parallel."
3. **Execute (0:30):** Activity tab shows calendar, flights, hotels, weather tool calls.
4. **Adapt (0:50):** Hotel sold out, agent switches, and the calendar conflict moves the flight to the evening. Then say: "Actually, make it a cheaper hotel." Agent adapts again.
5. **Approve (1:30):** Approval Card. Say "yes, book it."
6. **Confirm and follow up (1:50):** Ticket cards, calendar events appear (open Google Calendar), email arrives (show phone or inbox), reminders listed.
7. **After (2:20):** Click **Simulate delay**. Banner appears. Say "what are my options?" Agent proposes a fix, approves, updates the calendar.
8. **Close (2:50):** Show the Activity page: every action, who approved, and the payloads.

---

## 13. Known risks to check first

| Risk | Mitigation |
|---|---|
| Agora's REST path, auth style or LLM request format differs from this guide | Follow the current Agora Conversational AI quickstart for the exact `join` URL and auth. Everything else in this document is independent of that detail. |
| Agora cannot reach `localhost` | Always use a public HTTPS URL (ngrok or Cloud Run). |
| Voice latency feels slow | Stream a filler sentence first, keep Gemini on a Flash model, keep research parallel. |
| Gemini streaming plus tool calls complexity | Run tools internally and stream only spoken text. Never forward raw tool-call deltas to Agora. |
| Real travel API unavailable | Mock provider is the default, so the demo never depends on a third party. |
| Google OAuth app in "testing" mode | Add your demo Google account as a test user. |
