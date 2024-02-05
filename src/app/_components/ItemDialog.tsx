"use client";

import { useContext } from "react";
import { ItemsContext } from "./providers";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
} from "~/components/ui/dialog";
import { api } from "~/trpc/react";
import { toast } from "sonner";
import { Button } from "~/components/ui/button";

export default function ItemDialog({
  itemId,
  onClose,
}: {
  itemId?: number;
  onClose: () => void;
}) {
  const items = useContext(ItemsContext);
  const item = items?.find((item) => item.id === itemId);
  const selectItem = api.items.selectItem.useMutation({
    onError: (error) => {
      toast(error.message);
    },
  });
  const upvoteItem = api.items.upvoteItem.useMutation({
    onError: (error) => {
      toast(error.message);
    },
  });
  const downvoteItem = api.items.downvoteItem.useMutation({
    onError: (error) => {
      toast(error.message);
    },
  });

  if (!item) {
    console.log("Item not found");

    return <></>;
  }

  return (
    <Dialog
      open={!!item}
      onOpenChange={(open) => {
        if (!open) {
          onClose();
        }
      }}
    >
      <DialogContent>
        <DialogHeader>{item.longName || item.shortName}</DialogHeader>
        <DialogDescription>
          <p>
            Last ordered:{" "}
            {item.lastSelectedAt.toLocaleDateString("en-US", {
              weekday: "long",
              year: "numeric",
              month: "long",
              day: "numeric",
            })}
          </p>
        </DialogDescription>
        <div className="flex items-center justify-between">
          <p>Upvotes: {item.upvotes ?? 0}</p>
          <div className="flex gap-2">
            <Button
              onClick={() => {
                upvoteItem.mutate({
                  itemId: itemId!,
                  lobbyCuid: item.lobbyCuid,
                });
              }}
            >
              +
            </Button>
            <Button
              onClick={() => {
                downvoteItem.mutate({
                  itemId: itemId!,
                  lobbyCuid: item.lobbyCuid,
                });
              }}
            >
              -
            </Button>
          </div>
        </div>
        <DialogFooter className="flex flex-col gap-2 md:flex-row">
          <Button disabled={!item.url}>
            <a href={item.url ?? ""} target="_blank" rel="noopener noreferrer">
              Open Link
            </a>
          </Button>
          <Button
            className="btn"
            onClick={() => {
              selectItem.mutate({ itemId: itemId!, lobbyCuid: item.lobbyCuid });
            }}
          >
            Select
          </Button>
          <DialogClose asChild>
            <Button className="btn">Close</Button>
          </DialogClose>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
