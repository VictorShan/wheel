"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { api } from "~/trpc/react";
import { toast } from "sonner";
import { Button } from "~/components/ui/button";
import { ReloadIcon } from "@radix-ui/react-icons";
import { Card, CardContent, CardHeader } from "~/components/ui/card";

export function AddItem({ lobbyCuid }: { lobbyCuid: string }) {
  const router = useRouter();
  const [name, setName] = useState("");
  const [url, setUrl] = useState("");

  const addItem = api.items.addItem.useMutation({
    onSuccess: () => {
      router.refresh();
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
        <form
          onSubmit={(e) => {
            e.preventDefault();
            void addItem.mutate({
              lobbyCuid,
              item: {
                longName: name,
                url: url,
              },
            });
            setName("");
            setUrl("");
          }}
          className="flex flex-col gap-2"
        >
          <input
            type="text"
            placeholder="Item Name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full rounded-full px-4 py-2 text-black"
          />
          <input
            type="text"
            placeholder="URL"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            className="w-full rounded-full px-4 py-2 text-black"
          />
          <Button
            type="submit"
            className="rounded-full px-10 py-3 transition"
            disabled={addItem.isLoading}
          >
            {addItem.isLoading && (
              <ReloadIcon className="mr-2 h-4 w-4 animate-spin" />
            )}
            {addItem.isLoading ? "Submitting..." : "Submit"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
