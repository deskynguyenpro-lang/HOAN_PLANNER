import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { isEmailAllowed } from "@/lib/auth/allowlist";
import { DataProvider } from "@/lib/data/store";
import { AppShell } from "@/components/shell/AppShell";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
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
    <DataProvider>
      <AppShell email={user.email || ""}>{children}</AppShell>
    </DataProvider>
  );
}
