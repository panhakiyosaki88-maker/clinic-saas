import {
  LayoutDashboard,
  Calendar,
  Users,
  Stethoscope,
  Pill,
  FlaskConical,
  Package,
  Receipt,
  BarChart3,
  Bell,
  Settings,
  type LucideIcon,
} from "lucide-react";
import { PERMISSIONS, type Permission } from "@/lib/auth/permissions";

export interface NavItem {
  key: string;
  label: string;
  href: string;
  icon: LucideIcon;
  /**
   * Permission(s) required to see this item; null = always visible. An array
   * means "visible if the user holds ANY of these" (e.g. the Settings hub).
   */
  permission: Permission | Permission[] | null;
}

/** Primary sidebar navigation. Order matters. */
export const NAV: NavItem[] = [
  { key: "dashboard", label: "Dashboard", href: "/dashboard", icon: LayoutDashboard, permission: null },
  { key: "appointments", label: "Appointments", href: "/appointments", icon: Calendar, permission: PERMISSIONS.APPOINTMENTS_READ },
  { key: "patients", label: "Patients", href: "/patients", icon: Users, permission: PERMISSIONS.PATIENTS_READ },
  { key: "doctors", label: "Doctors", href: "/doctors", icon: Stethoscope, permission: PERMISSIONS.DOCTORS_READ },
  { key: "prescriptions", label: "Prescriptions", href: "/prescriptions", icon: Pill, permission: PERMISSIONS.PRESCRIPTIONS_READ },
  { key: "lab", label: "Laboratory", href: "/lab", icon: FlaskConical, permission: PERMISSIONS.LAB_READ },
  { key: "pharmacy", label: "Pharmacy", href: "/pharmacy", icon: Package, permission: PERMISSIONS.PHARMACY_READ },
  { key: "billing", label: "Billing", href: "/billing", icon: Receipt, permission: PERMISSIONS.BILLING_READ },
  { key: "reports", label: "Reports", href: "/reports", icon: BarChart3, permission: PERMISSIONS.REPORTS_VIEW },
  { key: "notifications", label: "Notifications", href: "/notifications", icon: Bell, permission: PERMISSIONS.NOTIFICATIONS_READ },
  {
    key: "settings",
    label: "Settings",
    href: "/settings",
    icon: Settings,
    permission: [PERMISSIONS.CLINIC_MANAGE, PERMISSIONS.STAFF_MANAGE, PERMISSIONS.SUBSCRIPTION_MANAGE],
  },
];
