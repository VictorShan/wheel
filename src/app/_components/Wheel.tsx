"use client";


export type WheelProps = {
    wheelItems: WheelItem[];
};

export type WheelItem = {
    name: string;
    weight: number;
    callback: () => void;
}
export default function Wheel({ wheelItems }: WheelProps) {
  const total = wheelItems.reduce((acc, item) => acc + item.weight, 0);
  return (
    <div>
      <h1>Wheel</h1>
      <ul>
        {wheelItems.map((item) => (
          <li key={item.name}>
            {item.name} - {item.weight/total}
          </li>
        ))}
      </ul>
    </div>
  );
}