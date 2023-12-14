"use client";
import Wheel, { type WheelItem } from "~/app/_components/Wheel";
import { api } from "~/trpc/react";
import type { inferRouterOutputs } from "@trpc/server";
import type { AppRouter } from "~/server/api/root";
import { AddItem } from "../_components/add-item";

type ApiOutput = inferRouterOutputs<AppRouter>;
type LobbyInfo = ApiOutput["lobbies"]["getLobbyInfo"];

export default function Page({ params }: { params: { wheelId: string } }) {
  const lobbyInfo = api.lobbies.getLobbyInfo.useQuery({
    lobbyCuid: params.wheelId,
  });
  const wheelItems = generateWheelItems(lobbyInfo.data);
  return (
    <article className="p-10">
      <h1>Page {lobbyInfo.data?.name ?? params.wheelId}</h1>
      <div className="flex">
        <div>
          <Wheel wheelItems={wheelItems} />
        </div>
        <div>
          <h2>Items</h2>
          <ul>
            {wheelItems.map((item) => (
              <li key={item.longName}>{item.longName}</li>
            ))}
          </ul>
          <AddItem lobbyCuid={params.wheelId} />
        </div>
      </div>
    </article>
  );
}

function generateWheelItems(data: LobbyInfo): WheelItem[] {
  const wheelItems: WheelItem[] = [];
  if (!data?.items) return randomItems;
  data.items.forEach((item) => {
    wheelItems.push({
      longName: item.longName,
      shortName: item.shortName,
      weight: Math.max(item.upvotes - item.downvotes, 1),
      callback: () => console.log(item.longName),
    });
  });
  if (wheelItems.length === 0) return randomItems;
  return wheelItems;
}

const randomItems: WheelItem[] = [
  {
    longName: "Item 1",
    weight: 1,
    callback: () => console.log("Item 1"),
  },
  {
    longName: "Item 2",
    weight: 1,
    callback: () => console.log("Item 2"),
  },
  {
    longName: "Item 3",
    weight: 1.5,
    callback: () => console.log("Item 3"),
  },
  {
    longName: "Item 4",
    weight: 1.5,
    callback: () => console.log("Item 4"),
  },
  {
    longName: "Item 5",
    weight: 1.5,
    callback: () => console.log("Item 5"),
  },
];
