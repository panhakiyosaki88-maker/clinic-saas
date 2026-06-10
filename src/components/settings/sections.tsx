import { Building2, MapPin, UserCog, CreditCard, Receipt, Bell, type LucideIcon } from "lucide-react";
import { PERMISSIONS, type Permission } from "@/lib/auth/permissions";

export interface SettingsSection {
  /** i18n key under the `settings.sections` namespace. */
  key: string;
  href: string;
  label: string;
  description: string;
  icon: LucideIcon;
  /** Permission that grants access to this section. */
  permission: Permission;
}

/**
 * The Settings hub sections, in display order. Shared by the landing-page
 * cards and the sub-nav so they never drift apart. Each entry is gated by the
 * same permission the underlying feature already uses, so visibility is
 * consistent with the rest of the app's RBAC.
 */
export const SETTINGS_SECTIONS: SettingsSection[] = [
  {
    key: "general",
    href: "/settings/clinic",
    label: "General",
    description: "Clinic name, contact details, timezone and currency",
    icon: Building2,
    permission: PERMISSIONS.CLINIC_MANAGE,
  },
  {
    key: "branches",
    href: "/settings/branches",
    label: "Branches",
    description: "Manage your clinic's physical locations",
    icon: MapPin,
    permission: PERMISSIONS.CLINIC_MANAGE,
  },
  {
    key: "billing",
    href: "/settings/billing",
    label: "Billing",
    description: "Price catalog, procedures, memberships & payment settings",
    icon: Receipt,
    permission: PERMISSIONS.BILLING_READ,
  },
  {
    key: "notifications",
    href: "/settings/notifications",
    label: "Notifications",
    description: "Reminder channels, timing and message templates",
    icon: Bell,
    permission: PERMISSIONS.NOTIFICATIONS_SEND,
  },
  {
    key: "staff",
    href: "/settings/staff",
    label: "Staff & roles",
    description: "Invite team members and assign their roles",
    icon: UserCog,
    permission: PERMISSIONS.STAFF_MANAGE,
  },
  {
    key: "subscription",
    href: "/settings/subscription",
    label: "Subscription",
    description: "Your plan, limits and usage",
    icon: CreditCard,
    permission: PERMISSIONS.SUBSCRIPTION_MANAGE,
  },
];
