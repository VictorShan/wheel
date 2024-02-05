import { ConstantSpinWheel } from "./_components/ConstantSpinWheel";
import { CreateLobby } from "./_components/create-lobby";

export default async function Home() {
  return (
    <main className="flex h-fit flex-col items-center justify-center text-white">
      <div className="container flex flex-col items-center justify-center gap-12 px-4 py-16">
        <h1 className="text-4xl">Spin the Wheel</h1>
        <ConstantSpinWheel rotationVelocity={0.02} />
        <CreateLobby />
      </div>
    </main>
  );
}
