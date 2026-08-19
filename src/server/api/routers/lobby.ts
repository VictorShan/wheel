import { z } from "zod";
import {
  authenticatedProcedure,
  createTRPCRouter,
  publicProcedure,
} from "~/server/api/trpc";
import { init } from "@paralleldrive/cuid2";
import { SPIN_EVENT } from "~/config/PusherConstants";
import { TRPCError } from "@trpc/server";
import { broadcastToLobby } from "~/config/broadcast";
import * as store from "~/server/db/lobbyStore";

const create = init({
  fingerprint: "lobby",
  length: 10,
});
const lobbyTimeout = 1000 * 60 * 60 * 24 * 7; // 7 days
const retries = 5;

export const lobbyRouter = createTRPCRouter({
  createLobby: authenticatedProcedure
    .input(
      z.object({
        name: z.string().trim().min(1),
        description: z.string().nullable(),
      }),
    )
    .mutation(async ({ input }) => {
      for (let i = 0; i < retries; i++) {
        const newCuid = create();
        const claim = await store.createLobby({
          cuid: newCuid,
          name: input.name,
          description: input.description,
        });
        if (claim === "created") return newCuid;

        // Taken. Reclaim it only if whoever had it is long gone.
        const existing = await store.getLobby(newCuid);
        if (!existing) continue;
        const age = Date.now() - Date.parse(existing.createdAt);
        if (!Number.isNaN(age) && age > lobbyTimeout) {
          // Takes the items and the log with it, so the next owner of this cuid doesn't inherit
          // the previous wheel's history.
          await store.deleteLobby(newCuid);
          const retry = await store.createLobby({
            cuid: newCuid,
            name: input.name,
            description: input.description,
          });
          if (retry === "created") return newCuid;
        }
      }
      // Returning undefined here would send the browser to /undefined, which renders as a
      // plausible empty wheel.
      throw new TRPCError({
        code: "CONFLICT",
        message: "Could not find a free wheel address. Please try again.",
      });
    }),
  getLobbyInfo: publicProcedure
    .input(z.object({ lobbyCuid: z.string() }))
    .query(async ({ input }) => {
      // One round trip for the wheel and every item on it.
      const lobby = await store.getLobbyWithItems(input.lobbyCuid);
      if (!lobby) return undefined;
      // Fire and forget, and only when the stamp is stale: a viewer shouldn't wait on a write
      // whose result they never see.
      store.touchLobbyRead(lobby);
      // Best first, with a stable tiebreak so the table doesn't reshuffle between refetches.
      lobby.items.sort(
        (a, b) => b.upvotes - a.upvotes || a.longName.localeCompare(b.longName),
      );
      return lobby;
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
    .mutation(async ({ input }) => {
      const itemIds = await store.listItemIds(input.lobbyCuid);
      const spin = {
        itemIds: itemIds.sort(),
        intialRotation: input.initialRotation,
        initialVelocity: input.initialVelocity,
      };
      await broadcastToLobby(input.lobbyCuid, SPIN_EVENT, {
        spin,
        seed: input.seed,
      });
    }),
  updatePostRequest: authenticatedProcedure
    .input(
      z.object({
        lobbyId: z.string(),
        postRequestBody: z
          .string()
          .transform((value, ctx) => {
            try {
              return JSON.parse(value) as unknown;
            } catch {
              // An unguarded JSON.parse here answered a bad body with a 500.
              ctx.addIssue({
                code: z.ZodIssueCode.custom,
                message: "Post body must be valid JSON",
              });
              return z.NEVER;
            }
          })
          .pipe(z.record(z.unknown())),
        postRequestUrl: z.string().url(),
      }),
    )
    .mutation(async ({ input }) => {
      const updated = await store.updateLobbyWebhook({
        cuid: input.lobbyId,
        selectWebhookUrl: input.postRequestUrl,
        selectWebhookBody: input.postRequestBody,
      });
      if (!updated) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Lobby not found" });
      }
    }),
});
