import { desc, eq } from "drizzle-orm";
import { z } from "zod";
import { createTRPCRouter, publicProcedure } from "~/server/api/trpc";
import { lobbyLogs } from "~/server/db/schema";

export const lobbyLogsRouter = createTRPCRouter({
  getLogs: publicProcedure
    .input(z.object({ lobbyCuid: z.string() }))
    .query(async ({ ctx, input }) => {
      const logs = await ctx.db.query.lobbyLogs.findMany({
        where: eq(lobbyLogs.lobbyCuid, input.lobbyCuid),
        // Without an order this returned the ten *oldest* entries, so the panel froze once a
        // lobby had been used ten times. Ordering by id avoids depending on the timestamp format.
        orderBy: [desc(lobbyLogs.id)],
        limit: 10,
      });
      return logs;
    }),
});
