import type { inferRouterOutputs } from "@trpc/server";
import type { AppRouter } from "~/server/api/root";

export type ApiOutput = inferRouterOutputs<AppRouter>;
export type LobbyInfo = NonNullable<ApiOutput["lobbies"]["getLobbyInfo"]>;
export type Item = LobbyInfo["items"][number];
