"use client";
import { useEffect, useRef } from "react";

const COLORS = [
  "green",
  "red",
  "blue",
  "orange",
  "green",
  "red",
  "blue",
  "orange",
];
export function ConstantSpinWheel({
  rotationVelocity,
}: {
  rotationVelocity: number;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rotation = useRef(Math.random() * 360);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    canvas.style.transform = `rotate(${rotation.current}deg)`;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const width = canvas.width;
    const height = canvas.height;
    const radius = width / 2;
    const centerX = width / 2;
    const centerY = height / 2;
    const total = COLORS.length;

    ctx.clearRect(0, 0, width, height);

    let startAngle = 0;
    let endAngle = 0;
    COLORS.forEach((_, i) => {
      startAngle = endAngle;
      endAngle = startAngle + (1 / total) * 2 * Math.PI;
      ctx.beginPath();
      ctx.arc(centerX, centerY, radius, startAngle, endAngle);
      ctx.lineTo(centerX, centerY);
      ctx.fillStyle = COLORS[i % COLORS.length]!;
      ctx.fill();
      //   ctx.stroke();
      // add text in the middle of the arc
      const angle = startAngle + (endAngle - startAngle) / 2;
      const textX = centerX + Math.cos(angle) * radius * 0.5;
      const textY = centerY + Math.sin(angle) * radius * 0.5;
      ctx.save();
      ctx.translate(textX, textY);
      ctx.rotate(angle);
      ctx.restore();
    });
    // add a white circle in the middle
    ctx.beginPath();
    ctx.arc(centerX, centerY, radius * 0.05, 0, 2 * Math.PI);
    ctx.fillStyle = "white";
    ctx.fill();

    let animationFrameNum: number;

    const animationFrame = () => {
      rotation.current = (rotation.current + rotationVelocity) % 360;
      canvas.style.transform = `rotate(${rotation.current}deg)`;
      animationFrameNum = requestAnimationFrame(animationFrame);
    };

    animationFrame();

    return () => {
      cancelAnimationFrame(animationFrameNum);
    };
  }, [canvasRef]);

  return (
    <div className="max-w-max">
      <canvas ref={canvasRef} width="500" height="500" className="w-full" />
    </div>
  );
}
