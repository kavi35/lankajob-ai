"use client";

import { isStandaloneMode } from "@/lib/standalone/config";

export function StandaloneBanner() {
  if (!isStandaloneMode()) return null;

  return (
    <div className="mb-6 rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-100">
      <strong>Vercel-only mode</strong> — CV data is saved in your browser. No database or Railway API
      required. Jobs are fetched live from TopJobs.lk when you search.
    </div>
  );
}
