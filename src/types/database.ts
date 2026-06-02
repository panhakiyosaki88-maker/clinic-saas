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
export type MembershipStatus = "active" | "invited" | "disabled";
export type Gender = "male" | "female" | "other";
export type RecordStatus = "draft" | "finalized";
export type TimelineEvent =
  | "registered"
  | "note"
  | "appointment"
  | "visit"
  | "document"
  | "prescription"
  | "lab"
  | "invoice";

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          email: string | null;
          full_name: string | null;
          avatar_url: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          email?: string | null;
          full_name?: string | null;
          avatar_url?: string | null;
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
      timeline_event: TimelineEvent;
      record_status: RecordStatus;
    };
    CompositeTypes: Record<string, never>;
  };
}
