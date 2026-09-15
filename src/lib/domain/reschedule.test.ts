/**
 * Helper test cases cho bộ máy xếp lịch bù (reschedule.ts) — không phụ
 * thuộc framework test nào, chạy trực tiếp bằng: npm run test
 */
import type { Block, EnergyLevel, Goal, Logs } from "./types";
import { addDays, toKey } from "./dates";
import {
  applyProposedSchedule,
  calculateAutoReschedule,
  detectAndProcessMissedTasks,
  type RescheduleOutcome,
} from "./reschedule";

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

// ─── Fixtures ────────────────────────────────────────────────────────────
const NOW = new Date(2026, 8, 15, 10, 0); // 2026-09-15 10:00 — thứ Ba

function makeGoal(id: string, energyLevel: EnergyLevel, target = 1): Goal {
  return {
    id,
    name: id,
    target,
    category: "work",
    objectiveId: null,
    // fromDate ở tương lai xa -> effectiveSchedule không tự sinh block ảo,
    // giữ lịch trình test hoàn toàn tất định (chỉ dùng block khai báo tay).
    schedule: { start: 8, duration: target, days: [1, 2, 3, 4, 5], fromDate: "2099-01-01", toDate: "" },
    createdAt: "2020-01-01",
    archived: false,
    energyLevel,
  };
}

function makeBlock(
  id: string,
  goalId: string,
  start: number,
  duration: number,
  opts: Partial<Block> = {},
): Block {
  return {
    id,
    goalId,
    start,
    duration,
    completed: false,
    skipped: false,
    reason: "",
    energyLevel: "MEDIUM",
    deferCount: 0,
    isBufferBlock: false,
    ...opts,
  };
}

function scheduled(outcome: RescheduleOutcome) {
  if (outcome.kind !== "scheduled") throw new Error(`Kỳ vọng "scheduled", nhận được "${outcome.kind}"`);
  return outcome;
}

// ─── 1. Xếp lại cơ bản khi lịch trống ────────────────────────────────────
group("1. Xếp lại cơ bản (MEDIUM, lịch trống)", () => {
  const yKey = toKey(addDays(NOW, -1));
  const goal = makeGoal("g1", "MEDIUM");
  const missedBlock = makeBlock("b1", "g1", 9, 1);
  const logs: Logs = { [yKey]: { blocks: [missedBlock] } };

  const { nextLogs, outcomes } = detectAndProcessMissedTasks([goal], logs, NOW);

  assert(outcomes.length === 1, "phát hiện đúng 1 task bị bỏ lỡ");
  const o = scheduled(outcomes[0]);
  assert(o.proposed.dateKey === toKey(addDays(NOW, 1)), "xếp vào ngày mai (sớm nhất có thể)");
  assert(o.proposed.start === 6, "bắt đầu ngay từ giờ thức dậy (06:00) vì lịch trống");
  assert(o.proposed.usedBuffer === false, "không dùng buffer vì không có buffer nào");
  assert(nextLogs[yKey].blocks[0].deferCount === 1, "defer_count của block gốc tăng lên 1");
});

// ─── 2. Ngưỡng hoãn 3 lần -> needs_breakdown, KHÔNG tự xếp lại ──────────
group("2. Ngưỡng hoãn >= 3 lần -> needs_breakdown", () => {
  const yKey = toKey(addDays(NOW, -1));
  const goal = makeGoal("g2", "MEDIUM");
  const missedBlock = makeBlock("b2", "g2", 9, 1, { deferCount: 2 });
  const logs: Logs = { [yKey]: { blocks: [missedBlock] } };

  const { nextLogs, outcomes } = detectAndProcessMissedTasks([goal], logs, NOW);

  assert(outcomes[0].kind === "needs_breakdown", "kết quả là needs_breakdown");
  if (outcomes[0].kind === "needs_breakdown") {
    assert(outcomes[0].deferCount === 3, "deferCount báo cáo đúng = 3");
    assert(outcomes[0].suggestion.includes("chia nhỏ"), "gợi ý có nhắc đến chia nhỏ task");
  }
  assert(nextLogs[yKey].blocks[0].deferCount === 3, "defer_count được lưu = 3");
});

// ─── 3. Khớp năng lượng: HIGH_FOCUS chỉ vào 8:00-11:00 ──────────────────
group("3. Khớp năng lượng — HIGH_FOCUS", () => {
  const yKey = toKey(addDays(NOW, -1));
  const goal = makeGoal("g3", "HIGH_FOCUS");
  const missedBlock = makeBlock("b3", "g3", 20, 1, { energyLevel: "HIGH_FOCUS" });
  const logs: Logs = { [yKey]: { blocks: [missedBlock] } };

  const { outcomes } = detectAndProcessMissedTasks([goal], logs, NOW);
  const o = scheduled(outcomes[0]);
  assert(o.proposed.start >= 8 && o.proposed.start + o.proposed.duration <= 11, "nằm trong khung 8:00-11:00");
});

// ─── 4. Khớp năng lượng: LOW_ENERGY/ADMIN vào chiều muộn hoặc tối ───────
group("4. Khớp năng lượng — LOW_ENERGY", () => {
  const yKey = toKey(addDays(NOW, -1));
  const goal = makeGoal("g4", "LOW_ENERGY");
  const missedBlock = makeBlock("b4", "g4", 9, 1, { energyLevel: "LOW_ENERGY" });
  const logs: Logs = { [yKey]: { blocks: [missedBlock] } };

  const { outcomes } = detectAndProcessMissedTasks([goal], logs, NOW);
  const o = scheduled(outcomes[0]);
  const inWindow =
    (o.proposed.start >= 16 && o.proposed.start + o.proposed.duration <= 17.5) ||
    (o.proposed.start >= 20.5 && o.proposed.start + o.proposed.duration <= 21.5);
  assert(inWindow, "nằm trong 16:00-17:30 hoặc 20:30-21:30");
});

// ─── 5. Buffer First — ưu tiên khung giờ buffer trước, dù đến sau trong ngày ─
group("5. Buffer First", () => {
  const yKey = toKey(addDays(NOW, -1));
  const tKey = toKey(addDays(NOW, 1));
  const goal = makeGoal("g5", "MEDIUM");
  const missedBlock = makeBlock("b5", "g5", 9, 1);
  const bufferBlock = makeBlock("buf1", "other", 14, 2, { isBufferBlock: true });
  const logs: Logs = {
    [yKey]: { blocks: [missedBlock] },
    [tKey]: { blocks: [bufferBlock] },
  };

  const { outcomes } = detectAndProcessMissedTasks([goal, makeGoal("other", "MEDIUM")], logs, NOW);
  const o = scheduled(outcomes[0]);
  assert(o.proposed.usedBuffer === true, "dùng đúng khung buffer đã đặt sẵn");
  assert(o.proposed.dateKey === tKey, "xếp vào ngày có buffer");
  assert(o.proposed.start === 14, "bắt đầu ngay từ đầu khung buffer (14:00)");
});

// ─── 6. Không quá 2h liên tục — tự tìm điểm bắt đầu muộn hơn trong slot ──
group("6. Ràng buộc tối đa 2h liên tục", () => {
  const yKey = toKey(addDays(NOW, -1));
  const tKey = toKey(addDays(NOW, 1));
  const goal = makeGoal("g6", "MEDIUM");
  const missedBlock = makeBlock("b6", "g6", 9, 1);
  // Khối cố định chiếm đúng từ giờ thức dậy 06:00-07:30 (1.5h) -> nếu xếp
  // sát ngay 07:30 sẽ tạo chuỗi liên tục 2.5h (>2h), thuật toán phải lùi
  // điểm bắt đầu tới sau khi có đủ 15 phút nghỉ.
  const fixedBlock = makeBlock("fixed1", "otherGoal", 6, 1.5);
  const logs: Logs = {
    [yKey]: { blocks: [missedBlock] },
    [tKey]: { blocks: [fixedBlock] },
  };

  const { outcomes } = detectAndProcessMissedTasks(
    [goal, makeGoal("otherGoal", "MEDIUM")],
    logs,
    NOW,
  );
  const o = scheduled(outcomes[0]);
  assert(o.proposed.dateKey === tKey, "vẫn xếp được trong cùng ngày (không phải né sang ngày khác)");
  assert(o.proposed.start === 8.75, "lùi điểm bắt đầu tới 08:45 (sau khối cố định + nghỉ 15 phút)");
});

// ─── 7. Không tìm được chỗ hợp lệ -> overload với đủ 4 phương án ─────────
group("7. OVERLOAD_WARNING khi hết chỗ trong 7 ngày tới", () => {
  const yKey = toKey(addDays(NOW, -1));
  const goal = makeGoal("g7", "HIGH_FOCUS", 5); // task dài 5h — không bao giờ vừa khung 8-11 (3h)
  const missedBlock = makeBlock("b7", "g7", 9, 5, { energyLevel: "HIGH_FOCUS" });
  const logs: Logs = { [yKey]: { blocks: [missedBlock] } };

  const { outcomes } = detectAndProcessMissedTasks([goal], logs, NOW);
  assert(outcomes[0].kind === "overload", "kết quả là overload");
  if (outcomes[0].kind === "overload") {
    assert(outcomes[0].options.length === 4, "trả về đủ 4 phương án A/B/C/D");
    assert(
      outcomes[0].options.map((o) => o.id).join("") === "ABCD",
      "đúng thứ tự A, B, C, D",
    );
  }
});

// ─── 8. applyProposedSchedule di chuyển đúng block giữa 2 ngày ──────────
group("8. applyProposedSchedule", () => {
  const yKey = toKey(addDays(NOW, -1));
  const tKey = toKey(addDays(NOW, 1));
  const block = makeBlock("b8", "g8", 9, 1);
  const logs: Logs = { [yKey]: { blocks: [block] } };

  const outcome: RescheduleOutcome = {
    kind: "scheduled",
    missed: { dateKey: yKey, block, goal: makeGoal("g8", "MEDIUM") },
    proposed: { dateKey: tKey, start: 14, duration: 1, usedBuffer: false },
    reasoning: "test",
  };
  const next = applyProposedSchedule(outcome, logs);

  assert(next[yKey].blocks.length === 0, "block gốc đã bị gỡ khỏi ngày cũ");
  assert(next[tKey].blocks.length === 1, "block mới xuất hiện ở ngày đề xuất");
  assert(next[tKey].blocks[0].start === 14, "giờ bắt đầu đúng như đề xuất");
  assert(next[tKey].blocks[0].isBufferBlock === false, "không còn đánh dấu là buffer sau khi dùng");
});

// ─── 9. calculateAutoReschedule là hàm thuần — gọi lại không đổi input ──
group("9. Tính thuần (không side-effect)", () => {
  const tKey = toKey(addDays(NOW, 1));
  const goal = makeGoal("g9", "MEDIUM");
  const missedBlock = makeBlock("b9", "g9", 9, 1);
  const logsBefore: Logs = { [toKey(addDays(NOW, -1))]: { blocks: [missedBlock] } };
  const snapshot = JSON.stringify(logsBefore);

  calculateAutoReschedule({ dateKey: toKey(addDays(NOW, -1)), block: missedBlock, goal }, [goal], logsBefore, NOW);
  assert(JSON.stringify(logsBefore) === snapshot, "logs đầu vào không bị chỉnh sửa");
  void tKey;
});

// ─── 10. Nhiều task bị bỏ lỡ cùng lượt -> đề xuất không được trùng giờ ──
group("10. Nhiều task bỏ lỡ cùng lượt không đề xuất trùng giờ", () => {
  const yKey = toKey(addDays(NOW, -1));
  const goalA = makeGoal("gA", "MEDIUM", 1);
  const goalB = makeGoal("gB", "MEDIUM", 1);
  // Cả 2 đều bị bỏ lỡ hôm qua, lịch trống hoàn toàn ở các ngày sắp tới ->
  // nếu không thấy đề xuất của nhau, cả 2 sẽ cùng rơi vào 06:00 ngày mai.
  const blockA = makeBlock("bA", "gA", 9, 1);
  const blockB = makeBlock("bB", "gB", 10, 1);
  const logs: Logs = { [yKey]: { blocks: [blockA, blockB] } };

  const { outcomes } = detectAndProcessMissedTasks([goalA, goalB], logs, NOW);
  assert(outcomes.length === 2, "phát hiện đủ 2 task bị bỏ lỡ");
  const oA = scheduled(outcomes[0]);
  const oB = scheduled(outcomes[1]);

  const overlap =
    oA.proposed.dateKey === oB.proposed.dateKey &&
    oA.proposed.start < oB.proposed.start + oB.proposed.duration &&
    oB.proposed.start < oA.proposed.start + oA.proposed.duration;
  assert(!overlap, "2 đề xuất không được chồng giờ lên nhau");
  assert(
    !(oA.proposed.dateKey === oB.proposed.dateKey && oA.proposed.start === oB.proposed.start),
    "không đề xuất đúng cùng 1 giờ bắt đầu cho 2 task khác nhau",
  );
});

// ─── Kết quả ─────────────────────────────────────────────────────────────
console.log(`\n${pass} passed, ${fail} failed`);
if (fail > 0) process.exit(1);
