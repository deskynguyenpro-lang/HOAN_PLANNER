"use client";

import { useState } from "react";
import { AlertTriangle, RefreshCw, X } from "lucide-react";
import { useStore } from "@/lib/data/store";

export function DataErrorBanner() {
  const { saveState, saveError, reload } = useStore();
  const [hidden, setHidden] = useState(false);

  if (saveState !== "error" || hidden) return null;

  return (
    <div
      className="mb-5 rounded-2xl p-4 flex items-start gap-3"
      style={{
        background: "color-mix(in srgb, var(--bad) 12%, var(--surface))",
        border: "1px solid color-mix(in srgb, var(--bad) 40%, var(--border))",
      }}
    >
      <AlertTriangle size={18} className="text-bad flex-shrink-0 mt-0.5" />
      <div className="min-w-0 flex-1">
        <div className="text-text text-[13.5px] font-semibold">
          Không đồng bộ được với máy chủ
        </div>
        <p className="text-text-2 text-[12px] mt-1 leading-relaxed break-words">
          {saveError || "Lỗi không xác định."}
        </p>
        <p className="text-text-3 text-[11px] mt-1.5">
          Thường do chưa chạy đủ file <code>supabase/schema.sql</code>. Thử bấm “Tải lại”;
          nếu vẫn lỗi, gửi nguyên dòng chữ đỏ ở trên cho người hỗ trợ.
        </p>
        <button
          onClick={() => reload()}
          className="btn-ghost mt-2.5 px-3 py-1.5 text-[12px] flex items-center gap-1.5"
        >
          <RefreshCw size={13} /> Tải lại
        </button>
      </div>
      <button
        onClick={() => setHidden(true)}
        className="text-text-3 hover:text-text p-1 flex-shrink-0"
        aria-label="Ẩn"
      >
        <X size={16} />
      </button>
    </div>
  );
}
