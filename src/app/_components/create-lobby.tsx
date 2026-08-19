"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "~/components/ui/button";
import { api } from "~/trpc/react";
import { ReloadIcon } from "@radix-ui/react-icons";
import { Input } from "~/components/ui/input";
import { SignedIn, SignedOut } from "@clerk/nextjs";
import { SignInPrompt } from "./SignInPrompt";

export function CreateLobby() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");

  const createLobby = api.lobbies.createLobby.useMutation({
    onSuccess: (data) => {
      router.push(`/${data}`);
    },
    onError: (error) => {
      toast(error.message);
    },
  });

  return (
    <>
      <SignedOut>
        <SignInPrompt action="create a wheel" />
      </SignedOut>
      <SignedIn>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            createLobby.mutate({
              name: name.trim(),
              description: description.trim() || null,
            });
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
            disabled={createLobby.isLoading || name.trim().length === 0}
          >
            {createLobby.isLoading && (
              <ReloadIcon className="mr-2 h-4 w-4 animate-spin" />
            )}
            {createLobby.isLoading ? "Submitting..." : "Submit"}
          </Button>
        </form>
      </SignedIn>
    </>
  );
}
