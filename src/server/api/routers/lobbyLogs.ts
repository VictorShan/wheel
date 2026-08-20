import { z } from "zod";
import { createTRPCRouter, publicProcedure } from "~/server/api/trpc";
import * as store from "~/server/db/lobbyStore";

export const lobbyLogsRouter = createTRPCRouter({
  getLogs: publicProcedure
    .input(z.object({ lobbyCuid: z.string() }))
    .query(({ input }) => store.listLogs(input.lobbyCuid, 10)),
});
