import { z } from "zod";
import { createTRPCRouter, publicProcedure } from "~/server/api/trpc";
import { lobbies, items } from "~/server/db/schema";
import { init } from "@paralleldrive/cuid2";
import { eq } from "drizzle-orm";

const create = init({
  fingerprint: "lobby",
  length: 10,
});
const lobbyTimeout = 1000 * 60 * 60 * 24 * 7; // 7 days
const retries = 5;
export const lobbyRouter = createTRPCRouter({
  createLobby: publicProcedure
    .input(
      z.object({ name: z.string().min(1), description: z.string().nullable() }),
    )
    .mutation(async ({ ctx, input }) => {
      for (let i = 0; i < retries; i++) {
        const newCuid = create();
        const foundLobby = await ctx.db.query.lobbies.findFirst({
          where: eq(lobbies.cuid, newCuid),
        });
        if (foundLobby) {
          const createdAt = new Date(foundLobby.createdAt);
          const now = new Date();
          const diff = now.getTime() - createdAt.getTime();
          if (diff > lobbyTimeout) {
            // found lobby has expired
            await ctx.db
              .delete(lobbies)
              .where(eq(lobbies.cuid, foundLobby.cuid))
              .execute();
            await ctx.db
              .delete(items)
              .where(eq(items.lobbyCuid, foundLobby.cuid))
              .execute();
          } else {
            continue; // found lobby but already being used
          }
        }

        await ctx.db.insert(lobbies).values({
          cuid: newCuid,
          name: input.name,
          description: input.description,
        });
        return newCuid;
      }
    }),
  getLobbyInfo: publicProcedure
    .input(z.object({ lobbyCuid: z.string() }))
    .query(async ({ ctx, input }) => {
      await ctx.db.update(lobbies).set({
        lastReadAt: new Date(),
      });
      return ctx.db.query.lobbies.findFirst({
        where: eq(lobbies.cuid, input.lobbyCuid),
        with: {
          items: true,
        },
      });
    }),
});
