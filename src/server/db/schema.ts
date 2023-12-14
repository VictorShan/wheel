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

export const lobbyItems = relations(lobbies, ({ many }) => ({
  items: many(items),
}));

export const items = mysqlTable(
  "item",
  {
    id: bigint("id", { mode: "number" }).primaryKey().autoincrement(),
    lobbyCuid: varchar("lobby_cuid", { length: 64 }).notNull(),
    longName: varchar("name", { length: 256 }),
    shortName: varchar("short_name", { length: 20 }),
    createdAt: timestamp("created_at")
      .default(sql`CURRENT_TIMESTAMP`)
      .notNull(),
    updatedAt: timestamp("updatedAt").onUpdateNow(),
    upvotes: bigint("upvotes", { mode: "number" }).default(0),
    downvotes: bigint("downvotes", { mode: "number" }).default(0),
    url: varchar("url", { length: 512 }),
    imageUrl: varchar("image_url", { length: 512 }),
  },
  (example) => ({
    nameIndex: index("lobbyId_idx").on(example.lobbyCuid),
  }),
);

export const itemLobbies = relations(items, ({ one }) => ({
  lobby: one(lobbies, {
    fields: [items.lobbyCuid],
    references: [lobbies.cuid],
  }),
}));
