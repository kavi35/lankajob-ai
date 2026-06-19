"use client";

import { useEffect, useState } from "react";
import { ExternalLink } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { SkillsRadar } from "@/components/dashboard/charts";
import { useApiClient } from "@/lib/api-providers";
import type { SkillGap } from "@/lib/api-client";

export default function SkillsPage() {
  const api = useApiClient();
  const [gaps, setGaps] = useState<SkillGap[]>([]);
  const [recommendations, setRecommendations] = useState<
    { skill: string; priority: number; learning_path: SkillGap["learning_path"] }[]
  >([]);

  useEffect(() => {
    api.fetch<SkillGap[]>("/api/v1/skills/gaps").then(setGaps).catch(console.error);
    api
      .fetch<{ skill: string; priority: number; learning_path: SkillGap["learning_path"] }[]>(
        "/api/v1/skills/recommendations"
      )
      .then(setRecommendations)
      .catch(console.error);
  }, []);

  const radarData = gaps.slice(0, 6).map((g) => ({
    skill: g.skill_name,
    score: Math.min(100, g.priority * 20),
  }));

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-white">Skill Analysis</h1>
        <p className="mt-1 text-white/50">Identify gaps and boost your match scores</p>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Skill Demand vs Your Profile</CardTitle>
          </CardHeader>
          <CardContent>
            {radarData.length > 0 ? (
              <SkillsRadar skills={radarData} />
            ) : (
              <p className="py-8 text-center text-white/40">Run a job search to see skill gaps</p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Missing Skills</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {gaps.length > 0 ? (
              gaps.map((g) => (
                <div
                  key={g.id}
                  className="flex items-center justify-between rounded-xl border border-white/10 bg-white/5 p-3"
                >
                  <span className="text-white">{g.skill_name}</span>
                  <Badge variant="warning">Priority {g.priority}</Badge>
                </div>
              ))
            ) : (
              <p className="text-white/40">No skill gaps identified yet</p>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Recommended Learning Paths</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2">
            {recommendations.map((rec) => (
              <div key={rec.skill} className="rounded-xl border border-white/10 bg-white/5 p-4">
                <h3 className="font-semibold text-white">{rec.skill}</h3>
                <p className="mt-1 text-sm text-white/50">
                  ~{rec.learning_path.estimated_weeks || 4} weeks to learn
                </p>
                <div className="mt-3 space-y-1">
                  {rec.learning_path.resources?.map((url) => (
                    <a
                      key={url}
                      href={url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-1 text-sm text-cyan-400 hover:underline"
                    >
                      <ExternalLink className="h-3 w-3" /> Resource
                    </a>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
