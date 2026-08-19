"use client";

import { useState } from "react";
import { api } from "~/trpc/react";
import { toast } from "sonner";
import { Button } from "~/components/ui/button";
import { ReloadIcon } from "@radix-ui/react-icons";
import { Card, CardContent, CardHeader } from "~/components/ui/card";
import { Input } from "~/components/ui/input";
import { SignedIn, SignedOut } from "@clerk/nextjs";
import { SignInPrompt } from "./SignInPrompt";

export function AddItem({ lobbyCuid }: { lobbyCuid: string }) {
  const utils = api.useUtils();
  const [name, setName] = useState("");
  const [url, setUrl] = useState("");
  const [urlError, setUrlError] = useState<string>();

  const addItem = api.items.addItem.useMutation({
    onSuccess: async () => {
      setName("");
      setUrl("");
      setUrlError(undefined);
      // The realtime event is how *other* people find out. Refetching here is what makes the item
      // show up for the person who added it, whether or not the broadcast makes it back.
      await utils.lobbies.getLobbyInfo.invalidate({ lobbyCuid });
    },
    onError: (error) => {
      toast(error.message);
    },
  });

  return (
    <Card>
      <CardHeader>
        <h2>Add Items</h2>
      </CardHeader>
      <CardContent>
        <SignedOut>
          <SignInPrompt action="add items to this wheel" />
        </SignedOut>
        <SignedIn>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              const trimmedUrl = url.trim();
              if (trimmedUrl && !isHttpUrl(trimmedUrl)) {
                setUrlError("Enter a full URL, including https://");
                return;
              }
              setUrlError(undefined);
              addItem.mutate({
                lobbyCuid,
                item: {
                  longName: name.trim(),
                  url: trimmedUrl,
                },
              });
            }}
            className="flex flex-col gap-2"
          >
            <Input
              type="text"
              placeholder="Item Name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-4 py-2"
            />
            <Input
              type="text"
              inputMode="url"
              placeholder="URL (optional)"
              value={url}
              onChange={(e) => {
                setUrl(e.target.value);
                setUrlError(undefined);
              }}
              className="w-full px-4 py-2"
            />
            {urlError && <p className="text-sm text-destructive">{urlError}</p>}
            <Button
              type="submit"
              className="px-10 py-3 transition"
              disabled={addItem.isLoading || name.trim().length === 0}
            >
              {addItem.isLoading && (
                <ReloadIcon className="mr-2 h-4 w-4 animate-spin" />
              )}
              {addItem.isLoading ? "Submitting..." : "Submit"}
            </Button>
          </form>
        </SignedIn>
      </CardContent>
    </Card>
  );
}

function isHttpUrl(value: string) {
  try {
    const { protocol } = new URL(value);
    return protocol === "http:" || protocol === "https:";
  } catch {
    return false;
  }
}
