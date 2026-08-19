"use client";

import { useContext, useEffect, useState } from "react";
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
import { SignedIn, SignedOut, useUser } from "@clerk/nextjs";
import { Pencil2Icon } from "@radix-ui/react-icons";
import { Input } from "~/components/ui/input";
import { SignInPrompt } from "./SignInPrompt";
import { formatTimestamp } from "./formatTimestamp";

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
  const [name, setName] = useState("");
  const [url, setUrl] = useState("");
  const utils = api.useUtils();
  const lobbyCuid = item?.lobbyCuid;

  // Reset the draft whenever a different item is opened, and drop out of edit mode with it.
  useEffect(() => {
    setName(item?.longName ?? item?.shortName ?? "");
    setUrl(item?.url ?? "");
    setEditMode(false);
  }, [item?.id, item?.longName, item?.shortName, item?.url]);

  const auth = useUser();
  const userString =
    auth.user?.fullName ??
    auth.user?.firstName ??
    auth.user?.lastName ??
    auth.user?.username ??
    undefined;
  const itemName = item?.longName ?? item?.shortName;

  /**
   * Every mutation refetches the lobby. Without this the person who acted saw their own change only
   * if the realtime broadcast made it back to them - so votes appeared not to register.
   */
  const refetchLobby = async () => {
    if (!lobbyCuid) return;
    await Promise.all([
      utils.lobbies.getLobbyInfo.invalidate({ lobbyCuid }),
      utils.lobbyLogs.getLogs.invalidate({ lobbyCuid }),
    ]);
  };

  const selectItem = api.items.selectItem.useMutation({
    onSuccess: async () => {
      toast(`${itemName} selected`);
      await refetchLobby();
      onClose();
      if (postUrl === undefined) {
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
        body: transformBody(JSON.stringify(postBody ?? {})),
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
    onSuccess: refetchLobby,
    onError: (error) => {
      toast(error.message);
    },
  });
  const downvoteItem = api.items.downvoteItem.useMutation({
    onSuccess: refetchLobby,
    onError: (error) => {
      toast(error.message);
    },
  });
  const updateItem = api.items.updateItem.useMutation({
    onSuccess: async () => {
      setEditMode(false);
      await refetchLobby();
    },
    onError: (error) => {
      toast(error.message);
    },
  });
  const removeItem = api.items.removeItem.useMutation({
    onSuccess: async () => {
      await refetchLobby();
      onClose();
    },
    onError: (error) => {
      toast(error.message);
    },
  });

  if (!item || !lobbyCuid) {
    return <></>;
  }

  const isVoting = upvoteItem.isLoading || downvoteItem.isLoading;

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
                placeholder="Item Name"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
              <Input
                type="text"
                inputMode="url"
                placeholder="URL (optional)"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
              />
            </div>
          ) : (
            <>
              <h1 className="my-2 text-2xl">{itemName}</h1>
              <SignedIn>
                <Button
                  className="mx-2 my-2"
                  variant="ghost"
                  onClick={() => setEditMode(true)}
                >
                  <Pencil2Icon />
                </Button>
              </SignedIn>
            </>
          )}
        </DialogHeader>
        <DialogDescription asChild>
          <div>
            <p>Last ordered: {formatTimestamp(item.lastSelectedAt)}</p>
          </div>
        </DialogDescription>
        <div className="flex items-center justify-between">
          <p>Upvotes: {item.upvotes ?? 0}</p>
          <SignedIn>
            <div className="flex gap-2">
              <Button
                disabled={isVoting}
                onClick={() => {
                  upvoteItem.mutate({ itemId: item.id, lobbyCuid });
                }}
              >
                +
              </Button>
              <Button
                disabled={isVoting}
                onClick={() => {
                  downvoteItem.mutate({ itemId: item.id, lobbyCuid });
                }}
              >
                -
              </Button>
            </div>
          </SignedIn>
        </div>
        <SignedOut>
          <SignInPrompt action="vote on items and pick one" />
        </SignedOut>
        <DialogFooter className="flex flex-col gap-2 md:flex-row">
          {editMode ? (
            <>
              <Button
                onClick={() => {
                  removeItem.mutate({ itemId: item.id, lobbyCuid });
                }}
                variant="destructive"
                disabled={removeItem.isLoading}
              >
                Delete Item
              </Button>
              <Button
                variant="secondary"
                onClick={() => {
                  setEditMode(false);
                  setName(item.longName ?? item.shortName ?? "");
                  setUrl(item.url ?? "");
                }}
              >
                Cancel
              </Button>
              <Button
                disabled={updateItem.isLoading || name.trim().length === 0}
                onClick={() => {
                  updateItem.mutate({
                    lobbyCuid,
                    itemId: item.id,
                    longName: name.trim(),
                    // Sent as "" when cleared, which the router stores as NULL.
                    url: url.trim(),
                  });
                }}
              >
                Save
              </Button>
            </>
          ) : (
            <>
              {item.url ? (
                <Button asChild>
                  <a href={item.url} target="_blank" rel="noopener noreferrer">
                    Open Link
                  </a>
                </Button>
              ) : (
                <Button disabled>Open Link</Button>
              )}
              <SignedIn>
                <Button
                  className="btn"
                  disabled={selectItem.isLoading}
                  onClick={() => {
                    selectItem.mutate({ itemId: item.id, lobbyCuid });
                  }}
                >
                  Select
                </Button>
              </SignedIn>
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
