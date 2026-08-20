# Teagent — Language Tutor for Kids ("Dev")

A kid-friendly language tutor: upload a photo of a Hindi or Kannada textbook page, get a literal
word-by-word English translation plus a glossary of tricky words, and ask "Dev" — a chatbot scoped
only to that chapter — for help.

## Monorepo layout

- `packages/shared` — zod schemas + TS types shared by frontend and backend (the translation JSON
  contract lives here — start here if you're adding a language or changing the output shape).
- `packages/backend` — Lambda handlers + the two LangGraph graphs (`extractChapterGraph`,
  `chatGraph`).
- `packages/infra` — AWS CDK (TypeScript) app: DynamoDB, API Gateway + Lambda, S3 + CloudFront.
- `packages/frontend` — React + TypeScript + Vite SPA.

## Local development

```bash
npm install
npm run build -w @teagent/shared   # shared must be built before frontend/backend can import it

cp .env.example .env               # fill in OPENAI_API_KEY and JWT_SIGNING_SECRET at minimum
```

### Fully local — no AWS account needed

DynamoDB Local and MinIO speak the same DynamoDB/S3 APIs your production code talks to, so
`profilesRepo.ts` and `s3/presign.ts` need zero special-casing — set the two endpoint env vars and
they point at Docker instead of real AWS.

```bash
npm run local:up                                 # starts DynamoDB Local (:8000) + MinIO (:9100)
cat >> .env <<'EOF'
DYNAMODB_ENDPOINT=http://localhost:8000
S3_ENDPOINT=http://localhost:9100
EOF

npm run dynamodb:setup -w @teagent/backend       # creates the table (idempotent)
npm run s3:setup -w @teagent/backend             # creates the uploads bucket (idempotent)
npm run seed -w @teagent/backend                 # creates demo profiles: parent/parent1234, kid/1234
```

Data is ephemeral and resets whenever a container restarts — just re-run the two `:setup` commands
+ `seed`. Stop everything with `npm run local:down`.

One extra wrinkle for image extraction specifically: OpenAI's vision API needs a URL it can fetch
over the internet, and a `localhost` MinIO URL isn't reachable from there. `s3/presign.ts` handles
this automatically — when `S3_ENDPOINT` is set, it reads the uploaded image bytes and inlines them
as a base64 data URL for the OpenAI call instead of passing a link; in production (real S3), it
uses the leaner presigned-URL approach as originally designed.

### Running the app

```bash
npm run dev:backend   # Express shim on http://localhost:3000, hot-reloads via tsx watch
npm run dev:frontend  # Vite dev server on http://localhost:5173
```

`OPENAI_API_KEY` still needs to be a real key for chat/extraction to work — there's no local
substitute for the actual AI calls. Everything else (profiles/auth/uploads/chat-usage-limits) works
fully offline once `local:up` is running.

There's no self-serve signup — the seed script above covers local dev; see `docs/deploy.md` §3 for
adding a profile to a real deployed environment.

## Testing

```bash
npm run lint        # eslint across all workspaces
npm run typecheck    # tsc --noEmit across all workspaces
npm run test         # vitest across all workspaces
```

## Deploying

See `docs/deploy.md` for the one-time OIDC/SSM/profile bootstrap, then every push to `main`
deploys automatically via `.github/workflows/cd.yml`.
