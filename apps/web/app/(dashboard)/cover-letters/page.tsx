"use client";

import { useEffect, useState } from "react";
import { Copy, Loader2, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useApiClient } from "@/lib/api-providers";
import type { CoverLetter, JobMatch } from "@/lib/api-client";

export default function CoverLettersPage() {
  const api = useApiClient();
  const [matches, setMatches] = useState<JobMatch[]>([]);
  const [selectedId, setSelectedId] = useState<string>("");
  const [letter, setLetter] = useState<CoverLetter | null>(null);
  const [generating, setGenerating] = useState(false);

  useEffect(() => {
    api.fetch<JobMatch[]>("/api/v1/matches?min_score=0").then(setMatches).catch(console.error);
  }, []);

  const generate = async () => {
    if (!selectedId) return;
    setGenerating(true);
    try {
      const result = await api.fetch<CoverLetter>(`/api/v1/matches/${selectedId}/cover-letter`, {
        method: "POST",
      });
      setLetter(result);
      toast.success("Cover letter generated");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Generation failed");
    } finally {
      setGenerating(false);
    }
  };

  const copy = () => {
    if (letter) {
      navigator.clipboard.writeText(letter.content);
      toast.success("Copied to clipboard");
    }
  };

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-white">Cover Letters</h1>
        <p className="mt-1 text-white/50">AI-generated cover letters tailored to each job</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Select a Job Match</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <select
            value={selectedId}
            onChange={(e) => setSelectedId(e.target.value)}
            className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-white"
          >
            <option value="">Choose a job...</option>
            {matches.map((m) => (
              <option key={m.id} value={m.id}>
                {m.job.title} at {m.job.company} ({m.match_score}%)
              </option>
            ))}
          </select>
          <Button onClick={generate} disabled={!selectedId || generating} className="gap-2">
            {generating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
            Generate Cover Letter
          </Button>
        </CardContent>
      </Card>

      {letter && (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Your Cover Letter</CardTitle>
            <Button variant="secondary" size="sm" onClick={copy} className="gap-1">
              <Copy className="h-3 w-3" /> Copy
            </Button>
          </CardHeader>
          <CardContent>
            <textarea
              className="min-h-[300px] w-full resize-y rounded-xl border border-white/10 bg-white/5 p-4 text-sm text-white/90 outline-none focus:border-violet-500/50"
              value={letter.content}
              onChange={(e) => setLetter({ ...letter, content: e.target.value })}
            />
          </CardContent>
        </Card>
      )}
    </div>
  );
}
