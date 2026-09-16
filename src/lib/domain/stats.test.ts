/**
 * Helper test cases cho calculatePredictiveVelocity (Turn 5) — chạy bằng:
 * npm run test
 */
import type { Objective } from "./types";
import { addDays, toKey } from "./dates";
import { calculatePredictiveVelocity } from "./stats";

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

const NOW = new Date(2026, 8, 16); // 2026-09-16

function makeObjective(overrides: Partial<Objective> = {}): Objective {
  return {
    id: "o1",
    name: "IELTS 6.5",
    unit: " điểm",
    startValue: 5.0,
    targetValue: 6.5,
    deadline: toKey(addDays(NOW, 30)),
    archived: false,
    checkins: [],
    ...overrides,
  };
}

group("1. Chưa đủ check-in -> hasEnoughData=false", () => {
  const obj = makeObjective({ checkins: [{ date: toKey(NOW), value: 5.0 }] });
  const v = calculatePredictiveVelocity(obj, 30, NOW);
  assert(v.hasEnoughData === false, "báo đúng chưa đủ dữ liệu");
  assert(v.predictedCompletionDate === null, "không dự báo ngày hoàn thành khi chưa đủ dữ liệu");
});

group("2. Tốc độ đủ nhanh -> dự báo về đích trước hạn", () => {
  const obj = makeObjective({
    checkins: [
      { date: toKey(addDays(NOW, -10)), value: 5.0 },
      { date: toKey(NOW), value: 5.5 },
    ],
  });
  const v = calculatePredictiveVelocity(obj, 30, NOW);
  assert(v.hasEnoughData, "đủ dữ liệu để dự báo");
  assert(v.predictedCompletionDate !== null, "có ngày dự báo hoàn thành");
  assert(v.lateDays !== null && v.lateDays <= 0, "không trễ hạn (lateDays <= 0)");
  assert(v.actualCompletionRatePctPerDay > 0, "tốc độ %/ngày > 0");
});

group("3. Tốc độ quá chậm -> dự báo trễ hạn", () => {
  const obj = makeObjective({
    checkins: [
      { date: toKey(addDays(NOW, -10)), value: 5.0 },
      { date: toKey(NOW), value: 5.1 },
    ],
  });
  const v = calculatePredictiveVelocity(obj, 30, NOW);
  assert(v.hasEnoughData, "đủ dữ liệu để dự báo");
  assert(v.lateDays !== null && v.lateDays > 0, "dự báo trễ hạn (lateDays > 0)");
});

group("4. chartSeries hợp lệ (%, trong khoảng 0-100, có điểm hôm nay)", () => {
  const obj = makeObjective({
    checkins: [
      { date: toKey(addDays(NOW, -10)), value: 5.0 },
      { date: toKey(NOW), value: 5.5 },
    ],
  });
  const v = calculatePredictiveVelocity(obj, 30, NOW);
  assert(v.chartSeries.length >= 2, "có ít nhất 2 điểm trên đồ thị");
  const allBounded = v.chartSeries.every(
    (p) =>
      (p.planned === null || (p.planned >= 0 && p.planned <= 100)) &&
      (p.actual === null || (p.actual >= 0 && p.actual <= 100)) &&
      (p.projected === null || (p.projected >= 0 && p.projected <= 100)),
  );
  assert(allBounded, "mọi giá trị % đều trong khoảng 0-100");
  assert(
    v.chartSeries.some((p) => p.date === toKey(NOW)),
    "có điểm dữ liệu cho hôm nay",
  );
});

group("5. Đã đạt mục tiêu -> không cần dự báo thêm", () => {
  const obj = makeObjective({
    targetValue: 6.5,
    checkins: [
      { date: toKey(addDays(NOW, -10)), value: 5.0 },
      { date: toKey(NOW), value: 6.5 },
    ],
  });
  const v = calculatePredictiveVelocity(obj, 30, NOW);
  assert(v.predictedCompletionDate === null, "không dự báo thêm khi đã đạt/vượt mục tiêu");
});

group("6. Mục tiêu dạng GIẢM (target < start) tính đúng chiều tốc độ", () => {
  // Giảm cân: 68kg -> 63kg. Tiến bộ thật (giảm được 1.8kg trong 27 ngày) phải
  // cho ra tốc độ %/ngày DƯƠNG và có ý nghĩa — không phải ~0 do cộng nhầm
  // chiều raw value.
  const obj = makeObjective({
    startValue: 68,
    targetValue: 63,
    unit: "kg",
    checkins: [
      { date: toKey(addDays(NOW, -30)), value: 68 },
      { date: toKey(addDays(NOW, -15)), value: 67 },
      { date: toKey(addDays(NOW, -3)), value: 66.2 },
    ],
  });
  const v = calculatePredictiveVelocity(obj, 30, NOW);
  assert(v.hasEnoughData, "đủ dữ liệu để dự báo");
  assert(
    v.actualCompletionRatePctPerDay > 0.5,
    `tốc độ %/ngày phải dương và có ý nghĩa (nhận được ${v.actualCompletionRatePctPerDay})`,
  );
  assert(v.predictedCompletionDate !== null, "có ngày dự báo hoàn thành");
});

group("7. Check-in đúng biên historicalDays vẫn được tính dù `now` không phải nửa đêm", () => {
  // `now` có giờ:phút cụ thể (14:30) — nếu so sánh biên window sai (không
  // chuẩn hoá nửa đêm), check-in đúng 30 ngày trước sẽ bị loại sai.
  const nowWithTime = new Date(2026, 8, 16, 14, 30);
  const obj = makeObjective({
    checkins: [
      { date: toKey(addDays(nowWithTime, -30)), value: 5.0 },
      { date: toKey(addDays(nowWithTime, -3)), value: 6.0 },
    ],
  });
  const v = calculatePredictiveVelocity(obj, 30, nowWithTime);
  assert(v.hasEnoughData, "vẫn tính được dù now có giờ:phút khác 0h");
  // Nếu tính đúng cả 2 điểm (30 ngày, tốc độ chậm hơn) thay vì bị loại điểm
  // biên (chỉ còn khoảng ngắn hơn, tốc độ bị tính nhanh hơn thực tế).
  assert(
    v.actualCompletionRatePctPerDay < 3,
    `tốc độ phải phản ánh đúng cả khoảng 27 ngày, không bị lệch do loại nhầm điểm biên (nhận được ${v.actualCompletionRatePctPerDay})`,
  );
});

console.log(`\n${pass} passed, ${fail} failed`);
if (fail > 0) process.exit(1);
