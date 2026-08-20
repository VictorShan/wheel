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

npx playwright test --project=store                     # data layer tests only (no browser)
npx playwright test tests/front-page.spec.ts            # single file
npx playwright test -g "has title"                      # single test by name
npx playwright test --project=chromium                  # single browser (chromium, firefox, Mobile Chrome)

npm run ddb:local             # local DynamoDB (dynalite) on :4567
npm run ddb:create-table      # create DDB_TABLE_NAME if absent; safe to re-run
npm run ddb:migrate-from-turso -- --dry-run   # one-shot copy of the pre-DynamoDB data
```

`ddb:*` scripts run through `dotenv-cli`, so they read `.env`. Copy `.env.example` to start. Env
validation runs at import time and **fails the build/dev server** if anything required is missing —
`SKIP_ENV_VALIDATION=1` bypasses it (the store tests use this).

Local development needs three things running: `npm run ddb:local`, then `npm run ddb:create-table`
once, then `npm run dev`.

## Architecture

**T3 stack**: Next.js 14 App Router + tRPC + DynamoDB (AWS SDK v3 document client) + Clerk auth
+ Soketi (self-hosted Pusher) for realtime + shadcn/ui (Radix + Tailwind) with daisyUI classes
mixed in.

### The DynamoDB layout (single table)

`src/server/db/lobbyStore.ts` is the only module that talks to DynamoDB; routers call it and never
build a key themselves. Everything about one wheel shares a partition:

```
pk = LOBBY#<cuid>
sk = LOBBY                    the wheel: name, description, webhook, timestamps
   | ITEM#<itemId>            one row per option
   | LOG#<timestamp>#<rand>   selection history
```

The sort keys are ordered so `sk < "LOG#"` reads the wheel *and* all of its items in one query and
stops before the log, which is read separately (`begins_with(sk, "LOG#")`, newest first, capped).
Consequences worth knowing:

- **Item ids are strings** (cuid2), not the old autoincrement integers. DynamoDB has no sequence,
  and a per-lobby counter would cost a round trip on every add.
- **Votes are applied with `ADD` plus a `ConditionExpression`** that caps the score, so simultaneous
  voters can't overwrite each other and nobody can run the counter away. Hitting the cap surfaces as
  `ConditionalCheckFailedException`, which the store treats as "no change", not an error.
- **`createLobby` claims a cuid with `attribute_not_exists(pk)`** rather than reading first, so two
  people generating the same cuid can't both win it.
- **`lastReadAt` is fire-and-forget and throttled** (`touchLobbyRead`): a viewer never waits on a
  write whose result they don't see.

### Data flow (the part that needs several files to see)

1. **tRPC has two clients.** `src/trpc/react.tsx` is the browser client (React Query) used by every
   `"use client"` component; `src/trpc/server.ts` is an RSC client that calls procedures in-process.
   They build context differently: the HTTP route (`src/app/api/trpc/[trpc]/route.ts`) gets `userId`
   from Clerk's `getAuth(req)`, the RSC client from `currentUser()`. Both resolve the user on a
   best-effort basis, so a Clerk failure can't take down public reads. Context is
   `{ headers, userId }` (`src/server/api/trpc.ts`); the store is imported directly.
2. **Procedure types**: `publicProcedure` and `authenticatedProcedure` (`isAuthed` middleware
   requires `ctx.userId`). Reads (`getLobbyInfo`, `getLogs`) and `spin` are public; everything that
   mutates lobbies/items requires a signed-in Clerk user. Routers live in
   `src/server/api/routers/` and are registered in `src/server/api/root.ts`.
3. **Mutations return the updated row and announce it.** After writing, the server calls
   `broadcastToLobby(...)` (`src/config/broadcast.ts`), which swallows realtime failures — the write
   already committed, so a broken Soketi must not fail the mutation. Clients subscribed via
   `usePusher` refetch on the event, but each mutation also invalidates `getLobbyInfo` itself, so the
   person who acted sees their change without a realtime round trip.
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
- Timestamps are ISO 8601 strings everywhere. Rows migrated from SQLite may still carry other
  formats, so anything parsing them (`wheelWeights.ts`, `formatTimestamp.ts`) tolerates that and
  degrades instead of producing `NaN`.
- Frontend types for API data come from the router via `inferRouterOutputs`
  (`src/app/_components/types.ts`) — don't redeclare item/lobby shapes.
- The lobby page passes items down through `ItemsContext` (`src/app/_components/providers.ts`)
  rather than prop-drilling into the table/dialog.
- Clerk's `authMiddleware` (`src/middleware.ts`) marks every route public; auth is enforced per
  tRPC procedure, not by the middleware.
- `src/server/utils.ts` has a Vercel-KV-backed hourly rate limiter that is currently commented out
  at both call sites.
- The store tests (`tests/lobbyStore.spec.ts`) run against dynalite, started per worker, and are
  their own Playwright project so they don't run once per browser.
- ESLint runs the type-checked rulesets, so lint failures are often real type errors.
