"use client";
import { SignInButton, SignedIn, SignedOut, UserButton } from "@clerk/nextjs";
import { DarkModeToggle } from "~/components/ui/DarkModeToggle";

export default function NavBar() {
  return (
    <nav className="flex items-center justify-between p-4">
      <div className="text-xl">Wheel</div>
      <div className="flex">
        <SignedIn>
          <UserButton />
        </SignedIn>
        <SignedOut>
          <SignInButton />
        </SignedOut>
        <div className="ml-4">
          <DarkModeToggle />
        </div>
      </div>
    </nav>
  );
}
