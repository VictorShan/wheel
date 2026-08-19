import { z } from "zod";
import { authenticatedProcedure, createTRPCRouter } from "~/server/api/trpc";
import { lobbies, items, lobbyLogs } from "~/server/db/schema";
import { eq, sql } from "drizzle-orm";
import { ITEM_EVENT } from "~/config/PusherConstants";
import { TRPCError } from "@trpc/server";
import { broadcastToLobby } from "~/config/broadcast";
import type { db } from "~/server/db/db";
// import { rateLimitPerHour } from "~/server/utils";

type Database = typeof db;

/**
 * Votes are clamped so one person leaning on the "+" button can't take over the wheel, and so a
 * runaway score can't shrink every other slice to nothing.
 */
const MAX_UPVOTES = 50;
const MIN_UPVOTES = -50;

/** Long enough ago that a newly added item is never treated as "just selected". */
const NEVER_SELECTED = new Date(0).toISOString();

function isHttpUrl(value: string) {
  try {
    const { protocol } = new URL(value);
    return protocol === "http:" || protocol === "https:";
  } catch {
    return false;
  }
}

/**
 * A URL field that may be left blank. Blank input becomes `undefined` rather than `""` so the
 * column stores NULL and the item stays editable later.
 */
const optionalUrl = z
  .string()
  .trim()
  .transform((value) => (value.length === 0 ? undefined : value))
  .refine((value) => value === undefined || isHttpUrl(value), {
    message: "Enter a full URL, including https://",
  })
  .optional();

/**
 * Applies a vote in SQL so simultaneous voters don't overwrite each other — which is exactly what a
 * group hitting the same lobby at lunchtime does.
 */
async function voteOnItem(
  database: Database,
  lobbyCuid: string,
  itemId: number,
  delta: number,
) {
  const [item] = await database
    .update(items)
    .set({
      upvotes: sql`max(${MIN_UPVOTES}, min(${MAX_UPVOTES}, ${items.upvotes} + ${delta}))`,
      updatedAt: new Date().toISOString(),
    })
    .where(eq(items.id, itemId))
    .returning();
  if (!item) {
    throw new TRPCError({
      code: "NOT_FOUND",
      message: `Item ${itemId} not found`,
    });
  }
  await broadcastToLobby(lobbyCuid, ITEM_EVENT, { item });
  return item;
}

export const itemRouter = createTRPCRouter({
  updateItem: authenticatedProcedure
    .input(
      z.object({
        lobbyCuid: z.string(),
        itemId: z.number(),
        longName: z.string().trim().min(1),
        url: optionalUrl,
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const [item] = await ctx.db
        .update(items)
        .set({
          longName: input.longName,
          url: input.url ?? null,
          updatedAt: new Date().toISOString(),
        })
        .where(eq(items.id, input.itemId))
        .returning();
      if (!item) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: `Item ${input.itemId} not found`,
        });
      }
      await broadcastToLobby(input.lobbyCuid, ITEM_EVENT, { item });
      return item;
    }),
  addItem: authenticatedProcedure
    .input(
      z.object({
        lobbyCuid: z.string(),
        item: z.object({
          longName: z.string().trim().min(1),
          shortName: z.string().trim().min(1).optional(),
          url: optionalUrl,
          imageUrl: optionalUrl,
        }),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const lobby = await ctx.db.query.lobbies.findFirst({
        where: eq(lobbies.cuid, input.lobbyCuid),
      });
      if (!lobby) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Lobby not found" });
      }
      const [item] = await ctx.db
        .insert(items)
        .values({
          lobbyCuid: input.lobbyCuid,
          longName: input.item.longName,
          shortName: input.item.shortName,
          url: input.item.url,
          imageUrl: input.item.imageUrl,
          lastSelectedAt: NEVER_SELECTED,
        })
        .returning();
      await broadcastToLobby(input.lobbyCuid, ITEM_EVENT, { item });
      return item;
    }),
  removeItem: authenticatedProcedure
    .input(
      z.object({
        lobbyCuid: z.string(),
        itemId: z.number(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      await ctx.db.delete(items).where(eq(items.id, input.itemId)).execute();
      await broadcastToLobby(input.lobbyCuid, ITEM_EVENT, {
        item: input.itemId,
      });
    }),
  selectItem: authenticatedProcedure
    .input(z.object({ itemId: z.number(), lobbyCuid: z.string() }))
    .mutation(async ({ ctx, input }) => {
      // await rateLimitPerHour(ctx.userId!, "selectItem", 3);
      const now = new Date().toISOString();
      const [item] = await ctx.db
        .update(items)
        .set({ lastSelectedAt: now, updatedAt: now })
        .where(eq(items.id, input.itemId))
        .returning();
      if (!item) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: `Item ${input.itemId} not found`,
        });
      }
      // The log is part of what "selecting" means, so write it with the selection. Broadcasting is
      // only a notification and happens afterwards.
      await ctx.db.insert(lobbyLogs).values({
        lobbyCuid: input.lobbyCuid,
        timestamp: now,
        data: {
          action: "selectItem",
          message: `${item.longName || item.shortName} selected`,
        },
      });
      await broadcastToLobby(input.lobbyCuid, ITEM_EVENT, { item });
      return item;
    }),
  upvoteItem: authenticatedProcedure
    .input(z.object({ itemId: z.number(), lobbyCuid: z.string() }))
    .mutation(({ ctx, input }) =>
      voteOnItem(ctx.db, input.lobbyCuid, input.itemId, 1),
    ),
  downvoteItem: authenticatedProcedure
    .input(z.object({ itemId: z.number(), lobbyCuid: z.string() }))
    .mutation(({ ctx, input }) =>
      voteOnItem(ctx.db, input.lobbyCuid, input.itemId, -1),
    ),
});
