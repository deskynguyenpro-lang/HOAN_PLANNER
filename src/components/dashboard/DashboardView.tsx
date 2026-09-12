"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { ArrowRight, Plus, Sparkles } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { Reveal } from "@/components/ui/bits";
import { useStore } from "@/lib/data/store";
import { addDays, fmtHours, startOfWeek, toKey, fmtVN } from "@/lib/domain/dates";
import { computeStreak } from "@/lib/domain/streak";
import {
  computeWeeklyMetrics,
  computeDriftAlerts,
  trajectoryData,
  pillarsWeekOverview,
} from "@/lib/domain/weekly";
import {
  fetchWeeklyReviews,
  saveWeeklyReview,
  type WeeklyReviewRow,
} from "@/lib/data/weekly-reviews";
import { dayBlocks, getEffectiveBlocks } from "@/lib/domain/schedule";
import { TrajectoryRibbon } from "./TrajectoryRibbon";
import { DriftAlerts } from "./DriftAlerts";
import { ScoreRing } from "./ScoreRing";
import { OnboardingCard } from "./OnboardingCard";
import { SpotlightCards } from "./SpotlightCards";
import { PillarsOverview } from "./PillarsOverview";
import { longestStreak } from "@/lib/domain/streak";
import { AddBlockModal } from "@/components/today/AddBlockModal";

function greeting() {
  const h = new Date().getHours();
  if (h < 11) return "Chào buổi sáng";
  if (h < 14) return "Chào buổi trưa";
  if (h < 18) return "Chào buổi chiều";
  return "Chào buổi tối";
}

export function DashboardView() {
  const { goals, logs, setLogs, objectives, email } = useStore();
  const [reviews, setReviews] = useState<WeeklyReviewRow[] | null>(null);
  const [addOpen, setAddOpen] = useState(false);
  const savedRef = useRef(false);

  const thisWeekStart = toKey(startOfWeek(new Date()));
  const lastWeekStart = toKey(addDays(startOfWeek(new Date()), -7));

  const streak = useMemo(() => computeStreak(goals, logs), [goals, logs]);
  const wk = useMemo(
    () => computeWeeklyMetrics(goals, logs, thisWeekStart),
    [goals, logs, thisWeekStart],
  );
  const lastWk = useMemo(
    () => computeWeeklyMetrics(goals, logs, lastWeekStart),
    [goals, logs, lastWeekStart],
  );
  const alerts = useMemo(
    () => computeDriftAlerts(goals, logs, objectives),
    [goals, logs, objectives],
  );
  const trajectory = useMemo(() => trajectoryData(goals, logs, 12), [goals, logs]);

  const pillarsWeek = useMemo(() => pillarsWeekOverview(goals, logs), [goals, logs]);

  // Tải danh sách tổng kết tuần đã lưu + tự lưu tuần vừa kết thúc (1 lần / phiên)
  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const rows = await fetchWeeklyReviews();
        if (!alive) return;
        setReviews(rows);
        const hasLast = rows.some((r) => r.week_start === lastWeekStart);
        const lastHadData =
          lastWk.completedHours > 0 || lastWk.adherence !== null;
        if (!hasLast && lastHadData && !savedRef.current) {
          savedRef.current = true;
          await saveWeeklyReview(lastWeekStart, lastWk);
          const fresh = await fetchWeeklyReviews();
          if (alive) setReviews(fresh);
        }
      } catch {
        if (alive) setReviews([]);
      }
    })();
    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lastWeekStart]);

  const name = email ? email.split("@")[0] : "";
  const latestReview = reviews?.[0];

  const activeGoals = goals.filter((g) => !g.archived);
  const isEmpty = activeGoals.length === 0 && objectives.filter((o) => !o.archived).length === 0;
  const todayPlanned = useMemo(
    () => getEffectiveBlocks(toKey(new Date()), goals, logs).filter((b) => !b.hidden),
    [goals, logs],
  );
  const todayDone = todayPlanned.filter((b) => b.completed).length;
  const todayHours = todayPlanned
    .filter((b) => b.completed)
    .reduce((s, b) => s + b.duration, 0);
  const bestStreak = useMemo(() => longestStreak(goals, logs), [goals, logs]);

  const initial = (name || email || "?").charAt(0).toUpperCase();

  const addBlock = ({
    goalId,
    start,
    duration,
  }: {
    goalId: string;
    start: number;
    duration: number;
  }) => {
    const todayKeyStr = toKey(new Date());
    const blocks = dayBlocks(todayKeyStr, logs);
    setLogs({
      ...logs,
      [todayKeyStr]: {
        blocks: [
          ...blocks,
          {
            id: `b_${Date.now()}`,
            goalId,
            start,
            duration,
            completed: false,
            skipped: false,
            reason: "",
          },
        ],
      },
    });
  };

  return (
    <div className="space-y-5">
      <Reveal>
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div className="flex items-start gap-3.5">
            <div
              className="flex items-center justify-center rounded-2xl flex-shrink-0 headline text-[18px] text-white"
              style={{
                width: 46,
                height: 46,
                background: "linear-gradient(145deg, var(--brand-2), var(--brand))",
                boxShadow: "0 10px 24px -10px color-mix(in srgb, var(--brand) 70%, transparent)",
              }}
            >
              {initial}
            </div>
            <div>
              <div className="eyebrow mb-1" suppressHydrationWarning>
                {fmtVN(new Date())}
              </div>
              <h1 className="display text-[24px] lg:text-[28px]" suppressHydrationWarning>
                {greeting()}
                {name ? `, ${name}` : ""}
              </h1>
              <div className="flex items-center gap-2 mt-2 flex-wrap">
                {streak > 0 && (
                  <span
                    className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-bold"
                    style={{
                      background: "color-mix(in srgb, var(--work) 16%, transparent)",
                      color: "var(--work)",
                    }}
                  >
                    🔥 {streak} ngày liên tiếp
                  </span>
                )}
                <span className="text-text-2 text-[12.5px]">
                  {isEmpty
                    ? "Chưa có kế hoạch nào — dựng cái đầu tiên bên dưới."
                    : todayPlanned.length === 0
                      ? "Hôm nay chưa có buổi nào trong lịch trình."
                      : `Hôm nay ${todayDone}/${todayPlanned.length} buổi xong.`}
                </span>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2 self-start">
            {!isEmpty && (
              <button
                onClick={() => setAddOpen(true)}
                className="btn-ghost px-3.5 py-2.5 text-[13px] flex items-center gap-1.5"
              >
                <Plus size={15} /> Thêm công việc mới
              </button>
            )}
            <Link
              href="/hom-nay"
              className="btn-primary px-4 py-2.5 text-[13px] flex items-center gap-2"
            >
              Lên kế hoạch hôm nay <ArrowRight size={15} />
            </Link>
          </div>
        </div>
      </Reveal>

      {isEmpty ? (
        <Reveal delay={40}>
          <OnboardingCard />
        </Reveal>
      ) : (
        <Reveal delay={40}>
          <SpotlightCards
            todayDone={todayDone}
            todayTotal={todayPlanned.length}
            todayHours={todayHours}
            weekScore={wk.score}
            adherence={wk.adherence}
            deltaHoursPct={wk.deltaHoursPct}
            streak={streak}
            bestStreak={bestStreak}
          />
        </Reveal>
      )}

      <Reveal delay={80}>
        <TrajectoryRibbon rows={trajectory} />
      </Reveal>

      {!isEmpty && (
        <Reveal delay={120}>
          <div>
            <div className="eyebrow mb-2">Cảnh báo lệch hướng</div>
            <DriftAlerts alerts={alerts} />
          </div>
        </Reveal>
      )}

      {!isEmpty && (
        <Reveal delay={160}>
          <div>
            <div className="eyebrow mb-2">4 trụ cột · tuần này</div>
            <PillarsOverview data={pillarsWeek} />
          </div>
        </Reveal>
      )}

      <Reveal delay={200}>
        <Card>
          <div className="flex items-center justify-between mb-3">
            <h2 className="headline text-[15px] flex items-center gap-1.5">
              <Sparkles size={15} className="text-brand" /> Tổng kết tuần gần nhất
            </h2>
            <Link
              href="/phan-tich?tab=tuan"
              className="text-brand text-[12px] font-bold flex items-center gap-1"
            >
              Chi tiết <ArrowRight size={13} />
            </Link>
          </div>

          {reviews === null ? (
            <div className="h-24 rounded-xl" style={{ background: "var(--chip)" }} />
          ) : latestReview ? (
            <div className="flex gap-4 items-center">
              <ScoreRing score={latestReview.metrics.score} />
              <div className="min-w-0 flex-1">
                <div className="text-text-3 text-[11px] num mb-1">
                  Tuần bắt đầu {latestReview.week_start}
                </div>
                <div className="text-text text-[12.5px] leading-relaxed">
                  Bám kế hoạch{" "}
                  <b>
                    {latestReview.metrics.adherence === null
                      ? "—"
                      : `${latestReview.metrics.adherence}%`}
                  </b>
                  , hoàn thành{" "}
                  <b>{fmtHours(latestReview.metrics.completedHours)}</b>
                  {latestReview.metrics.deltaHoursPct !== 0 && (
                    <>
                      {" "}
                      (
                      {latestReview.metrics.deltaHoursPct >= 0 ? "+" : ""}
                      {latestReview.metrics.deltaHoursPct}% so với tuần trước)
                    </>
                  )}
                  .
                </div>
                {latestReview.ai_summary && (
                  <div className="text-text-2 text-[11.5px] mt-2 line-clamp-3 leading-relaxed">
                    {latestReview.ai_summary}
                  </div>
                )}
              </div>
            </div>
          ) : (
            <p className="text-text-3 text-[12.5px] leading-relaxed">
              Chưa có tuần nào hoàn tất để tổng kết. Cứ bám lịch trình — cuối tuần app sẽ tự
              chấm điểm và lưu lại ở đây.
            </p>
          )}
        </Card>
      </Reveal>

      {addOpen && (
        <AddBlockModal
          goals={goals}
          defaultTime={`${String(Math.min(23, new Date().getHours() + 1)).padStart(2, "0")}:00`}
          onAdd={addBlock}
          onClose={() => setAddOpen(false)}
        />
      )}
    </div>
  );
}
