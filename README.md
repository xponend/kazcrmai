# kazcrmai

Diploma project — open-source mobile-first CRM with AI agents (Satbayev University 2026).

## Structure

| Folder | Stack | Role |
|---|---|---|
| `nextkazcrmai/` | Express 4 · MongoDB · Mongoose · Groq SDK (Llama 3.3 70B) | API + 3-agent AI pipeline (classify → prioritize → route) |
| `kazcrmmobile/` | Expo SDK 55 · Expo Router 55 · React 19.2 · RN 0.83 · Zustand | Mobile client with EAS Update + Build configured |

## Live infra

| Service | URL / ID |
|---|---|
| Backend (Render) | https://kazcrm.onrender.com (`srv-d7nof25ckfvc73f4va1g`, region: singapore, plan: free) |
| Health probe | https://kazcrm.onrender.com/api/health |
| EAS project | `@sultandelux/kazcrmmobile` (`db280bc1-ad39-4958-8ec1-cb8096a316da`) |
| EAS Update endpoint | https://u.expo.dev/db280bc1-ad39-4958-8ec1-cb8096a316da |

## Local quickstart

```sh
# Backend (needs MONGODB_URI + GROQ_API_KEY in .env)
cd nextkazcrmai && cp .env.example .env && npm install && npm run seed && npm run dev

# Mobile (talks to local backend by default)
cd kazcrmmobile && cp .env.example .env && npm install --legacy-peer-deps && npm start
```

## Production checklist

The Render service is up but **DB-backed endpoints return 500 until `MONGODB_URI` is set**. Free option:

1. Sign up at https://www.mongodb.com/cloud/atlas/register, create an M0 cluster.
2. In Network Access, add `0.0.0.0/0` (or Render Singapore egress IPs).
3. Get the connection string `mongodb+srv://USER:PASS@CLUSTER/kazcrmai?retryWrites=true&w=majority`.
4. Set it on Render via API or dashboard, then trigger a redeploy:
   ```sh
   curl -X PATCH https://api.render.com/v1/services/srv-d7nof25ckfvc73f4va1g/env-vars \
     -H "Authorization: Bearer $RENDER_API_KEY" -H "Content-Type: application/json" \
     -d '[{"key":"MONGODB_URI","value":"mongodb+srv://..."},{"key":"JWT_SECRET","value":"..."},{"key":"GROQ_API_KEY","value":"..."},{"key":"NODE_VERSION","value":"20.19.4"}]'
   ```
5. Once the deploy is `live`, seed the database from your local machine pointing at the Atlas URI:
   ```sh
   MONGODB_URI="mongodb+srv://..." npm --prefix nextkazcrmai run seed
   ```

## EAS scripts

```sh
cd kazcrmmobile
npm run update:preview -- --message "..."
npm run build:preview      # internal-distribution build
npm run build:production   # store-ready build
```
