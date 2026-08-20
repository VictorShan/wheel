import { PusherServer } from "~/config/PusherServer";
import { getLobbyChannelName } from "~/config/PusherConstants";

/**
 * Fan out an event to everyone viewing a lobby.
 *
 * The realtime channel is a side channel: the write it announces has already been committed by the
 * time we get here, so a broadcast failure must never turn a successful mutation into an error.
 * Callers should keep working when Soketi is unreachable, and clients refetch on their own after a
 * mutation rather than relying on the event coming back to them.
 */
export async function broadcastToLobby(
  lobbyCuid: string,
  event: string,
  payload: unknown,
) {
  try {
    await PusherServer.trigger(getLobbyChannelName(lobbyCuid), event, payload);
  } catch (error) {
    console.error(
      `Failed to broadcast ${event} to lobby ${lobbyCuid}:`,
      error instanceof Error ? error.message : error,
    );
  }
}
