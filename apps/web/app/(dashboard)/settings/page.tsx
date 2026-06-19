"use client";

import { UserProfile } from "@clerk/nextjs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { isClerkConfigured } from "@/lib/auth-config";

export default function SettingsPage() {
  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-white">Settings</h1>
        <p className="mt-1 text-white/50">Manage your account and preferences</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Subscription</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="rounded-xl border border-violet-500/30 bg-violet-500/10 p-4">
            <div className="font-semibold text-white">Free Plan</div>
            <p className="mt-1 text-sm text-white/60">3 CV analyses per month · Basic matching</p>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Profile</CardTitle>
        </CardHeader>
        <CardContent>
          {isClerkConfigured() ? (
            <UserProfile
              routing="hash"
              appearance={{ elements: { rootBox: "w-full", card: "bg-transparent shadow-none" } }}
            />
          ) : (
            <p className="text-sm text-white/50">
              Running in dev mode without Clerk. Add Clerk keys to `.env.local` to enable authentication.
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
