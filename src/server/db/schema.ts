// Example model schema from the Drizzle docs
// https://orm.drizzle.team/docs/sql-schema-declaration

import { relations, sql } from "drizzle-orm";
import {
  index,
  integer,
  sqliteTableCreator,
  text,
} from "drizzle-orm/sqlite-core";

/**
 * This is an example of how to use the multi-project schema feature of Drizzle ORM. Use the same
 * database instance for multiple projects.
 *
 * @see https://orm.drizzle.team/docs/goodies#multi-project-schema
 */
export const sqlTable = sqliteTableCreator((name) => `wheel_${name}`);

export const lobbies = sqlTable(
  "lobby",
  {
    cuid: text("cuid", { length: 64 }).primaryKey(),
    name: text("name", { length: 256 }),
    createdAt: text("created_at")
      .default(sql`CURRENT_TIMESTAMP`)
      .notNull(),
    updatedAt: text("updatedAt")
      .default(sql`CURRENT_TIMESTAMP`)
      .notNull(),
    lastReadAt: text("last_read_at")
      .default(sql`CURRENT_TIMESTAMP`)
      .notNull(),
    description: text("text"),
    selectWebhookUrl: text("select_webhook_url"),
    selectWebhookBody: text("select_webhook_body", { mode: "json" })
      .notNull()
      .default("{}"),
  },
  (example) => ({
    nameIndex: index("lobby_name_idx").on(example.name),
  }),
);

export const lobbyRelations = relations(lobbies, ({ many }) => ({
  items: many(items),
  logs: many(lobbyLogs),
}));

export const items = sqlTable(
  "item",
  {
    id: integer("id", { mode: "number" }).primaryKey({ autoIncrement: true }),
    lobbyCuid: text("lobby_cuid", { length: 64 }).notNull(),
    longName: text("name", { length: 256 }).notNull(),
    shortName: text("short_name", { length: 20 }),
    createdAt: text("created_at")
      .default(sql`CURRENT_TIMESTAMP`)
      .notNull(),
    updatedAt: text("updated_at")
      .default(sql`CURRENT_TIMESTAMP`)
      .notNull(),
    upvotes: integer("upvotes", { mode: "number" }).default(0).notNull(),
    url: text("url", { length: 512 }),
    imageUrl: text("image_url", { length: 512 }),
    lastSelectedAt: text("last_selected_at")
      .default(sql`CURRENT_TIMESTAMP`)
      .notNull(),
  },
  (example) => ({
    nameIndex: index("item_lobbyId_idx").on(example.lobbyCuid),
  }),
);

export const lobbyLogs = sqlTable(
  "lobby_log",
  {
    id: integer("id", { mode: "number" }).primaryKey({ autoIncrement: true }),
    lobbyCuid: text("lobby_cuid", { length: 64 }).notNull(),
    timestamp: text("timestamp")
      .default(sql`CURRENT_TIMESTAMP`)
      .notNull(),
    data: text("data", { mode: "json" })
      .$type<{
        action: string;
        message: string;
      }>()
      .notNull(),
  },
  (example) => ({
    nameIndex: index("lobby_log_lobbyId_idx").on(example.lobbyCuid),
  }),
);

export const lobbyLogRelations = relations(lobbyLogs, ({ one }) => ({
  lobby: one(lobbies, {
    fields: [lobbyLogs.lobbyCuid],
    references: [lobbies.cuid],
  }),
}));

export const itemLobbies = relations(items, ({ one }) => ({
  lobby: one(lobbies, {
    fields: [items.lobbyCuid],
    references: [lobbies.cuid],
  }),
}));
