"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { createClient } from "@/lib/supabase/client";
import type { AppData, Goal, Logs, Objective } from "@/lib/domain/types";
import {
  CheckinRow,
  goalToRow,
  objectiveToRow,
  rowToGoal,
  rowToObjective,
} from "./mapping";
import { isSupabaseConfigured, loadLocal, saveLocal } from "./local-store";

type SaveState = "idle" | "saving" | "saved" | "error";

interface StoreValue {
  goals: Goal[];
  logs: Logs;
  objectives: Objective[];
  loaded: boolean;
  saveState: SaveState;
  saveError: string;
  email: string;
  /** true khi đang chạy chế độ cục bộ (chưa cấu hình Supabase). */
  local: boolean;
  setGoals: (next: Goal[]) => void;
  setLogs: (next: Logs) => void;
  setObjectives: (next: Objective[]) => void;
  replaceAll: (data: AppData) => void;
  reload: () => Promise<void>;
}

export const StoreContext = createContext<StoreValue | null>(null);
const Ctx = StoreContext;

const inList = (ids: string[]) => `(${ids.map((i) => `"${i}"`).join(",")})`;

function describeError(e: unknown, fallback: string): string {
  if (e && typeof e === "object") {
    const o = e as { message?: string; details?: string; hint?: string; code?: string };
    const parts = [o.message, o.details, o.hint].filter(Boolean);
    const base = parts.join(" · ") || fallback;
    return o.code ? `${base} (mã ${o.code})` : base;
  }
  return e instanceof Error ? e.message : fallback;
}

export function DataProvider({ children }: { children: React.ReactNode }) {
  const local = useMemo(() => !isSupabaseConfigured(), []);
  const supabase = useMemo(() => (local ? null : createClient()), [local]);

  const [goals, setGoalsState] = useState<Goal[]>([]);
  const [logs, setLogsState] = useState<Logs>({});
  const [objectives, setObjectivesState] = useState<Objective[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [saveState, setSaveState] = useState<SaveState>("idle");
  const [saveError, setSaveError] = useState("");
  const [email, setEmail] = useState(local ? "Chế độ thử offline" : "");

  const userIdRef = useRef<string>("");
  const prevLogsRef = useRef<Logs>({});
  const queueRef = useRef<Promise<unknown>>(Promise.resolve());
  const loadRetriedRef = useRef(false);
  const dataRef = useRef<AppData>({ goals: [], logs: {}, objectives: [] });

  const syncRef = useCallback((g: Goal[], l: Logs, o: Objective[]) => {
    dataRef.current = { goals: g, logs: l, objectives: o };
  }, []);

  const runWrite = useCallback((fn: () => Promise<void>) => {
    setSaveState("saving");
    queueRef.current = queueRef.current
      .then(fn)
      .then(() => setSaveState("saved"))
      .catch((e: unknown) => {
        console.error("Lưu thất bại", e);
        setSaveError(describeError(e, "Không lưu được dữ liệu"));
        setSaveState("error");
      });
  }, []);

  // ─── Load ────────────────────────────────────────────────────────────────
  const load = useCallback(async () => {
    if (local) {
      const d = loadLocal();
      setGoalsState(d.goals);
      setLogsState(d.logs);
      setObjectivesState(d.objectives);
      prevLogsRef.current = d.logs;
      syncRef(d.goals, d.logs, d.objectives);
      setLoaded(true);
      return;
    }
    try {
      const { data: auth } = await supabase!.auth.getUser();
      if (!auth.user) {
        setLoaded(true);
        return;
      }
      userIdRef.current = auth.user.id;
      setEmail(auth.user.email || "");

      const [gRes, oRes, cRes, lRes] = await Promise.all([
        supabase!.from("goals").select("*"),
        supabase!.from("objectives").select("*"),
        supabase!.from("objective_checkins").select("*"),
        supabase!.from("day_logs").select("date, blocks"),
      ]);

      const gRows = gRes.data ?? [];
      const oRows = oRes.data ?? [];
      const cRows = (cRes.data ?? []) as CheckinRow[];
      const lRows = lRes.data ?? [];

      const nextGoals = gRows.map(rowToGoal);
      const nextObjectives = oRows.map((r) => rowToObjective(r, cRows));
      const nextLogs: Logs = {};
      lRows.forEach((r: { date: string; blocks: Logs[string]["blocks"] }) => {
        nextLogs[r.date] = { blocks: r.blocks || [] };
      });
      setGoalsState(nextGoals);
      setObjectivesState(nextObjectives);
      setLogsState(nextLogs);
      prevLogsRef.current = nextLogs;
      syncRef(nextGoals, nextLogs, nextObjectives);

      const errs = [
        gRes.error && `goals: ${describeError(gRes.error, "")}`,
        oRes.error && `objectives: ${describeError(oRes.error, "")}`,
        cRes.error && `checkins: ${describeError(cRes.error, "")}`,
        lRes.error && `day_logs: ${describeError(lRes.error, "")}`,
      ].filter(Boolean);
      if (errs.length) {
        const cacheStale = [gRes, oRes, cRes, lRes].some(
          (r) => r.error && (r.error as { code?: string }).code === "PGRST205",
        );
        if (cacheStale && !loadRetriedRef.current) {
          loadRetriedRef.current = true;
          await new Promise((r) => setTimeout(r, 2500));
          return load();
        }
        setSaveError(`Không đọc được dữ liệu — ${errs.join(" | ")}`);
        setSaveState("error");
      }
    } catch (e) {
      console.error("Tải dữ liệu thất bại", e);
      setSaveError(describeError(e, "Không kết nối được cơ sở dữ liệu."));
      setSaveState("error");
    } finally {
      setLoaded(true);
    }
  }, [local, supabase, syncRef]);

  useEffect(() => {
    load();
  }, [load]);

  // ─── Local persistence helper ───────────────────────────────────────────
  const persistLocal = useCallback(() => {
    runWrite(async () => {
      saveLocal(dataRef.current);
    });
  }, [runWrite]);

  // ─── Goals ───────────────────────────────────────────────────────────────
  const setGoals = useCallback(
    (next: Goal[]) => {
      setGoalsState(next);
      syncRef(next, dataRef.current.logs, dataRef.current.objectives);
      if (local) return persistLocal();
      const uid = userIdRef.current;
      runWrite(async () => {
        if (next.length) {
          const { error } = await supabase!
            .from("goals")
            .upsert(next.map((g) => goalToRow(g, uid)), { onConflict: "id" });
          if (error) throw error;
        }
        const del = supabase!.from("goals").delete().eq("user_id", uid);
        const { error: dErr } = next.length
          ? await del.not("id", "in", inList(next.map((g) => g.id)))
          : await del;
        if (dErr) throw dErr;
      });
    },
    [local, persistLocal, runWrite, supabase, syncRef],
  );

  // ─── Objectives + check-ins ─────────────────────────────────────────────
  const setObjectives = useCallback(
    (next: Objective[]) => {
      setObjectivesState(next);
      syncRef(dataRef.current.goals, dataRef.current.logs, next);
      if (local) return persistLocal();
      const uid = userIdRef.current;
      runWrite(async () => {
        if (next.length) {
          const { error } = await supabase!
            .from("objectives")
            .upsert(next.map((o) => objectiveToRow(o, uid)), { onConflict: "id" });
          if (error) throw error;
        }
        const delObj = supabase!.from("objectives").delete().eq("user_id", uid);
        const { error: dErr } = next.length
          ? await delObj.not("id", "in", inList(next.map((o) => o.id)))
          : await delObj;
        if (dErr) throw dErr;

        const rows: CheckinRow[] = [];
        next.forEach((o) =>
          (o.checkins || []).forEach((c) =>
            rows.push({ objective_id: o.id, user_id: uid, date: c.date, value: c.value }),
          ),
        );
        if (rows.length) {
          const { error } = await supabase!
            .from("objective_checkins")
            .upsert(rows, { onConflict: "objective_id,date" });
          if (error) throw error;
        }
        const keptObjIds = next.map((o) => o.id);
        const delC = supabase!.from("objective_checkins").delete().eq("user_id", uid);
        if (keptObjIds.length === 0) {
          const { error } = await delC;
          if (error) throw error;
        } else {
          const { error } = await delC.not("objective_id", "in", inList(keptObjIds));
          if (error) throw error;
          for (const o of next) {
            const dates = (o.checkins || []).map((c) => c.date);
            const q = supabase!
              .from("objective_checkins")
              .delete()
              .eq("objective_id", o.id);
            const { error: e2 } = dates.length
              ? await q.not("date", "in", `(${dates.map((d) => `"${d}"`).join(",")})`)
              : await q;
            if (e2) throw e2;
          }
        }
      });
    },
    [local, persistLocal, runWrite, supabase, syncRef],
  );

  // ─── Day logs ──────────────────────────────────────────────────────────
  const setLogs = useCallback(
    (next: Logs) => {
      setLogsState(next);
      const prev = prevLogsRef.current;
      prevLogsRef.current = next;
      syncRef(dataRef.current.goals, next, dataRef.current.objectives);
      if (local) return persistLocal();
      const uid = userIdRef.current;
      runWrite(async () => {
        const changed: string[] = [];
        for (const k of Object.keys(next)) {
          if (next[k] !== prev[k]) changed.push(k);
        }
        const removed = Object.keys(prev).filter((k) => !(k in next));

        if (changed.length) {
          const rows = changed.map((date) => ({
            user_id: uid,
            date,
            blocks: (next[date]?.blocks || []).filter((b) => !b.virtual),
            updated_at: new Date().toISOString(),
          }));
          const { error } = await supabase!
            .from("day_logs")
            .upsert(rows, { onConflict: "user_id,date" });
          if (error) throw error;
        }
        if (removed.length) {
          const { error } = await supabase!
            .from("day_logs")
            .delete()
            .eq("user_id", uid)
            .in("date", removed);
          if (error) throw error;
        }
      });
    },
    [local, persistLocal, runWrite, supabase, syncRef],
  );

  // ─── Thay toàn bộ (import / dữ liệu mẫu) ──────────────────────────────
  const replaceAll = useCallback(
    (data: AppData) => {
      setGoalsState(data.goals);
      setObjectivesState(data.objectives);
      setLogsState(data.logs);
      prevLogsRef.current = data.logs;
      syncRef(data.goals, data.logs, data.objectives);
      if (local) return persistLocal();
      const uid = userIdRef.current;
      runWrite(async () => {
        await supabase!.from("day_logs").delete().eq("user_id", uid);
        await supabase!.from("objective_checkins").delete().eq("user_id", uid);
        await supabase!.from("goals").delete().eq("user_id", uid);
        await supabase!.from("objectives").delete().eq("user_id", uid);

        if (data.objectives.length) {
          const { error } = await supabase!
            .from("objectives")
            .insert(data.objectives.map((o) => objectiveToRow(o, uid)));
          if (error) throw error;
          const cRows: CheckinRow[] = [];
          data.objectives.forEach((o) =>
            (o.checkins || []).forEach((c) =>
              cRows.push({ objective_id: o.id, user_id: uid, date: c.date, value: c.value }),
            ),
          );
          if (cRows.length) {
            const { error: ce } = await supabase!.from("objective_checkins").insert(cRows);
            if (ce) throw ce;
          }
        }
        if (data.goals.length) {
          const { error } = await supabase!
            .from("goals")
            .insert(data.goals.map((g) => goalToRow(g, uid)));
          if (error) throw error;
        }
        const logRows = Object.entries(data.logs).map(([date, l]) => ({
          user_id: uid,
          date,
          blocks: (l.blocks || []).filter((b) => !b.virtual),
        }));
        if (logRows.length) {
          const { error } = await supabase!.from("day_logs").insert(logRows);
          if (error) throw error;
        }
      });
    },
    [local, persistLocal, runWrite, supabase, syncRef],
  );

  const value: StoreValue = {
    goals,
    logs,
    objectives,
    loaded,
    saveState,
    saveError,
    email,
    local,
    setGoals,
    setLogs,
    setObjectives,
    replaceAll,
    reload: async () => {
      loadRetriedRef.current = false;
      setSaveState("idle");
      await load();
    },
  };

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useStore(): StoreValue {
  const v = useContext(Ctx);
  if (!v) throw new Error("useStore phải nằm trong <DataProvider>");
  return v;
}
