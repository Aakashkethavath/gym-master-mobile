# Gym Master — Full-Stack Mobile App

A production-grade gym management platform with a **React Native (Expo)** mobile client and a **Node.js + Express + MongoDB** REST API. Designed for two roles — `admin` and `client` — with JWT-based authentication, attendance streaks, subscription/billing, in-app messaging, and workout logging.

---

## Project layout

```
gym-master-mobile/
├── server/                 # Node.js + Express + MongoDB API
│   ├── src/
│   │   ├── app.js          # Express app (middleware, routes)
│   │   ├── server.js       # Entrypoint (DB connect + listen)
│   │   ├── config/         # env loader, db connection
│   │   ├── middlewares/    # auth, error, validation, rate-limit
│   │   ├── models/         # Mongoose schemas
│   │   ├── controllers/    # Business logic
│   │   ├── routes/         # Express routers
│   │   ├── validators/     # Zod input schemas
│   │   ├── utils/          # ApiError, asyncHandler, jwt, logger
│   │   └── scripts/seed.js # Seed admin + demo data
│   ├── .env.example
│   └── package.json
│
├── mobile/                 # Expo (React Native) app
│   ├── app/                # expo-router file-based routes
│   │   ├── _layout.tsx
│   │   ├── index.tsx       # Entry redirect
│   │   ├── (auth)/         # Login, register
│   │   ├── (admin)/        # Admin tab navigator
│   │   └── (client)/       # Client tab navigator
│   ├── src/
│   │   ├── api/            # Axios client + endpoint wrappers
│   │   ├── components/     # Reusable UI components
│   │   ├── context/        # AuthContext
│   │   ├── hooks/          # Custom hooks
│   │   ├── theme/          # Design tokens
│   │   └── utils/          # Storage, formatters
│   ├── app.json            # Expo config
│   ├── .env.example
│   └── package.json
│
├── docker-compose.yml      # Local MongoDB
├── .gitignore
└── README.md
```

---

## Tech stack

**Backend**
- Node.js 20+, Express 4
- MongoDB 7 + Mongoose 8
- JWT (access + refresh tokens) with `jsonwebtoken`
- `bcrypt` for password hashing
- `zod` for request validation
- `helmet`, `cors`, `express-rate-limit`, `morgan` for security/observability
- Pino structured logger

**Mobile**
- Expo SDK 51 + React Native 0.74
- TypeScript
- `expo-router` for file-based navigation
- `axios` + `expo-secure-store` for authenticated API calls
- `@tanstack/react-query` for server state
- React Native built-in components — no heavy UI library, all styled in-house from the theme tokens

---

## Quick start (local development)

### Prerequisites
- Node.js 20+
- npm 10+ (or pnpm/yarn)
- Docker (optional, for local MongoDB) OR a MongoDB Atlas connection string
- Expo Go app on your phone, **or** an iOS Simulator / Android Emulator

### 1. Start MongoDB

If you have Docker:
```bash
docker compose up -d
```

Otherwise, point `MONGODB_URI` in `server/.env` to your existing MongoDB instance or Atlas cluster.

### 2. Run the backend

```bash
cd server
cp .env.example .env         # then edit secrets
npm install
npm run seed                 # creates admin + demo client + sample plans/trainers
npm run dev                  # starts on http://localhost:5000
```

The seed script prints the demo credentials. Default:
- **Admin** — `admin@gymmaster.app` / `Admin@12345`
- **Client** — `client@gymmaster.app` / `Client@12345`

### 3. Run the mobile app

```bash
cd mobile
cp .env.example .env         # set EXPO_PUBLIC_API_URL
npm install
npm run start                # opens Expo Dev Tools
```

Scan the QR code with Expo Go (Android) or the Camera app (iOS), or press `i` / `a` to open a simulator.

> **Note on API URL.** On a physical device, `localhost` points to the phone itself. Use your machine's LAN IP, e.g. `EXPO_PUBLIC_API_URL=http://192.168.1.42:5000/api/v1`.

---

## API reference (summary)

All routes are prefixed with `/api/v1`. Authenticated routes require `Authorization: Bearer <accessToken>`.

| Method | Path                              | Role     | Description                            |
|--------|-----------------------------------|----------|----------------------------------------|
| POST   | `/auth/register`                  | public   | Register a client account              |
| POST   | `/auth/login`                     | public   | Returns access + refresh token         |
| POST   | `/auth/refresh`                   | public   | Rotate access token                    |
| POST   | `/auth/logout`                    | auth     | Revoke refresh token                   |
| GET    | `/auth/me`                        | auth     | Current user profile                   |
| PATCH  | `/users/me`                       | auth     | Update own profile                     |
| GET    | `/users`                          | admin    | List all users                         |
| GET    | `/plans`                          | public   | List membership plans                  |
| POST   | `/plans`                          | admin    | Create plan                            |
| PATCH  | `/plans/:id`                      | admin    | Update plan                            |
| DELETE | `/plans/:id`                      | admin    | Delete plan                            |
| GET    | `/trainers`                       | public   | List trainers                          |
| POST   | `/trainers`                       | admin    | Create trainer                         |
| PATCH  | `/trainers/:id`                   | admin    | Update trainer                         |
| DELETE | `/trainers/:id`                   | admin    | Delete trainer                         |
| POST   | `/subscriptions`                  | auth     | Subscribe to a plan                    |
| GET    | `/subscriptions/me`               | auth     | Current user subscription              |
| GET    | `/subscriptions`                  | admin    | All subscriptions (with `?expiring=7`) |
| POST   | `/attendance/check-in`            | auth     | Mark today's attendance, update streak |
| GET    | `/attendance/me`                  | auth     | Own attendance history + streaks       |
| GET    | `/attendance/stats`               | admin    | Aggregated attendance stats            |
| POST   | `/workouts`                       | auth     | Log a workout                          |
| GET    | `/workouts/me`                    | auth     | Own workout history                    |
| GET    | `/payments`                       | admin    | All payments + revenue summary         |
| GET    | `/payments/me`                    | auth     | Own payment history                    |

Errors follow a consistent shape:
```json
{ "success": false, "message": "Plan not found", "code": "NOT_FOUND" }
```

---

## Deployment

### Backend — any Node host (Render / Railway / Fly.io / Heroku / VPS)

1. Provision MongoDB (Atlas recommended).
2. Set environment variables from `server/.env.example`.
3. Build & start:
   ```bash
   npm install --omit=dev
   npm start
   ```
4. Health check: `GET /api/v1/health`.

The provided `Dockerfile` (in `server/`) lets you deploy on any container platform.

### Mobile — Expo Application Services (EAS)

Expo's recommended build pipeline produces native binaries (`.apk`, `.aab`, `.ipa`) without needing Xcode or Android Studio locally.

```bash
cd mobile
npm install -g eas-cli
eas login
eas build:configure
eas build --platform android        # or ios, or all
eas submit --platform android       # uploads to Play Console
eas submit --platform ios           # uploads to App Store Connect
```

For over-the-air JS updates:
```bash
eas update --branch production --message "Bug fixes"
```

---

## Security checklist (implemented)

- Passwords hashed with bcrypt (cost factor 12).
- Short-lived JWT access tokens (15 min) + rotating refresh tokens (30 d) stored hashed in DB.
- Refresh tokens stored on device with `expo-secure-store` (Keychain on iOS, Keystore on Android).
- Helmet HTTP headers, strict CORS allowlist, request rate limiting on `/auth/*`.
- Zod-validated input on every mutating endpoint.
- Role-based middleware (`requireAuth`, `requireAdmin`) guards routes.
- Centralized error handler — no stack traces leaked in production.
- Mongoose schema indexes on `email`, `userId`, attendance dates.

---

## Scripts

### Server
- `npm run dev` — nodemon with hot reload
- `npm start` — production
- `npm run seed` — populate demo data
- `npm run lint` — ESLint

### Mobile
- `npm run start` — Expo dev server
- `npm run android` / `npm run ios` / `npm run web` — open a target
- `npm run lint` — ESLint
- `npm run typecheck` — `tsc --noEmit`

---

## License

MIT
