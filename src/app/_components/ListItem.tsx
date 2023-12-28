"use client";
import { useState } from "react";
import { type Item } from "./types";
import { useRouter } from "next/navigation";
import { api } from "~/trpc/react";

export default function ListItem({
  item,
  chooseItem,
}: {
  item: Item;
  chooseItem: (itemId: number) => void;
}) {
  return (
    <li
      key={item.id}
      className="my-2 flex items-center justify-between rounded-lg border-2 border-solid border-black p-2 dark:border-gray-400"
    >
      <span className="p-1">{item.longName}</span>
      <Button item={item} chooseItem={chooseItem} />
    </li>
  );
}

function Button({
  item,
  chooseItem,
}: {
  item: Item;
  chooseItem: (itemId: number) => void;
}) {
  const router = useRouter();
  const removeItem = api.items.removeItem.useMutation({
    onSuccess: () => {
      router.refresh();
    },
  });
  const [confirmDelete, setConfirmDelete] = useState<boolean>(false);
  if (confirmDelete) {
    return (
      <div className="flex gap-2">
        <button
          className="btn"
          onClick={() => {
            removeItem.mutate({
              lobbyCuid: item.lobbyCuid,
              itemId: item.id,
            });
          }}
        >
          Delete
        </button>
        <button className="btn" onClick={() => setConfirmDelete(false)}>
          Cancel
        </button>
      </div>
    );
  }
  return (
    <div className="flex gap-4">
      <button className="btn" onClick={() => chooseItem(item.id)}>
        View
      </button>
      <button className="btn" onClick={() => setConfirmDelete(true)}>
        X
      </button>
    </div>
  );
}
