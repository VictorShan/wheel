// Example model schema from the Drizzle docs
// https://orm.drizzle.team/docs/sql-schema-declaration

import { relations, sql } from "drizzle-orm";
import {
  bigint,
  index,
  mysqlTableCreator,
  timestamp,
  varchar,
  text,
  json,
} from "drizzle-orm/mysql-core";

/**
 * This is an example of how to use the multi-project schema feature of Drizzle ORM. Use the same
 * database instance for multiple projects.
 *
 * @see https://orm.drizzle.team/docs/goodies#multi-project-schema
 */
export const mysqlTable = mysqlTableCreator((name) => `lunch-wheel_${name}`);

export const lobbies = mysqlTable(
  "lobby",
  {
    cuid: varchar("cuid", { length: 64 }).primaryKey(),
    name: varchar("name", { length: 256 }),
    createdAt: timestamp("created_at")
      .default(sql`CURRENT_TIMESTAMP`)
      .notNull(),
    updatedAt: timestamp("updatedAt").onUpdateNow(),
    lastReadAt: timestamp("last_read_at")
      .default(sql`CURRENT_TIMESTAMP`)
      .notNull(),
    description: text("text"),
  },
  (example) => ({
    nameIndex: index("name_idx").on(example.name),
  }),
);

export const lobbyRelations = relations(lobbies, ({ many }) => ({
  items: many(items),
  logs: many(lobbyLogs),
}));

export const items = mysqlTable(
  "item",
  {
    id: bigint("id", { mode: "number" }).primaryKey().autoincrement(),
    lobbyCuid: varchar("lobby_cuid", { length: 64 }).notNull(),
    longName: varchar("name", { length: 256 }).notNull(),
    shortName: varchar("short_name", { length: 20 }),
    createdAt: timestamp("created_at")
      .default(sql`CURRENT_TIMESTAMP`)
      .notNull(),
    updatedAt: timestamp("updatedAt").onUpdateNow(),
    upvotes: bigint("upvotes", { mode: "number" }).default(0).notNull(),
    url: varchar("url", { length: 512 }),
    imageUrl: varchar("image_url", { length: 512 }),
    lastSelectedAt: timestamp("last_selected_at").defaultNow().notNull(),
  },
  (example) => ({
    nameIndex: index("lobbyId_idx").on(example.lobbyCuid),
  }),
);

export const lobbyLogs = mysqlTable(
  "lobby_log",
  {
    id: bigint("id", { mode: "number" }).primaryKey().autoincrement(),
    lobbyCuid: varchar("lobby_cuid", { length: 64 }).notNull(),
    timestamp: timestamp("timestamp")
      .default(sql`CURRENT_TIMESTAMP`)
      .notNull(),
    data: json("data")
      .$type<{
        action: string;
        message: string;
      }>()
      .notNull(),
  },
  (example) => ({
    nameIndex: index("lobbyId_idx").on(example.lobbyCuid),
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
