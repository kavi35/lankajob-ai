import { Sidebar } from "@/components/dashboard/sidebar";
import { StandaloneBanner } from "@/components/standalone-banner";

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen">
      <Sidebar />
      <main className="min-h-screen px-4 pb-8 pt-[4.5rem] md:ml-64 md:p-8 md:pt-8">
        <StandaloneBanner />
        {children}
      </main>
    </div>
  );
}
