// ─── Kiểu dữ liệu dùng chung ────────────────────────────────────────────────

export type PillarId = "work" | "study" | "health" | "research";

/** Mức năng lượng cần thiết để làm việc này — dùng để sắp lịch đúng lúc bạn còn sức. */
export type EnergyLevel = "HIGH_FOCUS" | "MEDIUM" | "LOW_ENERGY" | "ADMIN";
export const DEFAULT_ENERGY_LEVEL: EnergyLevel = "MEDIUM";

export interface Schedule {
  start: number; // giờ trong ngày, dạng thập phân (8.5 = 8:30)
  duration: number; // số giờ
  days: number[]; // 0..6 (0 = Chủ nhật)
  fromDate: string; // 'YYYY-MM-DD'
  toDate: string; // '' = không giới hạn
}

export interface Goal {
  id: string;
  name: string;
  target: number; // giờ/ngày mục tiêu
  category: PillarId;
  objectiveId: string | null;
  schedule: Schedule;
  createdAt: string;
  archived: boolean;
  /** Mức năng lượng cần để làm việc này tốt nhất — mặc định MEDIUM. */
  energyLevel: EnergyLevel;
}

export interface Block {
  id: string;
  goalId: string;
  start: number;
  duration: number;
  completed: boolean;
  skipped: boolean;
  reason: string;
  virtual?: boolean;
  hidden?: boolean;
  /** Kế thừa từ Goal khi khối được tạo, có thể chỉnh riêng cho từng buổi. */
  energyLevel: EnergyLevel;
  /** Số lần buổi này bị hoãn/dời sang thời điểm khác. Mặc định 0. */
  deferCount: number;
  /** Đánh dấu khối thuộc phần thời gian dự phòng (buffer) trong tuần. */
  isBufferBlock: boolean;
}

export interface DayLog {
  blocks: Block[];
}

export type Logs = Record<string, DayLog>;

export interface Checkin {
  date: string;
  value: number;
}

export interface Objective {
  id: string;
  name: string;
  unit: string;
  startValue: number;
  targetValue: number;
  deadline: string;
  archived: boolean;
  checkins: Checkin[];
}

export interface WeeklyMetrics {
  weekStart: string;
  adherence: number | null; // % buổi hoàn thành so với kế hoạch
  completedHours: number;
  prevCompletedHours: number;
  deltaHoursPct: number;
  perPillar: Record<
    PillarId,
    { hours: number; prevHours: number; deltaPct: number; adherence: number | null }
  >;
  bestDay: { label: string; pct: number } | null;
  worstDay: { label: string; pct: number } | null;
  topReasons: { reason: string; count: number }[];
  sessions: number;
  score: number; // 0..100 điểm tổng hợp của tuần
}

export interface DriftAlert {
  id: string;
  kind: "pillar-neglected" | "objective-behind" | "streak-broken" | "low-adherence";
  severity: "warn" | "bad";
  title: string;
  detail: string;
  pillar?: PillarId;
}

export interface AppData {
  goals: Goal[];
  logs: Logs;
  objectives: Objective[];
}
