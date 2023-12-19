"use client";
import Wheel, { type WheelItem } from "~/app/_components/Wheel";
import { api } from "~/trpc/react";
import { AddItem } from "../_components/add-item";
import { useState } from "react";
import { type Item } from "../_components/types";
import Modal from "../_components/Modal";
import ListItem from "../_components/ListItem";
import { usePusher } from "~/app/_components/usePusher";
import { SELECTED_CHANNEL } from "~/config/PusherConstants";

export default function Page({ params }: { params: { wheelId: string } }) {
  const [item, setItem] = useState<Item>();
  const lobbyInfo = api.lobbies.getLobbyInfo.useQuery({
    lobbyCuid: params.wheelId,
  });

  const updateSelected = (data: { item: Item }) => {
    if (data?.item) {
      const selectedItem = data.item;
      // TODO: Make this less hacky
      setItem({
        ...data.item,
        lastSelectedAt:
          selectedItem.lastSelectedAt && new Date(selectedItem.lastSelectedAt),
        createdAt: selectedItem.createdAt && new Date(selectedItem.createdAt),
        updatedAt: selectedItem.updatedAt && new Date(selectedItem.updatedAt),
      });
    }
  };

  const selectedChannel = usePusher(
    params.wheelId,
    SELECTED_CHANNEL,
    updateSelected,
  );
  const wheelItems = generateWheelItems(lobbyInfo.data?.items, (i: number) => {
    if (!lobbyInfo.data?.items || i >= lobbyInfo.data.items.length || i < 0) {
      setItem(undefined);
    } else {
      setItem({ ...lobbyInfo.data.items[i]! });
      selectedChannel.trigger(SELECTED_CHANNEL, {
        item: lobbyInfo.data.items[i],
      });
    }
  });
  return (
    <article className="p-10">
      <h1>Page {lobbyInfo.data?.name ?? params.wheelId}</h1>
      <div className="flex">
        <div>
          <Wheel wheelItems={wheelItems} />
        </div>
        <div className="p-5">
          <h2>Add Items</h2>
          <AddItem lobbyCuid={params.wheelId} />
          <h2>Items</h2>
          <ul>
            {lobbyInfo.data?.items.map((item) => (
              <ListItem item={item} key={item.id} />
            ))}
          </ul>
        </div>
      </div>
      <Modal item={item} />
    </article>
  );
}

function generateWheelItems(
  items: Item[] | undefined,
  selectItem: (i: number) => void,
): WheelItem[] {
  const wheelItems: WheelItem[] = [];
  items?.forEach((item, i) => {
    const dateDiff = Date.now() - item.lastSelectedAt.getTime();
    const daysSinceLastSelected = Math.ceil(dateDiff / (1000 * 60 * 60 * 24));
    const daysSinceLastSelectedWeight = Math.min(1, daysSinceLastSelected / 5);
    const weight = Math.max(item.upvotes, 1);
    wheelItems.push({
      longName: item.longName,
      shortName: item.shortName,
      weight: weight * daysSinceLastSelectedWeight,
      callback: () => selectItem(i),
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
