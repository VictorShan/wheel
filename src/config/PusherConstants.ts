export const SELECTED_CHANNEL = "client-selected-channel";
export const ADD_ITEM = "client-add-item";
export const SPIN_EVENT = "spin-event";

export function getLobbyChannelName(lobbyCuid: string) {
  return `client-${lobbyCuid}`;
}
