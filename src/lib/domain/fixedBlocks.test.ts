/**
 * Helper test cases cho khung giờ cố định (fixedBlocks.ts) — chạy bằng:
 * npm run test
 */
import { toKey } from "./dates";
import { expandFixedBlocksToExternalBusy, type FixedTimeBlock } from "./fixedBlocks";
import { calculateAutoReschedule, type MissedBlockRef } from "./reschedule";
import type { Block, Goal } from "./types";

let pass = 0;
let fail = 0;
function assert(cond: boolean, label: string) {
  if (cond) {
    pass++;
    console.log(`  ✓ ${label}`);
  } else {
    fail++;
    console.error(`  ✗ ${label}`);
  }
}
function group(name: string, fn: () => void) {
  console.log(`\n${name}`);
  fn();
}

const NOW = new Date(2026, 8, 16); // Thứ Tư

group("1. expandFixedBlocksToExternalBusy chỉ trải đúng ngày lặp lại", () => {
  const lunch: FixedTimeBlock = { id: "f1", label: "Ăn trưa", start: 12, duration: 1, days: [1, 2, 3, 4, 5] };
  const map = expandFixedBlocksToExternalBusy([lunch], NOW, 3);
  const todayKey = toKey(NOW);
  assert(!!map[todayKey], "có mặt vào hôm nay (thứ trong days)");
  assert(map[todayKey][0].start === 12 && map[todayKey][0].end === 13, "đúng khung giờ 12h-13h");
});

group("2. Không lặp vào ngày không khai báo", () => {
  const weekdayOnly: FixedTimeBlock = { id: "f2", label: "Họp", start: 9, duration: 1, days: [1, 2, 3, 4, 5] };
  // Chủ nhật gần nhất trong 7 ngày tới không có trong days=[1..5]
  const sunday = new Date(2026, 8, 20); // Chủ nhật
  const map = expandFixedBlocksToExternalBusy([weekdayOnly], sunday, 1);
  assert(Object.keys(map).length === 0, "không có entry nào cho ngày Chủ nhật");
});

group("3. Khung giờ qua nửa đêm (VD ca đêm 22:00-06:00) đổ sang đầu ngày sau", () => {
  // start=22, duration=8 -> kết thúc lúc 6h SÁNG NGÀY SAU. Thứ Tư (16/9) có
  // trong days -> phải chặn 22h-24h của thứ Tư VÀ 0h-6h của thứ Năm (17/9).
  const nightShift: FixedTimeBlock = { id: "f3", label: "Ca đêm", start: 22, duration: 8, days: [3] };
  const map = expandFixedBlocksToExternalBusy([nightShift], NOW, 2);
  const wedKey = toKey(NOW);
  const thuKey = toKey(new Date(2026, 8, 17));

  assert(!!map[wedKey]?.some((iv) => iv.start === 22 && iv.end === 24), "chặn đúng 22h-24h ngày bắt đầu (thứ Tư)");
  assert(!!map[thuKey]?.some((iv) => iv.start === 0 && iv.end === 6), "phần dư qua nửa đêm chặn đúng 0h-6h ngày sau (thứ Năm)");
});

group("4. AI Rescheduler không xếp chèn lên khung giờ cố định (tích hợp thật)", () => {
  const goal: Goal = {
    id: "g1",
    name: "Việc bị lỡ",
    target: 1,
    category: "work",
    objectiveId: null,
    schedule: { start: 8, duration: 1, days: [1, 2, 3, 4, 5], fromDate: "2099-01-01", toDate: "" },
    createdAt: "2020-01-01",
    archived: false,
    energyLevel: "MEDIUM",
  };
  const missedBlock: Block = {
    id: "b1",
    goalId: "g1",
    start: 9,
    duration: 1,
    completed: false,
    skipped: false,
    reason: "",
    energyLevel: "MEDIUM",
    deferCount: 0,
    isBufferBlock: false,
  };
  const missed: MissedBlockRef = { dateKey: "2026-09-15", block: missedBlock, goal };

  // Chặn toàn bộ 6h-14h mỗi ngày bằng 1 khung giờ cố định "dài" (giả lập ca làm).
  const workShift: FixedTimeBlock = { id: "f3", label: "Ca làm", start: 6, duration: 8, days: [0, 1, 2, 3, 4, 5, 6] };
  const externalBusyByDay = expandFixedBlocksToExternalBusy([workShift], NOW, 10);

  const proposed = calculateAutoReschedule(missed, [goal], {}, NOW, externalBusyByDay);
  assert(proposed !== null, "vẫn tìm được chỗ trống (sau 14h)");
  assert(!!proposed && proposed.start >= 14, "không đề xuất vào khung giờ cố định 6h-14h");
});

console.log(`\n${pass} passed, ${fail} failed`);
if (fail > 0) process.exit(1);
