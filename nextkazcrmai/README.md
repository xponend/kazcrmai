# nextkazcrmai

Kazakh CRM backend. Express + MongoDB + Groq AI agents.

## Run

```sh
cp .env.example .env   # set MONGODB_URI, JWT_SECRET, GROQ_API_KEY
npm install
npm run seed
npm run dev
```

API on `http://localhost:3000/api`. Health: `GET /api/health`.

## AI pipeline

`POST /api/tickets` triggers `lib/ai/orchestrator.js`:

1. `classify.js` — categorises into one of 8 buckets via `llama-3.3-70b-versatile`.
2. `prioritize.js` — scores 0–100 using sentiment + urgency keywords + client history.
3. `route.js` — picks the operator based on skills and current load.

Result is persisted on the ticket and logged to `TicketHistory` as `ai_processed`.
