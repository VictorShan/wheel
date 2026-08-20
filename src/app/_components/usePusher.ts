import { useEffect, useRef, useState } from "react";
import type { Channel } from "pusher-js";
import { PusherClient } from "~/config/PusherClient";

export function usePusher(
  channelName: string,
  eventName: string,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  callback: (data: any) => void,
) {
  const [channel, setChannel] = useState<Channel>();
  // The subscription is only rebuilt when the channel or event changes, so binding `callback`
  // directly would pin the handler to whatever closure the first render happened to create.
  const callbackRef = useRef(callback);
  callbackRef.current = callback;

  useEffect(() => {
    const channel = PusherClient.subscribe(channelName);
    const handler = (data: unknown) => callbackRef.current(data);
    channel.bind(eventName, handler);
    setChannel(channel);
    return () => {
      channel.unbind(eventName, handler);
      PusherClient.unsubscribe(channelName);
    };
  }, [channelName, eventName]);

  return channel!;
}
