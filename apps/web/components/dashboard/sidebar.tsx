"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  FileText,
  Briefcase,
  Brain,
  Mail,
  Settings,
  Sparkles,
} from "lucide-react";
import { UserButton } from "@clerk/nextjs";
import { cn } from "@/lib/utils";
import { isClerkConfigured } from "@/lib/auth-config";

const navItems = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/cv", label: "My CV", icon: FileText },
  { href: "/matches", label: "Job Matches", icon: Briefcase },
  { href: "/skills", label: "Skill Analysis", icon: Brain },
  { href: "/cover-letters", label: "Cover Letters", icon: Mail },
  { href: "/settings", label: "Settings", icon: Settings },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="fixed left-0 top-0 z-40 flex h-screen w-64 flex-col border-r border-white/10 bg-black/40 backdrop-blur-xl">
      <div className="flex h-16 items-center gap-2 border-b border-white/10 px-6">
        <Sparkles className="h-5 w-5 text-violet-400" />
        <span className="font-semibold text-white">LankaJob AI</span>
      </div>
      <nav className="flex-1 space-y-1 p-4">
        {navItems.map(({ href, label, icon: Icon }) => (
          <Link
            key={href}
            href={href}
            className={cn(
              "flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm transition-colors",
              pathname === href
                ? "bg-violet-500/20 text-white"
                : "text-white/60 hover:bg-white/5 hover:text-white"
            )}
          >
            <Icon className="h-4 w-4" />
            {label}
          </Link>
        ))}
      </nav>
      <div className="border-t border-white/10 p-4">
        {isClerkConfigured() ? (
          <UserButton />
        ) : (
          <span className="text-xs text-white/40">Dev mode (no auth)</span>
        )}
      </div>
    </aside>
  );
}
