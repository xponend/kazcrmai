# kazcrmmobile

Expo SDK 55 client for the Kazakh CRM. Owner: `sultandelux`. Project: `db280bc1-ad39-4958-8ec1-cb8096a316da`.

## Run locally

```sh
cp .env.example .env   # set EXPO_PUBLIC_API_URL to your backend URL
npm install --legacy-peer-deps
npm start              # then scan QR with Expo Go
```

## EAS

- Update preview channel: `npm run update:preview -- --message "..."`
- Build preview (internal distribution): `npm run build:preview`
- Build production: `npm run build:production`

EAS Update endpoint: `https://u.expo.dev/db280bc1-ad39-4958-8ec1-cb8096a316da`.

## Stack

- Expo Router 55 with `Stack.Protected` auth gating
- Reanimated 4 + Worklets
- Zustand + axios + expo-secure-store
- react-native-chart-kit for analytics
