export const USER_STRING = "$USER$";
export const ITEM_PICKED_STRING = "$ITEM_PICKED$";
export const ITEM_PICKED_URL = "$ITEM_PICKED_URL$";
export function replaceConstants(user: string, item: string, url: string) {
  return (str: string) =>
    str
      .replace(USER_STRING, user)
      .replace(ITEM_PICKED_STRING, item)
      .replace(ITEM_PICKED_URL, url);
}
