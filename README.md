# kazcrmai

Diploma project — open-source mobile-first CRM with AI agents (Satbayev University 2026).

## Live demo

- Backend: https://kazcrm.onrender.com (Render free, region: singapore, auto-deploys on push)
- Health: https://kazcrm.onrender.com/api/health
- Demo login: `admin@crm.kz` / `admin123` · `aizhan@crm.kz` / `pass123`
- Mobile: Expo project `@sultandelux/kazcrmmobile`, EAS Update endpoint `https://u.expo.dev/db280bc1-ad39-4958-8ec1-cb8096a316da`, preview channel pinned to the live backend

## Structure

| Folder | Stack | Role |
|---|---|---|
| `nextkazcrmai/` | TypeScript · Express 4 · Mongoose 8 · Groq SDK 1.x (Llama 3.3 70B) | API + 3-agent AI pipeline (classify → prioritize → route) |
| `kazcrmmobile/` | Expo SDK 55 · Expo Router 55 · React 19.2 · RN 0.83 · Zustand | Mobile client with EAS Update + Build configured |

Both apps use **yarn 1**.

## How the deployed demo works

`src/server.ts` resolves the Mongo URI in this order:

1. `MONGODB_URI` env → use the real cluster
2. otherwise → spin up `mongodb-memory-server` in-process and auto-seed if the `users` collection is empty (42 tickets, 15 KZ clients, 7 users)

On Render free tier, the container sleeps after 15 min idle; the first request after sleep cold-starts mongod and reseeds — so the demo always starts in a known good state. To run with persistent storage, set `MONGODB_URI` to an Atlas/SRV string in Render's env and the fallback is skipped.

## Local quickstart

```sh
# Backend (works with or without a real MongoDB)
cd nextkazcrmai && yarn install && yarn dev

# Mobile (talks to local backend by default)
cd kazcrmmobile && cp .env.example .env && yarn install && yarn start
```

## Backend scripts (`nextkazcrmai`)

```sh
yarn dev        # tsx watch src/server.ts
yarn build      # tsc -> dist/
yarn start      # node dist/server.js (Render runs this)
yarn seed       # tsx src/seed.ts (requires MONGODB_URI)
yarn typecheck  # tsc --noEmit
```

## Mobile scripts (`kazcrmmobile`)

```sh
yarn start                # expo start
yarn update:preview       # publish EAS update on preview channel
yarn build:preview        # internal-distribution build
yarn build:production     # store-ready build
```

## Env vars

`nextkazcrmai/.env` (gitignored):

```
MONGODB_URI=          # leave blank for in-memory + auto-seed
JWT_SECRET=...
GROQ_API_KEY=gsk_...
SEED_ON_BOOT=         # set to "true" to force auto-seed against any URI
```

`kazcrmmobile/.env`:

```
EXPO_PUBLIC_API_URL=https://kazcrm.onrender.com/api
```

## Verified

- `yarn typecheck` passes on both apps
- `npx expo-doctor` passes 18/18 on mobile
- 46-check API exercise (auth, ticket list/detail/create/update with full Groq pipeline, clients with search, users/operators, analytics shape, status transition side-effects, 401/404/400 negatives) passes against the deployed Render backend
