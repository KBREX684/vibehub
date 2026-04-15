import type { Metadata } from "next";
import "./globals.css";
import { CommandPalette } from "@/components/command-palette";
import { TopNav } from "@/components/top-nav";
import { Footer } from "@/components/footer";
import { LanguageProvider } from "./context/LanguageContext";
import { AuthProvider } from "./context/AuthContext";
import { Toaster } from "sonner";
import { getServerLanguage, getServerTranslator } from "@/lib/i18n";

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getServerTranslator();
  return {
    title: t("meta.title"),
    description: t("meta.description"),
  };
}

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const language = await getServerLanguage();
  const { t } = await getServerTranslator();
  return (
    <html lang={language} className="dark">
      <body className="min-h-screen bg-[var(--color-bg-canvas)] flex flex-col">
        <AuthProvider>
          <LanguageProvider initialLanguage={language}>
            <a
              href="#main-content"
              className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[200] focus:rounded-[var(--radius-md)] focus:bg-[var(--color-bg-elevated)] focus:px-4 focus:py-2 focus:text-sm focus:text-[var(--color-text-primary)] focus:shadow-[var(--shadow-modal)]"
            >
              {t("a11y.skipToContent")}
            </a>
            <TopNav />
            <CommandPalette />
            <div id="main-content" className="flex-1 flex flex-col min-w-0">
              {children}
            </div>
            <Footer />
          </LanguageProvider>
        </AuthProvider>
        <Toaster richColors position="top-right" />
      </body>
    </html>
  );
}
