"use client";

import { useEffect, useRef, useState } from "react";
import { PackagePlus } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { useStore } from "@/lib/data/store";
import { fmtHours } from "@/lib/domain/dates";
import { currentWeeklyCapacity } from "@/lib/domain/identity";
import {
  DEFAULT_BUFFER_CAPACITY_PCT,
  MAX_BUFFER_CAPACITY_PCT,
  MIN_BUFFER_CAPACITY_PCT,
  clampBufferCapacityPct,
} from "@/lib/domain/settings";
import { fetchBufferCapacityPct, saveBufferCapacityPct } from "@/lib/data/settings-store";

export function BufferCapacityWidget() {
  const { goals, logs } = useStore();
  const [pct, setPct] = useState(DEFAULT_BUFFER_CAPACITY_PCT);
  const [loaded, setLoaded] = useState(false);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    fetchBufferCapacityPct()
      .then(setPct)
      .catch(() => setPct(DEFAULT_BUFFER_CAPACITY_PCT))
      .finally(() => setLoaded(true));
  }, []);

  const totalHours = currentWeeklyCapacity(goals, logs);
  const bufferHours = (totalHours * pct) / 100;
  const fixedHours = totalHours - bufferHours;

  const onChangePct = (next: number) => {
    const clamped = clampBufferCapacityPct(next);
    setPct(clamped);
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => {
      saveBufferCapacityPct(clamped).catch(() => {});
    }, 500);
  };

  return (
    <Card className="card-glass">
      <div className="flex items-center justify-between mb-3 gap-3 flex-wrap">
        <h2 className="headline text-[14px] flex items-center gap-1.5">
          <PackagePlus size={15} className="text-brand" /> Dung lượng đệm (Buffer)
        </h2>
        <span className="text-brand text-[20px] font-bold num">{pct}%</span>
      </div>

      <input
        type="range"
        min={MIN_BUFFER_CAPACITY_PCT}
        max={MAX_BUFFER_CAPACITY_PCT}
        step={1}
        value={pct}
        disabled={!loaded}
        onChange={(e) => onChangePct(Number(e.target.value))}
        className="w-full accent-[var(--brand)]"
        style={{ accentColor: "var(--brand)" }}
        aria-label="Tỷ lệ thời gian dự phòng mỗi tuần"
      />

      <p className="text-text-3 text-[11px] mt-1.5 leading-relaxed">
        % thời gian mỗi tuần cố tình để trống — dùng để hấp thụ việc phát sinh/hoãn, thay vì
        lịch kín 100% dễ vỡ kế hoạch.
      </p>

      <div className="grid grid-cols-3 gap-2 mt-3.5 text-center">
        <div className="rounded-xl py-2.5" style={{ background: "var(--chip)" }}>
          <div className="num text-text text-[15px] font-bold">{fmtHours(totalHours)}</div>
          <div className="text-text-3 text-[10.5px] mt-0.5">Tổng/tuần</div>
        </div>
        <div className="rounded-xl py-2.5" style={{ background: "var(--chip)" }}>
          <div className="num text-text text-[15px] font-bold">{fmtHours(fixedHours)}</div>
          <div className="text-text-3 text-[10.5px] mt-0.5">Cố định</div>
        </div>
        <div
          className="rounded-xl py-2.5"
          style={{ background: "color-mix(in srgb, var(--warn) 14%, transparent)" }}
        >
          <div className="num text-[15px] font-bold" style={{ color: "var(--warn)" }}>
            {fmtHours(bufferHours)}
          </div>
          <div className="text-text-3 text-[10.5px] mt-0.5">Đệm dự phòng</div>
        </div>
      </div>
    </Card>
  );
}
