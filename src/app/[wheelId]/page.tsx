"use client";
import Wheel, { type WheelItem } from "~/app/_components/Wheel";
import { api } from "~/trpc/react";
import { AddItem } from "../_components/add-item";
import { useCallback, useState } from "react";
import { type Item } from "../_components/types";
import { usePusher } from "~/app/_components/usePusher";
import { ITEM_EVENT, getLobbyChannelName } from "~/config/PusherConstants";
import { ItemsContext } from "../_components/providers";
import LogListMemo from "../_components/LogList";
import ItemDialog from "../_components/ItemDialog";
import LobbySettings from "../_components/LobbySettings";
import { Button } from "~/components/ui/button";
import ItemTable from "../_components/ItemTable";

export default function Page({ params }: { params: { wheelId: string } }) {
  const [itemId, setItemId] = useState<{ id: number }>();
  const [wheelItems, setItems] = useState<WheelItem[]>([]);
  const [willShuffle, setWillShuffle] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const lobbyInfo = api.lobbies.getLobbyInfo.useQuery(
    {
      lobbyCuid: params.wheelId,
    },
    {
      onSuccess: (data) => {
        !data
          ? setItems([])
          : setItems(
              generateWheelItems(data.items, (i: number) => {
                if (!data.items || i >= data.items.length || i < 0) {
                  setItemId(undefined);
                } else {
                  setItemId({ id: data.items[i]!.id });
                }
              }),
            );
      },
    },
  );
  usePusher(
    getLobbyChannelName(params.wheelId),
    ITEM_EVENT,
    (_: { item: Item }) => {
      void lobbyInfo.refetch();
    },
  );

  const closeModal = useCallback(() => {
    setItemId(undefined);
  }, [setItemId]);

  return (
    <main className="flex min-h-screen w-screen items-center justify-center">
      <ItemsContext.Provider value={lobbyInfo.data?.items}>
        <article className="container p-6">
          <div className="flex flex-row justify-between">
            <h1 className="text-4xl">
              {lobbyInfo.data?.name ?? params.wheelId}
            </h1>
            <Button onClick={() => setIsEditOpen(true)}>Edit Lobby</Button>
          </div>
          <div className="flex flex-col justify-center md:flex-row">
            <div className="">
              <Wheel
                lobbyCuid={params.wheelId}
                shuffleOnSpin={willShuffle}
                wheelItems={wheelItems}
              />
              <label className="label flex cursor-pointer justify-end">
                <span className="label-text mr-6">Shuffle on spin</span>
                <input
                  type="checkbox"
                  className="toggle toggle-primary"
                  checked={willShuffle}
                  onChange={() => {
                    setWillShuffle(!willShuffle);
                  }}
                />
              </label>
            </div>
            <div className="flex flex-col gap-8 p-5">
              <section>
                <AddItem lobbyCuid={params.wheelId} />
                <ItemTable
                  onItemSelect={(itemId) => setItemId({ id: itemId })}
                />
              </section>
              <section>
                <LogListMemo lobbyId={params.wheelId} />
              </section>
            </div>
          </div>
        </article>
        <ItemDialog
          itemId={itemId?.id}
          onClose={closeModal}
          postUrl={lobbyInfo.data?.selectWebhookUrl ?? undefined}
          postBody={lobbyInfo.data?.selectWebhookBody ?? undefined}
        />
      </ItemsContext.Provider>
      <LobbySettings
        lobbyId={params.wheelId}
        shouldOpen={isEditOpen}
        onClose={() => setIsEditOpen(false)}
      />
    </main>
  );
}

function generateWheelItems(
  items: Item[] | undefined,
  selectItem: (i: number) => void,
): WheelItem[] {
  const wheelItems: WheelItem[] = [];
  const minimumWeight =
    items?.reduce((acc, item) => {
      return Math.min(acc, item.upvotes);
    }, Infinity) ?? 1;
  items?.forEach((item, i) => {
    const dateDiff = Date.now() - new Date(item.lastSelectedAt).getTime();
    const daysSinceLastSelected = Math.ceil(dateDiff / (1000 * 60 * 60 * 24));
    const daysSinceLastSelectedWeight = Math.min(1, daysSinceLastSelected / 5);
    const weight = item.upvotes - minimumWeight + 1; // Minimum weight will be 1

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
