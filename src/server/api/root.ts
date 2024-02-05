import { lobbyRouter } from "~/server/api/routers/lobby";
import { itemRouter } from "~/server/api/routers/items";
import { createTRPCRouter } from "~/server/api/trpc";
import { lobbyLogsRouter } from "~/server/api/routers/lobbyLogs";

/**
 * This is the primary router for your server.
 *
 * All routers added in /api/routers should be manually added here.
 */
export const appRouter = createTRPCRouter({
  lobbies: lobbyRouter,
  items: itemRouter,
  lobbyLogs: lobbyLogsRouter,
});

// export type definition of API
export type AppRouter = typeof appRouter;
