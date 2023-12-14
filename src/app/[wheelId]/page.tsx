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
    callback: () => console.log("Item 1")
  },
  {
    name: "Item 2",
    weight: 1,
    callback: () => console.log("Item 2")
  },
  {
    name: "Item 3",
    weight: 1.5,
    callback: () => console.log("Item 3")
  },
  {
    name: "Item 4",
    weight: 1.5,
    callback: () => console.log("Item 4")
  },
  {
    name: "Item 5",
    weight: 1.5,
    callback: () => console.log("Item 5")
  },
]