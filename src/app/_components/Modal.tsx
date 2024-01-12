"use client";
import { useContext, useEffect, useRef, useState } from "react";
import { type Item } from "./types";
import { api } from "~/trpc/react";
import { ItemsContext } from "./providers";

export default function Modal({ itemId }: { itemId?: { id: number } }) {
  const items = useContext(ItemsContext);
  const [item, setItem] = useState<Item>();
  const modalRef = useRef<HTMLDialogElement>(null);
  const voteTimes = useRef<number[]>([]);
  const selectItem = api.items.selectItem.useMutation();
  const upvoteItem = api.items.upvoteItem.useMutation();
  const downvoteItem = api.items.downvoteItem.useMutation();
  useEffect(() => {
    if (itemId?.id) {
      setItem(items?.find((item) => item.id === itemId.id));
      modalRef.current?.showModal();
    } else {
      setItem(undefined);
      modalRef.current?.close();
    }
  }, [itemId, items]);
  return (
    <dialog ref={modalRef} className="modal">
      <div className="modal-box">
        <h3 className="text-lg font-bold">{item?.longName}</h3>
        <p className="py-4">
          Last ordered:{" "}
          {item?.lastSelectedAt.toLocaleDateString("en-US", {
            weekday: "long",
            year: "numeric",
            month: "long",
            day: "numeric",
          })}
        </p>
        <div className="flex items-center justify-between">
          <p>Upvotes: {item?.upvotes ?? 0}</p>
          <div className="flex gap-2">
            <button
              className="btn"
              onClick={() => {
                if (!item) return;
                voteTimes.current = filter5Mins(voteTimes.current);
                if (voteTimes.current.length > 5) return;
                upvoteItem.mutate({
                  itemId: item.id,
                  lobbyCuid: item.lobbyCuid,
                });
              }}
            >
              +
            </button>
            <button
              className="btn"
              onClick={() => {
                if (!item) return;
                voteTimes.current = filter5Mins(voteTimes.current);
                if (voteTimes.current.length > 5) return;
                downvoteItem.mutate({
                  itemId: item.id,
                  lobbyCuid: item.lobbyCuid,
                });
                voteTimes.current.push(getUTCNow());
              }}
            >
              -
            </button>
          </div>
        </div>
        <div className="modal-action flex justify-between">
          <a
            href={item?.url ?? undefined}
            target="_blank"
            rel="noopener noreferrer"
            className={`btn ${!item?.url && "pointer-events-none"}`}
          >
            Visit Site
          </a>
          <button
            className="btn"
            onClick={() => {
              if (!item) return;
              voteTimes.current = filter5Mins(voteTimes.current);
              if (voteTimes.current.length > 5) return;
              selectItem.mutate({
                itemId: item.id,
                lobbyCuid: item.lobbyCuid,
              });
              voteTimes.current.push(getUTCNow());
            }}
            disabled={!item?.id}
          >
            Select
          </button>
          <form method="dialog">
            <button className="btn">Close</button>
          </form>
        </div>
      </div>
    </dialog>
  );
}

function filter5Mins(times: number[]) {
  const now = getUTCNow();
  const fiveMinutes = 5 * 60 * 1000;
  return times.filter((time) => now - time < fiveMinutes);
}
function getUTCNow() {
  return Date.now();
}
