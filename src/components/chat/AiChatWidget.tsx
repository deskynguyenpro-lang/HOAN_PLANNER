"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  MessageCircle,
  X,
  Send,
  Sun,
  Moon,
  RotateCcw,
  Check,
  Loader2,
  Sparkles,
  TrendingDown,
} from "lucide-react";
import { useStore } from "@/lib/data/store";
import { useToast } from "@/components/ui/Toast";
import { fetchIdentity } from "@/lib/data/identity-store";
import { fetchBufferCapacityPct } from "@/lib/data/settings-store";
import { appendActionLog } from "@/lib/data/ai-log-store";
import { fetchExternalBusyBlocks, isGoogleCalendarFeatureAvailable } from "@/lib/data/google-calendar-store";
import { fetchFixedBlocks } from "@/lib/data/fixed-blocks-store";
import { expandFixedBlocksToExternalBusy } from "@/lib/domain/fixedBlocks";
import type { IdentityProfile } from "@/lib/domain/identity";
import { buildUserFullContext } from "@/lib/domain/aiContext";
import {
  applyProposedSchedule,
  detectAndProcessMissedTasks,
  mergeExternalBusy,
  type RescheduleOutcome,
} from "@/lib/domain/reschedule";
import { pillarOf } from "@/lib/domain/pillars";
import { decToLabel, fmtHours } from "@/lib/domain/dates";

type ChatMode = "morning" | "evening" | "breakdown" | "chat";

interface ChatMsg {
  role: "user" | "assistant";
  content: string;
  outcomes?: RescheduleOutcome[];
}

type ScheduledOutcome = Extract<RescheduleOutcome, { kind: "scheduled" }>;
type BreakdownOutcome = Extract<RescheduleOutcome, { kind: "needs_breakdown" }>;

const BREAKDOWN_REASONS = [
  "Việc này quá rộng, mình chưa biết bắt đầu từ đâu.",
  "Mình thiếu thông tin/công cụ cần thiết để làm.",
  "Mình chưa có đủ năng lượng phù hợp lúc này.",
];

export function AiChatWidget() {
  const { goals, logs, objectives, setLogs } = useStore();
  const { toast } = useToast();

  const [open, setOpen] = useState(false);
  const [identity, setIdentity] = useState<IdentityProfile | null>(null);
  const [bufferPct, setBufferPct] = useState(20);
  const [messages, setMessages] = useState<ChatMsg[]>([]);
  const [input, setInput] = useState("");
  const [streaming, setStreaming] = useState("");
  const [loading, setLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  const goalsRef = useRef(goals);
  goalsRef.current = goals;
  const logsRef = useRef(logs);
  logsRef.current = logs;

  useEffect(() => {
    if (!open) return;
    fetchIdentity()
      .then(setIdentity)
      .catch(() => {});
    fetchBufferCapacityPct()
      .then(setBufferPct)
      .catch(() => {});
  }, [open]);

  useEffect(() => {
    if (!scrollRef.current) return;
    scrollRef.current.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, streaming, open]);

  const velocityAlerts = useMemo(
    () => buildUserFullContext(goals, logs, objectives, identity, bufferPct).velocityAlerts,
    [goals, logs, objectives, identity, bufferPct],
  );

  async function send(
    mode: ChatMode,
    userText: string,
    opts?: {
      breakdownTarget?: { taskName: string; deferCount: number };
      outcomesForNextAssistant?: RescheduleOutcome[];
      /** Nếu gọi AI thất bại (VD: chưa cấu hình khoá), vẫn hiện nội dung này
       * + các Action Card kèm theo — dùng cho các luồng có kết quả tính toán
       * thật (Turn 3) không nên mất chỉ vì phần tóm tắt bằng AI bị lỗi. */
      fallbackContent?: string;
    },
  ) {
    const nextMessages: ChatMsg[] = [...messages, { role: "user", content: userText }];
    setMessages(nextMessages);
    setLoading(true);
    setStreaming("");
    try {
      const res = await fetch("/api/ai/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mode,
          messages: nextMessages.map((m) => ({ role: m.role, content: m.content })),
          goals: goalsRef.current,
          logs: logsRef.current,
          objectives,
          identity,
          bufferCapacityPct: bufferPct,
          breakdownTarget: opts?.breakdownTarget,
        }),
      });
      if (!res.ok || !res.body) {
        const err = await res.json().catch(() => ({ error: "Không kết nối được AI." }));
        throw new Error(err.error || "Không kết nối được AI.");
      }
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let acc = "";
      // eslint-disable-next-line no-constant-condition
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        acc += decoder.decode(value, { stream: true });
        setStreaming(acc);
      }
      setMessages((m) => [
        ...m,
        { role: "assistant", content: acc || "(không có phản hồi)", outcomes: opts?.outcomesForNextAssistant },
      ]);
    } catch (e) {
      if (opts?.fallbackContent) {
        // Đề xuất xếp lịch (Turn 3) là tính toán thật, không phụ thuộc AI —
        // vẫn hiện kèm Action Card dù AI tóm tắt lỗi (VD: chưa cấu hình khoá).
        setMessages((m) => [
          ...m,
          { role: "assistant", content: opts.fallbackContent!, outcomes: opts?.outcomesForNextAssistant },
        ]);
        toast("Không kết nối được AI để tóm tắt — vẫn hiện được đề xuất bên dưới.", "error");
      } else {
        toast(e instanceof Error ? e.message : "Có lỗi khi gọi AI.", "error");
        setMessages((m) => m.slice(0, -1)); // gỡ tin nhắn user vừa gửi nếu lỗi hẳn, tránh hội thoại lệch
      }
    } finally {
      setLoading(false);
      setStreaming("");
    }
  }

  const handleMorning = () => send("morning", "☀️ Check-in sáng giúp mình.");
  const handleEvening = () => send("evening", "🌙 Tổng kết tiến độ hôm nay giúp mình.");

  async function handleReschedule() {
    if (loading) return;
    const now = new Date();

    const fixedBlocks = await fetchFixedBlocks().catch(() => []);
    const fixedBusy = expandFixedBlocksToExternalBusy(fixedBlocks, now);

    let googleBusy = {};
    if (isGoogleCalendarFeatureAvailable()) {
      const from = now.toISOString();
      const to = new Date(now.getTime() + 8 * 86400000).toISOString();
      googleBusy = await fetchExternalBusyBlocks(from, to).catch(() => ({}));
    }
    const externalBusyByDay = mergeExternalBusy(fixedBusy, googleBusy);

    const { nextLogs, outcomes } = detectAndProcessMissedTasks(
      goalsRef.current,
      logsRef.current,
      now,
      externalBusyByDay,
    );
    setLogs(nextLogs);

    if (outcomes.length === 0) {
      setMessages((m) => [
        ...m,
        { role: "user", content: "🔄 Xếp lại lịch hôm nay giúp mình." },
        {
          role: "assistant",
          content: "Hôm nay chưa có việc nào bị bỏ lỡ cả — bạn đang bám khá sát kế hoạch, cứ tiếp tục vậy nhé!",
        },
      ]);
      return;
    }

    const scheduled = outcomes.filter((o): o is ScheduledOutcome => o.kind === "scheduled");
    const breakdowns = outcomes.filter((o): o is BreakdownOutcome => o.kind === "needs_breakdown");
    const overloads = outcomes.filter((o) => o.kind === "overload");

    if (breakdowns.length > 0) {
      const first = breakdowns[0];
      await send("breakdown", "🔄 Xếp lại lịch hôm nay giúp mình.", {
        breakdownTarget: { taskName: first.missed.goal.name, deferCount: first.deferCount },
        outcomesForNextAssistant: outcomes,
        fallbackContent: `Việc "${first.missed.goal.name}" đã bị hoãn ${first.deferCount} lần. Bạn đang vướng ở đâu — việc quá rộng, thiếu thông tin, hay chưa có năng lượng phù hợp?`,
      });
    } else {
      await send(
        "chat",
        `🔄 Mình vừa xếp lại lịch hôm nay: ${scheduled.length} việc được xếp lại${overloads.length ? `, ${overloads.length} việc không tìm được chỗ trống` : ""}. Tóm tắt ngắn gọn giúp mình.`,
        {
          outcomesForNextAssistant: outcomes,
          fallbackContent: `Mình vừa xếp lại ${scheduled.length} việc bị bỏ lỡ${overloads.length ? `, còn ${overloads.length} việc chưa tìm được chỗ trống hợp lý` : ""} — xem chi tiết bên dưới nhé.`,
        },
      );
    }
  }

  async function applyOutcome(outcome: ScheduledOutcome, msgIdx: number) {
    const next = applyProposedSchedule(outcome, logsRef.current);
    setLogs(next);
    try {
      await appendActionLog({
        taskId: outcome.missed.block.id,
        oldSchedule: {
          dateKey: outcome.missed.dateKey,
          start: outcome.missed.block.start,
          duration: outcome.missed.block.duration,
        },
        newSchedule: {
          dateKey: outcome.proposed.dateKey,
          start: outcome.proposed.start,
          duration: outcome.proposed.duration,
        },
        reasoning: outcome.reasoning,
        autonomyLevel: 2,
      });
    } catch {
      /* không chặn UI nếu ghi audit log lỗi — lịch đã được áp dụng rồi */
    }
    toast("Đã áp dụng thay đổi lịch.");
    dismissOutcome(outcome, msgIdx);
  }

  function dismissOutcome(outcome: RescheduleOutcome, msgIdx: number) {
    setMessages((prev) =>
      prev.map((m, i) => (i !== msgIdx ? m : { ...m, outcomes: (m.outcomes || []).filter((o) => o !== outcome) })),
    );
  }

  function handleSend() {
    const text = input.trim();
    if (!text || loading) return;
    setInput("");
    send("chat", text);
  }

  function pickBreakdownReason(reason: string) {
    if (loading) return;
    send("chat", reason);
  }

  return (
    <>
      <button
        onClick={() => setOpen((v) => !v)}
        aria-label={open ? "Đóng trợ lý AI" : "Mở trợ lý AI"}
        className="fixed z-40 flex items-center justify-center rounded-full text-white transition-transform"
        style={{
          bottom: "calc(6.5rem + env(safe-area-inset-bottom))",
          right: "1.5rem",
          width: 52,
          height: 52,
          background: "linear-gradient(145deg, var(--brand-2), var(--brand))",
          boxShadow: "0 14px 30px -10px color-mix(in srgb, var(--brand) 70%, transparent)",
          transform: open ? "scale(0.92)" : "scale(1)",
        }}
      >
        {open ? <X size={22} /> : <MessageCircle size={22} />}
      </button>

      {open && (
        <div
          className="fixed z-40 flex flex-col overflow-hidden rounded-2xl sm:rounded-3xl"
          style={{
            bottom: "calc(11.5rem + env(safe-area-inset-bottom))",
            right: "1rem",
            left: "1rem",
            top: "auto",
            height: "min(70vh, 560px)",
            maxWidth: 380,
            marginLeft: "auto",
            background: "var(--surface)",
            border: "1px solid var(--border)",
            boxShadow: "0 24px 60px -20px rgba(0,0,0,0.45)",
          }}
        >
          <div
            className="flex items-center gap-2 px-4 py-3 border-b flex-shrink-0"
            style={{ borderColor: "var(--border)" }}
          >
            <span
              className="flex items-center justify-center rounded-xl flex-shrink-0"
              style={{ width: 30, height: 30, background: "var(--brand-dim)" }}
            >
              <Sparkles size={15} className="text-brand" />
            </span>
            <div className="min-w-0">
              <div className="headline text-[13px]">Trợ lý đồng hành</div>
              <div className="text-text-3 text-[10.5px]">Luôn bám sát định hướng &amp; lịch thật của bạn</div>
            </div>
          </div>

          {velocityAlerts.length > 0 && (
            <div
              className="flex items-start gap-2 px-4 py-2.5 text-[11.5px] leading-relaxed flex-shrink-0"
              style={{ background: "color-mix(in srgb, var(--warn) 12%, transparent)", color: "var(--warn)" }}
            >
              <TrendingDown size={14} className="mt-0.5 flex-shrink-0" />
              <span>{velocityAlerts[0].message}</span>
            </div>
          )}

          <div ref={scrollRef} className="flex-1 overflow-y-auto px-3.5 py-3 space-y-3">
            {messages.length === 0 && (
              <p className="text-text-3 text-[12px] text-center mt-6 px-3 leading-relaxed">
                Bấm một gợi ý nhanh dưới đây, hoặc gõ câu hỏi cho mình.
              </p>
            )}
            {messages.map((m, i) => (
              <div key={i} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
                <div className="max-w-[85%]">
                  <div
                    className="rounded-2xl px-3.5 py-2.5 text-[12.5px] leading-relaxed whitespace-pre-wrap"
                    style={{
                      background: m.role === "user" ? "var(--brand)" : "var(--chip)",
                      color: m.role === "user" ? "#fff" : "var(--text)",
                    }}
                  >
                    {m.content}
                  </div>

                  {m.outcomes && m.outcomes.length > 0 && (
                    <div className="mt-2 space-y-2">
                      {m.outcomes.map((o, oi) => {
                        if (o.kind === "scheduled") {
                          const p = pillarOf(o.missed.goal.category);
                          return (
                            <div
                              key={oi}
                              className="rounded-xl px-3 py-2.5"
                              style={{
                                background: "var(--surface-2)",
                                borderLeft: `3px solid ${p.color}`,
                              }}
                            >
                              <div className="text-[12px] font-bold text-text">{o.missed.goal.name}</div>
                              <div className="text-[11px] text-text-3 mt-0.5">
                                {decToLabel(o.missed.block.start)} ({o.missed.dateKey}) → {decToLabel(o.proposed.start)} (
                                {o.proposed.dateKey}) · {fmtHours(o.proposed.duration)}
                                {o.proposed.usedBuffer ? " · dùng buffer" : ""}
                              </div>
                              <div className="flex gap-1.5 mt-2">
                                <button
                                  onClick={() => applyOutcome(o, i)}
                                  className="btn-primary px-2.5 py-1.5 text-[11px] flex items-center gap-1"
                                >
                                  <Check size={11} /> Áp dụng thay đổi
                                </button>
                                <button
                                  onClick={() => dismissOutcome(o, i)}
                                  className="btn-ghost px-2.5 py-1.5 text-[11px]"
                                >
                                  Bỏ qua
                                </button>
                              </div>
                            </div>
                          );
                        }
                        if (o.kind === "needs_breakdown") {
                          return (
                            <div
                              key={oi}
                              className="rounded-xl px-3 py-2.5"
                              style={{
                                background: "color-mix(in srgb, var(--bad) 10%, transparent)",
                                borderLeft: "3px solid var(--bad)",
                              }}
                            >
                              <div className="text-[12px] font-bold text-text">
                                ⚠️ {o.missed.goal.name} — hoãn {o.deferCount} lần
                              </div>
                              <div className="text-[11px] text-text-3 mt-1">Vướng ở đâu?</div>
                              <div className="flex flex-col gap-1 mt-1.5">
                                {BREAKDOWN_REASONS.map((r) => (
                                  <button
                                    key={r}
                                    onClick={() => pickBreakdownReason(r)}
                                    className="text-left px-2.5 py-1.5 rounded-lg text-[11px]"
                                    style={{ background: "var(--chip)", color: "var(--text-2)" }}
                                  >
                                    {r}
                                  </button>
                                ))}
                              </div>
                            </div>
                          );
                        }
                        return (
                          <div
                            key={oi}
                            className="rounded-xl px-3 py-2.5 text-[11px] text-text-3"
                            style={{ background: "var(--surface-2)", borderLeft: "3px solid var(--text-3)" }}
                          >
                            {o.missed.goal.name}: không tìm được chỗ trống hợp lệ trong 7 ngày tới.
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>
            ))}

            {loading && (
              <div className="flex justify-start">
                <div
                  className="rounded-2xl px-3.5 py-2.5 text-[12.5px] leading-relaxed whitespace-pre-wrap max-w-[85%]"
                  style={{ background: "var(--chip)", color: "var(--text)" }}
                >
                  {streaming || <Loader2 size={14} className="animate-spin" />}
                </div>
              </div>
            )}
          </div>

          <div className="px-3 pt-2 flex gap-1.5 flex-wrap flex-shrink-0">
            <button
              onClick={handleMorning}
              disabled={loading}
              className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[11px] font-semibold disabled:opacity-50"
              style={{ background: "var(--chip)", color: "var(--text-2)" }}
            >
              <Sun size={12} /> Check-in sáng
            </button>
            <button
              onClick={handleEvening}
              disabled={loading}
              className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[11px] font-semibold disabled:opacity-50"
              style={{ background: "var(--chip)", color: "var(--text-2)" }}
            >
              <Moon size={12} /> Tổng kết ngày
            </button>
            <button
              onClick={handleReschedule}
              disabled={loading}
              className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[11px] font-semibold disabled:opacity-50"
              style={{ background: "var(--chip)", color: "var(--text-2)" }}
            >
              <RotateCcw size={12} /> Xếp lại lịch hôm nay
            </button>
          </div>

          <div className="flex items-center gap-2 p-3 pt-2 flex-shrink-0">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  handleSend();
                }
              }}
              placeholder="Hỏi mình điều gì đó..."
              disabled={loading}
              className="field flex-1 px-3 py-2 text-[12.5px]"
            />
            <button
              onClick={handleSend}
              disabled={loading || !input.trim()}
              className="rounded-xl p-2.5 flex-shrink-0 disabled:opacity-40"
              style={{ background: "var(--brand)", color: "#fff" }}
              aria-label="Gửi"
            >
              <Send size={15} />
            </button>
          </div>
        </div>
      )}
    </>
  );
}
