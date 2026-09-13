"use client";

import Link from "next/link";
import { Sparkles, ArrowUpRight } from "lucide-react";
import { scoreLabel } from "@/lib/domain/weekly";
import type { DriftAlert } from "@/lib/domain/types";

/**
 * Gợi ý nhanh, tính tức thời từ dữ liệu hiện có (không gọi AI thật — miễn phí,
 * hiện ngay). Muốn phân tích sâu hơn bằng Claude thì bấm sang trang Phân tích.
 */
function pickInsight(alerts: DriftAlert[], score: number): { text: string; tone: "bad" | "warn" | "good" } {
  const bad = alerts.find((a) => a.severity === "bad");
  if (bad) return { text: bad.detail, tone: "bad" };
  const warn = alerts.find((a) => a.severity === "warn");
  if (warn) return { text: warn.detail, tone: "warn" };
  const sl = scoreLabel(score);
  if (sl.tone === "good") {
    return {
      text: `Điểm tuần ${score}/100 — ${sl.text.toLowerCase()}. Cứ giữ nhịp như vậy.`,
      tone: "good",
    };
  }
  return {
    text: "Chưa đủ dữ liệu để đưa ra gợi ý — hoàn thành vài buổi hôm nay để bắt đầu.",
    tone: "warn",
  };
}

export function AiAdvisorTile({ alerts, score }: { alerts: DriftAlert[]; score: number }) {
  const insight = pickInsight(alerts, score);
  const color =
    insight.tone === "bad" ? "var(--bad)" : insight.tone === "warn" ? "var(--warn)" : "var(--good)";

  return (
    <div
      className="card card-glass bento-hover card-hover p-4 lg:p-5 relative overflow-hidden flex-1"
      style={{
        borderRadius: 18,
        backgroundImage:
          "linear-gradient(155deg, color-mix(in srgb, var(--research) 10%, transparent), transparent 60%)",
      }}
    >
      <div className="flex items-center gap-2 mb-2.5">
        <span
          className="rounded-lg flex items-center justify-center flex-shrink-0"
          style={{
            width: 26,
            height: 26,
            background: "color-mix(in srgb, var(--research) 18%, transparent)",
          }}
        >
          <Sparkles size={13} style={{ color: "var(--research)" }} />
        </span>
        <span className="eyebrow">Gợi ý hôm nay</span>
      </div>

      <p className="text-text text-[13px] leading-relaxed mb-3" style={{ borderLeft: `2px solid ${color}`, paddingLeft: 10 }}>
        {insight.text}
      </p>

      <Link
        href="/phan-tich?tab=tuan"
        className="text-[11.5px] font-bold flex items-center gap-1"
        style={{ color: "var(--research)" }}
      >
        Phân tích sâu bằng AI <ArrowUpRight size={12} />
      </Link>
    </div>
  );
}
