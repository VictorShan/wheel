"use client";

import { SignInButton, SignUpButton } from "@clerk/nextjs";
import { usePathname } from "next/navigation";
import { Button } from "~/components/ui/button";

/**
 * Sign-in happens in a modal and returns to the page it was started from.
 *
 * A wheel's URL is the only handle anyone has on it, and the default redirect flow navigates away
 * to Clerk's hosted pages and comes back to the home page - so signing in used to lose the wheel
 * you were looking at.
 */
export function SignInButtons() {
  const pathname = usePathname();
  return (
    <div className="flex items-center gap-2">
      <SignInButton
        mode="modal"
        afterSignInUrl={pathname}
        afterSignUpUrl={pathname}
      >
        <Button type="button" variant="ghost">
          Sign in
        </Button>
      </SignInButton>
      <SignUpButton
        mode="modal"
        afterSignInUrl={pathname}
        afterSignUpUrl={pathname}
      >
        <Button type="button">Sign up</Button>
      </SignUpButton>
    </div>
  );
}

/**
 * Shown wherever a signed-out visitor would otherwise meet a control that can only fail with a 401.
 */
export function SignInPrompt({ action }: { action: string }) {
  return (
    <div className="flex flex-col items-start gap-2">
      <p className="text-sm">Sign in to {action}.</p>
      <SignInButtons />
    </div>
  );
}
