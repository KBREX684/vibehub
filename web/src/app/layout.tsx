import type { Metadata } from "next";
import "./globals.css";
import { TopNav } from "@/components/top-nav";
import { Footer } from "@/components/footer";
import { LanguageProvider } from "./context/LanguageContext";
import { AuthProvider } from "./context/AuthContext";
import { Toaster } from "sonner";

export const metadata: Metadata = {
  title: "VibeHub — Where Vibe Coders Build Together",
  description:
    "The premier platform for Vibe Coding developers. Discover AI-native projects, join elite teams, and connect with builders worldwide.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark">
      <body className="min-h-screen bg-[var(--color-bg-canvas)] flex flex-col">
        <AuthProvider>
          <LanguageProvider>
            <TopNav />
            <div className="flex-1 flex flex-col min-w-0">{children}</div>
            <Footer />
          </LanguageProvider>
        </AuthProvider>
        <Toaster richColors position="top-right" />
      </body>
    </html>
  );
}
