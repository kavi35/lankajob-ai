"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useDropzone } from "react-dropzone";
import { Upload, FileText, Loader2, Sparkles, ArrowRight, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { JobMatchCard } from "@/components/jobs/job-match-card";
import { useApiClient } from "@/lib/api-providers";
import type { CV, CVProfile, JobMatch, SearchSession } from "@/lib/api-client";

export default function CVPage() {
  const api = useApiClient();
  const router = useRouter();
  const [cvs, setCvs] = useState<CV[]>([]);
  const [profile, setProfile] = useState<CVProfile | null>(null);
  const [loading, setLoading] = useState(false);
  const [analyzingId, setAnalyzingId] = useState<string | null>(null);
  const [searching, setSearching] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [jobMatches, setJobMatches] = useState<JobMatch[]>([]);
  const activeCv = cvs[0] ?? null;
  const olderCvs = cvs.slice(1);

  const loadMatches = useCallback(async () => {
    try {
      const data = await api.fetch<JobMatch[]>("/api/v1/matches?min_score=0");
      setJobMatches(data);
    } catch {
      // Matches load on demand after search
    }
  }, [api]);

  const loadCvs = useCallback(async () => {
    const data = await api.fetch<CV[]>("/api/v1/cv");
    setCvs(data);
    const current = data[0];
    if (current?.status === "analyzed") {
      try {
        const p = await api.fetch<CVProfile>(`/api/v1/cv/${current.id}/profile`);
        setProfile(p);
      } catch {
        setProfile(null);
      }
    } else {
      setProfile(null);
    }
  }, [api]);

  useEffect(() => {
    loadCvs().catch((e) => toast.error(e instanceof Error ? e.message : "Failed to load CVs"));
    loadMatches();
  }, [loadCvs, loadMatches]);

  const onDrop = useCallback(
    async (files: File[]) => {
      const file = files[0];
      if (!file) return;
      setLoading(true);
      try {
        const form = new FormData();
        form.append("file", file);
        const cv = await api.upload<CV>("/api/v1/cv/upload", form);
        toast.success("CV uploaded — previous CV replaced");
        setCvs([cv]);
        setProfile(null);
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "Upload failed");
      } finally {
        setLoading(false);
      }
    },
    [api]
  );

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      "application/pdf": [".pdf"],
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document": [".docx"],
    },
    maxFiles: 1,
  });

  const analyze = async (cvId: string) => {
    setAnalyzingId(cvId);
    setCvs((prev) => prev.map((cv) => (cv.id === cvId ? { ...cv, status: "processing" } : cv)));
    try {
      const p = await api.fetch<CVProfile>(`/api/v1/cv/${cvId}/analyze`, { method: "POST" });
      setProfile(p);
      toast.success("CV analyzed successfully");
      await loadCvs();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Analysis failed");
      await loadCvs();
    } finally {
      setAnalyzingId(null);
    }
  };

  const deleteCv = async (cvId: string) => {
    setDeletingId(cvId);
    try {
      await api.fetch(`/api/v1/cv/${cvId}`, { method: "DELETE" });
      toast.success("Old CV removed");
      await loadCvs();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to remove CV");
    } finally {
      setDeletingId(null);
    }
  };

  const removeOlderCvs = async () => {
    for (const cv of olderCvs) {
      await deleteCv(cv.id);
    }
  };

  const renderCvRow = (cv: CV, isCurrent = false) => (
    <div
      key={cv.id}
      className={`flex items-center justify-between rounded-xl border p-4 ${
        isCurrent ? "border-violet-500/30 bg-violet-500/5" : "border-white/10 bg-white/5"
      }`}
    >
      <div className="flex items-center gap-3">
        <FileText className="h-5 w-5 text-violet-400" />
        <div>
          <div className="flex items-center gap-2">
            <span className="font-medium text-white">{cv.file_name}</span>
            {isCurrent && <Badge>Current CV</Badge>}
          </div>
          <div className="text-sm text-white/40">
            {new Date(cv.uploaded_at).toLocaleDateString()} · {cv.status}
          </div>
        </div>
      </div>
      <div className="flex gap-2">
        {isCurrent ? (
          <>
            <Button size="sm" onClick={() => analyze(cv.id)} disabled={analyzingId === cv.id}>
              {analyzingId === cv.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
              {analyzingId === cv.id ? "Analyzing..." : cv.status === "analyzed" ? "Re-analyze" : "Analyze"}
            </Button>
            {cv.status === "analyzed" && (
              <Button size="sm" variant="secondary" onClick={() => startSearch(cv.id)} disabled={searching}>
                {searching ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                Find Jobs
              </Button>
            )}
          </>
        ) : (
          <Button
            size="sm"
            variant="ghost"
            className="text-red-300 hover:text-red-200"
            onClick={() => deleteCv(cv.id)}
            disabled={deletingId === cv.id}
          >
            {deletingId === cv.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
            Remove
          </Button>
        )}
      </div>
    </div>
  );

  const startSearch = async (cvId: string) => {
    setSearching(true);
    try {
      const session = await api.fetch<SearchSession>("/api/v1/sessions", {
        method: "POST",
        body: JSON.stringify({ cv_id: cvId }),
      });
      const matches = session.matches ?? [];
      setJobMatches(matches);
      const count = matches.length;
      toast.success(`Found ${count} matching jobs!`, {
        action: {
          label: "View all",
          onClick: () => router.push("/matches"),
        },
      });
      setTimeout(() => {
        document.getElementById("job-results")?.scrollIntoView({ behavior: "smooth" });
      }, 100);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Search failed");
    } finally {
      setSearching(false);
    }
  };

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-white">My CV</h1>
        <p className="mt-1 text-white/50">Upload and analyze your resume</p>
      </div>

      <Card
        {...getRootProps()}
        className={`cursor-pointer border-dashed transition-colors ${
          isDragActive ? "border-violet-500 bg-violet-500/10" : ""
        }`}
      >
        <CardContent className="flex flex-col items-center justify-center py-16">
          <input {...getInputProps()} />
          {loading ? (
            <Loader2 className="h-10 w-10 animate-spin text-violet-400" />
          ) : (
            <Upload className="h-10 w-10 text-violet-400" />
          )}
          <p className="mt-4 text-white/80">
            {isDragActive ? "Drop your CV here" : "Drag & drop your CV (PDF or DOCX)"}
          </p>
          <p className="mt-1 text-sm text-white/40">or click to browse</p>
        </CardContent>
      </Card>

      {activeCv && (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Your CV</CardTitle>
            {olderCvs.length > 0 && (
              <Button size="sm" variant="ghost" className="text-red-300" onClick={removeOlderCvs}>
                Remove {olderCvs.length} old CV{olderCvs.length > 1 ? "s" : ""}
              </Button>
            )}
          </CardHeader>
          <CardContent className="space-y-4">
            {renderCvRow(activeCv, true)}
            {olderCvs.length > 0 && (
              <div className="space-y-2 border-t border-white/10 pt-4">
                <p className="text-sm text-white/40">Older uploads</p>
                {olderCvs.map((cv) => renderCvRow(cv))}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {profile && (
        <Card>
          <CardHeader>
            <CardTitle>Extracted Profile</CardTitle>
          </CardHeader>
            <CardContent className="space-y-4">
            {profile.ai_summary?.domains ? (
              <div>
                <h4 className="mb-2 text-sm text-white/60">Field</h4>
                <div className="flex flex-wrap gap-2">
                  {(profile.ai_summary.domains as string[]).map((d) => (
                    <Badge key={d} variant="muted">{d}</Badge>
                  ))}
                </div>
              </div>
            ) : null}
            <div>
              <h4 className="mb-2 text-sm text-white/60">Skills</h4>
              <div className="flex flex-wrap gap-2">
                {profile.skills.map((s) => (
                  <Badge key={s}>{s}</Badge>
                ))}
              </div>
            </div>
            {profile.ai_summary?.summary ? (
              <p className="text-sm text-white/70">{String(profile.ai_summary.summary)}</p>
            ) : null}
          </CardContent>
        </Card>
      )}

      {jobMatches.length > 0 && (
        <div id="job-results" className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-semibold text-white">Your Job Matches</h2>
              <p className="text-sm text-white/50">{jobMatches.length} jobs found for your profile</p>
            </div>
            <Button onClick={() => router.push("/matches")} className="gap-2">
              View all <ArrowRight className="h-4 w-4" />
            </Button>
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            {jobMatches.slice(0, 4).map((m) => (
              <JobMatchCard key={m.id} match={m} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
