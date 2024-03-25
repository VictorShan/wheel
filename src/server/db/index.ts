import { resolve } from "node:path";
import { db } from "~/server/db/db";
import { migrate } from "drizzle-orm/libsql/migrator";

(async () => {
  console.log("Migrating database");
  console.log(
    "Database URL:",
    resolve(import.meta.dirname, "../../../drizzle-migration"),
  );
  await migrate(db, {
    migrationsFolder: resolve(
      import.meta.dirname,
      "../../../drizzle-migration",
    ),
  });
})();
