# Personal study plans: Gemini

`/plan` uses a Vercel Node function at `POST /api/study-plan`. The browser never talks to Gemini directly and never receives its key. No SDK or new dependency is needed.

## Configuration

Set **server-only** `GEMINI_API_KEY` in Vercel and redeploy. Never use a `VITE_` prefix for this secret or commit it. Optional `GEMINI_MODEL` defaults to the stable `gemini-3.5-flash-lite` with minimal thinking. Google restricts the older 2.5 models to existing active users; new projects can receive `404 NOT_FOUND` for them. An explicit legacy 2.5 override retains budget-based thinking. The function uses `SUPABASE_URL` / `SUPABASE_ANON_KEY` or the existing `VITE_SUPABASE_URL` / `VITE_SUPABASE_ANON_KEY`. These Supabase public keys are not Gemini secrets. No service-role key is used.

The `consume_plan_quota()` Supabase RPC must be deployed. It runs as the signed-in user, derives their identity from `auth.uid()`, atomically reserves one attempt, and returns a JSON boolean. The endpoint fails closed if the RPC is unavailable. The limit is three attempts per user per UTC day plus the site's shared daily limit; attempts which reach the model can count even when it fails. This is an application safety limit, not a guarantee of free provider usage. Google quotas/pricing/billing settings still apply. API keys and model availability must be managed in the owner's Google project.

## Data and privacy

Explicit consent is required. Only the chosen CEFR level, interface language, daily minutes, goal and optional wishes are sent to Google Gemini. The UI warns against entering personal/sensitive information and links Google's terms. Account identifiers, email, auth tokens, past scores and user history are not sent to Gemini. Request contents and keys are not logged by this code. Supabase receives its normal auth token and a quota reservation, not the learner's free text.

Only a validated completed plan and activity checkmarks are saved in browser local storage, namespaced by account ID. Goals and wishes are not persisted by the application. Another browser/device will not have the plan. Generated content may itself reflect the submitted text; users should still avoid private data. Removing a saved plan clears its local copy. Switching accounts cannot display the previous account's plan.

## Safety and error handling

- POST JSON only; request <=4 KiB, goal/wishes <=1000 characters each.
- Signed-in Supabase users only; no anonymous guest generation.
- Fixed Google endpoint, server-controlled model and trusted `*.supabase.co` URL.
- One 25-second deadline for authentication, quota and model request together.
- Structured output: exactly seven ordered days, one to three supported learning activities/day, requested level, no daily time-budget overrun. Bounded text, output <=64 KiB and HTML-escaped rendering.
- Missing key returns an honest `503 ai_not_configured`; no placeholder plan is presented as AI output.
- Provider details and errors are not forwarded. No automatic retries that could silently increase cost.
- This is a practice guide, not a CEFR placement test, guarantee or automatic level promotion.

## Official references checked 2026-10-14

- [Gemini 3.5 Flash-Lite stable model](https://ai.google.dev/gemini-api/docs/models/gemini-3.5-flash-lite)
- [Model availability and legacy restrictions](https://ai.google.dev/gemini-api/docs/models)
- [Thinking controls](https://ai.google.dev/gemini-api/docs/thinking)
- [Structured output](https://ai.google.dev/gemini-api/docs/generate-content/structured-output)
- [GenerateContent API reference](https://ai.google.dev/api/generate-content) (`responseMimeType` and `responseJsonSchema` aliases remain supported for the stable model; model output is independently revalidated)
- [Server-side key handling](https://ai.google.dev/gemini-api/docs/api-key)
- [Gemini API terms and data use](https://ai.google.dev/gemini-api/terms)
