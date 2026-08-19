import { z } from "zod";
import {
  authenticatedProcedure,
  createTRPCRouter,
  publicProcedure,
} from "~/server/api/trpc";
import { lobbies, items, lobbyLogs } from "~/server/db/schema";
import { init } from "@paralleldrive/cuid2";
import { eq } from "drizzle-orm";
import { SPIN_EVENT } from "~/config/PusherConstants";
import { TRPCError } from "@trpc/server";
import { broadcastToLobby } from "~/config/broadcast";

const create = init({
  fingerprint: "lobby",
  length: 10,
});
const lobbyTimeout = 1000 * 60 * 60 * 24 * 7; // 7 days

/**
 * The webhook body reaches us as a JSON column, but rows written before it was stored as JSON (and
 * the column default) come back as a raw string. Callers want an object either way.
 */
function asObject(value: unknown): Record<string, unknown> {
  const parsed =
    typeof value === "string" ? tryParseJson(value) : (value ?? null);
  return typeof parsed === "object" && parsed !== null
    ? (parsed as Record<string, unknown>)
    : {};
}

function tryParseJson(value: string): unknown {
  try {
    return JSON.parse(value);
  } catch {
    return null;
  }
}
const retries = 5;
export const lobbyRouter = createTRPCRouter({
  createLobby: authenticatedProcedure
    .input(
      z.object({
        name: z.string().trim().min(1),
        description: z.string().nullable(),
      }),
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
            // Logs are keyed by cuid too, so leaving them behind would show the previous
            // lobby's history to whoever gets this cuid next.
            await ctx.db
              .delete(lobbyLogs)
              .where(eq(lobbyLogs.lobbyCuid, foundLobby.cuid))
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
      // Returning undefined here would send the browser to /undefined, which renders as an empty
      // wheel and looks like a working lobby.
      throw new TRPCError({
        code: "CONFLICT",
        message: "Could not find a free wheel address. Please try again.",
      });
    }),
  getLobbyInfo: publicProcedure
    .input(z.object({ lobbyCuid: z.string() }))
    .query(async ({ ctx, input }) => {
      const result = await ctx.db.query.lobbies.findFirst({
        where: eq(lobbies.cuid, input.lobbyCuid),
        with: {
          items: true,
        },
      });
      if (!result) {
        return result;
      }
      // Scoped to this lobby: without the where clause every read stamped every lobby in the
      // database, which also made last_read_at useless for expiry.
      await ctx.db
        .update(lobbies)
        .set({ lastReadAt: new Date().toISOString() })
        .where(eq(lobbies.cuid, input.lobbyCuid))
        .execute();
      // Best first, with a stable tiebreak so the table doesn't reshuffle between refetches.
      result.items.sort(
        (a, b) => b.upvotes - a.upvotes || a.longName.localeCompare(b.longName),
      );
      return { ...result, selectWebhookBody: asObject(result.selectWebhookBody) };
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
    .mutation(async ({ ctx, input }) => {
      await ctx.db
        .update(lobbies)
        .set({
          selectWebhookUrl: input.postRequestUrl,
          selectWebhookBody: input.postRequestBody,
          updatedAt: new Date().toISOString(),
        })
        .where(eq(lobbies.cuid, input.lobbyId))
        .execute();
    }),
});
