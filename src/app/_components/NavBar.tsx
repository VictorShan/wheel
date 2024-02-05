"use client";
import { SignInButton, SignedIn, SignedOut, UserButton } from "@clerk/nextjs";

export default function NavBar() {
  return (
    <nav className="flex justify-between p-4">
      <div>Wheel</div>
      <SignedIn>
        <UserButton />
      </SignedIn>
      <SignedOut>
        <SignInButton />
      </SignedOut>
    </nav>
  );
}
