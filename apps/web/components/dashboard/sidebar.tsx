"use client";

import { useEffect, useState } from "react";
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
  Menu,
  X,
} from "lucide-react";
import { UserButton } from "@clerk/nextjs";
import { cn } from "@/lib/utils";
import { isClerkConfigured } from "@/lib/auth-config";
import { isStandaloneMode } from "@/lib/standalone/config";

const fullNav = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/cv", label: "My CV", icon: FileText },
  { href: "/matches", label: "Job Matches", icon: Briefcase },
  { href: "/skills", label: "Skill Analysis", icon: Brain },
  { href: "/cover-letters", label: "Cover Letters", icon: Mail },
  { href: "/settings", label: "Settings", icon: Settings },
];

const simpleNav = [
  { href: "/cv", label: "CV Analyzer", icon: FileText },
  { href: "/matches", label: "Job Matches", icon: Briefcase },
];

function NavLinks({
  pathname,
  navItems,
  onNavigate,
}: {
  pathname: string;
  navItems: typeof fullNav;
  onNavigate?: () => void;
}) {
  return (
    <>
      {navItems.map(({ href, label, icon: Icon }) => (
        <Link
          key={href}
          href={href}
          onClick={onNavigate}
          className={cn(
            "flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm transition-colors",
            pathname === href
              ? "bg-violet-500/20 text-white"
              : "text-white/60 hover:bg-white/5 hover:text-white"
          )}
        >
          <Icon className="h-4 w-4 shrink-0" />
          {label}
        </Link>
      ))}
    </>
  );
}

export function Sidebar() {
  const pathname = usePathname();
  const navItems = isStandaloneMode() ? simpleNav : fullNav;
  const [open, setOpen] = useState(false);

  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  const footer = (
    <div className="border-t border-white/10 p-4">
      {isClerkConfigured() ? (
        <UserButton />
      ) : (
        <span className="text-xs text-white/40">
          {isStandaloneMode() ? "Vercel-only · no database" : "Dev mode (no auth)"}
        </span>
      )}
    </div>
  );

  return (
    <>
      {/* Mobile top bar */}
      <header className="fixed inset-x-0 top-0 z-50 flex h-14 items-center justify-between border-b border-white/10 bg-black/80 px-4 backdrop-blur-xl md:hidden">
        <Link href="/cv" className="flex items-center gap-2 font-semibold text-white">
          <Sparkles className="h-5 w-5 text-violet-400" />
          LankaJob AI
        </Link>
        <button
          type="button"
          aria-label={open ? "Close menu" : "Open menu"}
          onClick={() => setOpen((v) => !v)}
          className="rounded-lg p-2 text-white/80 hover:bg-white/10"
        >
          {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
      </header>

      {/* Mobile drawer overlay */}
      {open && (
        <button
          type="button"
          aria-label="Close menu"
          className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm md:hidden"
          onClick={() => setOpen(false)}
        />
      )}

      {/* Mobile drawer */}
      <aside
        className={cn(
          "fixed left-0 top-14 z-40 flex h-[calc(100vh-3.5rem)] w-72 max-w-[85vw] flex-col border-r border-white/10 bg-[#0a0a12] transition-transform duration-200 md:hidden",
          open ? "translate-x-0" : "-translate-x-full"
        )}
      >
        <nav className="flex-1 space-y-1 overflow-y-auto p-4">
          <NavLinks pathname={pathname} navItems={navItems} onNavigate={() => setOpen(false)} />
        </nav>
        {footer}
      </aside>

      {/* Desktop sidebar */}
      <aside className="fixed left-0 top-0 z-40 hidden h-screen w-64 flex-col border-r border-white/10 bg-black/40 backdrop-blur-xl md:flex">
        <div className="flex h-16 items-center gap-2 border-b border-white/10 px-6">
          <Sparkles className="h-5 w-5 text-violet-400" />
          <span className="font-semibold text-white">LankaJob AI</span>
        </div>
        <nav className="flex-1 space-y-1 overflow-y-auto p-4">
          <NavLinks pathname={pathname} navItems={navItems} />
        </nav>
        {footer}
      </aside>
    </>
  );
}
