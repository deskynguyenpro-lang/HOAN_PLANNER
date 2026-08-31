"use client";

import { AlertTriangle, TriangleAlert, ShieldCheck } from "lucide-react";
import type { DriftAlert } from "@/lib/domain/types";

export function DriftAlerts({ alerts }: { alerts: DriftAlert[] }) {
  if (alerts.length === 0) {
    return (
      <div
        className="card p-4 flex items-center gap-3"
        style={{ borderColor: "color-mix(in srgb, var(--good) 35%, var(--border))" }}
      >
        <div
          className="rounded-xl flex items-center justify-center flex-shrink-0"
          style={{
            width: 34,
            height: 34,
            background: "color-mix(in srgb, var(--good) 16%, transparent)",
          }}
        >
          <ShieldCheck size={17} className="text-good" />
        </div>
        <div>
          <div className="text-text text-[13.5px] font-semibold">
            Không có cảnh báo lệch hướng
          </div>
          <div className="text-text-3 text-[12px]">
            Cả 4 trụ cột và các mục tiêu lớn đang trong nhịp. Giữ đà nhé.
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-2.5">
      {alerts.map((a) => {
        const isBad = a.severity === "bad";
        const color = isBad ? "var(--bad)" : "var(--warn)";
        const Icon = isBad ? AlertTriangle : TriangleAlert;
        return (
          <div
            key={a.id}
            className="card p-4 flex gap-3"
            style={{ borderColor: `color-mix(in srgb, ${color} 40%, var(--border))` }}
          >
            <div
              className="rounded-xl flex items-center justify-center flex-shrink-0"
              style={{
                width: 34,
                height: 34,
                background: `color-mix(in srgb, ${color} 16%, transparent)`,
              }}
            >
              <Icon size={17} style={{ color }} />
            </div>
            <div className="min-w-0">
              <div className="text-text text-[13.5px] font-semibold leading-snug">
                {a.title}
              </div>
              <div className="text-text-2 text-[12px] mt-0.5 leading-relaxed">
                {a.detail}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
