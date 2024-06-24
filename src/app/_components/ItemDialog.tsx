"use client";

import { useContext, useRef, useState } from "react";
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
import { Pencil2Icon } from "@radix-ui/react-icons";
import { Input } from "~/components/ui/input";

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
  const [editMode, setEditMode] = useState(false);
  const items = useContext(ItemsContext);
  const item = items?.find((item) => item.id === itemId);
  const nameRef = useRef<string | undefined>(undefined);
  const urlRef = useRef<string | undefined>(undefined);
  nameRef.current = item?.longName ?? item?.shortName ?? undefined;
  urlRef.current = item?.url ?? undefined;
  const auth = useUser();
  const userString =
    auth.user?.fullName ??
    auth.user?.firstName ??
    auth.user?.lastName ??
    auth.user?.username ??
    undefined;
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
        mode: "no-cors",
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
  const updateItem = api.items.updateItem.useMutation({
    onSuccess: () => {
      setEditMode(false);
    },
    onError: (error) => {
      toast(error.message);
    },
  });
  const removeItem = api.items.removeItem.useMutation({
    onSuccess: () => {
      onClose();
    },
    onError: (error) => {
      toast(error.message);
    },
  });

  if (!item) {
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
        <DialogHeader className="flex flex-row p-1 align-middle">
          {editMode ? (
            <div className="w-full">
              <Input
                className="mt-2"
                placeholder={nameRef.current ?? "Item Name"}
                onChange={(e) => {
                  nameRef.current = e.target.value;
                }}
              />
              <Input
                placeholder={item.url ?? "URL"}
                onChange={(e) => {
                  urlRef.current = e.target.value;
                }}
              />
            </div>
          ) : (
            <>
              <h1 className="my-2 text-2xl">{nameRef.current}</h1>
              <Button
                className="mx-2 my-2"
                variant="ghost"
                onClick={() => setEditMode(true)}
              >
                <Pencil2Icon />
              </Button>
            </>
          )}
        </DialogHeader>
        <DialogDescription>
          <p>
            Last ordered:{" "}
            {new Date(item.lastSelectedAt).toLocaleDateString("en-US", {
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
          {editMode ? (
            <>
              <Button
                onClick={() => {
                  removeItem.mutate({
                    itemId: itemId!,
                    lobbyCuid: item.lobbyCuid,
                  });
                }}
                variant="destructive"
              >
                Delete Item
              </Button>
              <Button
                variant="secondary"
                onClick={() => {
                  setEditMode(false);
                  if (nameRef.current !== item.longName) {
                    nameRef.current =
                      item.longName ?? item.shortName ?? undefined;
                  }
                }}
              >
                Cancel
              </Button>
              <Button
                onClick={() => {
                  updateItem.mutate({
                    lobbyCuid: item.lobbyCuid,
                    itemId: itemId!,
                    longName: nameRef.current ?? item.longName,
                    url: urlRef.current ?? undefined,
                  });
                }}
              >
                Save
              </Button>
            </>
          ) : (
            <>
              <Button disabled={!item.url}>
                <a
                  href={item.url ?? ""}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  Open Link
                </a>
              </Button>
              <Button
                className="btn"
                onClick={() => {
                  selectItem.mutate({
                    itemId: itemId!,
                    lobbyCuid: item.lobbyCuid,
                  });
                }}
              >
                Select
              </Button>
              <DialogClose asChild>
                <Button className="btn">Close</Button>
              </DialogClose>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
