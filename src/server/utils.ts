import { kv } from "@vercel/kv";
import { TRPCError } from "@trpc/server";

const HOUR_MILLIS = 1000 * 60 * 60;

export async function rateLimitPerHour(
  userId: string,
  operation: string,
  limitPerHour: number,
) {
  const now = new Date();
  const nextFullHour = getNextFullHourEpochMillis(now);
  const rateLimitKey = `${userId}-${operation}:${now.getHours()}`;
  const selections = (await kv.get(rateLimitKey)) as number;
  if (selections && selections >= limitPerHour) {
    throw new TRPCError({
      code: "TOO_MANY_REQUESTS",
      message: "User select rate limit exceeded",
    });
  }
  await kv.incr(rateLimitKey);
  const expireSuccess = await kv.expireat(rateLimitKey, nextFullHour);
  if (!expireSuccess) {
    console.error(
      `Failed to set rate limit expiration for ${rateLimitKey} at ${nextFullHour}`,
    );
  }
}

function getNextFullHourEpochMillis(date: Date) {
  return Math.trunc(date.getTime() / HOUR_MILLIS + 1) * HOUR_MILLIS;
}
