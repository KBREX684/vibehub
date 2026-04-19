import { getServerTranslator } from "@/lib/i18n";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Trust Card — Print",
};

interface Props {
  params: Promise<{ slug: string }>;
}

export default async function TrustCardPrintPage({ params }: Props) {
  const { slug } = await params;
  const { t } = await getServerTranslator();

  // In production, fetch data server-side here
  // For now, use static placeholder data
  const name = slug === "dev-alice" ? "Alice Chen" : slug === "designer-bob" ? "Bob Wang" : "新用户";
  const tagline = slug === "dev-alice" ? "前端独立开发者 · AI 留痕倡导者" : slug === "designer-bob" ? "独立 UI 设计师" : "";

  return (
    <div className="print-container">
      <style>{`
        @media print {
          body { margin: 0; padding: 20mm; }
          .print-container { width: 100%; }
          .no-print { display: none !important; }
        }
        @page { size: A4; margin: 15mm; }
      `}</style>

      <div className="max-w-[600px] mx-auto py-16 px-8 space-y-8">
        {/* Header */}
        <div className="text-center space-y-2">
          <div className="mx-auto w-16 h-16 rounded-full bg-[var(--color-bg-elevated)] border border-[var(--color-border)] flex items-center justify-center text-2xl font-bold">
            {name.charAt(0)}
          </div>
          <h1 className="text-xl font-bold">{name}</h1>
          {tagline && <p className="text-sm text-[var(--color-text-secondary)]">{tagline}</p>}
        </div>

        {/* QR placeholder */}
        <div className="flex justify-center">
          <div className="w-24 h-24 border border-[var(--color-border)] bg-[var(--color-bg-surface)] flex items-center justify-center text-xs text-[var(--color-text-muted)]">
            QR Code
          </div>
        </div>

        {/* URL */}
        <p className="text-center text-xs font-mono text-[var(--color-text-muted)]">
          vibehub.com/u/{slug}
        </p>

        {/* Footer */}
        <p className="text-center text-[10px] font-mono text-[var(--color-text-muted)] pt-8 border-t border-[var(--color-border)]">
          由 VibeHub 公证 · {new Date().toISOString().split("T")[0]}
        </p>
      </div>

      {/* Screen-only back button */}
      <div className="no-print text-center mt-8">
        <button
          type="button"
          onClick={() => window.print()}
          className="px-4 py-2 text-sm bg-[var(--color-text-primary)] text-[var(--color-bg-canvas)] rounded-[var(--radius-md)]"
        >
          打印
        </button>
      </div>
    </div>
  );
}
