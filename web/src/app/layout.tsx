import type { Metadata } from "next";
import "./globals.css";
import { CommandPalette } from "@/components/command-palette";
import { TopNav } from "@/components/top-nav";
import { Footer } from "@/components/footer";
import { WebVitalsReporter } from "@/components/web-vitals-reporter";
import { LanguageProvider } from "./context/LanguageContext";
import { AuthProvider } from "./context/AuthContext";
import { Toaster } from "sonner";
import {
  getServerLanguage,
  getServerTranslator,
  getServerThemePreference,
  htmlClassForThemePreference,
} from "@/lib/i18n";
import { ThemeProvider } from "./context/ThemeContext";
import { ThemeScript } from "@/components/theme-script";

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
  const themePref = await getServerThemePreference();
  const { t } = await getServerTranslator();
  return (
    <html lang={language} className={htmlClassForThemePreference(themePref)} suppressHydrationWarning>
      <body className="min-h-screen bg-[var(--color-bg-canvas)] flex flex-col">
        <ThemeScript />
        <WebVitalsReporter />
        <AuthProvider>
          <LanguageProvider initialLanguage={language}>
            <ThemeProvider initialTheme={themePref}>
            <a
              href="#main-content"
              className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[200] focus:rounded-[var(--radius-md)] focus:bg-[var(--color-bg-elevated)] focus:px-4 focus:py-2 focus:text-sm focus:text-[var(--color-text-primary)] focus:shadow-[var(--shadow-modal)]"
            >
              {t("a11y.skip_to_content", "Skip to main content")}
            </a>
            <TopNav />
            <CommandPalette />
            <div id="main-content" className="flex-1 flex flex-col min-w-0">
              {children}
            </div>
            <Footer />
            </ThemeProvider>
          </LanguageProvider>
        </AuthProvider>
        <Toaster richColors position="top-right" />
      </body>
    </html>
  );
}
