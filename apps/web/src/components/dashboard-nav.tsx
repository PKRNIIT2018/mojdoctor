"use client";

import { Settings, Stethoscope } from "lucide-react";
import { useRouter } from "next/navigation";
import { SidebarNav } from "./sidebar-nav";
import { MobileNav } from "./mobile-nav";
import { navGroups, adminGroup } from "./nav-config";
import { createClient } from "@web/utils/supabase/client";

export function DashboardSidebar({ isAdmin }: { isAdmin: boolean }) {
  const groups = isAdmin ? [adminGroup, ...navGroups] : navGroups;
  const router = useRouter();

  async function handleSignOut() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/doctor/login");
  }

  return (
    <aside className="hidden md:flex w-64 flex-col border-r bg-muted/30">
      <div className="flex items-center gap-2 px-6 py-5 border-b">
        <Stethoscope className="h-5 w-5 text-primary" />
        <span className="font-semibold text-foreground">
          {isAdmin ? "Admin Portal" : "Doctor Portal"}
        </span>
      </div>
      <SidebarNav groups={groups} />
      <div className="border-t p-4">
        <button
          onClick={handleSignOut}
          className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <Settings className="h-4 w-4" />
          Sign out
        </button>
      </div>
    </aside>
  );
}

export function DashboardMobileHeader({ isAdmin }: { isAdmin: boolean }) {
  const groups = isAdmin ? [adminGroup, ...navGroups] : navGroups;
  const title = isAdmin ? "Admin Portal" : "Doctor Portal";

  return (
    <div className="md:hidden flex items-center gap-2 border-b px-4 py-3">
      <MobileNav groups={groups} title={title} />
      <span className="font-semibold text-sm">{title}</span>
    </div>
  );
}
