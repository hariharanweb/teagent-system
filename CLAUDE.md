# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm install
npm run build -w @teagent/shared   # REQUIRED before frontend/backend typecheck, test, or dev

npm run lint                       # eslint, all workspaces
npm run typecheck                  # tsc --noEmit, all workspaces
npm run test                       # vitest run, all workspaces

npm run dev:backend                # Express shim on :3000 (tsx watch src/localServer.ts)
npm run dev:frontend               # Vite on :5173
```

Single test file / single test:

```bash
npm run test -w @teagent/backend -- src/graphs/chatGraph.test.ts
npm run test -w @teagent/backend -- src/graphs/chatGraph.test.ts -t 'declines off_topic'
```

Fully offline stack (DynamoDB Local :8000 + MinIO :9100 via Docker):

```bash
npm run local:up
npm run dynamodb:setup -w @teagent/backend        # idempotent
npm run s3:setup -w @teagent/backend              # idempotent
SEED_PARENT_PASSWORD=… SEED_KID_PASSWORD=… npm run seed -w @teagent/backend
npm run local:down
```

Container data is ephemeral — after a restart, re-run both `:setup` scripts and `seed`. A real
`OPENAI_API_KEY` is still needed; there is no local substitute for the AI calls. There is no
self-serve signup: profiles come from `seed` locally, or `docs/deploy.md` §3 in a deployed env.

## Architecture

npm workspaces monorepo: `packages/shared` (zod contract) → `packages/backend` (Lambda handlers +
LangGraph) + `packages/frontend` (React SPA), deployed by `packages/infra` (CDK).

### Chapters are never stored server-side

This is the single most load-bearing design decision. The backend has no chapter table. A chapter
lives in `sessionStorage` (`chapterStore.ts`) and is durably persisted only by the user downloading
a JSON file and re-uploading it (`lib/fileIO.ts`, validated against `chapterFileSchema` on reload).
Consequences that constrain almost every change:

- `/chat/ask` and `/chapters/lesson-plan` receive the **entire chapter** in the request body, so
  size caps are correctness constraints, not polish: `MAX_TRANSLATION_LINES_PER_PAGE = 80`
  (enforced by truncation + a warning in `handlers/chapters/translate.ts`) and
  `MAX_PAGES_PER_CHAPTER = 15`.
- Changing the shape of `ChapterFile` breaks every saved file on users' disks. Bump
  `CHAPTER_FILE_FORMAT_VERSION` (`chapter.schema.ts`) — it is a `z.literal`, so old files then fail
  validation with a friendly error instead of half-loading.
- S3 uploads are staging only (1-day lifecycle rule); the image is fetched once during extraction.

### Narration audio is never stored server-side either

`/chapters/narrate` returns one base64 MP3 clip per line and keeps nothing. The browser
(`lib/narration/`) decodes the clips, adds pauses, re-encodes one CBR MP3 per page, and stores
Word timings in the MP3's ID3 tag. Audio lives in an in-memory store (`narrationStore`, too big for
sessionStorage), and the downloaded MP3 is the durable copy, reopened via `restoreNarration`. Word
timing inside a line is estimated: see `docs/adr/0001-*`. Domain terms are in `CONTEXT.md`.

### The shared contract

`packages/shared` is the source of truth and both other packages import it as a built package, so
**`npm run build -w @teagent/shared` after editing it** or downstream typechecks use stale `dist`.
It is ESM with `"moduleResolution": "Bundler"` — relative imports carry explicit `.js` extensions.

Adding a language is a one-line change to `LANGUAGES` in `languages.ts`; `LANGUAGE_CODES`,
the per-language line schema (`{meaning, wordByWordMeaning, [langCode]}`), the `anyTranslationLine`
union, and `promptName` interpolation in the prompts all derive from it. A translation line names
its language as a *field key*, and `chapterFileSchema`'s `superRefine` enforces that every line
carries the field matching the chapter's language.

### Backend

Handlers are thin: parse with a zod schema from shared → `getAuthContext(event)` →
`incrementAndCheckDailyUsage` → invoke a graph → `okResponse`. All are wrapped in
`withErrorHandling`, which converts `HttpError` subclasses (`lib/errors.ts` —
Unauthorized/Validation/NotFound/RateLimited) into responses; anything else becomes a 500.

Three LangGraph state machines in `src/graphs` (state annotations in `state.ts`). Extraction is
**two requests per page**, orchestrated by the client (`lib/extractPages.ts`): reading and
translating in one vision call made the model "correct" rare words (Kannada ವಠಾರ → ಪಟ್ಟಣ).

- `extractChapterGraph` (`/chapters/extract`) — fetch image URL → vision **transcription only**
  into sections of printed lines → self-repair retry (`MAX_EXTRACTION_ATTEMPTS = 2`).
- `translateChapterGraph` (`/chapters/translate`) — `splitSentences` splits the transcript into
  sentences **in code**; the text model returns only meanings, one per sentence, and the original
  text is attached from the transcript, so it can never be altered. Misalignment triggers one repair
  retry, then degrades to a warning → glossary. Failures append to `warnings[]` rather than throw.
- `chatGraph` — an LLM scope classifier gates the answer node; `on_topic` answers, anything else
  gets a canned decline. The classifier **fails closed**: unparseable classifier output is treated
  as `off_topic`. Keep this property when editing.

Model selection lives in `llm/openaiClients.ts`: vision `gpt-6-sol` at medium reasoning effort for
transcription (gpt-4.1/4o loop or invent text on Kannada; reasoning models reject `temperature`),
`gpt-4.1` for translation, the cheaper text model for glossary/chat/lesson plan, all env-overridable. Prompts are builder functions in `llm/prompts/*.prompt.ts`;
model output goes through `extractJson` (strips ``` fences) then a zod parse.

Secrets resolve via `auth/ssm.ts`: an env var wins (local `.env`), otherwise SSM Parameter Store at
`/teagent/{APP_ENV}/{name}`, cached at module scope for warm Lambdas. Daily per-profile,
per-feature usage counters live in the profiles table (`PROFILE#<id>` / `USAGE#<date>#<feature>`,
TTL'd) to bound OpenAI spend.

**Adding an endpoint requires three edits**: the handler, a `mount(...)` line in `localServer.ts`,
and a `LambdaNodeFn` + route in `packages/infra/src/stacks/api-stack.ts`. `localServer.ts` is a dev
shim that fakes the API Gateway v2 event shape and the JWT authorizer's `requestContext`; it is not
used in production, so it silently drifts if you skip it.

### Local AWS emulation

`profilesRepo.ts` and `s3Client.ts` need no special-casing — setting `DYNAMODB_ENDPOINT` /
`S3_ENDPOINT` points the real SDK clients at Docker. The one exception is `s3/presign.ts`: OpenAI's
vision API cannot reach a `localhost` MinIO URL, so when `S3_ENDPOINT` is set it reads the bytes and
inlines a base64 data URL, while real S3 uses a leaner presigned HTTPS URL.

### Frontend

React 19 + Vite + react-router, zustand stores (`authStore`, `chapterStore`) both persisted to
`sessionStorage` deliberately — a shared-device kid app. `api/client.ts` attaches the bearer token
and logs out globally on 401. Multi-page upload flows through `lib/extractPages.ts`, which extracts
files sequentially and returns partial success (pages that succeeded before the first failure) so a
blurry photo mid-batch doesn't discard the rest. `appendPages` clears any cached `lessonPlan`,
since it summarized the older page set.

### Infra

CDK app (`infra/src/bin/app.ts`) with `Data` → `Api` → `Frontend` stacks, per-env config in
`config/env.ts` (daily caps differ dev vs prod). `NodejsFunction` bundles backend **TypeScript
source** directly via `backendHandlerEntry(...)` — handlers are not pre-compiled, so a handler's
import graph must stay bundleable. `FrontendStack` is constructed only when
`packages/frontend/dist` exists, because CDK synthesizes every stack in the app even when deploying
a subset, and CD builds the frontend only after the API URL is known. `.github/workflows/cd.yml`
deploys Data+Api → reads `ApiUrl` from outputs into `frontend/.env.production` → builds → deploys
Frontend, on every push to `main`.

## Testing

Vitest everywhere; frontend uses jsdom + Testing Library (`vite.config.ts`, `src/setupTests.ts`).
Graph tests mock `../llm/openaiClients.js` with `vi.mock` and then `await import()` the graph
module, so the mock is in place before the module-scope model cache is created — follow that shape
rather than importing the graph statically.
