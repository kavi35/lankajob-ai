"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { JobMatchCard } from "@/components/jobs/job-match-card";
import { useApiClient } from "@/lib/api-providers";
import type { JobMatch } from "@/lib/api-client";

type InterviewPrep = {
  technical_questions?: string[];
  hr_questions?: string[];
  suggested_answers?: string[];
};

export default function MatchesPage() {
  const api = useApiClient();
  const router = useRouter();
  const [matches, setMatches] = useState<JobMatch[]>([]);
  const [minScore, setMinScore] = useState(0);
  const [selected, setSelected] = useState<JobMatch | null>(null);
  const [interviewPrep, setInterviewPrep] = useState<InterviewPrep | null>(null);
  const [loadingPrep, setLoadingPrep] = useState(false);
  const [loading, setLoading] = useState(true);

  const loadMatches = useCallback(async () => {
    setLoading(true);
    try {
      const data = await api.fetch<JobMatch[]>(`/api/v1/matches?min_score=${minScore}`);
      setMatches(data);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to load matches");
    } finally {
      setLoading(false);
    }
  }, [api, minScore]);

  useEffect(() => {
    loadMatches();
  }, [loadMatches]);

  const saveJob = async (jobId: string) => {
    try {
      await api.fetch(`/api/v1/jobs/${jobId}/save`, { method: "POST" });
      toast.success("Job saved");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to save");
    }
  };

  const loadInterviewPrep = async (matchId: string) => {
    setLoadingPrep(true);
    try {
      const prep = await api.fetch<{ content: InterviewPrep }>(
        `/api/v1/matches/${matchId}/interview-prep`,
        { method: "POST" }
      );
      setInterviewPrep(prep.content);
      toast.success("Interview prep generated");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to generate prep");
    } finally {
      setLoadingPrep(false);
    }
  };

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-white">Job Matches</h1>
          <p className="mt-1 text-white/50">
            {loading ? "Loading..." : `${matches.length} jobs matched to your profile`}
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="secondary" size="sm" onClick={loadMatches} className="gap-1">
            <RefreshCw className="h-3 w-3" /> Refresh
          </Button>
          <select
            value={minScore}
            onChange={(e) => setMinScore(Number(e.target.value))}
            className="rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-sm text-white"
          >
            <option value={0}>All scores</option>
            <option value={60}>60%+</option>
            <option value={80}>80%+</option>
          </select>
        </div>
      </div>

      {!loading && matches.length === 0 ? (
        <Card>
          <CardContent className="py-16 text-center">
            <p className="text-white/60">No job matches yet.</p>
            <p className="mt-2 text-sm text-white/40">
              Go to My CV, analyze your resume, then click <strong>Find Jobs</strong>.
            </p>
            <Button className="mt-6" onClick={() => router.push("/cv")}>
              Go to My CV
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {matches.map((m) => (
            <JobMatchCard
              key={m.id}
              match={m}
              onSave={() => saveJob(m.job.id)}
              onDetails={() => {
                setSelected(m);
                setInterviewPrep(null);
              }}
            />
          ))}
        </div>
      )}

      {selected && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm"
          onClick={() => setSelected(null)}
        >
          <div
            className="max-h-[80vh] w-full max-w-lg overflow-y-auto rounded-2xl border border-white/10 bg-[#12121a] p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className="text-xl font-bold text-white">{selected.job.title}</h2>
            <p className="text-white/50">{selected.job.company}</p>
            <p className="mt-4 text-sm text-white/70">{selected.job.description}</p>
            <p className="mt-4 text-sm text-violet-300">
              {String(selected.match_explanation.narrative || selected.match_explanation.summary || "")}
            </p>
            <Button
              className="mt-4"
              size="sm"
              onClick={() => loadInterviewPrep(selected.id)}
              disabled={loadingPrep}
            >
              {loadingPrep ? "Generating..." : "Generate Interview Prep"}
            </Button>
            {interviewPrep && (
              <div className="mt-4 space-y-3 text-sm">
                {interviewPrep.technical_questions && (
                  <div>
                    <h4 className="font-medium text-white">Technical Questions</h4>
                    <ul className="mt-1 list-inside list-disc text-white/70">
                      {interviewPrep.technical_questions.map((q) => (
                        <li key={q}>{q}</li>
                      ))}
                    </ul>
                  </div>
                )}
                {interviewPrep.hr_questions && (
                  <div>
                    <h4 className="font-medium text-white">HR Questions</h4>
                    <ul className="mt-1 list-inside list-disc text-white/70">
                      {interviewPrep.hr_questions.map((q) => (
                        <li key={q}>{q}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
