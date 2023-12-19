import { useEffect, useState } from "react";
import { Channel } from "pusher-js";
import { PusherClient } from "~/config/Pusher";

export function usePusher(
  channelName: string,
  eventName: string,
  callback: (data: any) => void,
) {
  const [channel, setChannel] = useState<Channel>();
  useEffect(() => {
    const channel = PusherClient.subscribe(channelName);
    channel.bind(eventName, callback);
    setChannel(channel);
    return () => {
      channel.unbind(eventName);
      PusherClient.unsubscribe(channelName);
    };
  }, [channelName, eventName]);

  return channel!;
}
