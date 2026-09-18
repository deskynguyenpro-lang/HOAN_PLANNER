/**
 * Helper test cases cho khung giờ cố định (fixedBlocks.ts) — chạy bằng:
 * npm run test
 */
import { addDays, toKey } from "./dates";
import { expandFixedBlocksToExternalBusy, type FixedBlockException, type FixedTimeBlock } from "./fixedBlocks";
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

group("5. Exception CANCELLED bỏ hẳn đúng 1 ngày, không ảnh hưởng ngày khác", () => {
  const lunch: FixedTimeBlock = { id: "f5", label: "Ăn trưa", start: 12, duration: 1, days: [1, 2, 3, 4, 5] };
  const todayKey = toKey(NOW); // Thứ Tư
  const tomorrowKey = toKey(addDays(NOW, 1)); // Thứ Năm
  const exceptions: FixedBlockException[] = [{ id: "e1", blockId: "f5", date: todayKey, status: "CANCELLED" }];

  const map = expandFixedBlocksToExternalBusy([lunch], NOW, 2, exceptions);
  assert(!map[todayKey], "không chặn giờ nào vào đúng ngày bị huỷ (hôm nay)");
  assert(!!map[tomorrowKey]?.some((iv) => iv.start === 12 && iv.end === 13), "ngày khác vẫn áp dụng quy tắc lặp lại như cũ");
});

group("6. Exception MODIFIED đổi giờ đúng 1 ngày, không sửa quy tắc chung", () => {
  const meeting: FixedTimeBlock = { id: "f6", label: "Họp giao ban", start: 9, duration: 1, days: [1, 2, 3, 4, 5] };
  const todayKey = toKey(NOW);
  const tomorrowKey = toKey(addDays(NOW, 1));
  const exceptions: FixedBlockException[] = [
    { id: "e2", blockId: "f6", date: todayKey, status: "MODIFIED", overrideStart: 14, overrideDuration: 2 },
  ];

  const map = expandFixedBlocksToExternalBusy([meeting], NOW, 2, exceptions);
  assert(!!map[todayKey]?.some((iv) => iv.start === 14 && iv.end === 16), "hôm nay dùng đúng giờ override (14h-16h)");
  assert(!map[todayKey]?.some((iv) => iv.start === 9), "hôm nay không còn chặn giờ gốc (9h) nữa");
  assert(!!map[tomorrowKey]?.some((iv) => iv.start === 9 && iv.end === 10), "ngày khác vẫn dùng giờ gốc (9h-10h) như cũ");
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
