"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { CalendarClock, CheckCircle2, Link2 } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { useToast } from "@/components/ui/Toast";
import {
  disconnectGoogleCalendar,
  fetchGoogleCalendarStatus,
  isGoogleCalendarFeatureAvailable,
  startGoogleCalendarConnect,
} from "@/lib/data/google-calendar-store";

/**
 * Kết nối Google Calendar (đọc-only) — khung giờ đã bận trên đó sẽ tự bị
 * loại khỏi quỹ thời gian trống, và AI Rescheduler (Turn 3/4) sẽ không bao
 * giờ xếp task chèn lên. Chỉ khả dụng ở chế độ cloud (xem lib/google/calendar.ts).
 */
export function GoogleCalendarCard() {
  const { toast } = useToast();
  const params = useSearchParams();
  const available = isGoogleCalendarFeatureAvailable();

  const [loaded, setLoaded] = useState(false);
  const [connected, setConnected] = useState(false);
  const [connectedAt, setConnectedAt] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!available) {
      setLoaded(true);
      return;
    }
    fetchGoogleCalendarStatus()
      .then((s) => {
        setConnected(s.connected);
        setConnectedAt(s.connectedAt);
      })
      .catch(() => {})
      .finally(() => setLoaded(true));
  }, [available]);

  useEffect(() => {
    const status = params.get("calendar");
    if (status === "connected") {
      toast("Đã kết nối Google Calendar.");
      setConnected(true);
    } else if (status === "error") {
      toast(params.get("message") || "Không kết nối được Google Calendar.", "error");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params]);

  const connect = () => startGoogleCalendarConnect("/ke-hoach");

  const disconnect = async () => {
    setBusy(true);
    try {
      await disconnectGoogleCalendar();
      setConnected(false);
      toast("Đã gỡ kết nối Google Calendar.");
    } catch (e) {
      toast(e instanceof Error ? e.message : "Không gỡ kết nối được.", "error");
    } finally {
      setBusy(false);
    }
  };

  if (!available) {
    return (
      <Card>
        <h2 className="headline text-[14px] flex items-center gap-1.5 mb-1">
          <CalendarClock size={15} className="text-brand" /> Đồng bộ Google Calendar
        </h2>
        <p className="text-text-3 text-[12px] leading-relaxed">
          Chỉ khả dụng khi dùng chế độ cloud (đã đăng nhập, có Supabase) — chế độ thử offline không có tài khoản để
          gắn quyền truy cập vào.
        </p>
      </Card>
    );
  }

  if (!loaded) return <div className="h-[70px] rounded-2xl" style={{ background: "var(--chip)" }} />;

  return (
    <Card>
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <h2 className="headline text-[14px] flex items-center gap-1.5">
            <CalendarClock size={15} className="text-brand" /> Đồng bộ Google Calendar
          </h2>
          <p className="text-text-3 text-[11.5px] mt-0.5 leading-relaxed max-w-[440px]">
            Đọc-only — khung giờ đã bận trên Google Calendar tự bị loại khỏi quỹ thời gian trống, AI xếp lịch không
            bao giờ chèn lên.
          </p>
        </div>
        {connected ? (
          <button onClick={disconnect} disabled={busy} className="btn-ghost px-3.5 py-2 text-[12.5px] disabled:opacity-60">
            Gỡ kết nối
          </button>
        ) : (
          <button onClick={connect} className="btn-primary px-3.5 py-2 text-[12.5px] flex items-center gap-1.5">
            <Link2 size={14} /> Kết nối
          </button>
        )}
      </div>
      {connected && (
        <div className="flex items-center gap-1.5 mt-2.5 text-[11.5px]" style={{ color: "var(--good)" }}>
          <CheckCircle2 size={13} />
          Đã kết nối{connectedAt ? ` từ ${new Date(connectedAt).toLocaleDateString("vi-VN")}` : ""}
        </div>
      )}
    </Card>
  );
}
