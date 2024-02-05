"use client";

import { memo } from "react";
import { api } from "~/trpc/react";
import { usePusher } from "./usePusher";
import { ITEM_EVENT, getLobbyChannelName } from "~/config/PusherConstants";

function LogList({ lobbyId }: { lobbyId: string }) {
  const log = api.lobbyLogs.getLogs.useQuery({ lobbyCuid: lobbyId });
  usePusher(getLobbyChannelName(lobbyId), ITEM_EVENT, () => {
    void log.refetch();
  });
  return (
    <div>
      <h2>Log</h2>
      <ul className="ml-6 flex list-disc flex-col-reverse">
        {log.data?.map((log) => (
          <li key={log.id}>
            {log.data.message} - {log.timestamp.toLocaleString()}
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
