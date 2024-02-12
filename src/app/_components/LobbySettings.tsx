"use client";
import { useMediaQuery } from "usehooks-ts";
import { Button } from "~/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "~/components/ui/dialog";
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
} from "~/components/ui/drawer";
import { useForm } from "react-hook-form";
import { z } from "zod";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "~/components/ui/form";
import { Input } from "~/components/ui/input";
import { api } from "~/trpc/react";
import { zodResolver } from "@hookform/resolvers/zod";
import { Textarea } from "~/components/ui/textarea";
import { InlineCode } from "~/components/ui/InlineCode";
import {
  ITEM_PICKED_STRING,
  ITEM_PICKED_URL,
  USER_STRING,
} from "~/config/postRequestUtils";
import { toast } from "sonner";

const lobbySettingsForm = z.object({
  postUrl: z.string().url(),
  postBody: z
    .string()
    .refine((value) => {
      try {
        JSON.parse(value);
        return true;
      } catch (e) {
        return false;
      }
    })
    .transform((value) => JSON.stringify(JSON.parse(value), null, 2)),
});

export default function LobbySettings({
  lobbyId,
  shouldOpen = false,
  onClose,
}: {
  shouldOpen: boolean;
  lobbyId: string;
  onClose: () => void;
}) {
  const lobbyInfo = api.lobbies.getLobbyInfo.useQuery({ lobbyCuid: lobbyId });
  const isDesktop = useMediaQuery("(min-width: 768px)");
  if (!isDesktop) {
    return (
      <Drawer open={shouldOpen} onClose={onClose}>
        <DrawerContent>
          <DrawerHeader>
            <DrawerTitle>Lobby settings</DrawerTitle>
            <DrawerDescription>Lobby settings description</DrawerDescription>
          </DrawerHeader>
          <div className="p-4">
            <LobbySettingsForm
              lobbyId={lobbyId}
              onClose={onClose}
              postUrl={lobbyInfo.data?.selectWebhookUrl ?? undefined}
              postBody={lobbyInfo.data?.selectWebhookBody ?? undefined}
            />
          </div>
          <DrawerFooter>
            <DrawerClose asChild>
              <Button className="w-full" onClick={onClose}>
                Close
              </Button>
            </DrawerClose>
          </DrawerFooter>
        </DrawerContent>
      </Drawer>
    );
  } else {
    return (
      <Dialog
        open={shouldOpen}
        onOpenChange={(isOpen) => {
          if (!isOpen) {
            onClose();
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Lobby settings</DialogTitle>
            <DialogDescription>Lobby settings description</DialogDescription>
          </DialogHeader>
          <LobbySettingsForm
            lobbyId={lobbyId}
            onClose={onClose}
            postUrl={lobbyInfo.data?.selectWebhookUrl ?? undefined}
            postBody={lobbyInfo.data?.selectWebhookBody ?? undefined}
          />
          <DialogFooter>
            <DialogClose asChild>
              <Button className="w-full" onClick={onClose}>
                Close
              </Button>
            </DialogClose>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    );
  }
}

function LobbySettingsForm({
  lobbyId,
  onClose,
  postUrl,
  postBody,
}: {
  postUrl?: string;
  postBody?: object;
  lobbyId: string;
  onClose: () => void;
}) {
  const jsonPostBodyString = postBody && JSON.stringify(postBody, null, 2);
  const form = useForm<z.infer<typeof lobbySettingsForm>>({
    resolver: zodResolver(lobbySettingsForm),
    defaultValues: {
      postUrl: postUrl,
      postBody: jsonPostBodyString,
    },
  });
  const updatePostRequest = api.lobbies.updatePostRequest.useMutation({
    onSuccess: () => {
      onClose();
    },
    onError: (error) => {
      toast(error.message);
    },
  });
  return (
    <Form {...form}>
      <form
        onSubmit={form.handleSubmit(
          (data) => {
            updatePostRequest.mutate({
              lobbyId,
              postRequestUrl: data.postUrl,
              postRequestBody: data.postBody,
            });
          },
          () => {
            toast("Invalid form data");
          },
        )}
      >
        <FormField
          control={form.control}
          name="postUrl"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Post URL</FormLabel>
              <FormControl>
                <Input placeholder={postUrl ?? "Post URL"} {...field} />
              </FormControl>
              <FormDescription>
                This is the endpoint that will be hit when someone selects an
                item.
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="postBody"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Post Body</FormLabel>
              <FormControl>
                <Textarea
                  placeholder={jsonPostBodyString ?? "JSON Post Body"}
                  {...field}
                />
              </FormControl>
              <FormDescription>
                This is the JSON body that will be sent when someone selects an
                item. Use <InlineCode text={USER_STRING} /> to replace with the
                user's name, <InlineCode text={ITEM_PICKED_STRING} /> to replace
                with the item picked, and <InlineCode text={ITEM_PICKED_URL} />{" "}
                to replace with the item picked's URL.
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />
        <Button
          className="mt-4 w-full"
          onClick={() => {
            toast(
              `Saving ${form.getValues().postUrl} and ${form.getValues().postBody} for lobby ${lobbyId}`,
            );
          }}
        >
          Save
        </Button>
      </form>
    </Form>
  );
}
