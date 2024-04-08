import { createClient } from "@libsql/client";
import { drizzle } from "drizzle-orm/libsql";
import * as schema from "~/server/db/schema";

import { env } from "~/env";

export const db = drizzle(
  createClient({
    url: env.TURSO_DATABASE_URL,
    authToken: env.TURSO_AUTH_TOKEN,
  }),
  { schema },
);
