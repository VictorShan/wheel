"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "~/components/ui/button";
import { api } from "~/trpc/react";
import { ReloadIcon } from "@radix-ui/react-icons";
import { Input } from "~/components/ui/input";

export function CreateLobby() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");

  const createLobby = api.lobbies.createLobby.useMutation({
    onSuccess: (data?: string) => {
      router.push(`/${data}`);
    },
    onError: (error) => {
      toast(error.message);
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
      <Input
        type="text"
        placeholder="Lobby Name"
        value={name}
        onChange={(e) => setName(e.target.value)}
        className="w-full px-4 py-2"
      />
      <Input
        type="text"
        placeholder="Description"
        value={description}
        onChange={(e) => setDescription(e.target.value)}
        className="w-full px-4 py-2"
      />
      <Button
        variant="default"
        type="submit"
        className="font-semibold transition"
        disabled={createLobby.isLoading}
      >
        {createLobby.isLoading && (
          <ReloadIcon className="mr-2 h-4 w-4 animate-spin" />
        )}
        {createLobby.isLoading ? "Submitting..." : "Submit"}
      </Button>
    </form>
  );
}
