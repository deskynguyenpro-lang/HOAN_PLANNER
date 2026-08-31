import type { AppData } from "./types";
import { addDays, toKey } from "./dates";
import { REASONS } from "./pillars";

/**
 * Dữ liệu mẫu tất định (không random) để xem app chạy thật:
 * 2 mục tiêu lớn, 5 mục tiêu ngày trải đủ 4 trụ cột, 21 ngày lịch sử.
 */
export function buildSampleData(): AppData {
  const today = new Date();
  const oId1 = "o_sample_ielts";
  const oId2 = "o_sample_weight";

  const objectives = [
    {
      id: oId1,
      name: "IELTS 6.5",
      unit: " điểm",
      startValue: 5.5,
      targetValue: 6.5,
      deadline: toKey(addDays(today, 60)),
      archived: false,
      checkins: [
        { date: toKey(addDays(today, -30)), value: 5.5 },
        { date: toKey(addDays(today, -15)), value: 5.5 },
        { date: toKey(addDays(today, -3)), value: 6.0 },
      ],
    },
    {
      id: oId2,
      name: "Giảm 5kg",
      unit: "kg",
      startValue: 68,
      targetValue: 63,
      deadline: toKey(addDays(today, 90)),
      archived: false,
      checkins: [
        { date: toKey(addDays(today, -28)), value: 68 },
        { date: toKey(addDays(today, -14)), value: 67 },
        { date: toKey(addDays(today, -2)), value: 66.2 },
      ],
    },
  ];

  const from = toKey(addDays(today, -30));
  const goals = [
    {
      id: "g_sample_vocab",
      name: "Học từ vựng IELTS",
      target: 1,
      category: "study" as const,
      objectiveId: oId1,
      createdAt: from,
      archived: false,
      schedule: { start: 19.5, duration: 1, days: [1, 2, 3, 4, 5], fromDate: from, toDate: "" },
    },
    {
      id: "g_sample_listening",
      name: "Luyện nghe IELTS",
      target: 0.75,
      category: "study" as const,
      objectiveId: oId1,
      createdAt: from,
      archived: false,
      schedule: { start: 6.5, duration: 0.75, days: [0, 1, 2, 3, 4, 5, 6], fromDate: from, toDate: "" },
    },
    {
      id: "g_sample_run",
      name: "Chạy bộ",
      target: 0.75,
      category: "health" as const,
      objectiveId: oId2,
      createdAt: from,
      archived: false,
      schedule: { start: 5.5, duration: 0.75, days: [1, 3, 5], fromDate: from, toDate: "" },
    },
    {
      id: "g_sample_report",
      name: "Báo cáo dự án",
      target: 2,
      category: "work" as const,
      objectiveId: null,
      createdAt: from,
      archived: false,
      schedule: { start: 9, duration: 2, days: [1, 2, 3, 4, 5], fromDate: from, toDate: "" },
    },
    {
      id: "g_sample_paper",
      name: "Đọc & tóm tắt paper",
      target: 1,
      category: "research" as const,
      objectiveId: null,
      createdAt: from,
      archived: false,
      schedule: { start: 21, duration: 1, days: [2, 4, 6], fromDate: from, toDate: "" },
    },
  ];

  const logs: AppData["logs"] = {};
  for (let i = 20; i >= 0; i--) {
    const d = addDays(today, -i);
    const dk = toKey(d);
    const weekday = d.getDay();
    const blocks: AppData["logs"][string]["blocks"] = [];
    goals.forEach((g) => {
      if (!g.schedule.days.includes(weekday)) return;
      const seed = (dk + g.id).split("").reduce((a, c) => a + c.charCodeAt(0), 0);
      const roll = seed % 10;
      let completed = roll < 7;
      let skipped = false;
      let reason = "";
      if (!completed) {
        skipped = roll < 9;
        reason = skipped ? REASONS[roll % REASONS.length] : "";
      }
      if (i === 0) {
        completed = false;
        skipped = false;
        reason = "";
      }
      blocks.push({
        id: `b_sample_${g.id}_${dk}`,
        goalId: g.id,
        start: g.schedule.start,
        duration: g.schedule.duration,
        completed,
        skipped,
        reason,
      });
    });
    if (blocks.length) logs[dk] = { blocks };
  }

  return { objectives, goals, logs };
}
