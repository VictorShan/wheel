import { eq } from "drizzle-orm";
import { z } from "zod";
import { createTRPCRouter, publicProcedure } from "~/server/api/trpc";
import { lobbyLogs } from "~/server/db/schema";

export const lobbyLogsRouter = createTRPCRouter({
  getLogs: publicProcedure
    .input(z.object({ lobbyCuid: z.string() }))
    .query(async ({ ctx, input }) => {
      const logs = await ctx.db.query.lobbyLogs.findMany({
        where: eq(lobbyLogs.lobbyCuid, input.lobbyCuid),
        limit: 10,
      });
      return logs;
    }),
});
