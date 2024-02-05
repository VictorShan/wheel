"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { api } from "~/trpc/react";
import { toast } from "sonner";

export function AddItem({ lobbyCuid }: { lobbyCuid: string }) {
  const router = useRouter();
  const [name, setName] = useState("");
  const [url, setUrl] = useState("");

  const createLobby = api.items.addItem.useMutation({
    onSuccess: () => {
      router.refresh();
    },
    onError: (error) => {
      toast(error.message);
    },
  });

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        void createLobby.mutate({
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
      <h2>Add Items</h2>
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
      <button
        type="submit"
        className="rounded-full bg-white/10 px-10 py-3 font-semibold transition hover:bg-white/20"
        disabled={createLobby.isLoading}
      >
        {createLobby.isLoading ? "Submitting..." : "Submit"}
      </button>
    </form>
  );
}
