# kazcrmai

Дипломный проект — open-source мобильный CRM с AI-агентами (Сатпаев Университет, 2026).

## Живое демо

- Backend: https://kazcrm.onrender.com (Render free, регион: singapore, авто-деплой при push)
- Health-check: https://kazcrm.onrender.com/api/health
- Web-админка: https://webkazcrmai.vercel.app
- Демо-логины: `admin@crm.kz` / `admin123` · `aizhan@crm.kz` / `pass123`
- Mobile: Expo-проект `@sultandelux/kazcrmmobile`, EAS Update endpoint `https://u.expo.dev/db280bc1-ad39-4958-8ec1-cb8096a316da`, preview-канал привязан к живому backend

## Структура

| Папка | Стек | Роль |
|---|---|---|
| `nextkazcrmai/` | TypeScript · Express 4 · Mongoose 8 · Groq SDK 1.x (Llama 3.3 70B) | API + AI-пайплайн из 3 агентов (classify → prioritize → route) |
| `webkazcrmai/` | TypeScript · Next.js 16 · React 19 · Tailwind 4 | Web-админка (RU локализация) |
| `kazcrmmobile/` | Expo SDK 55 · Expo Router 55 · React 19.2 · RN 0.83 · Zustand | Мобильный клиент с настроенными EAS Update + Build |

Все приложения используют **yarn 1**.

## Как работает задеплоенное демо

`src/server.ts` определяет Mongo URI в таком порядке:

1. Если есть env `MONGODB_URI` → подключается к реальному кластеру
2. Иначе → поднимает `mongodb-memory-server` в самом процессе и авто-сидит данные, если коллекция `users` пустая (42 тикета, 15 KZ-клиентов, 7 пользователей)

На бесплатном Render контейнер засыпает после 15 минут простоя. Первый запрос после сна делает cold-start mongod и пересидит данные — поэтому демо всегда стартует в известном рабочем состоянии. Чтобы использовать постоянное хранилище, задай `MONGODB_URI` (Atlas/SRV) в env Render — fallback тогда пропускается.

## Быстрый старт локально

```sh
# Backend (работает с реальной MongoDB или без неё)
cd nextkazcrmai && yarn install && yarn dev

# Web-админка (по умолчанию ходит в задеплоенный backend)
cd webkazcrmai && yarn install && yarn dev

# Mobile (по умолчанию ходит в локальный backend)
cd kazcrmmobile && cp .env.example .env && yarn install && yarn start
```

## Скрипты backend (`nextkazcrmai`)

```sh
yarn dev        # tsx watch src/server.ts
yarn build      # tsc -> dist/
yarn start      # node dist/server.js (это запускает Render)
yarn seed       # tsx src/seed.ts (требует MONGODB_URI)
yarn typecheck  # tsc --noEmit
```

## Скрипты web-админки (`webkazcrmai`)

```sh
yarn dev        # next dev (Turbopack)
yarn build      # next build
yarn start      # next start
yarn lint       # eslint
```

## Скрипты mobile (`kazcrmmobile`)

```sh
yarn start                # expo start
yarn update:preview       # публикация EAS update в preview-канал
yarn build:preview        # сборка для внутренней раздачи
yarn build:production     # сборка под сторы
```

## Переменные окружения

`nextkazcrmai/.env` (в .gitignore):

```
MONGODB_URI=          # пусто = in-memory + авто-сид
JWT_SECRET=...
GROQ_API_KEY=gsk_...
SEED_ON_BOOT=         # "true" — форс авто-сид при любом URI
```

`kazcrmmobile/.env`:

```
EXPO_PUBLIC_API_URL=https://kazcrm.onrender.com/api
```

`webkazcrmai/.env.local` (опционально):

```
NEXT_PUBLIC_API_URL=https://kazcrm.onrender.com/api
```

## Локализация

Web и mobile UI — на русском. Категории заявок (`technical_issue`, `billing`, `general_inquiry`, `account_access`, `integration`, `feature_request`, `complaint`, `urgent_outage`), статусы и приоритеты переводятся на лету через словари в `src/lib/i18n.ts` (web) и `lib/i18n.ts` (mobile). API-значения остаются на английском — переводятся только подписи в UI.

## Проверено

- `yarn typecheck` / `npx tsc --noEmit` проходит на всех трёх приложениях
- `npx expo-doctor` — 18/18 на мобильном
- Прогон API из 46 проверок (auth, список/деталь/создание/обновление тикетов с полным Groq-пайплайном, клиенты с поиском, users/operators, форма аналитики, побочные эффекты смены статуса, негативы 401/404/400) проходит на задеплоенном Render-бэкенде
