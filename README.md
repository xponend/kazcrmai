# kazcrmai

Diploma project — open-source mobile-first CRM with AI agents (Satbayev University 2026).

## Structure

| Folder | Stack | Role |
|---|---|---|
| `nextkazcrmai/` | Express 4 · MongoDB · Mongoose · Groq SDK (Llama 3.3 70B) | API + 3-agent AI pipeline (classify → prioritize → route) |
| `kazcrmmobile/` | Expo SDK 55 · Expo Router 55 · React 19.2 · RN 0.83 · Zustand | Mobile client with EAS Update + Build configured |

EAS project: `@sultandelux/kazcrmmobile` · `db280bc1-ad39-4958-8ec1-cb8096a316da`.

## Quickstart

```sh
# Backend
cd nextkazcrmai && cp .env.example .env && npm install && npm run seed && npm run dev

# Mobile (new terminal)
cd kazcrmmobile && cp .env.example .env && npm install --legacy-peer-deps && npm start
```
