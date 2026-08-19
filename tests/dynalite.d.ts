declare module "dynalite" {
  import type { Server } from "node:http";
  /** dynalite ships no types; this is the slice of its API the store tests use. */
  export default function dynalite(options?: {
    createTableMs?: number;
    deleteTableMs?: number;
    updateTableMs?: number;
    path?: string;
  }): Server;
}
