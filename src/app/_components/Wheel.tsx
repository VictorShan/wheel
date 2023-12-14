"use client";

import { useEffect, useRef } from "react";

export type WheelProps = {
  wheelItems: WheelItem[];
};

export type WheelItem = {
  name: string;
  weight: number;
  callback: () => void;
};

const COLORS = ["red", "blue", "green", "orange"];
const VELOCITY_DECAY = 0.05;

export default function Wheel({ wheelItems }: WheelProps) {
  const total = wheelItems.reduce((acc, item) => acc + item.weight, 0);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rotation = useRef(0);
  const velocity = useRef(0);

  const startSpin = () => {
    velocity.current = Math.random() * 10 + 10;
    spin();
  };

  const selectItem = () => {
    const angle = rotation.current % 360;
    let startAngle = 0;
    let endAngle = 0;
    wheelItems.forEach((item, i) => {
      startAngle = endAngle;
      endAngle = startAngle + (item.weight / total) * 360;
      if (angle >= startAngle && angle < endAngle) {
        item.callback();
      }
    });
  };

  const spin = () => {
    if (!canvasRef.current) return;
    rotation.current = (rotation.current + velocity.current) % 360;
    canvasRef.current.style.transform = `rotate(${rotation.current}deg)`;

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
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const width = canvas.width;
    const height = canvas.height;
    const radius = width / 2;
    const centerX = width / 2;
    const centerY = height / 2;

    ctx.clearRect(0, 0, width, height);
    // ctx.beginPath();
    // ctx.arc(centerX, centerY, radius, 0, 2 * Math.PI);
    // ctx.stroke();

    let startAngle = 0;
    let endAngle = 0;
    wheelItems.forEach((item, i) => {
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
      ctx.fillText(item.name, 0, 0);
      ctx.restore();
    });
    // add a white circle in the middle
    ctx.beginPath();
    ctx.arc(centerX, centerY, radius * 0.05, 0, 2 * Math.PI);
    ctx.fillStyle = "white";
    ctx.fill();
    // ctx.stroke();
  }, [canvasRef, wheelItems]);

  return (
    <div className="p-4">
      <h1>Wheel</h1>
      <canvas
        ref={canvasRef}
        width="500"
        height="500"
        style={{
          border: "1px solid black",
          transform: `rotate(${rotation.current % 360}deg)`,
        }}
        onClick={startSpin}
      />
    </div>
  );
}
