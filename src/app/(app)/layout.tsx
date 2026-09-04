import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { isEmailAllowed } from "@/lib/auth/allowlist";
import { isSupabaseConfigured } from "@/lib/data/local-store";
import { DataProvider } from "@/lib/data/store";
import { AppShell } from "@/components/shell/AppShell";
import { ToastProvider } from "@/components/ui/Toast";

// Trang có nội dung phụ thuộc thời điểm hiện tại (lời chào, ngày) — luôn
// render mới mỗi lượt truy cập, không dùng bản tĩnh đã cache.
export const dynamic = "force-dynamic";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Chưa cấu hình Supabase → chạy chế độ cục bộ (không cần đăng nhập).
  if (!isSupabaseConfigured()) {
    return (
      <ToastProvider>
        <DataProvider>
          <AppShell email="Chế độ thử offline">{children}</AppShell>
        </DataProvider>
      </ToastProvider>
    );
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");
  if (!isEmailAllowed(user.email)) {
    await supabase.auth.signOut();
    redirect("/login?error=not-allowed");
  }

  return (
    <ToastProvider>
      <DataProvider>
        <AppShell email={user.email || ""}>{children}</AppShell>
      </DataProvider>
    </ToastProvider>
  );
}
