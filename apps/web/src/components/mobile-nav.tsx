"use client";

import { Button } from "@web/components/ui/button";
import { Sheet, SheetContent, SheetTrigger, SheetTitle } from "@web/components/ui/sheet";
import { SidebarNav } from "@web/components/sidebar-nav";
import { MenuIcon, Stethoscope, type LucideIcon } from "lucide-react";
import { VisuallyHidden } from "@radix-ui/react-visually-hidden";

interface MobileNavProps {
  groups: { label: string; items: { href: string; label: string; icon: LucideIcon }[] }[];
  title: string;
}

export function MobileNav({ groups, title }: MobileNavProps) {
  return (
    <Sheet>
      <SheetTrigger asChild>
        <Button variant="ghost" size="icon" aria-label="Open navigation menu">
          <MenuIcon className="h-5 w-5" />
        </Button>
      </SheetTrigger>
      <SheetContent side="left" className="w-64 p-0" onCloseAutoFocus={(e) => e.preventDefault()}>
        <VisuallyHidden>
          <SheetTitle>Navigation</SheetTitle>
        </VisuallyHidden>
        <div className="flex items-center gap-2 px-6 py-5 border-b">
          <Stethoscope className="h-5 w-5 text-primary" />
          <span className="font-semibold text-foreground">{title}</span>
        </div>
        <SidebarNav groups={groups} />
      </SheetContent>
    </Sheet>
  );
}
