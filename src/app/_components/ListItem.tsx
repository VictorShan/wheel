"use client";
import { useState } from "react";
import { Item } from "./types";
import { useRouter } from "next/navigation";
import { api } from "~/trpc/react";

export default function ListItem({ item }: { item: Item }) {
  return (
    <li
      key={item.id}
      className="m-1 flex items-center justify-between rounded-lg border-2 border-solid border-black p-2 dark:border-gray-400"
    >
      <span className="p-1">{item.longName}</span>
      <Button item={item} />
    </li>
  );
}

function Button({ item }: { item: Item }) {
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
    <button className="btn" onClick={() => setConfirmDelete(true)}>
      X
    </button>
  );
}
