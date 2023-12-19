import PusherJS from "pusher-js";
import { env } from "~/env";

export const PusherClient = new PusherJS(env.NEXT_PUBLIC_SOKETI_KEY, {
  cluster: "", // Unused
  wsHost: env.NEXT_PUBLIC_SOKETI_URL,
  forceTLS: true,
  disableStats: true,
  enabledTransports: ["ws", "wss"],
});

export const SELECTED_CHANNEL = "client-selected-channel";
export const ADD_ITEM = "client-add-item";
