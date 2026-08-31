"use client";

import { useState } from "react";
import { Sparkles, Loader2 } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { useStore } from "@/lib/data/store";
import { buildAISummary } from "@/lib/domain/ai-summary";

export function AIInsightsCard({
  onResult,
}: {
  onResult?: (text: string) => void;
}) {
  const { goals, logs, objectives } = useStore();
  const [status, setStatus] = useState<"idle" | "loading" | "done" | "error">("idle");
  const [result, setResult] = useState("");
  const [errorMsg, setErrorMsg] = useState("");

  const run = async () => {
    setStatus("loading");
    setErrorMsg("");
    try {
      const summary = buildAISummary(goals, logs, objectives);
      const res = await fetch("/api/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ summary }),
      });
      const data = await res.json();
      if (!res.ok || data.error) {
        throw new Error(data.error || "Không phân tích được lúc này.");
      }
      setResult(data.text);
      setStatus("done");
      onResult?.(data.text);
    } catch (e) {
      setErrorMsg(e instanceof Error ? e.message : "Không phân tích được lúc này.");
      setStatus("error");
    }
  };

  return (
    <Card
      style={{
        background:
          "linear-gradient(150deg, color-mix(in srgb, var(--brand) 8%, var(--surface)), var(--surface))",
      }}
    >
      <h2 className="headline text-[15px] mb-1 flex items-center gap-1.5">
        <Sparkles size={16} className="text-brand" /> Phân tích &amp; gợi ý từ AI
      </h2>
      <p className="text-text-3 text-[12px] mb-3 leading-relaxed">
        AI đọc số liệu 30 ngày qua + tuần này để đánh giá hiệu quả và gợi ý cách xây kế
        hoạch tốt hơn. Cần cấu hình khoá API riêng, tính phí theo lượt dùng.
      </p>

      {status === "idle" && (
        <button onClick={run} className="btn-primary w-full py-2.5 text-sm">
          Phân tích hiệu quả kế hoạch
        </button>
      )}
      {status === "loading" && (
        <div className="flex items-center gap-2 py-2 text-text-2 text-[13px]">
          <Loader2 size={16} className="animate-spin text-brand" />
          Đang phân tích dữ liệu của bạn…
        </div>
      )}
      {status === "error" && (
        <div>
          <p className="text-bad text-[12.5px] mb-2 leading-relaxed">{errorMsg}</p>
          <button onClick={run} className="btn-ghost px-4 py-2 text-xs">
            Thử lại
          </button>
        </div>
      )}
      {status === "done" && (
        <div>
          <div
            className="text-text text-[13px] leading-[1.7]"
            style={{ whiteSpace: "pre-wrap" }}
          >
            {result}
          </div>
          <button onClick={run} className="btn-ghost px-4 py-2 text-xs mt-3">
            Phân tích lại
          </button>
        </div>
      )}
    </Card>
  );
}
