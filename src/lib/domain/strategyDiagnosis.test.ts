/**
 * Helper test cases cho diagnoseStrategyVsExecution (Turn 5) — chạy bằng:
 * npm run test
 */
import type { Block, Goal, Logs, Objective } from "./types";
import { addDays, toKey } from "./dates";
import { diagnoseStrategyVsExecution } from "./strategyDiagnosis";

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

const NOW = new Date(2026, 8, 16);

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
function makeGoal(id: string, objectiveId: string | null): Goal {
  return {
    id,
    name: id,
    target: 1,
    category: "study",
    objectiveId,
    schedule: { start: 8, duration: 1, days: [0, 1, 2, 3, 4, 5, 6], fromDate: "2020-01-01", toDate: "" },
    createdAt: "2020-01-01",
    archived: false,
    energyLevel: "MEDIUM",
  };
}
function makeBlock(id: string, goalId: string, completed: boolean): Block {
  return {
    id,
    goalId,
    start: 8,
    duration: 1,
    completed,
    skipped: false,
    reason: "",
    energyLevel: "MEDIUM",
    deferCount: 0,
    isBufferBlock: false,
  };
}

function buildLogs(goalId: string, days: number, completedFrac: number, now: Date): Logs {
  const logs: Logs = {};
  for (let i = 0; i < days; i++) {
    const dk = toKey(addDays(now, -i));
    logs[dk] = { blocks: [makeBlock(`b_${i}`, goalId, i / days < completedFrac)] };
  }
  return logs;
}

group("1. Không có goal gắn objective -> NOT_ENOUGH_DATA", () => {
  const obj = makeObjective();
  const d = diagnoseStrategyVsExecution(obj, [], {}, 30, NOW);
  assert(d.verdict === "NOT_ENOUGH_DATA", "verdict đúng NOT_ENOUGH_DATA");
});

group("2. Bám lịch tốt nhưng tiến độ thấp -> STRATEGY_PROBLEM", () => {
  const obj = makeObjective({ checkins: [{ date: toKey(NOW), value: 5.1 }] }); // pct ~7%
  const goal = makeGoal("g1", "o1");
  const logs = buildLogs("g1", 30, 0.9, NOW); // ~90% hoàn thành
  const d = diagnoseStrategyVsExecution(obj, [goal], logs, 30, NOW);
  assert(d.taskCompletionPct > 80, "task completion > 80%");
  assert(d.goalProgressPct < 30, "goal progress < 30%");
  assert(d.verdict === "STRATEGY_PROBLEM", "verdict đúng STRATEGY_PROBLEM");
});

group("3. Bám lịch kém -> EXECUTION_FRICTION", () => {
  const obj = makeObjective({ checkins: [{ date: toKey(NOW), value: 6.0 }] }); // pct cao
  const goal = makeGoal("g2", "o1");
  const logs = buildLogs("g2", 30, 0.3, NOW); // ~30% hoàn thành
  const d = diagnoseStrategyVsExecution(obj, [goal], logs, 30, NOW);
  assert(d.taskCompletionPct < 50, "task completion < 50%");
  assert(d.verdict === "EXECUTION_FRICTION", "verdict đúng EXECUTION_FRICTION");
});

group("4. Bám lịch & tiến độ đều tốt -> ON_TRACK", () => {
  const obj = makeObjective({ checkins: [{ date: toKey(NOW), value: 6.2 }] }); // pct cao
  const goal = makeGoal("g3", "o1");
  const logs = buildLogs("g3", 30, 0.7, NOW); // ~70% hoàn thành
  const d = diagnoseStrategyVsExecution(obj, [goal], logs, 30, NOW);
  assert(d.verdict === "ON_TRACK", "verdict đúng ON_TRACK");
});

console.log(`\n${pass} passed, ${fail} failed`);
if (fail > 0) process.exit(1);
