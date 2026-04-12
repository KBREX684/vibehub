import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "VibeHub",
  description: "Community + Showcase + Teaming for VibeCoding developers",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="zh-CN">
      <body>{children}</body>
    </html>
  );
}
