"use client";

import Link from "next/link";
import { Flame, Target, CalendarCheck2, ArrowRight, Trophy } from "lucide-react";
import { fmtHours } from "@/lib/domain/dates";
import { scoreLabel } from "@/lib/domain/weekly";

function Ring({
  pct,
  size = 72,
  stroke = 8,
  center,
}: {
  pct: number;
  size?: number;
  stroke?: number;
  center: React.ReactNode;
}) {
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const p = Math.max(0, Math.min(100, pct));
  return (
    <div style={{ width: size, height: size, position: "relative", flexShrink: 0 }}>
      <svg width={size} height={size} style={{ transform: "rotate(-90deg)" }}>
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke="rgba(255,255,255,0.25)"
          strokeWidth={stroke}
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke="#fff"
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={`${(p / 100) * c} ${c}`}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center text-white">
        {center}
      </div>
    </div>
  );
}

const SHELL =
  "rounded-2xl p-4 lg:p-5 text-white relative overflow-hidden shadow-[0_18px_40px_-20px_rgba(0,0,0,0.55)]";

export function SpotlightCards({
  todayDone,
  todayTotal,
  todayHours,
  weekScore,
  adherence,
  deltaHoursPct,
  streak,
  bestStreak,
}: {
  todayDone: number;
  todayTotal: number;
  todayHours: number;
  weekScore: number;
  adherence: number | null;
  deltaHoursPct: number;
  streak: number;
  bestStreak: number;
}) {
  const todayPct = todayTotal > 0 ? Math.round((todayDone / todayTotal) * 100) : 0;
  const sl = scoreLabel(weekScore);

  return (
    <div className="grid sm:grid-cols-3 gap-3">
      {/* Việc hôm nay */}
      <div
        className={SHELL}
        style={{ background: "linear-gradient(145deg, #ff7a5c, #ef4f39)" }}
      >
        <span
          aria-hidden
          className="absolute -right-6 -bottom-6 opacity-15"
        >
          <CalendarCheck2 size={96} strokeWidth={1.4} />
        </span>
        <div className="eyebrow text-white/80 mb-3">Việc hôm nay</div>
        <div className="flex items-center gap-3.5">
          <Ring
            pct={todayPct}
            center={
              <span className="num text-[15px] font-bold leading-none">{todayPct}%</span>
            }
          />
          <div className="min-w-0">
            <div className="display text-[20px] num leading-tight">
              {todayDone}/{todayTotal || 0}
            </div>
            <div className="text-white/80 text-[11.5px]">buổi · {fmtHours(todayHours)}</div>
            <Link
              href="/hom-nay"
              className="inline-flex items-center gap-1 text-[11.5px] font-bold text-white/95 mt-1.5 hover:gap-1.5 transition-all"
            >
              Mở lịch hôm nay <ArrowRight size={12} />
            </Link>
          </div>
        </div>
      </div>

      {/* Điểm tuần */}
      <div
        className={SHELL}
        style={{ background: "linear-gradient(145deg, #6d5df6, #4b3fd6)" }}
      >
        <span aria-hidden className="absolute -right-6 -bottom-6 opacity-15">
          <Target size={96} strokeWidth={1.4} />
        </span>
        <div className="eyebrow text-white/80 mb-3">Điểm tuần này</div>
        <div className="flex items-end gap-2">
          <span className="display text-[34px] num leading-none">{weekScore}</span>
          <span className="text-white/75 text-[12px] mb-1">/100</span>
        </div>
        <div className="text-[12px] font-bold text-white/95 mt-1">{sl.text}</div>
        <div className="flex items-center gap-3 mt-2 text-[11px] text-white/80">
          <span>
            Bám KH: <b className="text-white">{adherence === null ? "—" : `${adherence}%`}</b>
          </span>
          <span>
            {deltaHoursPct >= 0 ? "▲" : "▼"} {Math.abs(deltaHoursPct)}% giờ
          </span>
        </div>
      </div>

      {/* Chuỗi ngày */}
      <div
        className={SHELL}
        style={{ background: "linear-gradient(145deg, #2fbe8f, #159f70)" }}
      >
        <span aria-hidden className="absolute -right-5 -bottom-6 opacity-15">
          <Flame size={96} strokeWidth={1.4} />
        </span>
        <div className="eyebrow text-white/80 mb-3">Chuỗi ngày</div>
        <div className="flex items-center gap-2">
          <Flame size={26} className="text-white" fill="rgba(255,255,255,0.35)" />
          <span className="display text-[34px] num leading-none">{streak}</span>
          <span className="text-white/75 text-[12px] mb-1">ngày</span>
        </div>
        <div className="flex items-center gap-1.5 mt-2 text-[11px] text-white/85">
          <Trophy size={12} /> Kỷ lục {bestStreak} ngày
        </div>
        <div className="text-white/80 text-[11px] mt-1.5 leading-snug">
          {streak === 0
            ? "Hoàn thành ≥70% kế hoạch hôm nay để bắt đầu chuỗi mới."
            : "Giữ nhịp — mỗi ngày một chút."}
        </div>
      </div>
    </div>
  );
}
