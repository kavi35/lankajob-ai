import type { Metadata, Viewport } from "next";
import { Toaster } from "sonner";
import { AuthProvider } from "@/components/providers";
import "./globals.css";

export const metadata: Metadata = {
  title: "LankaJob AI — AI-Powered Job Matching for Sri Lanka",
  description: "Upload your CV and find the best Sri Lankan job matches with AI.",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <body className="antialiased gradient-bg min-h-screen font-sans">
        <AuthProvider>
          {children}
          <Toaster theme="dark" position="top-center" richColors closeButton />
        </AuthProvider>
      </body>
    </html>
  );
}
