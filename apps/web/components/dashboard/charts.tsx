"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

type ChartProps = {
  data: { name: string; value: number }[];
};

export function MatchScoreChart({ data }: ChartProps) {
  return (
    <ResponsiveContainer width="100%" height={240}>
      <BarChart data={data}>
        <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
        <XAxis dataKey="name" stroke="rgba(255,255,255,0.4)" fontSize={12} />
        <YAxis stroke="rgba(255,255,255,0.4)" fontSize={12} domain={[0, 100]} />
        <Tooltip
          contentStyle={{
            background: "rgba(0,0,0,0.8)",
            border: "1px solid rgba(255,255,255,0.1)",
            borderRadius: "8px",
          }}
        />
        <Bar dataKey="value" fill="url(#gradient)" radius={[6, 6, 0, 0]} />
        <defs>
          <linearGradient id="gradient" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="#8b5cf6" />
            <stop offset="100%" stopColor="#22d3ee" />
          </linearGradient>
        </defs>
      </BarChart>
    </ResponsiveContainer>
  );
}

export function TrendChart({ data }: ChartProps) {
  return (
    <ResponsiveContainer width="100%" height={200}>
      <LineChart data={data}>
        <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
        <XAxis dataKey="name" stroke="rgba(255,255,255,0.4)" fontSize={12} />
        <YAxis stroke="rgba(255,255,255,0.4)" fontSize={12} domain={[0, 100]} />
        <Tooltip
          contentStyle={{
            background: "rgba(0,0,0,0.8)",
            border: "1px solid rgba(255,255,255,0.1)",
            borderRadius: "8px",
          }}
        />
        <Line type="monotone" dataKey="value" stroke="#8b5cf6" strokeWidth={2} dot={{ fill: "#22d3ee" }} />
      </LineChart>
    </ResponsiveContainer>
  );
}

export function SkillsRadar({ skills }: { skills: { skill: string; score: number }[] }) {
  return (
    <div className="space-y-3">
      {skills.map((s) => (
        <div key={s.skill}>
          <div className="mb-1 flex justify-between text-sm">
            <span className="text-white/80">{s.skill}</span>
            <span className="text-white/50">{s.score}%</span>
          </div>
          <div className="h-2 rounded-full bg-white/10">
            <div
              className="h-2 rounded-full bg-gradient-to-r from-violet-500 to-cyan-400"
              style={{ width: `${s.score}%` }}
            />
          </div>
        </div>
      ))}
    </div>
  );
}
