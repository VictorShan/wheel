import {
  BatchWriteCommand,
  DeleteCommand,
  GetCommand,
  PutCommand,
  QueryCommand,
  UpdateCommand,
} from "@aws-sdk/lib-dynamodb";
import { init } from "@paralleldrive/cuid2";
import { ddb, TABLE_NAME } from "~/server/db/ddb";

/**
 * Single-table layout. Everything about one wheel lives in one partition, so the lobby page is a
 * single query instead of a join plus a follow-up:
 *
 *   pk = LOBBY#<cuid>
 *   sk = LOBBY                       the wheel itself
 *      | ITEM#<itemId>               one per option
 *      | LOG#<timestamp>#<id>        selection history, newest last
 *
 * The sort keys are ordered so that `sk < "LOG#"` selects the wheel and its items and stops before
 * the log, which is read separately and capped.
 */
const LOBBY_SK = "LOBBY";
const ITEM_PREFIX = "ITEM#";
const LOG_PREFIX = "LOG#";

const lobbyPk = (cuid: string) => `LOBBY#${cuid}`;
const itemSk = (itemId: string) => `${ITEM_PREFIX}${itemId}`;

const createItemId = init({ fingerprint: "item", length: 12 });
const createLogId = init({ fingerprint: "log", length: 8 });

export type Lobby = {
  cuid: string;
  name: string | null;
  description: string | null;
  createdAt: string;
  updatedAt: string;
  lastReadAt: string;
  selectWebhookUrl: string | null;
  selectWebhookBody: Record<string, unknown>;
};

export type Item = {
  id: string;
  lobbyCuid: string;
  longName: string;
  shortName: string | null;
  createdAt: string;
  updatedAt: string;
  upvotes: number;
  url: string | null;
  imageUrl: string | null;
  lastSelectedAt: string;
};

export type LobbyLog = {
  id: string;
  lobbyCuid: string;
  timestamp: string;
  data: { action: string; message: string };
};

/** Long enough ago that a newly added item is never treated as "just selected". */
const NEVER_SELECTED = new Date(0).toISOString();

/** Votes are clamped so one person holding "+" can't take over the wheel. */
export const MAX_UPVOTES = 50;
export const MIN_UPVOTES = -50;

/** A read only refreshes lastReadAt when the stored value is at least this stale. */
const READ_STAMP_INTERVAL_MS = 5 * 60 * 1000;

type Row = Record<string, unknown>;

function toLobby(row: Row): Lobby {
  return {
    cuid: String(row.cuid),
    name: (row.name as string | undefined) ?? null,
    description: (row.description as string | undefined) ?? null,
    createdAt: String(row.createdAt),
    updatedAt: String(row.updatedAt),
    lastReadAt: String(row.lastReadAt),
    selectWebhookUrl: (row.selectWebhookUrl as string | undefined) ?? null,
    selectWebhookBody:
      (row.selectWebhookBody as Record<string, unknown> | undefined) ?? {},
  };
}

function toItem(row: Row): Item {
  return {
    id: String(row.itemId),
    lobbyCuid: String(row.lobbyCuid),
    longName: String(row.longName),
    shortName: (row.shortName as string | undefined) ?? null,
    createdAt: String(row.createdAt),
    updatedAt: String(row.updatedAt),
    upvotes: Number(row.upvotes ?? 0),
    url: (row.url as string | undefined) ?? null,
    imageUrl: (row.imageUrl as string | undefined) ?? null,
    lastSelectedAt: String(row.lastSelectedAt ?? NEVER_SELECTED),
  };
}

function toLog(row: Row): LobbyLog {
  return {
    id: String(row.sk),
    lobbyCuid: String(row.lobbyCuid),
    timestamp: String(row.timestamp),
    data: row.data as LobbyLog["data"],
  };
}

/**
 * The whole wheel in one round trip: the lobby row and every item, without touching the log.
 */
export async function getLobbyWithItems(cuid: string) {
  const result = await ddb.send(
    new QueryCommand({
      TableName: TABLE_NAME,
      KeyConditionExpression: "pk = :pk AND sk < :logs",
      ExpressionAttributeValues: { ":pk": lobbyPk(cuid), ":logs": LOG_PREFIX },
    }),
  );
  const rows = (result.Items ?? []) as Row[];
  const lobbyRow = rows.find((row) => row.sk === LOBBY_SK);
  if (!lobbyRow) return undefined;
  return {
    ...toLobby(lobbyRow),
    items: rows.filter((row) => row.sk !== LOBBY_SK).map(toItem),
  };
}

export async function getLobby(cuid: string) {
  const result = await ddb.send(
    new GetCommand({
      TableName: TABLE_NAME,
      Key: { pk: lobbyPk(cuid), sk: LOBBY_SK },
    }),
  );
  return result.Item ? toLobby(result.Item as Row) : undefined;
}

/**
 * Claims a cuid, or reports that it is taken. The condition does the checking, so two people
 * generating the same cuid at the same moment can't both win it.
 */
export async function createLobby(input: {
  cuid: string;
  name: string;
  description: string | null;
}): Promise<"created" | "taken"> {
  const now = new Date().toISOString();
  try {
    await ddb.send(
      new PutCommand({
        TableName: TABLE_NAME,
        Item: {
          pk: lobbyPk(input.cuid),
          sk: LOBBY_SK,
          cuid: input.cuid,
          name: input.name,
          description: input.description ?? undefined,
          createdAt: now,
          updatedAt: now,
          lastReadAt: now,
          selectWebhookBody: {},
        },
        ConditionExpression: "attribute_not_exists(pk)",
      }),
    );
    return "created";
  } catch (error) {
    if (isConditionalCheckFailed(error)) return "taken";
    throw error;
  }
}

/** Removes a wheel and everything in its partition: items, log entries and the lobby row. */
export async function deleteLobby(cuid: string) {
  const keys: { pk: string; sk: string }[] = [];
  let startKey: Record<string, unknown> | undefined;
  do {
    const page = await ddb.send(
      new QueryCommand({
        TableName: TABLE_NAME,
        KeyConditionExpression: "pk = :pk",
        ExpressionAttributeValues: { ":pk": lobbyPk(cuid) },
        ProjectionExpression: "pk, sk",
        ExclusiveStartKey: startKey,
      }),
    );
    for (const row of (page.Items ?? []) as { pk: string; sk: string }[]) {
      keys.push({ pk: row.pk, sk: row.sk });
    }
    startKey = page.LastEvaluatedKey;
  } while (startKey);

  for (let i = 0; i < keys.length; i += 25) {
    await ddb.send(
      new BatchWriteCommand({
        RequestItems: {
          [TABLE_NAME]: keys
            .slice(i, i + 25)
            .map((Key) => ({ DeleteRequest: { Key } })),
        },
      }),
    );
  }
}

/**
 * Records that someone looked at a wheel.
 *
 * Deliberately not part of the read: it is fire-and-forget, and it only writes when the stored
 * value is already stale, so viewers don't each pay for a write they never see the result of.
 */
export function touchLobbyRead(lobby: { cuid: string; lastReadAt: string }) {
  const lastRead = Date.parse(lobby.lastReadAt);
  const isStale =
    Number.isNaN(lastRead) || Date.now() - lastRead > READ_STAMP_INTERVAL_MS;
  if (!isStale) return;
  void ddb
    .send(
      new UpdateCommand({
        TableName: TABLE_NAME,
        Key: { pk: lobbyPk(lobby.cuid), sk: LOBBY_SK },
        UpdateExpression: "SET lastReadAt = :now",
        ConditionExpression: "attribute_exists(pk)",
        ExpressionAttributeValues: { ":now": new Date().toISOString() },
      }),
    )
    .catch((error: unknown) => {
      if (isConditionalCheckFailed(error)) return;
      console.error("Failed to record lobby read:", error);
    });
}

export async function updateLobbyWebhook(input: {
  cuid: string;
  selectWebhookUrl: string;
  selectWebhookBody: Record<string, unknown>;
}) {
  try {
    await ddb.send(
      new UpdateCommand({
        TableName: TABLE_NAME,
        Key: { pk: lobbyPk(input.cuid), sk: LOBBY_SK },
        UpdateExpression:
          "SET selectWebhookUrl = :url, selectWebhookBody = :body, updatedAt = :now",
        ConditionExpression: "attribute_exists(pk)",
        ExpressionAttributeValues: {
          ":url": input.selectWebhookUrl,
          ":body": input.selectWebhookBody,
          ":now": new Date().toISOString(),
        },
      }),
    );
    return true;
  } catch (error) {
    if (isConditionalCheckFailed(error)) return false;
    throw error;
  }
}

export async function addItem(input: {
  lobbyCuid: string;
  longName: string;
  shortName?: string;
  url?: string;
  imageUrl?: string;
}): Promise<Item> {
  const now = new Date().toISOString();
  const itemId = createItemId();
  const row = {
    pk: lobbyPk(input.lobbyCuid),
    sk: itemSk(itemId),
    itemId,
    lobbyCuid: input.lobbyCuid,
    longName: input.longName,
    shortName: input.shortName,
    url: input.url,
    imageUrl: input.imageUrl,
    createdAt: now,
    updatedAt: now,
    upvotes: 0,
    lastSelectedAt: NEVER_SELECTED,
  };
  await ddb.send(new PutCommand({ TableName: TABLE_NAME, Item: row }));
  return toItem(row);
}

export async function updateItem(input: {
  lobbyCuid: string;
  itemId: string;
  longName: string;
  url: string | null;
}) {
  return updateExistingItem(input.lobbyCuid, input.itemId, {
    UpdateExpression: input.url
      ? "SET longName = :name, #url = :url, updatedAt = :now"
      : "SET longName = :name, updatedAt = :now REMOVE #url",
    ExpressionAttributeNames: { "#url": "url" },
    ExpressionAttributeValues: {
      ":name": input.longName,
      ":now": new Date().toISOString(),
      ...(input.url ? { ":url": input.url } : {}),
    },
  });
}

export async function removeItem(lobbyCuid: string, itemId: string) {
  await ddb.send(
    new DeleteCommand({
      TableName: TABLE_NAME,
      Key: { pk: lobbyPk(lobbyCuid), sk: itemSk(itemId) },
    }),
  );
}

export async function selectItem(lobbyCuid: string, itemId: string) {
  const now = new Date().toISOString();
  return updateExistingItem(lobbyCuid, itemId, {
    UpdateExpression: "SET lastSelectedAt = :now, updatedAt = :now",
    ExpressionAttributeValues: { ":now": now },
  });
}

/**
 * Applies a vote in DynamoDB rather than reading, adding one and writing back, so simultaneous
 * voters can't overwrite each other. The condition caps the score; hitting the cap is not an
 * error, it just leaves the item where it is.
 */
export async function voteOnItem(
  lobbyCuid: string,
  itemId: string,
  delta: 1 | -1,
) {
  const limit = delta > 0 ? MAX_UPVOTES : MIN_UPVOTES;
  const comparison = delta > 0 ? "<" : ">";
  try {
    const result = await ddb.send(
      new UpdateCommand({
        TableName: TABLE_NAME,
        Key: { pk: lobbyPk(lobbyCuid), sk: itemSk(itemId) },
        UpdateExpression: "ADD upvotes :delta SET updatedAt = :now",
        ConditionExpression: `attribute_exists(pk) AND (attribute_not_exists(upvotes) OR upvotes ${comparison} :limit)`,
        ExpressionAttributeValues: {
          ":delta": delta,
          ":limit": limit,
          ":now": new Date().toISOString(),
        },
        ReturnValues: "ALL_NEW",
      }),
    );
    return result.Attributes ? toItem(result.Attributes as Row) : undefined;
  } catch (error) {
    if (isConditionalCheckFailed(error)) {
      // Either the item is gone or it is already at the cap - the caller can tell which.
      return getItem(lobbyCuid, itemId);
    }
    throw error;
  }
}

export async function getItem(lobbyCuid: string, itemId: string) {
  const result = await ddb.send(
    new GetCommand({
      TableName: TABLE_NAME,
      Key: { pk: lobbyPk(lobbyCuid), sk: itemSk(itemId) },
    }),
  );
  return result.Item ? toItem(result.Item as Row) : undefined;
}

/** Item ids only, for broadcasting a spin. */
export async function listItemIds(lobbyCuid: string) {
  const result = await ddb.send(
    new QueryCommand({
      TableName: TABLE_NAME,
      KeyConditionExpression: "pk = :pk AND begins_with(sk, :items)",
      ExpressionAttributeValues: {
        ":pk": lobbyPk(lobbyCuid),
        ":items": ITEM_PREFIX,
      },
      ProjectionExpression: "itemId",
    }),
  );
  return ((result.Items ?? []) as Row[]).map((row) => String(row.itemId));
}

export async function appendLog(input: {
  lobbyCuid: string;
  timestamp: string;
  data: { action: string; message: string };
}) {
  await ddb.send(
    new PutCommand({
      TableName: TABLE_NAME,
      Item: {
        pk: lobbyPk(input.lobbyCuid),
        // Timestamp first so the log sorts by time; the suffix keeps entries written in the same
        // millisecond from overwriting each other.
        sk: `${LOG_PREFIX}${input.timestamp}#${createLogId()}`,
        lobbyCuid: input.lobbyCuid,
        timestamp: input.timestamp,
        data: input.data,
      },
    }),
  );
}

/** Newest first, which is the order the log is rendered in. */
export async function listLogs(lobbyCuid: string, limit = 10) {
  const result = await ddb.send(
    new QueryCommand({
      TableName: TABLE_NAME,
      KeyConditionExpression: "pk = :pk AND begins_with(sk, :logs)",
      ExpressionAttributeValues: {
        ":pk": lobbyPk(lobbyCuid),
        ":logs": LOG_PREFIX,
      },
      ScanIndexForward: false,
      Limit: limit,
    }),
  );
  return ((result.Items ?? []) as Row[]).map(toLog);
}

async function updateExistingItem(
  lobbyCuid: string,
  itemId: string,
  update: {
    UpdateExpression: string;
    ExpressionAttributeNames?: Record<string, string>;
    ExpressionAttributeValues: Record<string, unknown>;
  },
) {
  try {
    const result = await ddb.send(
      new UpdateCommand({
        TableName: TABLE_NAME,
        Key: { pk: lobbyPk(lobbyCuid), sk: itemSk(itemId) },
        ConditionExpression: "attribute_exists(pk)",
        ReturnValues: "ALL_NEW",
        ...update,
      }),
    );
    return result.Attributes ? toItem(result.Attributes as Row) : undefined;
  } catch (error) {
    if (isConditionalCheckFailed(error)) return undefined;
    throw error;
  }
}

function isConditionalCheckFailed(error: unknown) {
  return (
    typeof error === "object" &&
    error !== null &&
    "name" in error &&
    error.name === "ConditionalCheckFailedException"
  );
}
