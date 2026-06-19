"use client";

import { useEffect, useState } from "react";
import { Briefcase, Target, TrendingUp, AlertCircle } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { MatchScoreChart, TrendChart } from "@/components/dashboard/charts";
import { JobMatchCard } from "@/components/jobs/job-match-card";
import { useApiClient } from "@/lib/api-providers";
import type { DashboardStats, JobMatch } from "@/lib/api-client";

export default function DashboardPage() {
  const api = useApiClient();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [matches, setMatches] = useState<JobMatch[]>([]);

  useEffect(() => {
    api.fetch<DashboardStats>("/api/v1/skills/dashboard-stats").then(setStats).catch(console.error);
    api.fetch<JobMatch[]>("/api/v1/matches?min_score=0").then(setMatches).catch(console.error);
  }, [api]);

  const chartData = matches.slice(0, 6).map((m) => ({
    name: m.job.company.slice(0, 10),
    value: m.match_score,
  }));

  const trendData = [
    { name: "W1", value: Math.max(0, (stats?.average_match_score || 0) - 12) },
    { name: "W2", value: Math.max(0, (stats?.average_match_score || 0) - 8) },
    { name: "W3", value: Math.max(0, (stats?.average_match_score || 0) - 4) },
    { name: "W4", value: stats?.average_match_score || 0 },
  ];

  const widgets = [
    { label: "Total Matches", value: stats?.total_matches ?? "—", icon: Briefcase },
    { label: "Avg Match Score", value: stats ? `${stats.average_match_score}%` : "—", icon: Target },
    { label: "Missing Skills", value: stats?.missing_skills_count ?? "—", icon: AlertCircle },
    { label: "Recommended", value: stats?.recommended_skills?.[0] ?? "—", icon: TrendingUp },
  ];

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-white sm:text-3xl">Dashboard</h1>
        <p className="mt-1 text-white/50">Your AI-powered job search overview</p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {widgets.map(({ label, value, icon: Icon }) => (
          <Card key={label}>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-white/60">{label}</CardTitle>
              <Icon className="h-4 w-4 text-violet-400" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-white">{value}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Top Match Scores</CardTitle>
          </CardHeader>
          <CardContent>
            {chartData.length > 0 ? (
              <MatchScoreChart data={chartData} />
            ) : (
              <p className="py-12 text-center text-white/40">Upload a CV and run a search to see charts</p>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Match Score Trend</CardTitle>
          </CardHeader>
          <CardContent>
            <TrendChart data={trendData} />
          </CardContent>
        </Card>
      </div>

      <div>
        <h2 className="mb-4 text-xl font-semibold text-white">Recent Matches</h2>
        {matches.length > 0 ? (
          <div className="grid gap-4 md:grid-cols-2">
            {matches.slice(0, 4).map((m) => (
              <JobMatchCard key={m.id} match={m} />
            ))}
          </div>
        ) : (
          <Card>
            <CardContent className="py-12 text-center text-white/40">
              No matches yet. Go to My CV to upload and analyze your resume.
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
