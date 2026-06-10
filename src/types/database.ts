/**
 * Database types — HAND-MAINTAINED. Do NOT regenerate this file.
 *
 * `supabase gen types` output diverges from this curated version and breaks the
 * build: it omits the convenience enum aliases the codebase imports (Gender,
 * BloodType, EmploymentType, NotificationType, SubscriptionPlan, …) and marks
 * trigger-populated columns as required in Insert (invoice_number, invoice_seq,
 * receipt_number, receipt_seq, patient_number).
 *
 * After a migration, hand-edit this file: add the new column to the table's Row
 * and Insert blocks, mirroring an existing nullable column. To peek at the
 * generator's output for reference (e.g. to copy a new column), run
 * `npm run db:types` — it writes to src/types/database.generated.ts (a scratch
 * file), never overwriting this one.
 */

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type SubscriptionPlan = "starter" | "professional" | "enterprise";
export type SubscriptionStatus =
  | "trialing"
  | "active"
  | "past_due"
  | "canceled"
  | "expired";
export type ClinicStatus = "active" | "suspended" | "pending";
export type AccountStatus = "pending" | "approved" | "rejected";
export type MembershipStatus = "active" | "invited" | "disabled";
export type Gender = "male" | "female" | "other";
export type BloodType = "A+" | "A-" | "B+" | "B-" | "AB+" | "AB-" | "O+" | "O-" | "unknown";
export type MaritalStatus = "single" | "married" | "divorced" | "widowed" | "other";
export type IdDocType = "national_id" | "passport" | "driver_license" | "other";
export type ContactMethod = "phone" | "sms" | "email" | "telegram" | "none";
export type EmploymentType = "full_time" | "part_time" | "contract" | "visiting" | "locum";
export type RecordStatus = "draft" | "finalized";
export type AppointmentStatus =
  | "scheduled"
  | "waiting"
  | "in_consultation"
  | "completed"
  | "cancelled"
  | "no_show";
export type InventoryReason = "purchase" | "dispense" | "adjustment" | "expiry" | "return";
export type InvoiceStatus =
  | "unpaid"
  | "partially_paid"
  | "paid"
  | "cancelled"
  | "draft"
  | "pending"
  | "overdue"
  | "refunded";
export type PaymentMethod =
  | "cash"
  | "bank_transfer"
  | "khqr"
  | "aba_transfer"
  | "acleda_transfer"
  | "wing"
  | "credit_card"
  | "other";
export type PaymentKind = "payment" | "refund";
export type InvoiceSource =
  | "manual"
  | "appointment"
  | "lab"
  | "imaging"
  | "pharmacy"
  | "prescription"
  | "procedure"
  | "membership"
  | "visit";
export type ServiceCategory =
  | "consultation"
  | "lab"
  | "imaging"
  | "pharmacy"
  | "procedure"
  | "membership"
  | "other";
export type LabStatus = "requested" | "collected" | "processing" | "completed" | "cancelled";
export type ImagingStatus = "requested" | "scheduled" | "performed" | "reported" | "cancelled";
export type ProcedureStatus = "ordered" | "performed" | "completed" | "cancelled";
export type VisitStatus = "open" | "closed" | "cancelled";
export type BenefitType = "percent" | "fixed";
export type PatientMembershipStatus = "active" | "expired" | "cancelled";
export type NotificationChannel = "email" | "telegram";
export type NotificationStatus = "pending" | "sent" | "failed" | "skipped";
export type NotificationType =
  | "appointment_reminder"
  | "payment_reminder"
  | "follow_up"
  | "custom"
  | "doctor_schedule"
  | "owner_alert"
  | "staff_message";
export type TimelineEvent =
  | "registered"
  | "note"
  | "appointment"
  | "visit"
  | "document"
  | "prescription"
  | "lab"
  | "imaging"
  | "procedure"
  | "invoice"
  | "medication"
  | "immunization";

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          email: string | null;
          full_name: string | null;
          avatar_url: string | null;
          telegram_chat_id: string | null;
          status: AccountStatus;
          approved_at: string | null;
          approved_by: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          email?: string | null;
          full_name?: string | null;
          avatar_url?: string | null;
          telegram_chat_id?: string | null;
          status?: AccountStatus;
          approved_at?: string | null;
          approved_by?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["profiles"]["Insert"]>;
        Relationships: [];
      };
      clinics: {
        Row: {
          id: string;
          name: string;
          slug: string;
          subtitle: string | null;
          owner_user_id: string | null;
          contact_email: string | null;
          contact_phone: string | null;
          address: string | null;
          telegram: string | null;
          facebook_page: string | null;
          custom_fields: Json;
          country: string;
          timezone: string;
          currency: string;
          status: ClinicStatus;
          logo_path: string | null;
          created_at: string;
          updated_at: string;
          created_by: string | null;
          deleted_at: string | null;
        };
        Insert: {
          id?: string;
          name: string;
          slug: string;
          subtitle?: string | null;
          owner_user_id?: string | null;
          contact_email?: string | null;
          contact_phone?: string | null;
          address?: string | null;
          telegram?: string | null;
          facebook_page?: string | null;
          custom_fields?: Json;
          country?: string;
          timezone?: string;
          currency?: string;
          status?: ClinicStatus;
          logo_path?: string | null;
          created_at?: string;
          updated_at?: string;
          created_by?: string | null;
          deleted_at?: string | null;
        };
        Update: Partial<Database["public"]["Tables"]["clinics"]["Insert"]>;
        Relationships: [];
      };
      subscriptions: {
        Row: {
          id: string;
          clinic_id: string;
          plan: SubscriptionPlan;
          status: SubscriptionStatus;
          max_branches: number;
          max_doctors: number;
          max_patients: number;
          current_period_start: string;
          current_period_end: string | null;
          trial_ends_at: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          clinic_id: string;
          plan?: SubscriptionPlan;
          status?: SubscriptionStatus;
          max_branches?: number;
          max_doctors?: number;
          max_patients?: number;
          current_period_start?: string;
          current_period_end?: string | null;
          trial_ends_at?: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["subscriptions"]["Insert"]>;
        Relationships: [];
      };
      branches: {
        Row: {
          id: string;
          clinic_id: string;
          name: string;
          code: string | null;
          address: string | null;
          phone: string | null;
          payment_qr_path: string | null;
          payment_qr_caption: string | null;
          is_primary: boolean;
          created_at: string;
          updated_at: string;
          created_by: string | null;
          deleted_at: string | null;
        };
        Insert: {
          id?: string;
          clinic_id: string;
          name: string;
          code?: string | null;
          address?: string | null;
          phone?: string | null;
          payment_qr_path?: string | null;
          payment_qr_caption?: string | null;
          is_primary?: boolean;
          created_at?: string;
          updated_at?: string;
          created_by?: string | null;
          deleted_at?: string | null;
        };
        Update: Partial<Database["public"]["Tables"]["branches"]["Insert"]>;
        Relationships: [];
      };
      roles: {
        Row: {
          id: string;
          clinic_id: string | null;
          key: string;
          name: string;
          description: string | null;
          is_system: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          clinic_id?: string | null;
          key: string;
          name: string;
          description?: string | null;
          is_system?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["roles"]["Insert"]>;
        Relationships: [];
      };
      permissions: {
        Row: {
          id: string;
          key: string;
          category: string;
          description: string;
        };
        Insert: {
          id?: string;
          key: string;
          category: string;
          description: string;
        };
        Update: Partial<Database["public"]["Tables"]["permissions"]["Insert"]>;
        Relationships: [];
      };
      role_permissions: {
        Row: { role_id: string; permission_id: string };
        Insert: { role_id: string; permission_id: string };
        Update: Partial<{ role_id: string; permission_id: string }>;
        Relationships: [];
      };
      memberships: {
        Row: {
          id: string;
          clinic_id: string;
          user_id: string | null;
          role_id: string;
          invited_email: string | null;
          status: MembershipStatus;
          created_at: string;
          updated_at: string;
          created_by: string | null;
          deleted_at: string | null;
        };
        Insert: {
          id?: string;
          clinic_id: string;
          user_id?: string | null;
          role_id: string;
          invited_email?: string | null;
          status?: MembershipStatus;
          created_at?: string;
          updated_at?: string;
          created_by?: string | null;
          deleted_at?: string | null;
        };
        Update: Partial<Database["public"]["Tables"]["memberships"]["Insert"]>;
        Relationships: [];
      };
      patients: {
        Row: {
          id: string;
          clinic_id: string;
          branch_id: string | null;
          patient_seq: number;
          patient_number: string;
          full_name: string;
          khmer_name: string | null;
          gender: Gender | null;
          date_of_birth: string | null;
          phone: string | null;
          email: string | null;
          telegram_chat_id: string | null;
          address: string | null;
          occupation: string | null;
          emergency_contact_name: string | null;
          emergency_contact_phone: string | null;
          blood_type: BloodType | null;
          marital_status: MaritalStatus | null;
          national_id_type: IdDocType | null;
          national_id_number: string | null;
          preferred_language: string | null;
          preferred_contact_method: ContactMethod | null;
          do_not_contact: boolean;
          next_of_kin_name: string | null;
          next_of_kin_phone: string | null;
          next_of_kin_relationship: string | null;
          allergies: string | null;
          medical_history: string | null;
          chronic_diseases: string | null;
          notes: string | null;
          created_at: string;
          updated_at: string;
          created_by: string | null;
          deleted_at: string | null;
        };
        Insert: {
          id?: string;
          clinic_id: string;
          branch_id?: string | null;
          patient_seq?: number;
          patient_number?: string;
          full_name: string;
          khmer_name?: string | null;
          gender?: Gender | null;
          date_of_birth?: string | null;
          phone?: string | null;
          email?: string | null;
          telegram_chat_id?: string | null;
          address?: string | null;
          occupation?: string | null;
          emergency_contact_name?: string | null;
          emergency_contact_phone?: string | null;
          blood_type?: BloodType | null;
          marital_status?: MaritalStatus | null;
          national_id_type?: IdDocType | null;
          national_id_number?: string | null;
          preferred_language?: string | null;
          preferred_contact_method?: ContactMethod | null;
          do_not_contact?: boolean;
          next_of_kin_name?: string | null;
          next_of_kin_phone?: string | null;
          next_of_kin_relationship?: string | null;
          allergies?: string | null;
          medical_history?: string | null;
          chronic_diseases?: string | null;
          notes?: string | null;
          created_at?: string;
          updated_at?: string;
          created_by?: string | null;
          deleted_at?: string | null;
        };
        Update: Partial<Database["public"]["Tables"]["patients"]["Insert"]>;
        Relationships: [];
      };
      patient_insurance: {
        Row: {
          id: string;
          clinic_id: string;
          patient_id: string;
          provider: string;
          policy_number: string | null;
          group_number: string | null;
          coverage_start: string | null;
          coverage_end: string | null;
          is_primary: boolean;
          notes: string | null;
          created_at: string;
          updated_at: string;
          created_by: string | null;
          deleted_at: string | null;
        };
        Insert: {
          id?: string;
          clinic_id: string;
          patient_id: string;
          provider: string;
          policy_number?: string | null;
          group_number?: string | null;
          coverage_start?: string | null;
          coverage_end?: string | null;
          is_primary?: boolean;
          notes?: string | null;
          created_at?: string;
          updated_at?: string;
          created_by?: string | null;
          deleted_at?: string | null;
        };
        Update: Partial<Database["public"]["Tables"]["patient_insurance"]["Insert"]>;
        Relationships: [];
      };
      patient_allergies: {
        Row: {
          id: string;
          clinic_id: string;
          patient_id: string;
          substance: string;
          reaction: string | null;
          severity: string | null;
          noted_at: string | null;
          created_at: string;
          updated_at: string;
          created_by: string | null;
          deleted_at: string | null;
        };
        Insert: {
          id?: string;
          clinic_id: string;
          patient_id: string;
          substance: string;
          reaction?: string | null;
          severity?: string | null;
          noted_at?: string | null;
          created_at?: string;
          updated_at?: string;
          created_by?: string | null;
          deleted_at?: string | null;
        };
        Update: Partial<Database["public"]["Tables"]["patient_allergies"]["Insert"]>;
        Relationships: [];
      };
      patient_medications: {
        Row: {
          id: string;
          clinic_id: string;
          patient_id: string;
          name: string;
          dose: string | null;
          frequency: string | null;
          route: string | null;
          started_on: string | null;
          ended_on: string | null;
          status: string;
          created_at: string;
          updated_at: string;
          created_by: string | null;
          deleted_at: string | null;
        };
        Insert: {
          id?: string;
          clinic_id: string;
          patient_id: string;
          name: string;
          dose?: string | null;
          frequency?: string | null;
          route?: string | null;
          started_on?: string | null;
          ended_on?: string | null;
          status?: string;
          created_at?: string;
          updated_at?: string;
          created_by?: string | null;
          deleted_at?: string | null;
        };
        Update: Partial<Database["public"]["Tables"]["patient_medications"]["Insert"]>;
        Relationships: [];
      };
      patient_immunizations: {
        Row: {
          id: string;
          clinic_id: string;
          patient_id: string;
          vaccine: string;
          dose_label: string | null;
          given_on: string | null;
          next_due_on: string | null;
          provider: string | null;
          created_at: string;
          updated_at: string;
          created_by: string | null;
          deleted_at: string | null;
        };
        Insert: {
          id?: string;
          clinic_id: string;
          patient_id: string;
          vaccine: string;
          dose_label?: string | null;
          given_on?: string | null;
          next_due_on?: string | null;
          provider?: string | null;
          created_at?: string;
          updated_at?: string;
          created_by?: string | null;
          deleted_at?: string | null;
        };
        Update: Partial<Database["public"]["Tables"]["patient_immunizations"]["Insert"]>;
        Relationships: [];
      };
      patient_conditions: {
        Row: {
          id: string;
          clinic_id: string;
          patient_id: string;
          condition: string;
          status: string;
          diagnosed_on: string | null;
          resolved_on: string | null;
          notes: string | null;
          created_at: string;
          updated_at: string;
          created_by: string | null;
          deleted_at: string | null;
        };
        Insert: {
          id?: string;
          clinic_id: string;
          patient_id: string;
          condition: string;
          status?: string;
          diagnosed_on?: string | null;
          resolved_on?: string | null;
          notes?: string | null;
          created_at?: string;
          updated_at?: string;
          created_by?: string | null;
          deleted_at?: string | null;
        };
        Update: Partial<Database["public"]["Tables"]["patient_conditions"]["Insert"]>;
        Relationships: [];
      };
      patient_consents: {
        Row: {
          id: string;
          clinic_id: string;
          patient_id: string;
          consent_type: string;
          granted: boolean;
          signed_on: string | null;
          document_id: string | null;
          notes: string | null;
          created_at: string;
          updated_at: string;
          created_by: string | null;
          deleted_at: string | null;
        };
        Insert: {
          id?: string;
          clinic_id: string;
          patient_id: string;
          consent_type: string;
          granted: boolean;
          signed_on?: string | null;
          document_id?: string | null;
          notes?: string | null;
          created_at?: string;
          updated_at?: string;
          created_by?: string | null;
          deleted_at?: string | null;
        };
        Update: Partial<Database["public"]["Tables"]["patient_consents"]["Insert"]>;
        Relationships: [];
      };
      patient_communications: {
        Row: {
          id: string;
          clinic_id: string;
          patient_id: string;
          channel: ContactMethod | null;
          direction: string;
          subject: string | null;
          body: string | null;
          status: string | null;
          sent_at: string;
          created_at: string;
          created_by: string | null;
          deleted_at: string | null;
        };
        Insert: {
          id?: string;
          clinic_id: string;
          patient_id: string;
          channel?: ContactMethod | null;
          direction?: string;
          subject?: string | null;
          body?: string | null;
          status?: string | null;
          sent_at?: string;
          created_at?: string;
          created_by?: string | null;
          deleted_at?: string | null;
        };
        Update: Partial<Database["public"]["Tables"]["patient_communications"]["Insert"]>;
        Relationships: [];
      };
      patient_tags: {
        Row: {
          id: string;
          clinic_id: string;
          name: string;
          color: string | null;
          created_at: string;
          updated_at: string;
          created_by: string | null;
          deleted_at: string | null;
        };
        Insert: {
          id?: string;
          clinic_id: string;
          name: string;
          color?: string | null;
          created_at?: string;
          updated_at?: string;
          created_by?: string | null;
          deleted_at?: string | null;
        };
        Update: Partial<Database["public"]["Tables"]["patient_tags"]["Insert"]>;
        Relationships: [];
      };
      patient_tag_links: {
        Row: {
          id: string;
          clinic_id: string;
          patient_id: string;
          tag_id: string;
          created_at: string;
          created_by: string | null;
        };
        Insert: {
          id?: string;
          clinic_id: string;
          patient_id: string;
          tag_id: string;
          created_at?: string;
          created_by?: string | null;
        };
        Update: Partial<Database["public"]["Tables"]["patient_tag_links"]["Insert"]>;
        Relationships: [];
      };
      patient_documents: {
        Row: {
          id: string;
          clinic_id: string;
          patient_id: string;
          file_path: string;
          file_name: string;
          mime_type: string | null;
          size_bytes: number | null;
          medical_record_id: string | null;
          category: string | null;
          created_at: string;
          created_by: string | null;
          deleted_at: string | null;
        };
        Insert: {
          id?: string;
          clinic_id: string;
          patient_id: string;
          file_path: string;
          file_name: string;
          mime_type?: string | null;
          size_bytes?: number | null;
          medical_record_id?: string | null;
          category?: string | null;
          created_at?: string;
          created_by?: string | null;
          deleted_at?: string | null;
        };
        Update: Partial<Database["public"]["Tables"]["patient_documents"]["Insert"]>;
        Relationships: [];
      };
      medical_records: {
        Row: {
          id: string;
          clinic_id: string;
          patient_id: string;
          branch_id: string | null;
          provider_user_id: string | null;
          visit_id: string | null;
          visit_date: string;
          status: RecordStatus;
          chief_complaint: string | null;
          subjective: string | null;
          objective: string | null;
          assessment: string | null;
          plan: string | null;
          diagnosis: string | null;
          treatment_plan: string | null;
          clinical_notes: string | null;
          created_at: string;
          updated_at: string;
          created_by: string | null;
          deleted_at: string | null;
        };
        Insert: {
          id?: string;
          clinic_id: string;
          patient_id: string;
          branch_id?: string | null;
          provider_user_id?: string | null;
          visit_id?: string | null;
          visit_date?: string;
          status?: RecordStatus;
          chief_complaint?: string | null;
          subjective?: string | null;
          objective?: string | null;
          assessment?: string | null;
          plan?: string | null;
          diagnosis?: string | null;
          treatment_plan?: string | null;
          clinical_notes?: string | null;
          created_at?: string;
          updated_at?: string;
          created_by?: string | null;
          deleted_at?: string | null;
        };
        Update: Partial<Database["public"]["Tables"]["medical_records"]["Insert"]>;
        Relationships: [];
      };
      vital_signs: {
        Row: {
          id: string;
          clinic_id: string;
          patient_id: string;
          medical_record_id: string | null;
          systolic: number | null;
          diastolic: number | null;
          pulse: number | null;
          temperature: number | null;
          height_cm: number | null;
          weight_kg: number | null;
          bmi: number | null;
          oxygen_saturation: number | null;
          recorded_at: string;
          created_at: string;
          created_by: string | null;
        };
        Insert: {
          id?: string;
          clinic_id: string;
          patient_id: string;
          medical_record_id?: string | null;
          systolic?: number | null;
          diastolic?: number | null;
          pulse?: number | null;
          temperature?: number | null;
          height_cm?: number | null;
          weight_kg?: number | null;
          // bmi is generated by the database; not insertable.
          oxygen_saturation?: number | null;
          recorded_at?: string;
          created_at?: string;
          created_by?: string | null;
        };
        Update: Partial<Database["public"]["Tables"]["vital_signs"]["Insert"]>;
        Relationships: [];
      };
      patient_timeline: {
        Row: {
          id: string;
          clinic_id: string;
          patient_id: string;
          event_type: TimelineEvent;
          title: string;
          description: string | null;
          created_at: string;
          created_by: string | null;
        };
        Insert: {
          id?: string;
          clinic_id: string;
          patient_id: string;
          event_type?: TimelineEvent;
          title: string;
          description?: string | null;
          created_at?: string;
          created_by?: string | null;
        };
        Update: Partial<Database["public"]["Tables"]["patient_timeline"]["Insert"]>;
        Relationships: [];
      };
      doctors: {
        Row: {
          id: string;
          clinic_id: string;
          user_id: string | null;
          branch_id: string | null;
          full_name: string;
          specialization: string | null;
          license_number: string | null;
          phone: string | null;
          email: string | null;
          bio: string | null;
          consultation_fee: number | null;
          is_active: boolean;
          title: string | null;
          gender: Gender | null;
          languages: string | null;
          employment_type: EmploymentType | null;
          sub_specialty: string | null;
          years_experience: number | null;
          joined_on: string | null;
          room: string | null;
          calendar_color: string | null;
          license_expiry: string | null;
          license_verified: boolean;
          license_verified_on: string | null;
          avatar_path: string | null;
          created_at: string;
          updated_at: string;
          created_by: string | null;
          deleted_at: string | null;
        };
        Insert: {
          id?: string;
          clinic_id: string;
          user_id?: string | null;
          branch_id?: string | null;
          full_name: string;
          specialization?: string | null;
          license_number?: string | null;
          phone?: string | null;
          email?: string | null;
          bio?: string | null;
          consultation_fee?: number | null;
          is_active?: boolean;
          title?: string | null;
          gender?: Gender | null;
          languages?: string | null;
          employment_type?: EmploymentType | null;
          sub_specialty?: string | null;
          years_experience?: number | null;
          joined_on?: string | null;
          room?: string | null;
          calendar_color?: string | null;
          license_expiry?: string | null;
          license_verified?: boolean;
          license_verified_on?: string | null;
          avatar_path?: string | null;
          created_at?: string;
          updated_at?: string;
          created_by?: string | null;
          deleted_at?: string | null;
        };
        Update: Partial<Database["public"]["Tables"]["doctors"]["Insert"]>;
        Relationships: [];
      };
      doctor_documents: {
        Row: {
          id: string;
          clinic_id: string;
          doctor_id: string;
          file_path: string;
          file_name: string;
          mime_type: string | null;
          size_bytes: number | null;
          category: string | null;
          created_at: string;
          created_by: string | null;
          deleted_at: string | null;
        };
        Insert: {
          id?: string;
          clinic_id: string;
          doctor_id: string;
          file_path: string;
          file_name: string;
          mime_type?: string | null;
          size_bytes?: number | null;
          category?: string | null;
          created_at?: string;
          created_by?: string | null;
          deleted_at?: string | null;
        };
        Update: Partial<Database["public"]["Tables"]["doctor_documents"]["Insert"]>;
        Relationships: [];
      };
      doctor_qualifications: {
        Row: {
          id: string;
          clinic_id: string;
          doctor_id: string;
          degree: string;
          institution: string | null;
          field: string | null;
          year: number | null;
          notes: string | null;
          created_at: string;
          updated_at: string;
          created_by: string | null;
          deleted_at: string | null;
        };
        Insert: {
          id?: string;
          clinic_id: string;
          doctor_id: string;
          degree: string;
          institution?: string | null;
          field?: string | null;
          year?: number | null;
          notes?: string | null;
          created_at?: string;
          updated_at?: string;
          created_by?: string | null;
          deleted_at?: string | null;
        };
        Update: Partial<Database["public"]["Tables"]["doctor_qualifications"]["Insert"]>;
        Relationships: [];
      };
      doctor_licenses: {
        Row: {
          id: string;
          clinic_id: string;
          doctor_id: string;
          license_number: string;
          authority: string | null;
          jurisdiction: string | null;
          issued_on: string | null;
          expiry_on: string | null;
          verified: boolean;
          created_at: string;
          updated_at: string;
          created_by: string | null;
          deleted_at: string | null;
        };
        Insert: {
          id?: string;
          clinic_id: string;
          doctor_id: string;
          license_number: string;
          authority?: string | null;
          jurisdiction?: string | null;
          issued_on?: string | null;
          expiry_on?: string | null;
          verified?: boolean;
          created_at?: string;
          updated_at?: string;
          created_by?: string | null;
          deleted_at?: string | null;
        };
        Update: Partial<Database["public"]["Tables"]["doctor_licenses"]["Insert"]>;
        Relationships: [];
      };
      doctor_schedules: {
        Row: {
          id: string;
          clinic_id: string;
          doctor_id: string;
          branch_id: string | null;
          day_of_week: number;
          start_time: string;
          end_time: string;
          is_active: boolean;
          break_start: string | null;
          break_end: string | null;
          slot_minutes: number | null;
          max_patients: number | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          clinic_id: string;
          doctor_id: string;
          branch_id?: string | null;
          day_of_week: number;
          start_time: string;
          end_time: string;
          is_active?: boolean;
          break_start?: string | null;
          break_end?: string | null;
          slot_minutes?: number | null;
          max_patients?: number | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["doctor_schedules"]["Insert"]>;
        Relationships: [];
      };
      doctor_time_off: {
        Row: {
          id: string;
          clinic_id: string;
          doctor_id: string;
          start_date: string;
          end_date: string;
          reason: string | null;
          created_at: string;
          created_by: string | null;
        };
        Insert: {
          id?: string;
          clinic_id: string;
          doctor_id: string;
          start_date: string;
          end_date: string;
          reason?: string | null;
          created_at?: string;
          created_by?: string | null;
        };
        Update: Partial<Database["public"]["Tables"]["doctor_time_off"]["Insert"]>;
        Relationships: [];
      };
      appointments: {
        Row: {
          id: string;
          clinic_id: string;
          branch_id: string | null;
          patient_id: string;
          doctor_id: string | null;
          scheduled_at: string;
          duration_minutes: number;
          status: AppointmentStatus;
          is_walk_in: boolean;
          reason: string | null;
          notes: string | null;
          checked_in_at: string | null;
          started_at: string | null;
          completed_at: string | null;
          visit_id: string | null;
          created_at: string;
          updated_at: string;
          created_by: string | null;
          deleted_at: string | null;
        };
        Insert: {
          id?: string;
          clinic_id: string;
          branch_id?: string | null;
          patient_id: string;
          doctor_id?: string | null;
          scheduled_at: string;
          duration_minutes?: number;
          status?: AppointmentStatus;
          is_walk_in?: boolean;
          reason?: string | null;
          notes?: string | null;
          checked_in_at?: string | null;
          started_at?: string | null;
          completed_at?: string | null;
          visit_id?: string | null;
          created_at?: string;
          updated_at?: string;
          created_by?: string | null;
          deleted_at?: string | null;
        };
        Update: Partial<Database["public"]["Tables"]["appointments"]["Insert"]>;
        Relationships: [];
      };
      medicines: {
        Row: {
          id: string;
          clinic_id: string;
          name: string;
          generic_name: string | null;
          sku: string | null;
          strength: string | null;
          category: string | null;
          unit: string;
          reorder_level: number;
          purchase_price: number | null;
          selling_price: number | null;
          stock_quantity: number;
          is_active: boolean;
          created_at: string;
          updated_at: string;
          created_by: string | null;
          deleted_at: string | null;
        };
        Insert: {
          id?: string;
          clinic_id: string;
          name: string;
          generic_name?: string | null;
          sku?: string | null;
          strength?: string | null;
          category?: string | null;
          unit?: string;
          reorder_level?: number;
          purchase_price?: number | null;
          selling_price?: number | null;
          stock_quantity?: number;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
          created_by?: string | null;
          deleted_at?: string | null;
        };
        Update: Partial<Database["public"]["Tables"]["medicines"]["Insert"]>;
        Relationships: [];
      };
      inventory_transactions: {
        Row: {
          id: string;
          clinic_id: string;
          medicine_id: string;
          change: number;
          reason: InventoryReason;
          batch_number: string | null;
          expiry_date: string | null;
          unit_cost: number | null;
          note: string | null;
          branch_id: string | null;
          patient_id: string | null;
          visit_id: string | null;
          unit_price: number | null;
          created_at: string;
          created_by: string | null;
        };
        Insert: {
          id?: string;
          clinic_id: string;
          medicine_id: string;
          change: number;
          reason: InventoryReason;
          batch_number?: string | null;
          expiry_date?: string | null;
          unit_cost?: number | null;
          note?: string | null;
          branch_id?: string | null;
          patient_id?: string | null;
          visit_id?: string | null;
          unit_price?: number | null;
          created_at?: string;
          created_by?: string | null;
        };
        Update: Partial<Database["public"]["Tables"]["inventory_transactions"]["Insert"]>;
        Relationships: [];
      };
      invoices: {
        Row: {
          id: string;
          clinic_id: string;
          patient_id: string | null;
          branch_id: string | null;
          invoice_seq: number;
          invoice_number: string;
          status: InvoiceStatus;
          subtotal: number;
          discount: number;
          tax: number;
          total: number;
          amount_paid: number;
          balance: number;
          notes: string | null;
          source: InvoiceSource;
          source_id: string | null;
          doctor_id: string | null;
          service_type: string | null;
          due_date: string | null;
          voided_at: string | null;
          refunded_total: number;
          invoice_year: number | null;
          year_seq: number | null;
          visit_id: string | null;
          issued_at: string;
          created_at: string;
          updated_at: string;
          created_by: string | null;
          deleted_at: string | null;
        };
        Insert: {
          id?: string;
          clinic_id: string;
          patient_id?: string | null;
          branch_id?: string | null;
          invoice_seq?: number;
          invoice_number?: string;
          status?: InvoiceStatus;
          subtotal?: number;
          discount?: number;
          tax?: number;
          total?: number;
          amount_paid?: number;
          balance?: number;
          notes?: string | null;
          source?: InvoiceSource;
          source_id?: string | null;
          doctor_id?: string | null;
          service_type?: string | null;
          due_date?: string | null;
          voided_at?: string | null;
          refunded_total?: number;
          invoice_year?: number | null;
          year_seq?: number | null;
          visit_id?: string | null;
          issued_at?: string;
          created_at?: string;
          updated_at?: string;
          created_by?: string | null;
          deleted_at?: string | null;
        };
        Update: Partial<Database["public"]["Tables"]["invoices"]["Insert"]>;
        Relationships: [];
      };
      invoice_items: {
        Row: {
          id: string;
          clinic_id: string;
          invoice_id: string;
          description: string;
          quantity: number;
          unit_price: number;
          line_total: number;
          sort_order: number;
          category: ServiceCategory;
          created_at: string;
        };
        Insert: {
          id?: string;
          clinic_id: string;
          invoice_id: string;
          description: string;
          quantity?: number;
          unit_price?: number;
          // line_total is generated by the database; not insertable.
          sort_order?: number;
          category?: ServiceCategory;
          created_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["invoice_items"]["Insert"]>;
        Relationships: [];
      };
      payments: {
        Row: {
          id: string;
          clinic_id: string;
          invoice_id: string;
          receipt_seq: number;
          receipt_number: string;
          amount: number;
          method: PaymentMethod;
          kind: PaymentKind;
          reference: string | null;
          note: string | null;
          paid_at: string;
          created_at: string;
          created_by: string | null;
        };
        Insert: {
          id?: string;
          clinic_id: string;
          invoice_id: string;
          receipt_seq?: number;
          receipt_number?: string;
          amount: number;
          method?: PaymentMethod;
          kind?: PaymentKind;
          reference?: string | null;
          note?: string | null;
          paid_at?: string;
          created_at?: string;
          created_by?: string | null;
        };
        Update: Partial<Database["public"]["Tables"]["payments"]["Insert"]>;
        Relationships: [];
      };
      service_prices: {
        Row: {
          id: string;
          clinic_id: string;
          branch_id: string | null;
          category: ServiceCategory;
          name: string;
          code: string | null;
          unit_price: number;
          effective_from: string;
          archived_at: string | null;
          created_at: string;
          updated_at: string;
          created_by: string | null;
        };
        Insert: {
          id?: string;
          clinic_id: string;
          branch_id?: string | null;
          category?: ServiceCategory;
          name: string;
          code?: string | null;
          unit_price?: number;
          effective_from?: string;
          archived_at?: string | null;
          created_at?: string;
          updated_at?: string;
          created_by?: string | null;
        };
        Update: Partial<Database["public"]["Tables"]["service_prices"]["Insert"]>;
        Relationships: [];
      };
      invoice_source_links: {
        Row: {
          id: string;
          clinic_id: string;
          invoice_id: string;
          source: InvoiceSource;
          source_id: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          clinic_id: string;
          invoice_id: string;
          source: InvoiceSource;
          source_id: string;
          created_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["invoice_source_links"]["Insert"]>;
        Relationships: [];
      };
      billing_settings: {
        Row: {
          id: string;
          clinic_id: string;
          branch_id: string | null;
          khqr_merchant_name: string | null;
          khqr_merchant_account: string | null;
          khqr_merchant_city: string | null;
          currency: string;
          usd_to_khr_rate: number;
          tax_rate: number;
          invoice_due_days: number;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          clinic_id: string;
          branch_id?: string | null;
          khqr_merchant_name?: string | null;
          khqr_merchant_account?: string | null;
          khqr_merchant_city?: string | null;
          currency?: string;
          usd_to_khr_rate?: number;
          tax_rate?: number;
          invoice_due_days?: number;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["billing_settings"]["Insert"]>;
        Relationships: [];
      };
      lab_categories: {
        Row: {
          id: string;
          clinic_id: string;
          name: string;
          description: string | null;
          parent_id: string | null;
          default_price: number;
          is_active: boolean;
          created_at: string;
          updated_at: string;
          created_by: string | null;
        };
        Insert: {
          id?: string;
          clinic_id: string;
          name: string;
          description?: string | null;
          parent_id?: string | null;
          default_price?: number;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
          created_by?: string | null;
        };
        Update: Partial<Database["public"]["Tables"]["lab_categories"]["Insert"]>;
        Relationships: [];
      };
      lab_requests: {
        Row: {
          id: string;
          clinic_id: string;
          patient_id: string;
          doctor_id: string | null;
          category_id: string | null;
          medical_record_id: string | null;
          test_name: string;
          status: LabStatus;
          notes: string | null;
          branch_id: string | null;
          visit_id: string | null;
          requested_at: string;
          completed_at: string | null;
          created_at: string;
          updated_at: string;
          created_by: string | null;
          deleted_at: string | null;
        };
        Insert: {
          id?: string;
          clinic_id: string;
          patient_id: string;
          doctor_id?: string | null;
          category_id?: string | null;
          medical_record_id?: string | null;
          test_name: string;
          status?: LabStatus;
          notes?: string | null;
          branch_id?: string | null;
          visit_id?: string | null;
          requested_at?: string;
          completed_at?: string | null;
          created_at?: string;
          updated_at?: string;
          created_by?: string | null;
          deleted_at?: string | null;
        };
        Update: Partial<Database["public"]["Tables"]["lab_requests"]["Insert"]>;
        Relationships: [];
      };
      lab_results: {
        Row: {
          id: string;
          clinic_id: string;
          lab_request_id: string;
          result_value: string | null;
          unit: string | null;
          reference_range: string | null;
          result_text: string | null;
          file_path: string | null;
          file_name: string | null;
          result_at: string;
          created_at: string;
          created_by: string | null;
        };
        Insert: {
          id?: string;
          clinic_id: string;
          lab_request_id: string;
          result_value?: string | null;
          unit?: string | null;
          reference_range?: string | null;
          result_text?: string | null;
          file_path?: string | null;
          file_name?: string | null;
          result_at?: string;
          created_at?: string;
          created_by?: string | null;
        };
        Update: Partial<Database["public"]["Tables"]["lab_results"]["Insert"]>;
        Relationships: [];
      };
      imaging_categories: {
        Row: {
          id: string;
          clinic_id: string;
          parent_id: string | null;
          name: string;
          description: string | null;
          is_active: boolean;
          created_at: string;
          updated_at: string;
          created_by: string | null;
        };
        Insert: {
          id?: string;
          clinic_id: string;
          parent_id?: string | null;
          name: string;
          description?: string | null;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
          created_by?: string | null;
        };
        Update: Partial<Database["public"]["Tables"]["imaging_categories"]["Insert"]>;
        Relationships: [];
      };
      imaging_services: {
        Row: {
          id: string;
          clinic_id: string;
          category_id: string | null;
          name: string;
          code: string | null;
          modality: string | null;
          default_price: number;
          description: string | null;
          is_active: boolean;
          created_at: string;
          updated_at: string;
          created_by: string | null;
          deleted_at: string | null;
        };
        Insert: {
          id?: string;
          clinic_id: string;
          category_id?: string | null;
          name: string;
          code?: string | null;
          modality?: string | null;
          default_price?: number;
          description?: string | null;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
          created_by?: string | null;
          deleted_at?: string | null;
        };
        Update: Partial<Database["public"]["Tables"]["imaging_services"]["Insert"]>;
        Relationships: [];
      };
      imaging_requests: {
        Row: {
          id: string;
          clinic_id: string;
          patient_id: string;
          doctor_id: string | null;
          branch_id: string | null;
          visit_id: string | null;
          category_id: string | null;
          service_id: string | null;
          service_name: string;
          modality: string | null;
          status: ImagingStatus;
          notes: string | null;
          requested_at: string;
          scheduled_at: string | null;
          performed_at: string | null;
          reported_at: string | null;
          created_at: string;
          updated_at: string;
          created_by: string | null;
          deleted_at: string | null;
        };
        Insert: {
          id?: string;
          clinic_id: string;
          patient_id: string;
          doctor_id?: string | null;
          branch_id?: string | null;
          visit_id?: string | null;
          category_id?: string | null;
          service_id?: string | null;
          service_name: string;
          modality?: string | null;
          status?: ImagingStatus;
          notes?: string | null;
          requested_at?: string;
          scheduled_at?: string | null;
          performed_at?: string | null;
          reported_at?: string | null;
          created_at?: string;
          updated_at?: string;
          created_by?: string | null;
          deleted_at?: string | null;
        };
        Update: Partial<Database["public"]["Tables"]["imaging_requests"]["Insert"]>;
        Relationships: [];
      };
      imaging_results: {
        Row: {
          id: string;
          clinic_id: string;
          imaging_request_id: string;
          findings: string | null;
          impression: string | null;
          report_text: string | null;
          reported_by: string | null;
          result_at: string;
          created_at: string;
          updated_at: string;
          created_by: string | null;
        };
        Insert: {
          id?: string;
          clinic_id: string;
          imaging_request_id: string;
          findings?: string | null;
          impression?: string | null;
          report_text?: string | null;
          reported_by?: string | null;
          result_at?: string;
          created_at?: string;
          updated_at?: string;
          created_by?: string | null;
        };
        Update: Partial<Database["public"]["Tables"]["imaging_results"]["Insert"]>;
        Relationships: [];
      };
      imaging_files: {
        Row: {
          id: string;
          clinic_id: string;
          imaging_request_id: string;
          file_path: string;
          file_name: string | null;
          created_at: string;
          created_by: string | null;
        };
        Insert: {
          id?: string;
          clinic_id: string;
          imaging_request_id: string;
          file_path: string;
          file_name?: string | null;
          created_at?: string;
          created_by?: string | null;
        };
        Update: Partial<Database["public"]["Tables"]["imaging_files"]["Insert"]>;
        Relationships: [];
      };
      notifications: {
        Row: {
          id: string;
          clinic_id: string;
          channel: NotificationChannel;
          type: NotificationType;
          recipient: string;
          subject: string | null;
          body: string;
          status: NotificationStatus;
          error: string | null;
          patient_id: string | null;
          appointment_id: string | null;
          invoice_id: string | null;
          sent_at: string | null;
          scheduled_for: string | null;
          attempts: number;
          last_attempt_at: string | null;
          created_at: string;
          created_by: string | null;
        };
        Insert: {
          id?: string;
          clinic_id: string;
          channel: NotificationChannel;
          type?: NotificationType;
          recipient: string;
          subject?: string | null;
          body: string;
          status?: NotificationStatus;
          error?: string | null;
          patient_id?: string | null;
          appointment_id?: string | null;
          invoice_id?: string | null;
          sent_at?: string | null;
          scheduled_for?: string | null;
          attempts?: number;
          last_attempt_at?: string | null;
          created_at?: string;
          created_by?: string | null;
        };
        Update: Partial<Database["public"]["Tables"]["notifications"]["Insert"]>;
        Relationships: [];
      };
      notification_settings: {
        Row: {
          id: string;
          clinic_id: string;
          default_channel: NotificationChannel;
          appointment_reminder_enabled: boolean;
          appointment_lead_hours: number;
          payment_reminder_enabled: boolean;
          payment_overdue_days: number;
          follow_up_enabled: boolean;
          doctor_schedule_enabled: boolean;
          owner_alerts_enabled: boolean;
          owner_daily_summary_enabled: boolean;
          telegram_bot_token: string | null;
          telegram_bot_username: string | null;
          telegram_webhook_secret: string | null;
          telegram_link_secret: string | null;
          created_at: string;
          updated_at: string;
          created_by: string | null;
        };
        Insert: {
          id?: string;
          clinic_id: string;
          default_channel?: NotificationChannel;
          appointment_reminder_enabled?: boolean;
          appointment_lead_hours?: number;
          payment_reminder_enabled?: boolean;
          payment_overdue_days?: number;
          follow_up_enabled?: boolean;
          doctor_schedule_enabled?: boolean;
          owner_alerts_enabled?: boolean;
          owner_daily_summary_enabled?: boolean;
          telegram_bot_token?: string | null;
          telegram_bot_username?: string | null;
          telegram_webhook_secret?: string | null;
          telegram_link_secret?: string | null;
          created_at?: string;
          updated_at?: string;
          created_by?: string | null;
        };
        Update: Partial<Database["public"]["Tables"]["notification_settings"]["Insert"]>;
        Relationships: [];
      };
      notification_templates: {
        Row: {
          id: string;
          clinic_id: string;
          type: NotificationType;
          channel: NotificationChannel;
          subject: string | null;
          body: string;
          is_active: boolean;
          created_at: string;
          updated_at: string;
          created_by: string | null;
          deleted_at: string | null;
        };
        Insert: {
          id?: string;
          clinic_id: string;
          type: NotificationType;
          channel?: NotificationChannel;
          subject?: string | null;
          body: string;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
          created_by?: string | null;
          deleted_at?: string | null;
        };
        Update: Partial<Database["public"]["Tables"]["notification_templates"]["Insert"]>;
        Relationships: [];
      };
      prescriptions: {
        Row: {
          id: string;
          clinic_id: string;
          patient_id: string;
          doctor_id: string | null;
          medical_record_id: string | null;
          prescribed_at: string;
          notes: string | null;
          branch_id: string | null;
          visit_id: string | null;
          created_at: string;
          updated_at: string;
          created_by: string | null;
          deleted_at: string | null;
        };
        Insert: {
          id?: string;
          clinic_id: string;
          patient_id: string;
          doctor_id?: string | null;
          medical_record_id?: string | null;
          prescribed_at?: string;
          notes?: string | null;
          branch_id?: string | null;
          visit_id?: string | null;
          created_at?: string;
          updated_at?: string;
          created_by?: string | null;
          deleted_at?: string | null;
        };
        Update: Partial<Database["public"]["Tables"]["prescriptions"]["Insert"]>;
        Relationships: [];
      };
      prescription_items: {
        Row: {
          id: string;
          clinic_id: string;
          prescription_id: string;
          medicine_name: string;
          dosage: string | null;
          frequency: string | null;
          duration: string | null;
          timing: string | null;
          instructions: string | null;
          quantity: number | null;
          sort_order: number;
          created_at: string;
        };
        Insert: {
          id?: string;
          clinic_id: string;
          prescription_id: string;
          medicine_name: string;
          dosage?: string | null;
          frequency?: string | null;
          duration?: string | null;
          timing?: string | null;
          instructions?: string | null;
          quantity?: number | null;
          sort_order?: number;
          created_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["prescription_items"]["Insert"]>;
        Relationships: [];
      };
      audit_logs: {
        Row: {
          id: number;
          clinic_id: string | null;
          actor_user_id: string | null;
          action: "INSERT" | "UPDATE" | "DELETE";
          table_name: string;
          record_id: string | null;
          old_data: Json | null;
          new_data: Json | null;
          created_at: string;
        };
        Insert: never;
        Update: never;
        Relationships: [];
      };
      patient_visits: {
        Row: {
          id: string;
          clinic_id: string;
          patient_id: string;
          branch_id: string | null;
          doctor_id: string | null;
          appointment_id: string | null;
          visit_seq: number;
          visit_number: string;
          status: VisitStatus;
          visit_date: string;
          chief_complaint: string | null;
          notes: string | null;
          closed_at: string | null;
          created_at: string;
          updated_at: string;
          created_by: string | null;
          deleted_at: string | null;
        };
        Insert: {
          id?: string;
          clinic_id: string;
          patient_id: string;
          branch_id?: string | null;
          doctor_id?: string | null;
          appointment_id?: string | null;
          visit_seq?: number;
          visit_number?: string;
          status?: VisitStatus;
          visit_date?: string;
          chief_complaint?: string | null;
          notes?: string | null;
          closed_at?: string | null;
          created_at?: string;
          updated_at?: string;
          created_by?: string | null;
          deleted_at?: string | null;
        };
        Update: Partial<Database["public"]["Tables"]["patient_visits"]["Insert"]>;
        Relationships: [];
      };
      dismissed_medicine_names: {
        Row: {
          id: string;
          clinic_id: string;
          name: string;
          created_at: string;
          created_by: string | null;
        };
        Insert: {
          id?: string;
          clinic_id: string;
          name: string;
          created_at?: string;
          created_by?: string | null;
        };
        Update: Partial<Database["public"]["Tables"]["dismissed_medicine_names"]["Insert"]>;
        Relationships: [];
      };
      procedures: {
        Row: {
          id: string;
          clinic_id: string;
          category_id: string | null;
          name: string;
          code: string | null;
          default_price: number;
          description: string | null;
          is_active: boolean;
          created_at: string;
          updated_at: string;
          created_by: string | null;
          deleted_at: string | null;
        };
        Insert: {
          id?: string;
          clinic_id: string;
          category_id?: string | null;
          name: string;
          code?: string | null;
          default_price?: number;
          description?: string | null;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
          created_by?: string | null;
          deleted_at?: string | null;
        };
        Update: Partial<Database["public"]["Tables"]["procedures"]["Insert"]>;
        Relationships: [];
      };
      procedure_categories: {
        Row: {
          id: string;
          clinic_id: string;
          parent_id: string | null;
          name: string;
          description: string | null;
          is_active: boolean;
          created_at: string;
          updated_at: string;
          created_by: string | null;
        };
        Insert: {
          id?: string;
          clinic_id: string;
          parent_id?: string | null;
          name: string;
          description?: string | null;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
          created_by?: string | null;
        };
        Update: Partial<Database["public"]["Tables"]["procedure_categories"]["Insert"]>;
        Relationships: [];
      };
      procedure_orders: {
        Row: {
          id: string;
          clinic_id: string;
          patient_id: string;
          doctor_id: string | null;
          branch_id: string | null;
          visit_id: string | null;
          category_id: string | null;
          procedure_id: string | null;
          procedure_name: string;
          status: ProcedureStatus;
          quantity: number;
          price: number;
          notes: string | null;
          ordered_at: string;
          performed_at: string | null;
          completed_at: string | null;
          created_at: string;
          updated_at: string;
          created_by: string | null;
          deleted_at: string | null;
        };
        Insert: {
          id?: string;
          clinic_id: string;
          patient_id: string;
          doctor_id?: string | null;
          branch_id?: string | null;
          visit_id?: string | null;
          category_id?: string | null;
          procedure_id?: string | null;
          procedure_name: string;
          status?: ProcedureStatus;
          quantity?: number;
          price?: number;
          notes?: string | null;
          ordered_at?: string;
          performed_at?: string | null;
          completed_at?: string | null;
          created_at?: string;
          updated_at?: string;
          created_by?: string | null;
          deleted_at?: string | null;
        };
        Update: Partial<Database["public"]["Tables"]["procedure_orders"]["Insert"]>;
        Relationships: [];
      };
      procedure_records: {
        Row: {
          id: string;
          clinic_id: string;
          procedure_order_id: string;
          clinical_notes: string | null;
          outcome: string | null;
          performed_by: string | null;
          recorded_at: string;
          created_at: string;
          updated_at: string;
          created_by: string | null;
        };
        Insert: {
          id?: string;
          clinic_id: string;
          procedure_order_id: string;
          clinical_notes?: string | null;
          outcome?: string | null;
          performed_by?: string | null;
          recorded_at?: string;
          created_at?: string;
          updated_at?: string;
          created_by?: string | null;
        };
        Update: Partial<Database["public"]["Tables"]["procedure_records"]["Insert"]>;
        Relationships: [];
      };
      visit_procedures: {
        Row: {
          id: string;
          clinic_id: string;
          visit_id: string | null;
          patient_id: string;
          procedure_id: string | null;
          procedure_order_id: string | null;
          doctor_id: string | null;
          name: string;
          price: number;
          quantity: number;
          notes: string | null;
          performed_at: string;
          created_at: string;
          updated_at: string;
          created_by: string | null;
          deleted_at: string | null;
        };
        Insert: {
          id?: string;
          clinic_id: string;
          visit_id?: string | null;
          patient_id: string;
          procedure_id?: string | null;
          procedure_order_id?: string | null;
          doctor_id?: string | null;
          name: string;
          price?: number;
          quantity?: number;
          notes?: string | null;
          performed_at?: string;
          created_at?: string;
          updated_at?: string;
          created_by?: string | null;
          deleted_at?: string | null;
        };
        Update: Partial<Database["public"]["Tables"]["visit_procedures"]["Insert"]>;
        Relationships: [];
      };
      membership_plans: {
        Row: {
          id: string;
          clinic_id: string;
          name: string;
          price: number;
          benefit_type: BenefitType;
          benefit_value: number;
          duration_days: number | null;
          description: string | null;
          is_active: boolean;
          created_at: string;
          updated_at: string;
          created_by: string | null;
          deleted_at: string | null;
        };
        Insert: {
          id?: string;
          clinic_id: string;
          name: string;
          price?: number;
          benefit_type?: BenefitType;
          benefit_value?: number;
          duration_days?: number | null;
          description?: string | null;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
          created_by?: string | null;
          deleted_at?: string | null;
        };
        Update: Partial<Database["public"]["Tables"]["membership_plans"]["Insert"]>;
        Relationships: [];
      };
      patient_memberships: {
        Row: {
          id: string;
          clinic_id: string;
          patient_id: string;
          plan_id: string | null;
          status: PatientMembershipStatus;
          started_at: string;
          expires_at: string | null;
          created_at: string;
          updated_at: string;
          created_by: string | null;
          deleted_at: string | null;
        };
        Insert: {
          id?: string;
          clinic_id: string;
          patient_id: string;
          plan_id?: string | null;
          status?: PatientMembershipStatus;
          started_at?: string;
          expires_at?: string | null;
          created_at?: string;
          updated_at?: string;
          created_by?: string | null;
          deleted_at?: string | null;
        };
        Update: Partial<Database["public"]["Tables"]["patient_memberships"]["Insert"]>;
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: {
      current_clinic_id: { Args: Record<string, never>; Returns: string };
      current_user_role: { Args: Record<string, never>; Returns: string };
      is_super_admin: { Args: Record<string, never>; Returns: boolean };
      has_permission: { Args: { p_permission: string }; Returns: boolean };
    };
    Enums: {
      subscription_plan: SubscriptionPlan;
      subscription_status: SubscriptionStatus;
      clinic_status: ClinicStatus;
      membership_status: MembershipStatus;
      gender: Gender;
      blood_type: BloodType;
      marital_status: MaritalStatus;
      id_doc_type: IdDocType;
      contact_method: ContactMethod;
      employment_type: EmploymentType;
      timeline_event: TimelineEvent;
      record_status: RecordStatus;
      appointment_status: AppointmentStatus;
      inventory_reason: InventoryReason;
      invoice_status: InvoiceStatus;
      payment_method: PaymentMethod;
      payment_kind: PaymentKind;
      invoice_source: InvoiceSource;
      service_category: ServiceCategory;
      lab_status: LabStatus;
      imaging_status: ImagingStatus;
      procedure_status: ProcedureStatus;
      notification_channel: NotificationChannel;
      notification_status: NotificationStatus;
      notification_type: NotificationType;
    };
    CompositeTypes: Record<string, never>;
  };
}
