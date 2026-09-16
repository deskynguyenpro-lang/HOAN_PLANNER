"use client";

import { useEffect, useState } from "react";
import { Scale } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { PillarDot } from "@/components/ui/bits";
import { PILLARS } from "@/lib/domain/pillars";
import type { IdentityProfile } from "@/lib/domain/identity";
import { fetchIdentity } from "@/lib/data/identity-store";

/** So sánh % thời gian thực tế đang phân bổ cho 4 trụ cột với % trọng số đã đặt ở Định hướng. */
export function PillarAllocationCard({ actualHoursByPillar }: { actualHoursByPillar: Record<string, number> }) {
  const [identity, setIdentity] = useState<IdentityProfile | null>(null);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    fetchIdentity()
      .then(setIdentity)
      .catch(() => setIdentity(null))
      .finally(() => setLoaded(true));
  }, []);

  const totalActual = Object.values(actualHoursByPillar).reduce((a, b) => a + b, 0);

  if (!loaded) return null;
  if (!identity || !identity.vision) {
    return (
      <Card>
        <h2 className="headline text-[15px] flex items-center gap-1.5 mb-1">
          <Scale size={16} className="text-brand" /> Thực tế vs. Trọng số định hướng
        </h2>
        <p className="text-text-3 text-[12.5px] leading-relaxed">
          Chưa thiết lập định hướng nên chưa có trọng số để so sánh — xem ở trang{" "}
          <a href="/dinh-huong" className="text-brand font-semibold">
            Định hướng &amp; ưu tiên
          </a>
          .
        </p>
      </Card>
    );
  }

  return (
    <Card>
      <h2 className="headline text-[15px] flex items-center gap-1.5 mb-3">
        <Scale size={16} className="text-brand" /> Thực tế vs. Trọng số định hướng
      </h2>
      <div className="space-y-3">
        {PILLARS.map((p) => {
          const actualHours = actualHoursByPillar[p.id] || 0;
          const actualPct = totalActual > 0 ? Math.round((actualHours / totalActual) * 100) : 0;
          const targetPct = identity.pillarWeights[p.id] ?? 0;
          const diff = actualPct - targetPct;
          return (
            <div key={p.id}>
              <div className="flex items-center justify-between mb-1">
                <span className="flex items-center gap-1.5 text-text text-[12.5px] font-semibold">
                  <PillarDot id={p.id} size={8} /> {p.label}
                </span>
                <span className="text-[11.5px] num text-text-2">
                  thực tế <b className="text-text">{actualPct}%</b> · đặt {targetPct}%
                  {Math.abs(diff) >= 8 && (
                    <span
                      className="ml-1.5 font-bold"
                      style={{ color: diff > 0 ? "var(--good)" : "var(--warn)" }}
                    >
                      ({diff > 0 ? "+" : ""}
                      {diff})
                    </span>
                  )}
                </span>
              </div>
              <div className="relative h-[7px] rounded-full overflow-hidden" style={{ background: "var(--chip)" }}>
                <div
                  className="absolute inset-y-0 left-0 rounded-full"
                  style={{ width: `${Math.min(100, targetPct)}%`, background: "var(--border)" }}
                />
                <div
                  className="absolute inset-y-0 left-0 rounded-full"
                  style={{ width: `${Math.min(100, actualPct)}%`, background: p.color, opacity: 0.9 }}
                />
              </div>
            </div>
          );
        })}
      </div>
      <p className="text-text-3 text-[10.5px] mt-3">Vạch mờ = trọng số đã đặt · vạch màu = giờ thực tế 30 ngày qua</p>
    </Card>
  );
}
