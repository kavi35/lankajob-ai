"use client";

import { ExternalLink, Bookmark, Eye } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import type { JobMatch } from "@/lib/api-client";
import { isDemoJob, isValidApplyUrl, jobApplyUrl, jobSourceLabel } from "@/lib/api-client";
import { cn } from "@/lib/utils";

type Props = {
  match: JobMatch;
  onSave?: () => void;
  onDetails?: () => void;
};

export function JobMatchCard({ match, onSave, onDetails }: Props) {
  const scoreColor =
    match.match_score >= 80 ? "text-emerald-400" : match.match_score >= 60 ? "text-amber-400" : "text-white/70";
  const hasDirectApply = isValidApplyUrl(match.job.apply_url);
  const applyHref = jobApplyUrl(match.job);

  return (
    <Card className="group transition-all hover:border-violet-500/30 hover:shadow-violet-500/10">
      <CardHeader className="pb-3">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <CardTitle className="text-base leading-snug">{match.job.title}</CardTitle>
              {isDemoJob(match.job) ? (
                <Badge variant="warning">Demo listing</Badge>
              ) : (
                <Badge variant="success">Live · {jobSourceLabel(match.job.source)}</Badge>
              )}
            </div>
            <p className="mt-1 text-sm text-white/50">
              {match.job.company} · {match.job.location}
              {match.job.salary_text && ` · ${match.job.salary_text}`}
            </p>
          </div>
          <div className="shrink-0 sm:text-right">
            <div className={cn("text-2xl font-bold", scoreColor)}>{match.match_score}%</div>
            <div className="text-xs text-white/40">Match</div>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <Progress value={match.match_score} />
        <div className="flex flex-wrap gap-1.5">
          {match.matched_skills.slice(0, 5).map((skill) => (
            <Badge key={skill} variant="success">✓ {skill}</Badge>
          ))}
        </div>
        {match.missing_skills.length > 0 && (
          <div className="text-sm text-white/50 break-words">
            Missing:{" "}
            {match.missing_skills.slice(0, 3).map((s, i) => (
              <span key={s}>
                {i > 0 && ", "}
                <span className="text-amber-300/80">{s}</span>
              </span>
            ))}
          </div>
        )}
        {match.potential_score > match.match_score && (
          <p className="text-xs text-cyan-400/80">
            Learn missing skills to reach {match.potential_score}% match
          </p>
        )}
        <div className="flex flex-col gap-2 pt-2 sm:flex-row sm:flex-wrap">
          <a href={applyHref} target="_blank" rel="noopener noreferrer" className="w-full sm:w-auto">
            <Button size="sm" className="w-full gap-1 sm:w-auto">
              {hasDirectApply ? "Apply" : "Find on TopJobs"}{" "}
              <ExternalLink className="h-3 w-3" />
            </Button>
          </a>
          <Button size="sm" variant="secondary" className="w-full gap-1 sm:w-auto" onClick={onDetails}>
            <Eye className="h-3 w-3" /> Details
          </Button>
          <Button size="sm" variant="ghost" className="w-full gap-1 sm:w-auto" onClick={onSave}>
            <Bookmark className="h-3 w-3" /> Save
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
