/**
 * One-shot copy of the old Turso/SQLite data into DynamoDB.
 *
 *   npm run ddb:migrate-from-turso            # copy everything
 *   npm run ddb:migrate-from-turso -- --dry-run
 *
 * Needs TURSO_DATABASE_URL and TURSO_AUTH_TOKEN alongside the DDB variables. Re-running overwrites
 * the rows it wrote before, so an interrupted run can simply be repeated.
 *
 * Item ids were integers in SQLite and are strings in DynamoDB; the number is kept as its own
 * string so an item keeps its identity across the move.
 */
import { createClient } from "@libsql/client";
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import {
  BatchWriteCommand,
  DynamoDBDocumentClient,
} from "@aws-sdk/lib-dynamodb";

const dryRun = process.argv.includes("--dry-run");
const tableName = process.env.DDB_TABLE_NAME;
const region = process.env.AWS_REGION;
const tursoUrl = process.env.TURSO_DATABASE_URL;
if (!region || !tableName) {
  throw new Error("AWS_REGION and DDB_TABLE_NAME must be set");
}
if (!tursoUrl) {
  throw new Error("TURSO_DATABASE_URL must be set to migrate from Turso");
}

const turso = createClient({
  url: tursoUrl,
  authToken: process.env.TURSO_AUTH_TOKEN,
});
const ddb = DynamoDBDocumentClient.from(
  new DynamoDBClient({ region, endpoint: process.env.DDB_ENDPOINT }),
  { marshallOptions: { removeUndefinedValues: true } },
);

const NEVER_SELECTED = new Date(0).toISOString();

/** SQLite held three different timestamp formats; DynamoDB gets one. */
function toIso(value: unknown, fallback: string) {
  if (typeof value !== "string" || value.length === 0) return fallback;
  const direct = Date.parse(value);
  if (!Number.isNaN(direct)) return new Date(direct).toISOString();
  // "2026-08-19 19:27:37" - SQL CURRENT_TIMESTAMP, which is UTC but not valid ISO 8601.
  const asIso = Date.parse(value.replace(" ", "T") + "Z");
  return Number.isNaN(asIso) ? fallback : new Date(asIso).toISOString();
}

function asObject(value: unknown): Record<string, unknown> {
  if (typeof value === "string") {
    try {
      const parsed: unknown = JSON.parse(value);
      return typeof parsed === "object" && parsed !== null
        ? (parsed as Record<string, unknown>)
        : {};
    } catch {
      return {};
    }
  }
  return typeof value === "object" && value !== null
    ? (value as Record<string, unknown>)
    : {};
}

function text(value: unknown) {
  return typeof value === "string" && value.length > 0 ? value : undefined;
}

let droppedUrls = 0;

/**
 * The old schema never checked what went into a url column, so it can hold anything a signed-in
 * user typed - including `javascript:`, which the item dialog would render as a live link. The app
 * only accepts http(s) now, and the copy has to hold that line too rather than carrying an
 * unusable value into the new store.
 */
function httpUrl(value: unknown) {
  const url = text(value);
  if (url === undefined) return undefined;
  try {
    const { protocol } = new URL(url);
    if (protocol === "http:" || protocol === "https:") return url;
  } catch {
    // Not a URL at all.
  }
  droppedUrls++;
  console.warn(`Dropped a url that is not http(s): ${JSON.stringify(url)}`);
  return undefined;
}

const rows: Record<string, unknown>[] = [];
const now = new Date().toISOString();

const lobbies = await turso.execute("select * from wheel_lobby");
for (const lobby of lobbies.rows) {
  const cuid = String(lobby.cuid);
  rows.push({
    pk: `LOBBY#${cuid}`,
    sk: "LOBBY",
    cuid,
    name: text(lobby.name),
    description: text(lobby.text),
    createdAt: toIso(lobby.created_at, now),
    updatedAt: toIso(lobby.updatedAt, now),
    lastReadAt: toIso(lobby.last_read_at, now),
    selectWebhookUrl: httpUrl(lobby.select_webhook_url),
    selectWebhookBody: asObject(lobby.select_webhook_body),
  });
}

const items = await turso.execute("select * from wheel_item");
for (const item of items.rows) {
  const itemId = String(item.id);
  rows.push({
    pk: `LOBBY#${String(item.lobby_cuid)}`,
    sk: `ITEM#${itemId}`,
    itemId,
    lobbyCuid: String(item.lobby_cuid),
    longName: String(item.name),
    shortName: text(item.short_name),
    url: httpUrl(item.url),
    imageUrl: httpUrl(item.image_url),
    createdAt: toIso(item.created_at, now),
    updatedAt: toIso(item.updated_at, now),
    upvotes: Number(item.upvotes ?? 0),
    lastSelectedAt: toIso(item.last_selected_at, NEVER_SELECTED),
  });
}

const logs = await turso.execute("select * from wheel_lobby_log");
for (const log of logs.rows) {
  const timestamp = toIso(log.timestamp, now);
  rows.push({
    pk: `LOBBY#${String(log.lobby_cuid)}`,
    // The old integer id keeps entries written in the same second apart and makes the copy
    // repeatable: the same row always lands on the same sort key.
    sk: `LOG#${timestamp}#${String(log.id)}`,
    lobbyCuid: String(log.lobby_cuid),
    timestamp,
    data: asObject(log.data),
  });
}

console.log(
  `Read ${lobbies.rows.length} lobbies, ${items.rows.length} items, ${logs.rows.length} log entries`,
);
if (droppedUrls > 0) {
  console.log(`Dropped ${droppedUrls} url(s) that were not http(s)`);
}

if (dryRun) {
  console.log("Dry run: nothing written. First row would be:");
  console.log(JSON.stringify(rows[0], null, 2));
} else {
  for (let i = 0; i < rows.length; i += 25) {
    const batch = rows.slice(i, i + 25);
    let unprocessed = await ddb
      .send(
        new BatchWriteCommand({
          RequestItems: {
            [tableName]: batch.map((Item) => ({ PutRequest: { Item } })),
          },
        }),
      )
      .then((result) => result.UnprocessedItems?.[tableName] ?? []);
    // BatchWrite can decline part of a batch when it throttles; those rows have to be resent.
    for (let attempt = 0; unprocessed.length > 0 && attempt < 5; attempt++) {
      await new Promise((resolve) => setTimeout(resolve, 100 * 2 ** attempt));
      unprocessed = await ddb
        .send(
          new BatchWriteCommand({ RequestItems: { [tableName]: unprocessed } }),
        )
        .then((result) => result.UnprocessedItems?.[tableName] ?? []);
    }
    if (unprocessed.length > 0) {
      throw new Error(`Gave up on ${unprocessed.length} rows near index ${i}`);
    }
    console.log(`Wrote ${Math.min(i + 25, rows.length)}/${rows.length}`);
  }
  console.log("Migration complete");
}
