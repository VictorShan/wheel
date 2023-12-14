import { CreateLobby } from "./_components/create-lobby";

export default async function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-gradient-to-b from-[#2e026d] to-[#15162c] text-white">
      <div className="container flex flex-col items-center justify-center gap-12 px-4 py-16 ">
        <h1>Wheel</h1>
        <CreateLobby />
      </div>
    </main>
  );
}
