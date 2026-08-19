"use client";
import { SignedIn, SignedOut, UserButton } from "@clerk/nextjs";
import { usePathname } from "next/navigation";
import { DarkModeToggle } from "~/components/ui/DarkModeToggle";
import { SignInButtons } from "./SignInPrompt";

export default function NavBar() {
  const pathname = usePathname();
  return (
    <nav className="flex items-center justify-between p-4">
      <a className="text-xl" href="/">
        Wheel
      </a>
      <div className="flex items-center">
        <SignedIn>
          <UserButton afterSignOutUrl={pathname} />
        </SignedIn>
        <SignedOut>
          <SignInButtons />
        </SignedOut>
        <div className="ml-4">
          <DarkModeToggle />
        </div>
      </div>
    </nav>
  );
}
