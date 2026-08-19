import { z } from "zod";
import { authenticatedProcedure, createTRPCRouter } from "~/server/api/trpc";
import { ITEM_EVENT } from "~/config/PusherConstants";
import { TRPCError } from "@trpc/server";
import { broadcastToLobby } from "~/config/broadcast";
import * as store from "~/server/db/lobbyStore";
// import { rateLimitPerHour } from "~/server/utils";

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
 * attribute is absent and the item stays editable later.
 */
const optionalUrl = z
  .string()
  .trim()
  .transform((value) => (value.length === 0 ? undefined : value))
  .refine((value) => value === undefined || isHttpUrl(value), {
    message: "Enter a full URL, including https://",
  })
  .optional();

const itemNotFound = (itemId: string) =>
  new TRPCError({ code: "NOT_FOUND", message: `Item ${itemId} not found` });

export const itemRouter = createTRPCRouter({
  updateItem: authenticatedProcedure
    .input(
      z.object({
        lobbyCuid: z.string(),
        itemId: z.string(),
        longName: z.string().trim().min(1),
        url: optionalUrl,
      }),
    )
    .mutation(async ({ input }) => {
      const item = await store.updateItem({
        lobbyCuid: input.lobbyCuid,
        itemId: input.itemId,
        longName: input.longName,
        url: input.url ?? null,
      });
      if (!item) throw itemNotFound(input.itemId);
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
    .mutation(async ({ input }) => {
      const lobby = await store.getLobby(input.lobbyCuid);
      if (!lobby) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Lobby not found" });
      }
      const item = await store.addItem({
        lobbyCuid: input.lobbyCuid,
        longName: input.item.longName,
        shortName: input.item.shortName,
        url: input.item.url,
        imageUrl: input.item.imageUrl,
      });
      await broadcastToLobby(input.lobbyCuid, ITEM_EVENT, { item });
      return item;
    }),
  removeItem: authenticatedProcedure
    .input(
      z.object({
        lobbyCuid: z.string(),
        itemId: z.string(),
      }),
    )
    .mutation(async ({ input }) => {
      await store.removeItem(input.lobbyCuid, input.itemId);
      await broadcastToLobby(input.lobbyCuid, ITEM_EVENT, {
        item: input.itemId,
      });
    }),
  selectItem: authenticatedProcedure
    .input(z.object({ itemId: z.string(), lobbyCuid: z.string() }))
    .mutation(async ({ input }) => {
      // await rateLimitPerHour(ctx.userId!, "selectItem", 3);
      const item = await store.selectItem(input.lobbyCuid, input.itemId);
      if (!item) throw itemNotFound(input.itemId);
      // The log is part of what "selecting" means, so write it with the selection. Broadcasting is
      // only a notification and happens afterwards.
      await store.appendLog({
        lobbyCuid: input.lobbyCuid,
        timestamp: item.lastSelectedAt,
        data: {
          action: "selectItem",
          message: `${item.longName || item.shortName} selected`,
        },
      });
      await broadcastToLobby(input.lobbyCuid, ITEM_EVENT, { item });
      return item;
    }),
  upvoteItem: authenticatedProcedure
    .input(z.object({ itemId: z.string(), lobbyCuid: z.string() }))
    .mutation(({ input }) => vote(input.lobbyCuid, input.itemId, 1)),
  downvoteItem: authenticatedProcedure
    .input(z.object({ itemId: z.string(), lobbyCuid: z.string() }))
    .mutation(({ input }) => vote(input.lobbyCuid, input.itemId, -1)),
});

async function vote(lobbyCuid: string, itemId: string, delta: 1 | -1) {
  const item = await store.voteOnItem(lobbyCuid, itemId, delta);
  if (!item) throw itemNotFound(itemId);
  await broadcastToLobby(lobbyCuid, ITEM_EVENT, { item });
  return item;
}
