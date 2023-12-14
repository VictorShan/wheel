"use client";
import Wheel, { WheelItem } from "~/app/_components/Wheel";

export default function Page({ params }: { params: { wheelId: string }}) {
  return (
    <div>
      <h1>Page {params.wheelId}</h1>
      <Wheel wheelItems={randomItems}/>
    </div>
  );
}

const randomItems: WheelItem[] = [
  {
    name: "Item 1",
    weight: 1,
    callback: () => {},
  },
  {
    name: "Item 2",
    weight: 1,
    callback: () => {},
  }
]