# webkazcrmai

Next.js 16 admin panel for the kazcrmai backend. Talks to the same Express API
as the mobile app (`https://kazcrm.onrender.com/api`), so all three components
share auth and AI features end-to-end.

## Pages

- `/login` — JWT login (handles both legacy `{token,user}` and new
  `{accessToken,refreshToken,user}` server shapes).
- `/` — tickets list with status filters.
- `/tickets/new` — create form with **live AI preview**: as you type,
  category and priority predictions appear after a 1.5s debounce.
- `/tickets/[id]` — detail with **all AI features wired**:
  - Reply suggestions (3 tones)
  - Summarize (1-line + bullets)
  - Similar resolved tickets (mongo `$text`)
  - Resolution playbook (steps + estimate + escalation triggers)
  - RU/KK/EN inline translation
  - Operator comments
  - Timeline + status advance
- `/clients` — list + search; "ИИ-профиль" opens AI-generated client
  persona (tone, recurring topics, risk flags).
- `/analytics` — KPI tiles, by-category + operator-load tables, **AI
  digest** with selectable window (24ч/7д/30д).
- `/chat` — natural-language chatbot over ticket data, with quick prompts.

## Run

```bash
yarn install
yarn dev
```

Defaults to `http://localhost:3000`. To point at a different backend, edit
`.env.local`:

```
NEXT_PUBLIC_API_URL=https://kazcrm.onrender.com/api
```

## Demo creds

```
admin@crm.kz / admin123       (admin — sees all)
aliya@crm.kz / pass123         (manager — analytics + digest)
aizhan@crm.kz / pass123        (operator — own tickets only, no analytics)
```

## Architecture notes

- **Auth**: JWT in localStorage with refresh-on-401 interceptor. Same
  `normalizeAuthResponse` adapter as the mobile app — works against
  legacy and hardened backend without code changes.
- **Route guard**: `<AuthProvider>` redirects unauthenticated users to
  `/login`, signed-in users away from `/login`. Sidebar layout renders
  only when the auth context resolves a user.
- **AI graceful degradation**: every AI panel hides itself silently if
  the endpoint returns 404 (legacy backend) or 403 (operator hitting an
  admin-only endpoint).

## Deploy

Vercel (recommended) — connect the repo and set `NEXT_PUBLIC_API_URL`. No
server-side state, fully static + client.
