import { DashboardSidebar, DashboardMobileHeader } from "../../components/dashboard-nav";
import { createClient, createAdminClient } from "../../utils/supabase/server";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  let isAdmin = false;
  if (user?.email && process.env.SUPABASE_SECRET_KEY) {
    try {
      const admin = createAdminClient();
      const { data: doctor } = await admin
        .from("doctor")
        .select("role")
        .eq("email", user.email)
        .single();
      isAdmin = doctor?.role === "admin";
    } catch {
      // admin client unavailable — treat as non-admin
    }
  }

  return (
    <div className="flex min-h-dvh">
      <DashboardSidebar isAdmin={isAdmin} />
      <main className="flex-1 overflow-auto">
        <DashboardMobileHeader isAdmin={isAdmin} />
        <div className="p-4 md:p-6">{children}</div>
      </main>
    </div>
  );
}
