# Трекер здоровья 360

A full-stack personal health & nutrition tracking web app.

## What It Does

- **Landing page** — public marketing page with Sign in / Sign up
- **Auth** — Clerk authentication (email + Google SSO); each user gets their own data
- **Dashboard** — calorie/macro progress rings, weekly bar chart, meal type pie chart, recent meals list
- **Daily Log** — date-navigable meal log grouped by meal type, add/delete entries; Google Sheets auto-sync
- **Food Library** — searchable card grid, add/edit/delete foods, AI food photo analysis, barcode scanning, import/export Google Sheets; 131-product pre-seeded library
- **My Goals** — set daily calorie + macro targets
- **Wellness Journal** — track calories burned, mood, stress, sleep, supplements, medications; Google Sheets sync; AI posture analysis by photo

## Architecture

pnpm workspace monorepo with TypeScript. All API types flow from a single OpenAPI spec through codegen.

| Package | Description |
|---|---|
| `artifacts/calorie-tracker` | React + Vite frontend (port from `PORT` env) |
| `artifacts/api-server` | Express 5 REST API (port 8080) |
| `lib/api-spec` | OpenAPI spec + Orval codegen config |
| `lib/api-client-react` | Generated React Query hooks |
| `lib/api-zod` | Generated Zod validation schemas |
| `lib/db` | Drizzle ORM schema + client |

## Stack

- **Monorepo**: pnpm workspaces
- **Node.js**: 24
- **Frontend**: React 19, Vite, Tailwind CSS v4, shadcn/ui, Recharts
- **Backend**: Express 5
- **Database**: PostgreSQL + Drizzle ORM
- **Validation**: Zod v4 + drizzle-zod
- **API codegen**: Orval (from OpenAPI spec)
- **AI**: OpenAI GPT vision via Replit AI Integrations (no user key needed)
- **Build**: esbuild

## DB Schema

- `foods` — id, name, calories, protein, carbs, fat, servingSize, createdAt
- `meals` — id, foodId, mealType (breakfast/lunch/dinner/snack), servings, date (YYYY-MM-DD), createdAt
- `goals` — id, dailyCalories, dailyProtein, dailyCarbs, dailyFat, updatedAt

Nutrition is computed on-the-fly: `calories = food.calories * servings`.

## Key Commands

```bash
pnpm run typecheck                          # full typecheck
pnpm run build                              # typecheck + build all
pnpm --filter @workspace/api-spec run codegen  # regenerate API hooks + Zod from OpenAPI
pnpm --filter @workspace/db run push        # push DB schema changes (dev only)
pnpm --filter @workspace/api-server run dev # run API server
pnpm --filter @workspace/calorie-tracker run dev  # run frontend
```

## Monetization: Pro Token System

Time-limited access tokens for Russian market (no Stripe required).

### How It Works
- **Free users** — can use the app (nutrition tracking, wellness journal, Google Sheets) but AI features are locked behind `<ProGate>`
- **Pro users** — get a unique link `https://app.com?token=<uuid>` valid for 32 days with full AI access
- **After 32 days** — token expires, user reverts to Free but sees "Access expired / Renew" screen (not "new user")
- **Renewal** — admin generates a new token → sends new link → user clicks it → Pro restored

### AI Features Gated Behind ProGate
- Food photo analysis (foods page)
- Posture analysis by photo (wellness page)
- Tracker screenshot import AI (wellness page)
- 30-day AI cycle analysis (wellness posture analyzer)

### Admin Panel
URL: `/admin` — protected by `ADMIN_SECRET` env variable (set as a secret)
- Generate new tokens with label (client name) and duration
- View all tokens with expiry status
- Revoke tokens early

### Backend Endpoints
- `GET /api/tokens/:token/validate` — public, validates token
- `POST /api/admin/tokens` — creates token (requires `x-admin-secret` header)
- `GET /api/admin/tokens` — lists all tokens
- `PATCH /api/admin/tokens/:id/revoke` — revokes a token

### DB Table
`pro_access_tokens` — id, token (UUID), label, created_at, expires_at, is_revoked

### NOTE: Stripe Integration
Stripe integration was proposed but dismissed by user. When ready, connect via Integrations tab (connector:ccfg_stripe_01K611P4YQR0SZM11XFRQJC44Y).

## Important Notes

- **Date params in OpenAPI**: Query parameters with date values must use `type: string` (NOT `format: date`). Using `format: date` causes orval to generate `zod.date()` which rejects plain strings from query params.
- **AI integration**: Uses `AI_INTEGRATIONS_OPENAI_BASE_URL` + `AI_INTEGRATIONS_OPENAI_API_KEY` from Replit AI Integrations — no user API key required.
- **CSS imports**: Google Fonts `@import url()` must be at the very top of `index.css` before `@import "tailwindcss"`.
- **Body limit**: API server is configured with `20mb` body size limit for image payloads.

## Design

- Theme: forest green primary (`hsl(142 45% 35%)`), orange accent (`hsl(25 90% 55%)`)
- Fonts: Plus Jakarta Sans (body) + Fraunces (headings, serif)
- Light green background (`hsl(120 20% 97%)`)
