"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowRight, Compass, Sparkles } from "lucide-react";
import { useStore } from "@/lib/data/store";
import { fetchIdentity } from "@/lib/data/identity-store";
import { recommendedAllocation, type IdentityProfile } from "@/lib/domain/identity";
import { pillarOf } from "@/lib/domain/pillars";
import { PriorityWeightBar } from "@/components/identity/PriorityWeightBar";

export function IdentityWeightTile() {
  const { goals, logs } = useStore();
  const [identity, setIdentity] = useState<IdentityProfile | null>(null);

  useEffect(() => {
    let alive = true;
    fetchIdentity()
      .then((p) => alive && setIdentity(p))
      .catch(() => alive && setIdentity(null));
    return () => {
      alive = false;
    };
  }, []);

  if (identity === null) {
    return <div className="card h-[120px]" style={{ background: "var(--chip)" }} />;
  }

  if (!identity.vision) {
    return (
      <Link href="/dinh-huong" className="card card-glass p-4 lg:p-5 flex items-center gap-3.5 h-full">
        <div
          className="flex items-center justify-center rounded-2xl flex-shrink-0"
          style={{ width: 42, height: 42, background: "var(--brand-dim)" }}
        >
          <Compass size={20} className="text-brand" />
        </div>
        <div className="min-w-0 flex-1">
          <h2 className="headline text-[14px]">Chưa thiết lập định hướng</h2>
          <p className="text-text-3 text-[12px] mt-0.5">
            Mô tả mục tiêu 1-3 năm để tự động tính lại trọng số 4 trụ cột.
          </p>
        </div>
        <ArrowRight size={16} className="text-text-3 flex-shrink-0" />
      </Link>
    );
  }

  const allocation = recommendedAllocation(identity.pillarWeights, goals, logs);
  const biggestGap = [...allocation].sort((a, b) => b.deltaHours - a.deltaHours)[0];

  return (
    <Link href="/dinh-huong" className="card card-glass p-4 lg:p-5 h-full flex flex-col">
      <div className="flex items-center justify-between mb-3">
        <h2 className="headline text-[14.5px] flex items-center gap-1.5">
          <Sparkles size={15} className="text-brand" /> Trọng số theo định hướng
        </h2>
        <ArrowRight size={15} className="text-text-3" />
      </div>
      <PriorityWeightBar weights={identity.pillarWeights} compact />
      {biggestGap && biggestGap.deltaHours > 0.25 && (
        <p className="text-text-3 text-[11.5px] mt-3 leading-relaxed">
          Đang thiếu nhiều nhất ở{" "}
          <b className="text-text-2">{pillarOf(biggestGap.id).label}</b> so với định hướng —
          xem chi tiết.
        </p>
      )}
    </Link>
  );
}
