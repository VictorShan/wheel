import { createEnv } from "@t3-oss/env-nextjs";
import { z } from "zod";

export const env = createEnv({
  /**
   * Specify your server-side environment variables schema here. This way you can ensure the app
   * isn't built with invalid env vars.
   */
  server: {
    AWS_REGION: z.string().min(1),
    DDB_TABLE_NAME: z.string().min(1),
    /** Set to point at a local DynamoDB (dynalite, DynamoDB Local); unset in production. */
    DDB_ENDPOINT: z.string().url().optional(),
    /**
     * Turso is only read by the one-shot migration script now that the app runs on DynamoDB, so
     * these are optional: the app boots without them.
     */
    TURSO_DATABASE_URL: z.string().url().optional(),
    TURSO_AUTH_TOKEN: z.string().optional(),
    NODE_ENV: z
      .enum(["development", "test", "production"])
      .default("development"),
    CLERK_SECRET_KEY: z.string().min(1),
    SOKETI_SECRET: z.string().min(1),
    SOKETI_APP_ID: z.string().min(1),
  },

  /**
   * Specify your client-side environment variables schema here. This way you can ensure the app
   * isn't built with invalid env vars. To expose them to the client, prefix them with
   * `NEXT_PUBLIC_`.
   */
  client: {
    NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY: z.string(),
    NEXT_PUBLIC_SOKETI_KEY: z.string(),
    NEXT_PUBLIC_SOKETI_URL: z.string(),
  },

  /**
   * You can't destruct `process.env` as a regular object in the Next.js edge runtimes (e.g.
   * middlewares) or client-side so we need to destruct manually.
   */
  runtimeEnv: {
    AWS_REGION: process.env.AWS_REGION,
    DDB_TABLE_NAME: process.env.DDB_TABLE_NAME,
    DDB_ENDPOINT: process.env.DDB_ENDPOINT,
    TURSO_DATABASE_URL: process.env.TURSO_DATABASE_URL,
    TURSO_AUTH_TOKEN: process.env.TURSO_AUTH_TOKEN,
    NODE_ENV: process.env.NODE_ENV,
    NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY:
      process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY,
    CLERK_SECRET_KEY: process.env.CLERK_SECRET_KEY,
    NEXT_PUBLIC_SOKETI_URL: process.env.NEXT_PUBLIC_SOKETI_URL,
    NEXT_PUBLIC_SOKETI_KEY: process.env.NEXT_PUBLIC_SOKETI_KEY,
    SOKETI_SECRET: process.env.SOKETI_SECRET,
    SOKETI_APP_ID: process.env.SOKETI_APP_ID,
  },
  /**
   * Run `build` or `dev` with `SKIP_ENV_VALIDATION` to skip env validation. This is especially
   * useful for Docker builds.
   */
  skipValidation: !!process.env.SKIP_ENV_VALIDATION,
  /**
   * Makes it so that empty strings are treated as undefined.
   * `SOME_VAR: z.string()` and `SOME_VAR=''` will throw an error.
   */
  emptyStringAsUndefined: true,
});
