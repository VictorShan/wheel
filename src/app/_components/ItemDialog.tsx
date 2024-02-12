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
import { replaceConstants } from "~/config/postRequestUtils";
import { useUser } from "@clerk/nextjs";

export default function ItemDialog({
  itemId,
  onClose,
  postUrl,
  postBody,
}: {
  postUrl?: string;
  postBody?: object;
  itemId?: number;
  onClose: () => void;
}) {
  const items = useContext(ItemsContext);
  const item = items?.find((item) => item.id === itemId);
  const auth = useUser();
  const userString =
    auth.user?.fullName ??
    auth.user?.username ??
    auth.user?.emailAddresses.length
      ? auth.user?.emailAddresses[0]?.emailAddress
      : undefined;
  const itemName = item?.longName ?? item?.shortName;
  const selectItem = api.items.selectItem.useMutation({
    onSuccess: () => {
      toast(`${itemName} selected`);
      onClose();
      if (postUrl === undefined) {
        toast("No POST URL provided");
        return;
      }
      if (!userString || !itemName) {
        toast(
          `Could not send post request by "${userString}" for item "${itemName}".`,
        );
        return;
      }
      const transformBody = replaceConstants(
        userString,
        itemName,
        item?.url ?? "No URL Provided",
      );
      fetch(postUrl, {
        method: "POST",
        mode: "cors",
        headers: {
          "Content-Type": "application/json",
        },
        body: transformBody(JSON.stringify(postBody) ?? "{}"),
      })
        .then(() => {
          toast("POST request sent");
        })
        .catch((e) => {
          toast("Failed to send POST request");
          console.error(e);
        });
    },
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
