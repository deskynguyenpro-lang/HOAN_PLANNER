export const WEEKDAYS_VI = ["CN", "T2", "T3", "T4", "T5", "T6", "T7"];
export const WEEKDAYS_VI_MON_FIRST = ["T2", "T3", "T4", "T5", "T6", "T7", "CN"];
export const MONTHS_VI = [
  "Th1", "Th2", "Th3", "Th4", "Th5", "Th6",
  "Th7", "Th8", "Th9", "Th10", "Th11", "Th12",
];

export const pad = (n: number) => String(n).padStart(2, "0");

export const toKey = (d: Date) =>
  `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

export const parseKey = (k: string) => {
  const [y, m, d] = k.split("-").map(Number);
  return new Date(y, m - 1, d);
};

export const todayKey = () => toKey(new Date());

export const addDays = (d: Date, n: number) => {
  const r = new Date(d);
  r.setDate(r.getDate() + n);
  return r;
};

export const fmtVN = (d: Date) =>
  `${WEEKDAYS_VI[d.getDay()]}, ${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()}`;

export const fmtShort = (d: Date) => `${pad(d.getDate())}/${pad(d.getMonth() + 1)}`;

export const decToLabel = (dec: number) => {
  const h = Math.floor(dec);
  const m = Math.round((dec - h) * 60);
  return `${pad(h)}:${pad(m)}`;
};

export const timeStrToDec = (s: string) => {
  const [h, m] = s.split(":").map(Number);
  return h + m / 60;
};

export const fmtHours = (h: number) => {
  if (h <= 0) return "0h";
  if (h < 1) return `${Math.round(h * 60)}p`;
  const whole = Math.floor(h);
  const min = Math.round((h - whole) * 60);
  return min === 0 ? `${whole}h` : `${whole}h${min}`;
};

/** Thứ 2 của tuần chứa ngày d. */
export const startOfWeek = (d: Date) => {
  const day = (d.getDay() + 6) % 7;
  return addDays(d, -day);
};
