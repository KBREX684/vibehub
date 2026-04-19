"use client";

/**
 * LedgerExportDialog — Export Ledger in JSON/PDF/TXT format.
 *
 * Built on Modal. Fields: date range, format (pill), workspace auto-selected.
 * In mock mode, shows a toast instead of downloading.
 */

import { useState } from "react";
import { Modal } from "@/components/ui";
import { useLanguage } from "@/app/context/LanguageContext";
import { isMockDataEnabled } from "@/lib/runtime-mode";
import { emitPmfEvent } from "@/lib/pmf-event";
import { toast } from "sonner";

type ExportFormat = "json" | "pdf" | "txt";

interface LedgerExportDialogProps {
  open: boolean;
  onClose: () => void;
  workspaceId: string;
}

export function LedgerExportDialog({ open, onClose, workspaceId }: LedgerExportDialogProps) {
  const { t } = useLanguage();
  const [format, setFormat] = useState<ExportFormat>("pdf");
  const [from, setFrom] = useState(() => {
    const d = new Date();
    d.setDate(1);
    return d.toISOString().split("T")[0];
  });
  const [to, setTo] = useState(() => new Date().toISOString().split("T")[0]);
  const [exporting, setExporting] = useState(false);

  async function handleExport() {
    setExporting(true);
    try {
      if (isMockDataEnabled()) {
        toast.success(t("ledger.export_mock_msg", "Mock 模式下不下载文件。导出参数已记录。"));
        emitPmfEvent("ledger.exported", { format });
        onClose();
        return;
      }

      emitPmfEvent("ledger.exported", { format });

      const url = `/api/v1/workspaces/${workspaceId}/ledger/export?format=${format}&from=${from}&to=${to}`;
      window.location.href = url;
      onClose();
    } catch {
      toast.error("导出失败，请重试。");
    } finally {
      setExporting(false);
    }
  }

  const formats: ExportFormat[] = ["json", "pdf", "txt"];

  return (
    <Modal open={open} onClose={onClose} title={t("ledger.export_title", "导出 Ledger")}>
      <div className="space-y-5">
        {/* Date range */}
        <div className="space-y-2">
          <label className="text-xs font-mono text-[var(--color-text-muted)] uppercase tracking-wider">
            {t("ledger.export.date_range", "日期范围")}
          </label>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-[10px] text-[var(--color-text-muted)]">开始</label>
              <input
                type="date"
                value={from}
                onChange={(e) => setFrom(e.target.value)}
                className="input-base w-full text-sm"
              />
            </div>
            <div>
              <label className="text-[10px] text-[var(--color-text-muted)]">结束</label>
              <input
                type="date"
                value={to}
                onChange={(e) => setTo(e.target.value)}
                className="input-base w-full text-sm"
              />
            </div>
          </div>
        </div>

        {/* Format */}
        <div className="space-y-2">
          <label className="text-xs font-mono text-[var(--color-text-muted)] uppercase tracking-wider">
            {t("ledger.export.format", "格式")}
          </label>
          <div className="flex gap-2">
            {formats.map((f) => (
              <button
                key={f}
                type="button"
                onClick={() => setFormat(f)}
                className="px-4 py-2 text-xs font-mono uppercase rounded-[var(--radius-md)] border transition-colors"
                style={{
                  borderColor: format === f ? "var(--color-accent-apple)" : "var(--color-border)",
                  backgroundColor: format === f ? "var(--color-accent-apple-subtle)" : "transparent",
                  color: format === f ? "var(--color-accent-apple)" : "var(--color-text-secondary)",
                }}
              >
                {f}
              </button>
            ))}
          </div>
        </div>

        {/* Actions */}
        <div className="flex justify-end gap-2 pt-2">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-sm text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] transition-colors"
          >
            {t("ledger.export.cancel", "取消")}
          </button>
          <button
            type="button"
            onClick={handleExport}
            disabled={exporting}
            className="px-4 py-2 text-sm font-semibold bg-[var(--color-text-primary)] text-[var(--color-bg-canvas)] border border-[var(--color-text-primary)] rounded-[var(--radius-md)] hover:opacity-90 transition-opacity disabled:opacity-50"
          >
            {exporting ? "导出中..." : t("ledger.export.cta", "导出")}
          </button>
        </div>
      </div>
    </Modal>
  );
}
