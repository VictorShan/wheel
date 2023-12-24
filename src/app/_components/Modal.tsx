"use client";
import { useEffect, useRef } from "react";
import { type Item } from "./types";
import { api } from "~/trpc/react";

export default function Modal({ item }: { item?: Item }) {
  const modalRef = useRef<HTMLDialogElement>(null);
  const selectItem = api.items.selectItem.useMutation();
  const upvoteItem = api.items.upvoteItem.useMutation();
  const downvoteItem = api.items.downvoteItem.useMutation();
  useEffect(() => {
    if (item) {
      modalRef.current?.showModal();
    } else {
      modalRef.current?.close();
    }
  }, [item]);
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
                downvoteItem.mutate({
                  itemId: item.id,
                  lobbyCuid: item.lobbyCuid,
                });
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
              selectItem.mutate({
                itemId: item.id,
                lobbyCuid: item.lobbyCuid,
              });
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
