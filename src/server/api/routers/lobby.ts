import { z } from "zod";
import {
  authenticatedProcedure,
  createTRPCRouter,
  publicProcedure,
} from "~/server/api/trpc";
import { lobbies, items } from "~/server/db/schema";
import { init } from "@paralleldrive/cuid2";
import { eq } from "drizzle-orm";
import { PusherServer } from "~/config/PusherServer";
import { SPIN_EVENT, getLobbyChannelName } from "~/config/PusherConstants";

const create = init({
  fingerprint: "lobby",
  length: 10,
});
const lobbyTimeout = 1000 * 60 * 60 * 24 * 7; // 7 days
const retries = 5;
export const lobbyRouter = createTRPCRouter({
  createLobby: authenticatedProcedure
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
      const result = await ctx.db.query.lobbies.findFirst({
        where: eq(lobbies.cuid, input.lobbyCuid),
        with: {
          items: true,
        },
      });
      result?.items.sort((a, b) => a.upvotes - b.upvotes);
      return result;
    }),
  spin: publicProcedure
    .input(
      z.object({
        lobbyCuid: z.string(),
        initialRotation: z.number(),
        initialVelocity: z.number(),
        seed: z.number().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const itemIds = (
        await ctx.db.query.items.findMany({
          where: eq(items.lobbyCuid, input.lobbyCuid),
        })
      ).map((item) => item.id);
      const spin = {
        itemIds: itemIds.sort(),
        intialRotation: input.initialRotation,
        initialVelocity: input.initialVelocity,
      };
      await PusherServer.trigger(
        getLobbyChannelName(input.lobbyCuid),
        SPIN_EVENT,
        {
          spin,
          seed: input.seed,
        },
      );
    }),
});
