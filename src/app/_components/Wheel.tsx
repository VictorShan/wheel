"use client";

import { useEffect, useRef, useState } from "react";
import { SPIN_EVENT, getLobbyChannelName } from "~/config/PusherConstants";
import { usePusher } from "./usePusher";
import type { Spin } from "./types";
import { api } from "~/trpc/react";

export type WheelProps = {
  wheelItems: WheelItem[];
  lobbyCuid: string;
  shuffleOnSpin?: boolean;
};

export type WheelItem = {
  longName: string;
  shortName?: string | null;
  url?: string;
  weight: number;
  callback: () => void;
};

const COLORS = ["red", "blue", "green", "orange"];
const VELOCITY_DECAY = 0.05;
const SEED = 0.5;

export default function Wheel({
  wheelItems,
  lobbyCuid,
  shuffleOnSpin = false,
}: WheelProps) {
  const itemsRef = useRef<WheelItem[]>([]);
  const shouldShuffleRef = useRef(shuffleOnSpin);
  const [items, setItems] = useState<WheelItem[]>(wheelItems);
  const startSpinApi = api.lobbies.spin.useMutation({
    onMutate: () => {
      spin();
    },
  });
  const wheelRef = useRef<HTMLCanvasElement>(null);
  const markerRef = useRef<HTMLCanvasElement>(null);
  const rotation = useRef(Math.random() * 360);
  const velocity = useRef(0);
  usePusher(
    getLobbyChannelName(lobbyCuid),
    SPIN_EVENT,
    function (data: { spin: Spin; seed?: number }) {
      if (!wheelRef.current) return;
      if (velocity.current !== 0) return;
      setItems(stableShuffle(itemsRef.current, data.seed));
      rotation.current = data.spin.intialRotation;
      velocity.current = data.spin.initialVelocity;
      spin();
    },
  );

  const startSpin = () => {
    if (!wheelRef.current) return;
    if (velocity.current !== 0) return;
    const seed = shouldShuffleRef.current ? Math.random() : undefined;
    setItems(stableShuffle(itemsRef.current, seed));
    velocity.current = Math.random() * 20 + 10;
    startSpinApi.mutate({
      lobbyCuid,
      initialRotation: rotation.current,
      initialVelocity: velocity.current,
      seed: seed,
    });
  };

  const selectItem = () => {
    // Selects the item that is at the right of the wheel
    const angle = (360 - rotation.current) % 360;
    const total = getTotalWeight(itemsRef.current);
    let startAngle = 0;
    let endAngle = 0;
    itemsRef.current.forEach((item) => {
      startAngle = endAngle;
      endAngle = startAngle + (item.weight / total) * 360;
      if (angle >= startAngle && angle < endAngle) {
        item.callback();
        return;
      }
    });
  };

  const spin = () => {
    if (!wheelRef.current) return;

    rotation.current = (rotation.current + velocity.current) % 360;
    wheelRef.current.style.transform = `rotate(${rotation.current}deg)`;

    const req = requestAnimationFrame(spin);
    if (Math.abs(velocity.current) < VELOCITY_DECAY) {
      velocity.current = 0;
      cancelAnimationFrame(req);
      selectItem();
    } else if (velocity.current > 0) {
      velocity.current -= VELOCITY_DECAY;
    } else {
      velocity.current += VELOCITY_DECAY;
    }
  };

  useEffect(() => {
    setItems(stableShuffle(wheelItems));
  }, [wheelItems]);

  useEffect(() => {
    shouldShuffleRef.current = shuffleOnSpin;
  }, [shuffleOnSpin]);

  useEffect(() => {
    // draw a triangle at the right of the wheel
    const canvas = markerRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const width = canvas.width;
    const height = canvas.height;
    const radius = width * 0.1;
    const centerY = height / 2;
    const startAngle = (-0.1 * Math.PI) % (2 * Math.PI);
    const endAngle = (0.1 * Math.PI) % (2 * Math.PI);
    ctx.beginPath();
    ctx.arc(width - radius + 5, centerY, radius, startAngle, endAngle);
    ctx.lineTo(width - radius, centerY);
    ctx.fillStyle = "black";
    ctx.fill();
    ctx.strokeStyle = "white";
    ctx.stroke();
  }, [markerRef]);

  useEffect(() => {
    itemsRef.current = items;

    const canvas = wheelRef.current;
    if (!canvas) return;
    canvas.style.transform = `rotate(${rotation.current}deg)`;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const width = canvas.width;
    const height = canvas.height;
    const radius = width / 2;
    const centerX = width / 2;
    const centerY = height / 2;
    const total = getTotalWeight(items);

    ctx.clearRect(0, 0, width, height);

    let startAngle = 0;
    let endAngle = 0;
    items.forEach((item, i) => {
      startAngle = endAngle;
      endAngle = startAngle + (item.weight / total) * 2 * Math.PI;
      ctx.beginPath();
      ctx.arc(centerX, centerY, radius, startAngle, endAngle);
      ctx.lineTo(centerX, centerY);
      ctx.fillStyle = COLORS[i % COLORS.length]!;
      ctx.fill();
      ctx.stroke();
      // add text in the middle of the arc
      const angle = startAngle + (endAngle - startAngle) / 2;
      const textX = centerX + Math.cos(angle) * radius * 0.5;
      const textY = centerY + Math.sin(angle) * radius * 0.5;
      ctx.save();
      ctx.translate(textX, textY);
      ctx.rotate(angle);
      ctx.font = "20px Arial";
      ctx.textAlign = "center";
      ctx.fillStyle = "white";
      ctx.fillText(item.longName, 0, 0);
      ctx.restore();
    });
    // add a white circle in the middle
    ctx.beginPath();
    ctx.arc(centerX, centerY, radius * 0.05, 0, 2 * Math.PI);
    ctx.fillStyle = "white";
    ctx.fill();
  }, [wheelRef, items]);

  return (
    <div className="relative max-w-max p-2">
      <canvas
        ref={wheelRef}
        width="500"
        height="500"
        onClick={startSpin}
        className="w-full"
      />
      <canvas
        ref={markerRef}
        width="500"
        height="500"
        className="h-100 w-100 z-1 pointer-events-none absolute top-0 w-full"
      />
    </div>
  );
}

function getTotalWeight(items: WheelItem[]) {
  return items.reduce((acc, item) => acc + item.weight, 0);
}

function getRandomGenerator(s: number) {
  // https://stackoverflow.com/a/23304189
  return function () {
    s = Math.sin(s) * 10000;
    return s - Math.floor(s);
  };
}

/**
 * Shuffles an array in a stable way using the Fisher-Yates algorithm if a seed is provided
 */
function stableShuffle(list: WheelItem[], seed: number = SEED) {
  const sortedList = [...list].sort((a, b) =>
    a.longName.localeCompare(b.longName),
  );
  const shuffled = shuffle(sortedList, seed);
  return shuffled;
}

/**
 * Shuffles an array using the Fisher-Yates algorithm
 */
function shuffle<T>(list: T[], seed?: number) {
  if (!seed) return list;
  const rng = getRandomGenerator(seed);
  const shuffled = [...list];
  // https://en.wikipedia.org/wiki/Fisher%E2%80%93Yates_shuffle
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j]!, shuffled[i]!];
  }
  return shuffled;
}
