import type { Metadata } from "next";
import "./globals.css";
import { Sidebar } from "@/components/sidebar";

export const metadata: Metadata = {
  title: "VibeHub",
  description: "Community + Showcase + Teaming for VibeCoding developers",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="zh-CN">
      <body className="flex min-h-screen bg-[var(--color-bg-canvas)]">
        <Sidebar />
        <div className="flex-1 lg:pl-[260px] flex flex-col min-w-0 transition-all duration-300">
          <div className="pt-16 lg:pt-0 flex-1">
            {children}
          </div>
        </div>
      </body>
    </html>
  );
}
