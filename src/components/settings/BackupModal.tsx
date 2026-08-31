"use client";

import { useMemo, useState } from "react";
import { ClipboardCopy, Download, Upload } from "lucide-react";
import { Modal } from "@/components/ui/Modal";
import { Segmented } from "@/components/ui/bits";
import { useStore } from "@/lib/data/store";
import { normalizePillar } from "@/lib/domain/pillars";
import type { AppData } from "@/lib/domain/types";

export function BackupModal({ onClose }: { onClose: () => void }) {
  const { goals, logs, objectives, replaceAll } = useStore();
  const [mode, setMode] = useState<"export" | "import">("export");
  const [importText, setImportText] = useState("");
  const [importError, setImportError] = useState("");
  const [copied, setCopied] = useState(false);

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
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      /* clipboard bị chặn — textarea vẫn chọn tay được */
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
  };

  const doImport = () => {
    try {
      const data = JSON.parse(importText) as Partial<AppData>;
      if (!data || !Array.isArray(data.goals) || typeof data.logs !== "object") {
        throw new Error("shape");
      }
      // chuẩn hoá trụ cột cũ (personal/other) về 4 trụ cột
      const normalized: AppData = {
        goals: data.goals.map((g) => ({ ...g, category: normalizePillar(g.category) })),
        logs: (data.logs as AppData["logs"]) || {},
        objectives: (data.objectives as AppData["objectives"]) || [],
      };
      replaceAll(normalized);
      onClose();
    } catch {
      setImportError(
        "Dữ liệu dán vào không hợp lệ — kiểm tra lại bạn đã copy đủ toàn bộ đoạn chưa.",
      );
    }
  };

  return (
    <Modal title="Sao lưu / Khôi phục" onClose={onClose} size="md">
      <p className="text-text-3 text-[11.5px] mb-3 leading-relaxed">
        Dữ liệu đã tự lưu lên máy chủ. Dùng phần này khi muốn giữ một bản sao ngoài, hoặc
        chuyển dữ liệu giữa các tài khoản.
      </p>
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
        <div className="space-y-2.5">
          <textarea
            readOnly
            value={exportText}
            onFocus={(e) => e.currentTarget.select()}
            rows={7}
            className="field w-full px-3 py-2.5 text-[10px] num"
          />
          <div className="flex gap-2">
            <button
              onClick={copy}
              className="btn-primary flex-1 py-2.5 text-sm flex items-center justify-center gap-1.5"
            >
              <ClipboardCopy size={15} /> {copied ? "Đã copy!" : "Copy toàn bộ"}
            </button>
            <button
              onClick={downloadFile}
              className="btn-ghost px-4 py-2.5 text-sm flex items-center gap-1.5"
            >
              <Download size={15} /> Tải file
            </button>
          </div>
        </div>
      ) : (
        <div className="space-y-2.5">
          <textarea
            value={importText}
            onChange={(e) => {
              setImportText(e.target.value);
              setImportError("");
            }}
            placeholder="Dán dữ liệu đã sao lưu vào đây…"
            rows={7}
            className="field w-full px-3 py-2.5 text-xs num"
          />
          {importError && <p className="text-bad text-[11.5px]">{importError}</p>}
          <button
            onClick={doImport}
            disabled={!importText.trim()}
            className="btn-primary w-full py-2.5 text-sm flex items-center justify-center gap-1.5 disabled:opacity-50"
          >
            <Upload size={15} /> Khôi phục (ghi đè dữ liệu hiện tại)
          </button>
        </div>
      )}
    </Modal>
  );
}
