"use client";

import { useCallback, useEffect, useState } from "react";
import { useDropzone } from "react-dropzone";
import {
  Upload,
  FileText,
  Loader2,
  CheckCircle2,
  Circle,
  Sparkles,
  Briefcase,
} from "lucide-react";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { JobMatchCard } from "@/components/jobs/job-match-card";
import { isStandaloneMode } from "@/lib/standalone/config";
import {
  clearSavedResult,
  loadSavedResult,
  processCvFile,
  STEP_LABELS,
  STEP_ORDER,
  type CvAnalysisResult,
  type ProcessStep,
} from "@/lib/standalone/process-cv";

function stepIndex(step: ProcessStep): number {
  if (step === "error") return -1;
  if (step === "done") return STEP_ORDER.length;
  return STEP_ORDER.indexOf(step);
}

function StepIndicator({ current }: { current: ProcessStep }) {
  const activeIdx = stepIndex(current);

  return (
    <div className="grid gap-3 sm:grid-cols-5">
      {STEP_ORDER.slice(0, -1).map((step, i) => {
        const done = activeIdx > i;
        const active = STEP_ORDER[activeIdx] === step || (current === "done" && i === 4);
        return (
          <div
            key={step}
            className={`flex items-center gap-2 rounded-lg border px-3 py-2 text-sm transition-colors ${
              done
                ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-200"
                : active
                  ? "border-violet-500/50 bg-violet-500/10 text-violet-200"
                  : "border-white/10 bg-white/5 text-white/40"
            }`}
          >
            {done ? (
              <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-400" />
            ) : active ? (
              <Loader2 className="h-4 w-4 shrink-0 animate-spin text-violet-400" />
            ) : (
              <Circle className="h-4 w-4 shrink-0" />
            )}
            <span className="truncate">{STEP_LABELS[step]}</span>
          </div>
        );
      })}
    </div>
  );
}

export default function CVPage() {
  const [result, setResult] = useState<CvAnalysisResult | null>(null);
  const [currentStep, setCurrentStep] = useState<ProcessStep>("upload");
  const [statusMsg, setStatusMsg] = useState("");
  const [processing, setProcessing] = useState(false);
  const [showText, setShowText] = useState(false);

  useEffect(() => {
    const saved = loadSavedResult();
    if (saved) {
      setResult(saved);
      setCurrentStep("done");
    }
  }, []);

  const runPipeline = useCallback(async (file: File) => {
    setProcessing(true);
    setResult(null);
    setCurrentStep("upload");
    try {
      const data = await processCvFile(file, (step, msg) => {
        setCurrentStep(step);
        if (msg) setStatusMsg(msg);
      });
      setResult(data);
      setCurrentStep("done");
      toast.success("CV analyzed — results ready!");
    } catch (e) {
      setCurrentStep("error");
      toast.error(e instanceof Error ? e.message : "Processing failed");
    } finally {
      setProcessing(false);
    }
  }, []);

  const onDrop = useCallback(
    async (files: File[]) => {
      const file = files[0];
      if (!file) return;
      await runPipeline(file);
    },
    [runPipeline]
  );

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      "application/pdf": [".pdf"],
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document": [".docx"],
    },
    maxFiles: 1,
    disabled: processing,
  });

  const reset = () => {
    clearSavedResult();
    setResult(null);
    setCurrentStep("upload");
    setStatusMsg("");
  };

  const progress =
    currentStep === "done"
      ? 100
      : currentStep === "error"
        ? 0
        : Math.round((stepIndex(currentStep) / (STEP_ORDER.length - 1)) * 100);

  if (!isStandaloneMode()) {
    return (
      <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-6 text-amber-100">
        <p className="font-medium">Full-stack mode active</p>
        <p className="mt-2 text-sm text-amber-100/80">
          Set <code className="rounded bg-black/30 px-1">NEXT_PUBLIC_STANDALONE=true</code> on
          Vercel for database-free CV analysis.
        </p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-4xl space-y-8">
      <div className="text-center">
        <h1 className="text-3xl font-bold text-white">CV Analyzer</h1>
        <p className="mt-2 text-white/50">
          Upload → Read PDF → Extract Text → Analyze Skills → Match Score
        </p>
        <p className="mt-1 text-xs text-emerald-400/80">
          No database · Everything runs in your browser + Vercel
        </p>
      </div>

      <StepIndicator current={currentStep} />

      {(processing || currentStep === "done") && (
        <div className="space-y-2">
          <Progress value={progress} className="h-2" />
          {statusMsg && processing && (
            <p className="text-center text-sm text-white/50">{statusMsg}</p>
          )}
        </div>
      )}

      {!result && (
        <Card
          {...getRootProps()}
          className={`cursor-pointer border-dashed transition-colors ${
            isDragActive ? "border-violet-500 bg-violet-500/10" : ""
          } ${processing ? "pointer-events-none opacity-60" : ""}`}
        >
          <CardContent className="flex flex-col items-center justify-center py-20">
            <input {...getInputProps()} />
            {processing ? (
              <Loader2 className="h-12 w-12 animate-spin text-violet-400" />
            ) : (
              <Upload className="h-12 w-12 text-violet-400" />
            )}
            <p className="mt-4 text-lg text-white/80">
              {processing
                ? "Processing your CV..."
                : isDragActive
                  ? "Drop your CV here"
                  : "Drag & drop your CV (PDF or DOCX)"}
            </p>
            {!processing && (
              <p className="mt-1 text-sm text-white/40">or click to browse</p>
            )}
          </CardContent>
        </Card>
      )}

      {result && (
        <>
          <Card className="border-emerald-500/20 bg-emerald-500/5">
            <CardHeader className="flex flex-row items-center justify-between">
              <div className="flex items-center gap-3">
                <CheckCircle2 className="h-6 w-6 text-emerald-400" />
                <div>
                  <CardTitle className="text-emerald-100">Analysis Complete</CardTitle>
                  <p className="text-sm text-white/50">{result.fileName}</p>
                </div>
              </div>
              <Button variant="secondary" size="sm" onClick={reset}>
                Upload New CV
              </Button>
            </CardHeader>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Sparkles className="h-5 w-5 text-violet-400" />
                Extracted Skills
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {result.profile.ai_summary?.primary_domains ? (
                <div>
                  <p className="mb-2 text-sm text-white/50">Your field</p>
                  <div className="flex flex-wrap gap-2">
                    {(result.profile.ai_summary.primary_domains as string[]).map((d) => (
                      <Badge key={d} variant="muted">
                        {d}
                      </Badge>
                    ))}
                  </div>
                </div>
              ) : null}
              <div>
                <p className="mb-2 text-sm text-white/50">Skills found</p>
                <div className="flex flex-wrap gap-2">
                  {result.profile.skills.length ? (
                    result.profile.skills.map((s) => <Badge key={s}>{s}</Badge>)
                  ) : (
                    <span className="text-white/40">No skills detected — try a clearer CV</span>
                  )}
                </div>
              </div>
              {result.profile.ai_summary?.summary ? (
                <p className="text-sm text-white/70">{String(result.profile.ai_summary.summary)}</p>
              ) : null}
              <Button variant="ghost" size="sm" onClick={() => setShowText(!showText)}>
                {showText ? "Hide" : "Show"} extracted text
              </Button>
              {showText && (
                <pre className="max-h-48 overflow-auto rounded-lg bg-black/40 p-4 text-xs text-white/60">
                  {result.rawText.slice(0, 3000)}
                  {result.rawText.length > 3000 ? "..." : ""}
                </pre>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Briefcase className="h-5 w-5 text-violet-400" />
                Job Match Scores
              </CardTitle>
              <p className="text-sm text-white/50">
                {result.matches.length} jobs ranked by your profile
              </p>
            </CardHeader>
            <CardContent>
              {result.matches.length === 0 ? (
                <p className="text-white/50">No matches found. Try uploading a different CV.</p>
              ) : (
                <div className="grid gap-4 md:grid-cols-2">
                  {result.matches.slice(0, 6).map((m) => (
                    <JobMatchCard key={m.id} match={m} />
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
