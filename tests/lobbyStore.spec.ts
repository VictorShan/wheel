/**
 * Exercises the DynamoDB data layer against a local DynamoDB (dynalite), so the access patterns the
 * app depends on are covered without an AWS account.
 */
import { test, expect } from "@playwright/test";
import type { Server } from "node:http";
import dynalite from "dynalite";
import { CreateTableCommand, DynamoDBClient } from "@aws-sdk/client-dynamodb";

const TABLE = "wheel-test";

let server: Server;
let store: typeof import("~/server/db/lobbyStore");

test.beforeAll(async ({}, testInfo) => {
  // One local DynamoDB per worker, since the suite runs in parallel.
  const port = 4599 + testInfo.workerIndex;
  server = dynalite({ createTableMs: 0 });
  await new Promise<void>((resolve) => server.listen(port, resolve));

  process.env.SKIP_ENV_VALIDATION = "1";
  process.env.AWS_REGION = "us-east-1";
  process.env.AWS_ACCESS_KEY_ID = "local";
  process.env.AWS_SECRET_ACCESS_KEY = "local";
  process.env.DDB_TABLE_NAME = TABLE;
  process.env.DDB_ENDPOINT = `http://127.0.0.1:${port}`;

  const client = new DynamoDBClient({
    region: "us-east-1",
    endpoint: `http://127.0.0.1:${port}`,
    credentials: { accessKeyId: "local", secretAccessKey: "local" },
  });
  await client.send(
    new CreateTableCommand({
      TableName: TABLE,
      KeySchema: [
        { AttributeName: "pk", KeyType: "HASH" },
        { AttributeName: "sk", KeyType: "RANGE" },
      ],
      AttributeDefinitions: [
        { AttributeName: "pk", AttributeType: "S" },
        { AttributeName: "sk", AttributeType: "S" },
      ],
      BillingMode: "PAY_PER_REQUEST",
    }),
  );

  // Imported after the environment is set, since the client is built at import time.
  store = await import("~/server/db/lobbyStore");
});

test.afterAll(async () => {
  await new Promise<void>((resolve) => server.close(() => resolve()));
});

let counter = 0;
async function freshLobby() {
  const cuid = `test${counter++}`;
  expect(
    await store.createLobby({ cuid, name: "Lunch", description: null }),
  ).toBe("created");
  return cuid;
}

test("a wheel and all of its items come back in one query", async () => {
  const cuid = await freshLobby();
  await store.addItem({ lobbyCuid: cuid, longName: "Pizza" });
  await store.addItem({ lobbyCuid: cuid, longName: "Sushi" });
  await store.appendLog({
    lobbyCuid: cuid,
    timestamp: new Date().toISOString(),
    data: { action: "selectItem", message: "Pizza selected" },
  });

  const lobby = await store.getLobbyWithItems(cuid);
  expect(lobby?.name).toBe("Lunch");
  expect(lobby?.items.map((item) => item.longName).sort()).toEqual([
    "Pizza",
    "Sushi",
  ]);
  // The log lives in the same partition but must not be dragged into the page read.
  expect(lobby?.items).toHaveLength(2);
});

test("an unknown wheel reads as undefined rather than an empty one", async () => {
  expect(await store.getLobbyWithItems("does-not-exist")).toBeUndefined();
  expect(await store.getLobby("does-not-exist")).toBeUndefined();
});

test("a cuid can only be claimed once", async () => {
  const cuid = await freshLobby();
  expect(
    await store.createLobby({ cuid, name: "Someone else", description: null }),
  ).toBe("taken");
  expect((await store.getLobby(cuid))?.name).toBe("Lunch");
});

test("votes accumulate and stop at the cap", async () => {
  const cuid = await freshLobby();
  const item = await store.addItem({ lobbyCuid: cuid, longName: "Pizza" });

  expect((await store.voteOnItem(cuid, item.id, 1))?.upvotes).toBe(1);
  expect((await store.voteOnItem(cuid, item.id, 1))?.upvotes).toBe(2);
  expect((await store.voteOnItem(cuid, item.id, -1))?.upvotes).toBe(1);

  for (let i = 0; i < store.MAX_UPVOTES + 5; i++) {
    await store.voteOnItem(cuid, item.id, 1);
  }
  expect((await store.getItem(cuid, item.id))?.upvotes).toBe(store.MAX_UPVOTES);
});

test("simultaneous votes all land", async () => {
  const cuid = await freshLobby();
  const item = await store.addItem({ lobbyCuid: cuid, longName: "Pizza" });

  await Promise.all(
    Array.from({ length: 10 }, () => store.voteOnItem(cuid, item.id, 1)),
  );
  expect((await store.getItem(cuid, item.id))?.upvotes).toBe(10);
});

test("voting on a missing item reports nothing rather than inventing one", async () => {
  const cuid = await freshLobby();
  expect(await store.voteOnItem(cuid, "nope", 1)).toBeUndefined();
});

test("editing an item can clear its url, and selecting stamps it", async () => {
  const cuid = await freshLobby();
  const item = await store.addItem({
    lobbyCuid: cuid,
    longName: "Pizza",
    url: "https://example.com",
  });

  const renamed = await store.updateItem({
    lobbyCuid: cuid,
    itemId: item.id,
    longName: "Deep Dish",
    url: null,
  });
  expect(renamed?.longName).toBe("Deep Dish");
  expect(renamed?.url).toBeNull();

  const selected = await store.selectItem(cuid, item.id);
  expect(Date.parse(selected!.lastSelectedAt)).toBeGreaterThan(
    Date.parse(item.lastSelectedAt),
  );

  await store.removeItem(cuid, item.id);
  expect(await store.getItem(cuid, item.id)).toBeUndefined();
  expect(
    await store.updateItem({
      lobbyCuid: cuid,
      itemId: item.id,
      longName: "gone",
      url: null,
    }),
  ).toBeUndefined();
});

test("the log reads newest first and is capped", async () => {
  const cuid = await freshLobby();
  for (let i = 0; i < 12; i++) {
    await store.appendLog({
      lobbyCuid: cuid,
      timestamp: new Date(Date.now() + i * 1000).toISOString(),
      data: { action: "selectItem", message: `pick ${i}` },
    });
  }
  const logs = await store.listLogs(cuid, 10);
  expect(logs).toHaveLength(10);
  expect(logs[0]?.data.message).toBe("pick 11");
  expect(logs[9]?.data.message).toBe("pick 2");
});

test("entries written in the same millisecond both survive", async () => {
  const cuid = await freshLobby();
  const timestamp = new Date().toISOString();
  await Promise.all([
    store.appendLog({
      lobbyCuid: cuid,
      timestamp,
      data: { action: "selectItem", message: "first" },
    }),
    store.appendLog({
      lobbyCuid: cuid,
      timestamp,
      data: { action: "selectItem", message: "second" },
    }),
  ]);
  expect(await store.listLogs(cuid)).toHaveLength(2);
});

test("deleting a wheel takes its items and log with it", async () => {
  const cuid = await freshLobby();
  await store.addItem({ lobbyCuid: cuid, longName: "Pizza" });
  await store.appendLog({
    lobbyCuid: cuid,
    timestamp: new Date().toISOString(),
    data: { action: "selectItem", message: "Pizza selected" },
  });

  await store.deleteLobby(cuid);

  expect(await store.getLobbyWithItems(cuid)).toBeUndefined();
  expect(await store.listLogs(cuid)).toEqual([]);
  // The cuid is free again, and the new wheel starts with an empty history.
  expect(
    await store.createLobby({ cuid, name: "Reused", description: null }),
  ).toBe("created");
  expect(await store.listLogs(cuid)).toEqual([]);
});

test("a wheel bigger than one batch reads and deletes whole", async () => {
  const cuid = await freshLobby();
  // More than the 25 rows BatchWrite accepts at once, so the delete has to loop and resend.
  const created = await Promise.all(
    Array.from({ length: 60 }, (_, i) =>
      store.addItem({ lobbyCuid: cuid, longName: `Item ${i}` }),
    ),
  );
  expect(created).toHaveLength(60);

  const lobby = await store.getLobbyWithItems(cuid);
  expect(lobby?.items).toHaveLength(60);
  expect(await store.listItemIds(cuid)).toHaveLength(60);

  await store.deleteLobby(cuid);
  expect(await store.getLobbyWithItems(cuid)).toBeUndefined();
  expect(await store.listItemIds(cuid)).toEqual([]);
});

test("the webhook survives a round trip, and an unknown wheel reports back", async () => {
  const cuid = await freshLobby();
  expect(
    await store.updateLobbyWebhook({
      cuid,
      selectWebhookUrl: "https://example.com/hook",
      selectWebhookBody: { text: "$USER$ picked $ITEM_PICKED$" },
    }),
  ).toBe(true);

  const lobby = await store.getLobbyWithItems(cuid);
  expect(lobby?.selectWebhookUrl).toBe("https://example.com/hook");
  expect(lobby?.selectWebhookBody).toEqual({
    text: "$USER$ picked $ITEM_PICKED$",
  });

  expect(
    await store.updateLobbyWebhook({
      cuid: "does-not-exist",
      selectWebhookUrl: "https://example.com/hook",
      selectWebhookBody: {},
    }),
  ).toBe(false);
});

test("a read only restamps lastReadAt once it is stale", async () => {
  const cuid = await freshLobby();
  const fresh = await store.getLobbyWithItems(cuid);
  store.touchLobbyRead(fresh!);
  await new Promise((resolve) => setTimeout(resolve, 200));
  expect((await store.getLobby(cuid))?.lastReadAt).toBe(fresh?.lastReadAt);

  store.touchLobbyRead({
    cuid,
    lastReadAt: new Date(Date.now() - 60 * 60 * 1000).toISOString(),
  });
  await expect
    .poll(async () => (await store.getLobby(cuid))?.lastReadAt)
    .not.toBe(fresh?.lastReadAt);
});
