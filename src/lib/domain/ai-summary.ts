import type { Goal, Logs, Objective } from "./types";
import { addDays, startOfWeek, toKey, parseKey, WEEKDAYS_VI } from "./dates";
import { PILLARS, pillarOf } from "./pillars";
import { categoryTotals, dayStatsFromBlocks, hoursForGoalsInRange, objectiveProgress } from "./stats";
import { computeStreak } from "./streak";
import { fmtHours } from "./dates";
import { computeWeeklyMetrics, computeDriftAlerts } from "./weekly";

/** Bản tóm tắt số liệu 30 ngày + tuần này, đưa vào prompt cho Claude API. */
export function buildAISummary(
  goals: Goal[],
  logs: Logs,
  objectives: Objective[],
): string {
  const today = new Date();
  const from = addDays(today, -29);
  const totals = categoryTotals(goals, logs, from, today);
  const totalAll = Object.values(totals).reduce((a, b) => a + b, 0);
  const streak = computeStreak(goals, logs);

  const goalLines =
    goals
      .filter((g) => !g.archived)
      .map((g) => {
        let scheduled = 0;
        let completed = 0;
        Object.entries(logs).forEach(([dk, log]) => {
          const d = parseKey(dk);
          if (d < from || d > today) return;
          (log.blocks || []).forEach((b) => {
            if (b.goalId === g.id) {
              scheduled += 1;
              if (b.completed) completed += 1;
            }
          });
        });
        const pct = scheduled ? Math.round((completed / scheduled) * 100) : null;
        return `- ${g.name} (${pillarOf(g.category).label}, mục tiêu ${fmtHours(
          g.target,
        )}/ngày): ${
          pct === null ? "chưa có dữ liệu" : `${pct}% buổi hoàn thành (${completed}/${scheduled})`
        }`;
      })
      .join("\n") || "Chưa có mục tiêu ngày nào.";

  const reasonCounts: Record<string, number> = {};
  Object.values(logs).forEach((log) =>
    (log.blocks || []).forEach((b) => {
      if (b.skipped && b.reason)
        reasonCounts[b.reason] = (reasonCounts[b.reason] || 0) + 1;
    }),
  );
  const topReasons =
    Object.entries(reasonCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map(([r, c]) => `${r} (${c} lần)`)
      .join(", ") || "không có dữ liệu";

  const wSums = Array(7).fill(0);
  const wCounts = Array(7).fill(0);
  Object.keys(logs).forEach((dk) => {
    const s = dayStatsFromBlocks(dk, goals, logs);
    if (s.hasData && s.pct !== null) {
      const wd = parseKey(dk).getDay();
      wSums[wd] += s.pct;
      wCounts[wd] += 1;
    }
  });
  const wAvg: (number | null)[] = wSums.map((s, i) =>
    wCounts[i] ? Math.round(s / wCounts[i]) : null,
  );
  let bestIdx = -1;
  let worstIdx = -1;
  wAvg.forEach((v, i) => {
    if (v === null) return;
    if (bestIdx === -1 || v > (wAvg[bestIdx] as number)) bestIdx = i;
    if (worstIdx === -1 || v < (wAvg[worstIdx] as number)) worstIdx = i;
  });

  const objLines =
    objectives
      .filter((o) => !o.archived)
      .map((o) => {
        const p = objectiveProgress(o);
        const linkedIds = goals.filter((g) => g.objectiveId === o.id).map((g) => g.id);
        const hrs = hoursForGoalsInRange(linkedIds, logs, from, today);
        return `- ${o.name}: hiện ${p.current}${o.unit}, mục tiêu ${o.targetValue}${o.unit} (${p.pct}% tiến độ), đã đầu tư ${fmtHours(
          hrs,
        )} trong 30 ngày qua${p.daysLeft !== null ? `, còn ${p.daysLeft} ngày tới hạn` : ""}`;
      })
      .join("\n") || "Chưa có mục tiêu lớn nào.";

  const wk = computeWeeklyMetrics(goals, logs, toKey(startOfWeek(today)));
  const pillarWeekLines = PILLARS.map((p) => {
    const d = wk.perPillar[p.id];
    return `  · ${p.label}: ${fmtHours(d.hours)} tuần này (tuần trước ${fmtHours(
      d.prevHours,
    )}, ${d.deltaPct >= 0 ? "+" : ""}${d.deltaPct}%)${
      d.adherence !== null ? `, bám kế hoạch ${d.adherence}%` : ""
    }`;
  }).join("\n");

  const drift = computeDriftAlerts(goals, logs, objectives);
  const driftLines = drift.length
    ? drift.map((a) => `  · [${a.severity === "bad" ? "NẶNG" : "nhẹ"}] ${a.title}`).join("\n")
    : "  · Không có cảnh báo lệch hướng.";

  return `TỔNG QUAN 30 NGÀY QUA:
- Tổng giờ đã hoàn thành: ${fmtHours(totalAll)}
- Streak hiện tại: ${streak} ngày
- Phân bổ theo trụ cột: ${PILLARS.map((c) => `${c.label} ${fmtHours(totals[c.id] || 0)}`).join(", ")}
- Ngày hiệu quả nhất trong tuần: ${bestIdx >= 0 ? `${WEEKDAYS_VI[bestIdx]} (${wAvg[bestIdx]}%)` : "chưa rõ"}
- Ngày kém hiệu quả nhất: ${worstIdx >= 0 ? `${WEEKDAYS_VI[worstIdx]} (${wAvg[worstIdx]}%)` : "chưa rõ"}
- Lý do bỏ lỡ phổ biến nhất: ${topReasons}

TUẦN NÀY (điểm tổng hợp ${wk.score}/100, bám kế hoạch ${
    wk.adherence === null ? "chưa có" : wk.adherence + "%"
  }):
${pillarWeekLines}

CẢNH BÁO LỆCH HƯỚNG ĐANG BẬT:
${driftLines}

CHI TIẾT TỪNG MỤC TIÊU NGÀY (30 ngày qua):
${goalLines}

MỤC TIÊU LỚN:
${objLines}`;
}

export const AI_SYSTEM_PROMPT = `Bạn là mentor huấn luyện năng suất cá nhân, phong cách thẳng thắn, có phản biện xây dựng, không sáo rỗng, không mở đầu dài dòng.`;

export function buildAIUserPrompt(summary: string): string {
  return `Dựa trên dữ liệu kế hoạch phát triển bản thân dưới đây (4 trụ cột: Công việc, Học tập, Sức khỏe, Nghiên cứu), viết bằng tiếng Việt (~220-320 từ) gồm 3 phần rõ ràng, đánh số:

1) Đánh giá mức độ hiệu quả hiện tại (2-3 câu, thẳng thắn — nếu chưa tốt thì nói rõ, đừng khen cho có). Nhận xét cả về sự CÂN BẰNG giữa 4 trụ cột.
2) 1-2 nguyên nhân cụ thể đang cản trở, suy ra trực tiếp từ số liệu (không đoán mò ngoài dữ liệu).
3) 3-4 đề xuất hành động cụ thể, thực tế cho tuần tới — nêu rõ trụ cột nào cần ưu tiên và điều chỉnh lịch thế nào.

Dữ liệu:
${summary}`;
}
