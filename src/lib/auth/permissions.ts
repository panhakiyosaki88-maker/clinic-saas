/**
 * Canonical permission keys. Mirrors the catalog seeded in migration 0003.
 * Server actions and UI reference PERMISSIONS.* rather than raw strings.
 */
export const PERMISSIONS = {
  DASHBOARD_VIEW: "dashboard.view",
  PATIENTS_READ: "patients.read",
  PATIENTS_WRITE: "patients.write",
  APPOINTMENTS_READ: "appointments.read",
  APPOINTMENTS_WRITE: "appointments.write",
  EMR_READ: "emr.read",
  EMR_WRITE: "emr.write",
  PRESCRIPTIONS_READ: "prescriptions.read",
  PRESCRIPTIONS_WRITE: "prescriptions.write",
  LAB_READ: "lab.read",
  LAB_WRITE: "lab.write",
  IMAGING_READ: "imaging.read",
  IMAGING_WRITE: "imaging.write",
  PROCEDURES_READ: "procedures.read",
  PROCEDURES_WRITE: "procedures.write",
  PHARMACY_READ: "pharmacy.read",
  PHARMACY_WRITE: "pharmacy.write",
  BILLING_READ: "billing.read",
  BILLING_WRITE: "billing.write",
  REPORTS_VIEW: "reports.view",
  DOCTORS_READ: "doctors.read",
  DOCTORS_WRITE: "doctors.write",
  NOTIFICATIONS_READ: "notifications.read",
  NOTIFICATIONS_SEND: "notifications.send",
  STAFF_MANAGE: "staff.manage",
  CLINIC_MANAGE: "clinic.manage",
  SUBSCRIPTION_MANAGE: "subscription.manage",
} as const;

export type Permission = (typeof PERMISSIONS)[keyof typeof PERMISSIONS];

/** The 7 system role keys. */
export const ROLE_KEYS = [
  "super_admin",
  "clinic_owner",
  "doctor",
  "nurse",
  "receptionist",
  "cashier",
  "accountant",
] as const;
export type RoleKey = (typeof ROLE_KEYS)[number];
