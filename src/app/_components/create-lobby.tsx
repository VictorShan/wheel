"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { api } from "~/trpc/react";

export function CreateLobby() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");

  const createLobby = api.lobbies.createLobby.useMutation({
    onSuccess: (data?: string) => {
      router.push(`/${data}`);
    },
  });

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        createLobby.mutate({ name, description });
      }}
      className="flex flex-col gap-2"
    >
      <h1 className="text-center text-lg">Create Lobby</h1>
      <input
        type="text"
        placeholder="Lobby Name"
        value={name}
        onChange={(e) => setName(e.target.value)}
        className="w-full rounded-full px-4 py-2 text-black"
      />
      <input
        type="text"
        placeholder="Description"
        value={description}
        onChange={(e) => setDescription(e.target.value)}
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
