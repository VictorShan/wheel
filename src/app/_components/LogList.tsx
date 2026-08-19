"use client";

import { memo, useEffect } from "react";
import { api } from "~/trpc/react";
import { usePusher } from "./usePusher";
import { ITEM_EVENT, getLobbyChannelName } from "~/config/PusherConstants";
import { toast } from "sonner";
import { formatTimestamp } from "./formatTimestamp";

function LogList({ lobbyId }: { lobbyId: string }) {
  const log = api.lobbyLogs.getLogs.useQuery({ lobbyCuid: lobbyId });
  usePusher(getLobbyChannelName(lobbyId), ITEM_EVENT, () => {
    void log.refetch();
  });

  // Toasting straight from the render path fired again on every render and every retry.
  const errorMessage = log.isError ? log.error.message : undefined;
  useEffect(() => {
    if (errorMessage) toast(errorMessage);
  }, [errorMessage]);

  if (log.isError) {
    return <p>Error loading logs</p>;
  }
  return (
    <div>
      <h2>Log</h2>
      <ul className="ml-6 flex list-disc flex-col">
        {log.data?.length === 0 && <li className="list-none">Nothing yet</li>}
        {log.data?.map((log) => (
          <li key={log.id}>
            {log.data.message} -{" "}
            {formatTimestamp(log.timestamp, {
              month: "short",
              day: "numeric",
              hour: "numeric",
              minute: "2-digit",
            })}
          </li>
        ))}
      </ul>
    </div>
  );
}

const LogListMemo = memo(
  LogList,
  (prev, next) => prev.lobbyId === next.lobbyId,
);
export default LogListMemo;
