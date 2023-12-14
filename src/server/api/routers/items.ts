import { z } from "zod";
import { createTRPCRouter, publicProcedure } from "~/server/api/trpc";
import { lobbies, items } from "~/server/db/schema";
import { eq } from "drizzle-orm";

export const itemRouter = createTRPCRouter({
  addItem: publicProcedure
    .input(
      z.object({
        lobbyCuid: z.string(),
        item: z.object({
          longName: z.string().min(1),
          shortName: z.string().min(1).optional(),
          url: z.string().optional(),
          imageUrl: z.string().optional(),
        }),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const lobby = await ctx.db.query.lobbies.findFirst({
        where: eq(lobbies.cuid, input.lobbyCuid),
      });
      if (!lobby) {
        throw new Error("Lobby not found");
      }
      const item = await ctx.db
        .insert(items)
        .values({
          lobbyCuid: input.lobbyCuid,
          longName: input.item.longName,
          shortName: input.item.shortName,
          url: input.item.url,
          imageUrl: input.item.imageUrl,
        })
        .execute();
      return item;
    }),
  removeItem: publicProcedure
    .input(
      z.object({
        itemId: z.number(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      await ctx.db.delete(items).where(eq(items.id, input.itemId)).execute();
    }),
});
