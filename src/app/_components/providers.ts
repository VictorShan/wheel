import { createContext } from "react";
import type { Item } from "./types";

export const ItemsContext = createContext<Item[] | undefined>([]);
