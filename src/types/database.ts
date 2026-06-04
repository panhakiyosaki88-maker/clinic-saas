/**
 * Database types for the foundation schema (migration 0001).
 *
 * Hand-maintained for now. Once the local Supabase stack is running, regenerate
 * the full, authoritative file with:
 *
 *   npm run db:types
 *
 * (= `supabase gen types typescript --local > src/types/database.ts`)
 *
 * Each subsequent module's migration should be followed by a regen so this file
 * stays in sync with the database.
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
export type InvoiceStatus = "unpaid" | "partially_paid" | "paid" | "cancelled";
export type PaymentMethod = "cash" | "bank_transfer" | "khqr";
export type LabStatus = "requested" | "collected" | "processing" | "completed" | "cancelled";
export type NotificationChannel = "email" | "telegram";
export type NotificationStatus = "pending" | "sent" | "failed" | "skipped";
export type NotificationType = "appointment_reminder" | "payment_reminder" | "follow_up" | "custom";
export type TimelineEvent =
  | "registered"
  | "note"
  | "appointment"
  | "visit"
  | "document"
  | "prescription"
  | "lab"
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
          owner_user_id: string | null;
          contact_email: string | null;
          contact_phone: string | null;
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
          owner_user_id?: string | null;
          contact_email?: string | null;
          contact_phone?: string | null;
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
          gender: Gender | null;
          date_of_birth: string | null;
          phone: string | null;
          email: string | null;
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
          gender?: Gender | null;
          date_of_birth?: string | null;
          phone?: string | null;
          email?: string | null;
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
          reference?: string | null;
          note?: string | null;
          paid_at?: string;
          created_at?: string;
          created_by?: string | null;
        };
        Update: Partial<Database["public"]["Tables"]["payments"]["Insert"]>;
        Relationships: [];
      };
      lab_categories: {
        Row: {
          id: string;
          clinic_id: string;
          name: string;
          description: string | null;
          parent_id: string | null;
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
          created_at?: string;
          created_by?: string | null;
        };
        Update: Partial<Database["public"]["Tables"]["notifications"]["Insert"]>;
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
      lab_status: LabStatus;
      notification_channel: NotificationChannel;
      notification_status: NotificationStatus;
      notification_type: NotificationType;
    };
    CompositeTypes: Record<string, never>;
  };
}
