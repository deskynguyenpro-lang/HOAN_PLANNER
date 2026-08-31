"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Check, Loader2, TrendingUp, TrendingDown, Minus, History } from "lucide-react";
import { Card, CardHeader } from "@/components/ui/Card";
import { PillarDot, EmptyState } from "@/components/ui/bits";
import { ScoreRing } from "@/components/dashboard/ScoreRing";
import { AIInsightsCard } from "@/components/reports/AIInsightsCard";
import { useStore } from "@/lib/data/store";
import { PILLARS } from "@/lib/domain/pillars";
import { fmtHours, startOfWeek, toKey } from "@/lib/domain/dates";
import { computeWeeklyMetrics } from "@/lib/domain/weekly";
import {
  fetchWeeklyReviews,
  saveWeeklyReview,
  type WeeklyReviewRow,
} from "@/lib/data/weekly-reviews";
import type { WeeklyMetrics } from "@/lib/domain/types";

function DeltaBadge({ pct }: { pct: number }) {
  const Icon = pct > 0 ? TrendingUp : pct < 0 ? TrendingDown : Minus;
  const color = pct > 0 ? "var(--good)" : pct < 0 ? "var(--bad)" : "var(--text-3)";
  return (
    <span
      className="inline-flex items-center gap-1 text-[11px] font-bold num"
      style={{ color }}
    >
      <Icon size={12} />
      {pct > 0 ? "+" : ""}
      {pct}%
    </span>
  );
}

function MetricsBody({ m }: { m: WeeklyMetrics }) {
  return (
    <>
      <div className="flex gap-4 items-center">
        <ScoreRing score={m.score} />
        <div className="flex-1 grid grid-cols-2 gap-x-4 gap-y-2">
          <div>
            <div className="eyebrow">Bám kế hoạch</div>
            <div className="headline text-[16px] num">
              {m.adherence === null ? "—" : `${m.adherence}%`}
            </div>
          </div>
          <div>
            <div className="eyebrow">Giờ hoàn thành</div>
            <div className="headline text-[16px] num">{fmtHours(m.completedHours)}</div>
          </div>
          <div>
            <div className="eyebrow">So với tuần trước</div>
            <div className="headline text-[16px]">
              <DeltaBadge pct={m.deltaHoursPct} />
            </div>
          </div>
          <div>
            <div className="eyebrow">Số buổi xong</div>
            <div className="headline text-[16px] num">{m.sessions}</div>
          </div>
        </div>
      </div>

      <div className="hair my-4" />

      <div className="eyebrow mb-2">Từng trụ cột</div>
      <div className="space-y-2">
        {PILLARS.map((p) => {
          const d = m.perPillar[p.id];
          return (
            <div key={p.id} className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <PillarDot id={p.id} size={8} />
                <span className="text-text-2 text-[12.5px]">{p.label}</span>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-text text-[12px] font-bold num">
                  {fmtHours(d.hours)}
                </span>
                <DeltaBadge pct={d.deltaPct} />
                <span className="text-text-3 text-[11px] num w-10 text-right">
                  {d.adherence === null ? "—" : `${d.adherence}%`}
                </span>
              </div>
            </div>
          );
        })}
      </div>

      {(m.bestDay || m.worstDay || m.topReasons.length > 0) && (
        <>
          <div className="hair my-4" />
          <div className="space-y-1.5 text-[12px] text-text-2">
            {m.bestDay && (
              <div>
                Ngày mạnh nhất: <b className="text-text">{m.bestDay.label}</b> ({m.bestDay.pct}%)
              </div>
            )}
            {m.worstDay && m.worstDay.label !== m.bestDay?.label && (
              <div>
                Ngày yếu nhất: <b className="text-text">{m.worstDay.label}</b> ({m.worstDay.pct}%)
              </div>
            )}
            {m.topReasons.length > 0 && (
              <div>
                Lý do bỏ lỡ:{" "}
                {m.topReasons.map((r, i) => (
                  <span key={r.reason}>
                    {i > 0 && ", "}
                    {r.reason} ({r.count})
                  </span>
                ))}
              </div>
            )}
          </div>
        </>
      )}
    </>
  );
}

export function WeeklyReviewView() {
  const { goals, logs } = useStore();
  const thisWeekStart = toKey(startOfWeek(new Date()));
  const wk = useMemo(
    () => computeWeeklyMetrics(goals, logs, thisWeekStart),
    [goals, logs, thisWeekStart],
  );

  const [reviews, setReviews] = useState<WeeklyReviewRow[] | null>(null);
  const [saveMsg, setSaveMsg] = useState("");
  const [saving, setSaving] = useState(false);

  const refresh = useCallback(async () => {
    try {
      setReviews(await fetchWeeklyReviews());
    } catch {
      setReviews([]);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const persist = async (ai?: string) => {
    setSaving(true);
    try {
      await saveWeeklyReview(thisWeekStart, wk, ai);
      setSaveMsg(ai ? "Đã lưu kèm phân tích AI" : "Đã lưu tổng kết tuần này");
      await refresh();
    } catch {
      setSaveMsg("Lưu thất bại — thử lại sau");
    } finally {
      setSaving(false);
      setTimeout(() => setSaveMsg(""), 2600);
    }
  };

  const pastReviews = (reviews || []).filter((r) => r.week_start !== thisWeekStart);

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader
          title="Tuần này"
          eyebrow={`Bắt đầu ${thisWeekStart}`}
          action={
            <button
              onClick={() => persist()}
              disabled={saving}
              className="btn-ghost px-3 py-2 text-[12px] flex items-center gap-1.5"
            >
              {saving ? <Loader2 size={13} className="animate-spin" /> : <Check size={13} />}
              Lưu tổng kết
            </button>
          }
        />
        <MetricsBody m={wk} />
        {saveMsg && <p className="text-good text-[11.5px] font-bold mt-3">{saveMsg}</p>}
      </Card>

      <AIInsightsCard onResult={(text) => persist(text)} />

      <Card>
        <CardHeader
          title="Các tuần trước"
          icon={<History size={16} className="text-brand" />}
        />
        {reviews === null ? (
          <div className="h-20 rounded-xl" style={{ background: "var(--chip)" }} />
        ) : pastReviews.length === 0 ? (
          <EmptyState
            icon={History}
            title="Chưa có tuần nào được lưu"
            hint="Mỗi khi một tuần kết thúc, app tự chấm điểm và lưu vào đây. Bạn cũng có thể bấm “Lưu tổng kết” ở trên bất cứ lúc nào."
          />
        ) : (
          <div className="space-y-2.5">
            {pastReviews.map((r) => (
              <details
                key={r.id}
                className="rounded-xl overflow-hidden"
                style={{ background: "var(--surface-2)", border: "1px solid var(--border)" }}
              >
                <summary className="flex items-center justify-between px-4 py-3 cursor-pointer list-none">
                  <div className="flex items-center gap-3">
                    <ScoreRing score={r.metrics.score} size={44} label={false} />
                    <div>
                      <div className="text-text text-[13px] font-semibold num">
                        Tuần {r.week_start}
                      </div>
                      <div className="text-text-3 text-[11px] num">
                        Bám {r.metrics.adherence === null ? "—" : `${r.metrics.adherence}%`} ·{" "}
                        {fmtHours(r.metrics.completedHours)} ·{" "}
                        {r.metrics.deltaHoursPct >= 0 ? "+" : ""}
                        {r.metrics.deltaHoursPct}%
                      </div>
                    </div>
                  </div>
                  {r.ai_summary && (
                    <span className="eyebrow" style={{ color: "var(--brand)" }}>
                      có AI
                    </span>
                  )}
                </summary>
                <div className="px-4 pb-4 pt-1 border-t" style={{ borderColor: "var(--border)" }}>
                  <MetricsBody m={r.metrics} />
                  {r.ai_summary && (
                    <>
                      <div className="hair my-3" />
                      <div
                        className="text-text-2 text-[12px] leading-[1.7]"
                        style={{ whiteSpace: "pre-wrap" }}
                      >
                        {r.ai_summary}
                      </div>
                    </>
                  )}
                </div>
              </details>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}
