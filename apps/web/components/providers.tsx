"use client";

import { ClerkProvider } from "@clerk/nextjs";
import { ClerkApiProvider, DevApiProvider } from "@/lib/api-providers";
import { isClerkConfigured } from "@/lib/auth-config";

export function AuthProvider({ children }: { children: React.ReactNode }) {
  if (!isClerkConfigured()) {
    return <DevApiProvider>{children}</DevApiProvider>;
  }

  return (
    <ClerkProvider publishableKey={process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY!}>
      <ClerkApiProvider>{children}</ClerkApiProvider>
    </ClerkProvider>
  );
}
