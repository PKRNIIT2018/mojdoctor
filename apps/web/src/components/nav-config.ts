import {
  Calendar,
  ClipboardCheck,
  Users,
  FileText,
  Settings,
  Stethoscope,
  Shield,
  Clock,
  ShieldCheck,
  ClipboardList,
  FormInput,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

export type NavItem = { href: string; label: string; icon: LucideIcon };
export type NavGroup = { label: string; items: NavItem[] };

export const navGroups: NavGroup[] = [
  {
    label: "Consultations",
    items: [
      { href: "/dashboard", label: "Schedule", icon: Calendar },
      { href: "/dashboard/approvals", label: "Approvals", icon: ClipboardCheck },
      { href: "/dashboard/consultations", label: "Consultations", icon: ClipboardList },
      { href: "/dashboard/patients", label: "Patients", icon: Users },
    ],
  },
  {
    label: "Tools",
    items: [
      { href: "/dashboard/slots", label: "Slots", icon: Clock },
      { href: "/dashboard/templates", label: "Templates", icon: FileText },
      { href: "/dashboard/intake", label: "Intake", icon: FormInput },
    ],
  },
  {
    label: "Account",
    items: [
      { href: "/dashboard/settings", label: "Settings", icon: Settings },
      { href: "/dashboard/compliance", label: "Compliance", icon: ShieldCheck },
    ],
  },
];

export const adminGroup: NavGroup = {
  label: "Administration",
  items: [
    { href: "/dashboard/admin", label: "Admin", icon: Shield },
    { href: "/dashboard/admin/doctors/new", label: "Add Doctor", icon: Stethoscope },
  ],
};
