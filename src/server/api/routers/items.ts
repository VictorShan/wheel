import { z } from "zod";
import { createTRPCRouter, publicProcedure } from "~/server/api/trpc";
import { lobbies, items } from "~/server/db/schema";
import { eq } from "drizzle-orm";
import { PusherServer } from "~/config/PusherServer";
import { ITEM_EVENT, getLobbyChannelName } from "~/config/PusherConstants";
import { TRPCClientError } from "@trpc/client";

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
          lastSelectedAt: new Date(1000), // Earliest possible date
        })
        .execute();
      await PusherServer.trigger(
        getLobbyChannelName(input.lobbyCuid),
        ITEM_EVENT,
        {
          item: item.rows[0],
        },
      );
      return item;
    }),
  removeItem: publicProcedure
    .input(
      z.object({
        lobbyCuid: z.string(),
        itemId: z.number(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      await ctx.db.delete(items).where(eq(items.id, input.itemId)).execute();
      await PusherServer.trigger(
        getLobbyChannelName(input.lobbyCuid),
        ITEM_EVENT,
        {
          item: input.itemId,
        },
      );
    }),
  selectItem: publicProcedure
    .input(z.object({ itemId: z.number(), lobbyCuid: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const item = await ctx.db
        .update(items)
        .set({
          lastSelectedAt: new Date(),
        })
        .where(eq(items.id, input.itemId))
        .execute();
      await PusherServer.trigger(
        getLobbyChannelName(input.lobbyCuid),
        ITEM_EVENT,
        {
          item: item.rows[0],
        },
      );
    }),
  upvoteItem: publicProcedure
    .input(z.object({ itemId: z.number(), lobbyCuid: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const item = await ctx.db.query.items.findFirst({
        where: eq(items.id, input.itemId),
      });
      if (!item) {
        throw new TRPCClientError(`Item ${input.itemId} not found`);
      }
      item.upvotes += 1;
      await ctx.db
        .update(items)
        .set({
          upvotes: item.upvotes,
        })
        .where(eq(items.id, input.itemId))
        .execute();
      await PusherServer.trigger(
        getLobbyChannelName(input.lobbyCuid),
        ITEM_EVENT,
        {
          item: item,
        },
      );
    }),
  downvoteItem: publicProcedure
    .input(z.object({ itemId: z.number(), lobbyCuid: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const item = await ctx.db.query.items.findFirst({
        where: eq(items.id, input.itemId),
      });
      if (!item) {
        throw new TRPCClientError(`Item ${input.itemId} not found`);
      }
      item.upvotes -= 1;
      await ctx.db
        .update(items)
        .set({
          upvotes: item.upvotes,
        })
        .where(eq(items.id, input.itemId))
        .execute();
      await PusherServer.trigger(
        getLobbyChannelName(input.lobbyCuid),
        ITEM_EVENT,
        {
          item: item,
        },
      );
    }),
});
