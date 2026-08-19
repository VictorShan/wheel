import { getAuth } from "@clerk/nextjs/server";
import { fetchRequestHandler } from "@trpc/server/adapters/fetch";
import { type NextRequest } from "next/server";

import { env } from "~/env";
import { appRouter } from "~/server/api/root";
import { createTRPCContext } from "~/server/api/trpc";

/**
 * This wraps the `createTRPCContext` helper and provides the required context for the tRPC API when
 * handling a HTTP request (e.g. when you make requests from Client Components).
 */
const createContext = async (req: NextRequest) => {
  return createTRPCContext({
    headers: req.headers,
    userId: getUserId(req),
  });
};

/**
 * Resolving the signed-in user is best effort. `getAuth` throws when Clerk can't make sense of the
 * request, and letting that escape would fail the whole batched request — including the public
 * queries that render a wheel for a visitor who never signs in.
 */
const getUserId = (req: NextRequest) => {
  try {
    return getAuth(req).userId;
  } catch (error) {
    console.error(
      "Failed to resolve the signed-in user:",
      error instanceof Error ? error.message : error,
    );
    return null;
  }
};

const handler = (req: NextRequest) =>
  fetchRequestHandler({
    endpoint: "/api/trpc",
    req,
    router: appRouter,
    createContext: () => createContext(req),
    onError:
      env.NODE_ENV === "development"
        ? ({ path, error }) => {
            console.error(
              `❌ tRPC failed on ${path ?? "<no-path>"}: ${error.message}`,
            );
          }
        : undefined,
  });

export { handler as GET, handler as POST };
