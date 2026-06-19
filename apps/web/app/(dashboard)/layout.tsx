import { Sidebar } from "@/components/dashboard/sidebar";
import { StandaloneBanner } from "@/components/standalone-banner";

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen">
      <Sidebar />
      <main className="ml-64 min-h-screen p-8">
        <StandaloneBanner />
        {children}
      </main>
    </div>
  );
}
