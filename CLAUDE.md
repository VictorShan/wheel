# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this app is

"Spin the Wheel" (package name `lunch-wheel`): a shared decision wheel. Anyone creates a *lobby*
(a wheel) and gets a random 10-char CUID URL (`/[wheelId]`). Visitors to that URL add *items*,
up/downvote them, and spin. A spin on one device is broadcast to every device viewing the same
lobby, so all clients animate the same spin and land on the same item.

Two mechanics shape an item's slice size on the wheel (both computed client-side in
`generateWheelItems` in `src/app/[wheelId]/page.tsx`):
- **Votes**: `upvotes` shift weight relative to the lowest-voted item in the lobby.
- **Recency**: selecting an item stamps `lastSelectedAt`; a freshly selected item is worth ~20% of
  its weight and recovers ~20% per day (5 days to full).

## Commands

```bash
npm run dev          # Next.js dev server on :3000
npm run build        # next build (also runs env validation via next.config.js)
npm run lint         # next lint (type-checked ESLint rules; needs a tsconfig project)
npm test             # playwright test (auto-starts `npm run dev` per playwright.config.ts)
npm run test:report  # open the last Playwright HTML report

npx playwright test tests/front-page.spec.ts            # single file
npx playwright test -g "has title"                      # single test by name
npx playwright test --project=chromium                  # single browser (projects: chromium, firefox, Mobile Chrome)

npm run db:push      # push schema to Turso (drizzle-kit push:sqlite)
npm run db:generate  # generate SQL migrations into ./drizzle-migration
npm run db:migrate   # apply migrations (tsx src/server/db/index.ts)
```

`db:*` scripts run through `dotenv-cli`, so they read `.env`. There is no `.env.example`; the
required variables are the ones listed in `src/env.js` (Turso, Clerk, Soketi, plus a legacy
`DATABASE_URL`). Env validation runs at import time and **fails the build/dev server** if any are
missing — `SKIP_ENV_VALIDATION=1` bypasses it.

`./drizzle-migration` is gitignored, so a fresh clone has no migration files to apply.

## Architecture

**T3 stack**: Next.js 14 App Router + tRPC + Drizzle (SQLite dialect on Turso/libSQL) + Clerk auth
+ Soketi (self-hosted Pusher) for realtime + shadcn/ui (Radix + Tailwind) with daisyUI classes
mixed in.

### Data flow (the part that needs several files to see)

1. **tRPC has two clients.** `src/trpc/react.tsx` is the browser client (React Query) used by every
   `"use client"` component; `src/trpc/server.ts` is an RSC client that calls procedures in-process.
   They build context differently: the HTTP route (`src/app/api/trpc/[trpc]/route.ts`) gets `userId`
   from Clerk's `getAuth(req)`, the RSC client from `currentUser()`. Context is always
   `{ db, headers, userId }` (`src/server/api/trpc.ts`).
2. **Procedure types**: `publicProcedure` and `authenticatedProcedure` (`isAuthed` middleware
   requires `ctx.userId`). Reads (`getLobbyInfo`, `getLogs`) and `spin` are public; everything that
   mutates lobbies/items requires a signed-in Clerk user. Routers live in
   `src/server/api/routers/` and are registered in `src/server/api/root.ts`.
3. **Mutations do not return updated state to the caller.** After a mutation the server calls
   `PusherServer.trigger(getLobbyChannelName(cuid), ITEM_EVENT | SPIN_EVENT, …)`; clients subscribed
   via the `usePusher` hook react to that event (usually by refetching `getLobbyInfo`). So the
   realtime channel is load-bearing for the *local* user's UI too, not just other viewers.
4. **Wheel rendering** (`src/app/_components/Wheel.tsx`) is canvas + `requestAnimationFrame` with
   CSS `rotate`. Both the spin's initial rotation/velocity and an optional shuffle `seed` travel
   through the Pusher `SPIN_EVENT` so every client reproduces the same animation and lands on the
   same slice; the winning slice is resolved from the marker at the right edge (screen angle 0).
5. **Item selection can fire a webhook**: a lobby stores `selectWebhookUrl` / `selectWebhookBody`
   (edited in `LobbySettings`), and the *browser* POSTs that body after `selectItem` succeeds
   (`ItemDialog`), substituting the `$USER$` / `$ITEM_PICKED$` / `$ITEM_PICKED_URL$` placeholders
   from `src/config/postRequestUtils.ts`.

### Conventions

- Path alias `~/*` → `src/*`.
- Drizzle tables are created through `sqliteTableCreator` with a `wheel_` prefix
  (`src/server/db/schema.ts`); `tablesFilter: ["wheel_*"]` in `drizzle.config.ts` keeps drizzle-kit
  scoped to them. Timestamp columns are **text**, defaulting to SQL `CURRENT_TIMESTAMP`.
- Frontend types for API data come from the router via `inferRouterOutputs`
  (`src/app/_components/types.ts`) — don't redeclare item/lobby shapes.
- The lobby page passes items down through `ItemsContext` (`src/app/_components/providers.ts`)
  rather than prop-drilling into the table/dialog.
- Clerk's `authMiddleware` (`src/middleware.ts`) marks every route public; auth is enforced per
  tRPC procedure, not by the middleware.
- `src/server/utils.ts` has a Vercel-KV-backed hourly rate limiter that is currently commented out
  at both call sites.
- ESLint runs the type-checked rulesets, so lint failures are often real type errors.
