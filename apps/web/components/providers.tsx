"use client";

import { ClerkProvider } from "@clerk/nextjs";
import { ClerkApiProvider, DevApiProvider, StandaloneApiProvider } from "@/lib/api-providers";
import { isClerkConfigured } from "@/lib/auth-config";
import { isStandaloneMode } from "@/lib/standalone/config";

export function AuthProvider({ children }: { children: React.ReactNode }) {
  if (isStandaloneMode()) {
    return <StandaloneApiProvider>{children}</StandaloneApiProvider>;
  }

  if (!isClerkConfigured()) {
    return <DevApiProvider>{children}</DevApiProvider>;
  }

  return (
    <ClerkProvider publishableKey={process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY!}>
      <ClerkApiProvider>{children}</ClerkApiProvider>
    </ClerkProvider>
  );
}
