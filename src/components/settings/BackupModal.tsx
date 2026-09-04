"use client";

import { useMemo, useState } from "react";
import { ClipboardCopy, Download, Upload } from "lucide-react";
import { Sheet } from "@/components/ui/Sheet";
import { Segmented } from "@/components/ui/bits";
import { useToast } from "@/components/ui/Toast";
import { useStore } from "@/lib/data/store";
import { normalizePillar } from "@/lib/domain/pillars";
import type { AppData } from "@/lib/domain/types";

export function BackupModal({ onClose }: { onClose: () => void }) {
  const { goals, logs, objectives, replaceAll } = useStore();
  const { toast } = useToast();
  const [mode, setMode] = useState<"export" | "import">("export");
  const [importText, setImportText] = useState("");
  const [importError, setImportError] = useState("");

  const exportText = useMemo(
    () =>
      JSON.stringify(
        { goals, logs, objectives, exportedAt: new Date().toISOString(), v: 2 },
        null,
        2,
      ),
    [goals, logs, objectives],
  );

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(exportText);
      toast("Đã copy toàn bộ dữ liệu.");
    } catch {
      toast("Không copy được — chọn tay trong ô bên trên rồi Ctrl+C.", "error");
    }
  };

  const downloadFile = () => {
    const blob = new Blob([exportText], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `ke-hoach-sao-luu-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
    toast("Đã tải file sao lưu.");
  };

  const doImport = () => {
    try {
      const data = JSON.parse(importText) as Partial<AppData>;
      if (!data || !Array.isArray(data.goals) || typeof data.logs !== "object") {
        throw new Error("shape");
      }
      const normalized: AppData = {
        goals: data.goals.map((g) => ({ ...g, category: normalizePillar(g.category) })),
        logs: (data.logs as AppData["logs"]) || {},
        objectives: (data.objectives as AppData["objectives"]) || [],
      };
      replaceAll(normalized);
      toast("Đã khôi phục dữ liệu.");
      onClose();
    } catch {
      setImportError(
        "Dữ liệu dán vào không hợp lệ — kiểm tra lại bạn đã copy đủ toàn bộ đoạn chưa.",
      );
    }
  };

  return (
    <Sheet
      title="Sao lưu / Khôi phục"
      subtitle="Dữ liệu đã tự lưu; dùng phần này để giữ bản sao ngoài hoặc chuyển dữ liệu."
      onClose={onClose}
      dirty={mode === "import" && importText.trim().length > 0}
      footer={
        mode === "export" ? (
          <>
            <button onClick={downloadFile} className="btn-ghost flex-1 py-2.5 text-sm flex items-center justify-center gap-1.5">
              <Download size={15} /> Tải file
            </button>
            <button onClick={copy} className="btn-primary flex-1 py-2.5 text-sm flex items-center justify-center gap-1.5">
              <ClipboardCopy size={15} /> Copy toàn bộ
            </button>
          </>
        ) : (
          <>
            <button onClick={onClose} className="btn-ghost flex-1 py-2.5 text-sm">
              Huỷ
            </button>
            <button
              onClick={doImport}
              disabled={!importText.trim()}
              className="btn-primary flex-1 py-2.5 text-sm flex items-center justify-center gap-1.5 disabled:opacity-50"
            >
              <Upload size={15} /> Khôi phục
            </button>
          </>
        )
      }
    >
      <div className="mb-3">
        <Segmented
          value={mode}
          onChange={setMode}
          options={[
            { value: "export", label: "Sao lưu ra" },
            { value: "import", label: "Khôi phục vào" },
          ]}
        />
      </div>

      {mode === "export" ? (
        <textarea
          readOnly
          value={exportText}
          onFocus={(e) => e.currentTarget.select()}
          rows={12}
          className="field w-full px-3 py-2.5 text-[10px] num"
        />
      ) : (
        <div className="space-y-2.5">
          <textarea
            value={importText}
            onChange={(e) => {
              setImportText(e.target.value);
              setImportError("");
            }}
            placeholder="Dán dữ liệu đã sao lưu vào đây…"
            rows={12}
            className="field w-full px-3 py-2.5 text-xs num"
          />
          {importError && <p className="text-bad text-[11.5px]">{importError}</p>}
          <p className="text-text-3 text-[11px]">
            ⚠️ Khôi phục sẽ <b>ghi đè</b> toàn bộ dữ liệu hiện tại.
          </p>
        </div>
      )}
    </Sheet>
  );
}
