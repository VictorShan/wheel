import { Item } from "~/app/_components/types";

export const SELECTED_CHANNEL = "client-selected-channel";
export const ADD_ITEM = "client-add-item";
export const SPIN_EVENT = "spin-event";
export const ITEM_EVENT = "item-event";

export type ItemEvent = {
  type: "add" | "remove" | "shuffle";
  item?: Item;
  itemIdOrder: number[];
};

export function getLobbyChannelName(lobbyCuid: string) {
  return `client-${lobbyCuid}`;
}
