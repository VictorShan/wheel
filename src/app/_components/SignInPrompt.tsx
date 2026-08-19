"use client";

import { SignInButton } from "@clerk/nextjs";
import { usePathname } from "next/navigation";
import { Button } from "~/components/ui/button";

/**
 * Shown wherever a signed-out visitor would otherwise meet a control that can only fail. Sign-in
 * happens in a modal and returns here, so nobody loses the wheel's URL by signing in.
 */
export function SignInPrompt({ action }: { action: string }) {
  const pathname = usePathname();
  return (
    <div className="flex flex-col items-start gap-2">
      <p className="text-sm">Sign in to {action}.</p>
      <SignInButton
        mode="modal"
        afterSignInUrl={pathname}
        afterSignUpUrl={pathname}
      >
        <Button type="button">Sign in</Button>
      </SignInButton>
    </div>
  );
}
