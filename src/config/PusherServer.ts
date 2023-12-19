import Pusher from "pusher";
import { env } from "~/env";

export const PusherServer = new Pusher({
  appId: env.SOKETI_APP_ID,
  key: env.NEXT_PUBLIC_SOKETI_KEY,
  secret: env.SOKETI_SECRET,
  cluster: "",
  useTLS: true,
  host: env.NEXT_PUBLIC_SOKETI_URL,
});
