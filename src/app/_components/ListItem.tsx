"use client";
import { useState } from "react";
import { type Item } from "./types";
import { useRouter } from "next/navigation";
import { api } from "~/trpc/react";
import { toast } from "sonner";
import { Button } from "~/components/ui/button";

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
      <ChooseButton item={item} chooseItem={chooseItem} />
    </li>
  );
}

function ChooseButton({
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
    onError: (error) => {
      toast(error.message);
    },
  });
  const [confirmDelete, setConfirmDelete] = useState<boolean>(false);
  if (confirmDelete) {
    return (
      <div className="flex gap-2">
        <Button
          variant="destructive"
          onClick={() => {
            removeItem.mutate({
              lobbyCuid: item.lobbyCuid,
              itemId: item.id,
            });
          }}
        >
          Delete
        </Button>
        <Button variant="outline" onClick={() => setConfirmDelete(false)}>
          Cancel
        </Button>
      </div>
    );
  }
  return (
    <div className="flex gap-4">
      <Button variant="outline" onClick={() => chooseItem(item.id)}>
        View
      </Button>
      <Button variant="outline" onClick={() => setConfirmDelete(true)}>
        X
      </Button>
    </div>
  );
}
