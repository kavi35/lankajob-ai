"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { Sparkles, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { isClerkConfigured } from "@/lib/auth-config";

export function Navbar() {
  return (
    <motion.nav
      initial={{ y: -20, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      className="fixed top-0 z-50 w-full border-b border-white/10 bg-black/30 backdrop-blur-xl"
    >
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-6">
        <Link href="/" className="flex items-center gap-2 font-semibold text-white">
          <Sparkles className="h-5 w-5 text-violet-400" />
          LankaJob AI
        </Link>
        <div className="hidden items-center gap-8 text-sm text-white/70 md:flex">
          <Link href="#features" className="hover:text-white">Features</Link>
          <Link href="#testimonials" className="hover:text-white">Testimonials</Link>
          <Link href="/pricing" className="hover:text-white">Pricing</Link>
        </div>
        <div className="flex items-center gap-3">
          <Link href={isClerkConfigured() ? "/sign-in" : "/dashboard"}>
            <Button variant="ghost" size="sm">Sign in</Button>
          </Link>
          <Link href={isClerkConfigured() ? "/sign-up" : "/cv"}>
            <Button size="sm">Get Started</Button>
          </Link>
        </div>
      </div>
    </motion.nav>
  );
}

export function Hero() {
  return (
    <section className="relative overflow-hidden pt-32 pb-20">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-violet-900/40 via-transparent to-transparent" />
      <div className="relative mx-auto max-w-7xl px-6 text-center">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
          <span className="mb-6 inline-block rounded-full border border-violet-500/30 bg-violet-500/10 px-4 py-1.5 text-sm text-violet-200">
            AI-Powered Job Matching for Sri Lanka
          </span>
          <h1 className="mx-auto max-w-4xl text-5xl font-bold tracking-tight text-white md:text-7xl">
            Find your perfect job with{" "}
            <span className="bg-gradient-to-r from-violet-400 to-cyan-400 bg-clip-text text-transparent">
              AI precision
            </span>
          </h1>
          <p className="mx-auto mt-6 max-w-2xl text-lg text-white/60">
            Upload your CV and let LankaJob AI match you with the best opportunities from TopJobs,
            XpressJobs, LinkedIn, and top company career pages across Sri Lanka.
          </p>
          <div className="mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row">
            <Link href={isClerkConfigured() ? "/sign-up" : "/cv"}>
              <Button size="lg" className="gap-2">
                Upload Your CV <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
            <Link href="#features">
              <Button variant="secondary" size="lg">See how it works</Button>
            </Link>
          </div>
        </motion.div>
      </div>
    </section>
  );
}

export function Stats() {
  const stats = [
    { value: "10K+", label: "Jobs Indexed" },
    { value: "94%", label: "Match Accuracy" },
    { value: "500+", label: "Companies" },
    { value: "2min", label: "Avg. Analysis Time" },
  ];

  return (
    <section className="mx-auto max-w-7xl px-6 py-12">
      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        {stats.map((stat, i) => (
          <motion.div
            key={stat.label}
            initial={{ opacity: 0, scale: 0.9 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            transition={{ delay: i * 0.1 }}
            className="rounded-2xl border border-white/10 bg-white/5 p-6 text-center backdrop-blur-xl"
          >
            <div className="text-3xl font-bold text-white">{stat.value}</div>
            <div className="mt-1 text-sm text-white/50">{stat.label}</div>
          </motion.div>
        ))}
      </div>
    </section>
  );
}

export function Features() {
  const features = [
    { title: "Smart CV Parsing", desc: "Extract skills, education, and experience from PDF/DOCX instantly." },
    { title: "Multi-Source Search", desc: "Aggregate jobs from TopJobs, XpressJobs, LinkedIn, and career pages." },
    { title: "Match Scoring", desc: "Get 0–100% match scores with detailed explanations for every job." },
    { title: "Skill Gap Analysis", desc: "Discover missing skills and personalized learning paths." },
    { title: "Cover Letters", desc: "Generate tailored cover letters for each application." },
    { title: "Interview Prep", desc: "AI-generated technical and HR questions with suggested answers." },
  ];

  return (
    <section id="features" className="mx-auto max-w-7xl px-6 py-20">
      <h2 className="mb-12 text-center text-3xl font-bold text-white">Everything you need to land your dream job</h2>
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {features.map((f, i) => (
          <motion.div
            key={f.title}
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: i * 0.05 }}
            className="rounded-2xl border border-white/10 bg-gradient-to-br from-white/10 to-white/5 p-6 backdrop-blur-xl"
          >
            <h3 className="text-lg font-semibold text-white">{f.title}</h3>
            <p className="mt-2 text-sm text-white/60">{f.desc}</p>
          </motion.div>
        ))}
      </div>
    </section>
  );
}

export function Testimonials() {
  const items = [
    { name: "Amaya P.", role: "Software Engineer", quote: "LankaJob AI matched me with a 96% fit role at a top tech company in Colombo within a week." },
    { name: "Ravi K.", role: "Data Analyst", quote: "The skill gap analysis helped me learn Power BI and boosted my match scores significantly." },
    { name: "Nethmi S.", role: "Marketing Executive", quote: "Cover letter generator saved me hours. The UI feels like a premium SaaS product." },
  ];

  return (
    <section id="testimonials" className="mx-auto max-w-7xl px-6 py-20">
      <h2 className="mb-12 text-center text-3xl font-bold text-white">Trusted by job seekers across Sri Lanka</h2>
      <div className="grid gap-6 md:grid-cols-3">
        {items.map((t) => (
          <div key={t.name} className="rounded-2xl border border-white/10 bg-white/5 p-6 backdrop-blur-xl">
            <p className="text-white/80">&ldquo;{t.quote}&rdquo;</p>
            <div className="mt-4">
              <div className="font-medium text-white">{t.name}</div>
              <div className="text-sm text-white/50">{t.role}</div>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

export function Pricing() {
  const plans = [
    { name: "Free", price: "LKR 0", features: ["3 CV analyses/month", "Basic job matches", "Skill gap report"] },
    { name: "Pro", price: "LKR 1,990", features: ["Unlimited analyses", "Cover letters", "Interview prep", "Priority matching"], popular: true },
    { name: "Enterprise", price: "Custom", features: ["Team accounts", "API access", "Custom integrations", "Dedicated support"] },
  ];

  return (
    <section className="mx-auto max-w-7xl px-6 py-20">
      <h2 className="mb-12 text-center text-3xl font-bold text-white">Simple, transparent pricing</h2>
      <div className="grid gap-6 md:grid-cols-3">
        {plans.map((plan) => (
          <div
            key={plan.name}
            className={`rounded-2xl border p-6 backdrop-blur-xl ${
              plan.popular ? "border-violet-500/50 bg-violet-500/10" : "border-white/10 bg-white/5"
            }`}
          >
            {plan.popular && (
              <span className="mb-4 inline-block rounded-full bg-violet-500/20 px-3 py-1 text-xs text-violet-200">
                Most Popular
              </span>
            )}
            <h3 className="text-xl font-semibold text-white">{plan.name}</h3>
            <div className="mt-2 text-3xl font-bold text-white">{plan.price}<span className="text-sm font-normal text-white/50">/mo</span></div>
            <ul className="mt-6 space-y-2">
              {plan.features.map((f) => (
                <li key={f} className="text-sm text-white/70">✓ {f}</li>
              ))}
            </ul>
            <Link href="/sign-up" className="mt-6 block">
              <Button variant={plan.popular ? "default" : "secondary"} className="w-full">Get started</Button>
            </Link>
          </div>
        ))}
      </div>
    </section>
  );
}

export function Footer() {
  return (
    <footer className="border-t border-white/10 py-12">
      <div className="mx-auto max-w-7xl px-6 text-center text-sm text-white/40">
        © {new Date().getFullYear()} LankaJob AI. Built for Sri Lankan job seekers.
      </div>
    </footer>
  );
}
