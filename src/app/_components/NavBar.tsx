"use client";
import { SignInButton, SignedIn, SignedOut, UserButton } from "@clerk/nextjs";
import { DarkModeToggle } from "~/components/ui/DarkModeToggle";

export default function NavBar() {
  return (
    <nav className="flex items-center justify-between p-4">
      <a className="text-xl" href="/">
        Wheel
      </a>
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
