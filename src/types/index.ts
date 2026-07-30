export type UserRole = "user" | "admin";
export type SessionType = "group" | "individual";
export type SessionStatus = "draft" | "published" | "completed";
export type BookingStatus = "pending" | "confirmed" | "cancelled" | "completed";
export type PaymentStatus =
  | "pending"
  | "paid"
  | "failed"
  | "pending_verification"
  | "refunded";
export type PaymentMethod = "paymob" | "instapay" | "vodafone_cash";
export type DiscountType = "percent" | "fixed";

export interface Badge {
  id: string;
  name: string;
  icon: string;
  earned_at: string;
}

// ─── Component-facing interfaces (with relation fields) ─────────────────────

export interface Profile {
  id: string;
  email: string;
  full_name: string | null;
  role: UserRole;
  avatar_url: string | null;
  phone: string | null;
  created_at: string;
}

export interface WorkshopOutlineItem {
  session: string;
  title: string;
  bullets: string[];
}

export interface Workshop {
  id: string;
  title_ar: string;
  title_en: string;
  description_ar: string;
  description_en: string;
  topic: string;
  image_url: string | null;
  outline_en: WorkshopOutlineItem[] | null;
  outline_ar: WorkshopOutlineItem[] | null;
  end_goals_en: string[] | null;
  end_goals_ar: string[] | null;
  target_audience_en: string | null;
  target_audience_ar: string | null;
  spots_available: number | null;
  created_by: string | null;
  created_at: string;
}

export interface Session {
  id: string;
  workshop_id: string;
  type: SessionType;
  price: number;
  capacity: number;
  starts_at: string;
  ends_at: string;
  location_or_link: string | null;
  status: SessionStatus;
  created_at: string;
  // relation joins (not DB columns)
  workshop?: Workshop;
}

export interface TimeSlot {
  id: string;
  session_id: string;
  starts_at: string;
  ends_at: string;
  booked_count: number;
  capacity: number;
}

export interface Booking {
  id: string;
  user_id: string;
  session_id: string;
  time_slot_id: string | null;
  status: BookingStatus;
  created_at: string;
  // relation joins
  session?: Session;
  time_slot?: TimeSlot;
  user?: Profile;
  payment?: Payment;
}

export interface Payment {
  id: string;
  booking_id: string;
  user_id: string;
  amount: number;
  currency: string;
  method: PaymentMethod;
  gateway_txn_id: string | null;
  proof_url: string | null;
  status: PaymentStatus;
  created_at: string;
}

export interface DiscountCode {
  id: string;
  code: string;
  type: DiscountType;
  value: number;
  max_uses: number | null;
  used_count: number;
  expires_at: string | null;
  is_active: boolean;
}

export interface Announcement {
  id: string;
  title_ar: string;
  title_en: string;
  body_ar: string;
  body_en: string;
  is_active: boolean;
  created_at: string;
}

export interface Vlog {
  id: string;
  title_ar: string;
  title_en: string;
  description_ar: string;
  description_en: string;
  video_url: string;
  thumbnail_url: string | null;
  created_at: string;
}

export interface SessionMaterial {
  id: string;
  booking_id: string;
  session_id: string;
  title_ar: string;
  title_en: string;
  content_ar: string | null;
  content_en: string | null;
  file_url: string | null;
  created_at: string;
}

export interface RoadmapProgress {
  id: string;
  user_id: string;
  xp: number;
  level: number;
  completed_count: number;
  badges: Badge[];
  created_at: string;
}

// ─── Skills Layer types ────────────────────────────────────────────────────────
export type { Skill, ClientSkill, ClientSkillHistory, RoadmapMilestone, SessionReflection, SessionReflectionSkill, SkillLevel, SkillLevelSource, MilestoneStatus, AssessmentEligibility, EligibilityResult } from "@/lib/skills/types";

// ─── Supabase Database type (must match GenericSchema / GenericTable exactly) ─

export type Database = {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          email: string;
          full_name: string | null;
          role: string;
          avatar_url: string | null;
          phone: string | null;
          created_at: string;
        };
        Insert: {
          id: string;
          email: string;
          full_name?: string | null;
          role?: string;
          avatar_url?: string | null;
          phone?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          email?: string;
          full_name?: string | null;
          role?: string;
          avatar_url?: string | null;
          phone?: string | null;
          created_at?: string;
        };
        Relationships: [];
      };
      workshops: {
        Row: {
          id: string;
          title_ar: string;
          title_en: string;
          description_ar: string;
          description_en: string;
          topic: string;
          image_url: string | null;
          outline_en: WorkshopOutlineItem[] | null;
          outline_ar: WorkshopOutlineItem[] | null;
          end_goals_en: string[] | null;
          end_goals_ar: string[] | null;
          target_audience_en: string | null;
          target_audience_ar: string | null;
          spots_available: number | null;
          created_by: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          title_ar: string;
          title_en: string;
          description_ar?: string;
          description_en?: string;
          topic: string;
          image_url?: string | null;
          outline_en?: WorkshopOutlineItem[] | null;
          outline_ar?: WorkshopOutlineItem[] | null;
          end_goals_en?: string[] | null;
          end_goals_ar?: string[] | null;
          target_audience_en?: string | null;
          target_audience_ar?: string | null;
          spots_available?: number | null;
          created_by?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          title_ar?: string;
          title_en?: string;
          description_ar?: string;
          description_en?: string;
          topic?: string;
          image_url?: string | null;
          outline_en?: WorkshopOutlineItem[] | null;
          outline_ar?: WorkshopOutlineItem[] | null;
          end_goals_en?: string[] | null;
          end_goals_ar?: string[] | null;
          target_audience_en?: string | null;
          target_audience_ar?: string | null;
          spots_available?: number | null;
          created_by?: string | null;
          created_at?: string;
        };
        Relationships: [];
      };
      sessions: {
        Row: {
          id: string;
          workshop_id: string;
          type: string;
          price: number;
          capacity: number;
          starts_at: string;
          ends_at: string;
          location_or_link: string | null;
          status: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          workshop_id: string;
          type: string;
          price?: number;
          capacity?: number;
          starts_at: string;
          ends_at: string;
          location_or_link?: string | null;
          status?: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          workshop_id?: string;
          type?: string;
          price?: number;
          capacity?: number;
          starts_at?: string;
          ends_at?: string;
          location_or_link?: string | null;
          status?: string;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "sessions_workshop_id_fkey";
            columns: ["workshop_id"];
            isOneToOne: false;
            referencedRelation: "workshops";
            referencedColumns: ["id"];
          }
        ];
      };
      time_slots: {
        Row: {
          id: string;
          session_id: string;
          starts_at: string;
          ends_at: string;
          booked_count: number;
          capacity: number;
        };
        Insert: {
          id?: string;
          session_id: string;
          starts_at: string;
          ends_at: string;
          booked_count?: number;
          capacity?: number;
        };
        Update: {
          id?: string;
          session_id?: string;
          starts_at?: string;
          ends_at?: string;
          booked_count?: number;
          capacity?: number;
        };
        Relationships: [
          {
            foreignKeyName: "time_slots_session_id_fkey";
            columns: ["session_id"];
            isOneToOne: false;
            referencedRelation: "sessions";
            referencedColumns: ["id"];
          }
        ];
      };
      bookings: {
        Row: {
          id: string;
          user_id: string;
          session_id: string;
          time_slot_id: string | null;
          status: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          session_id: string;
          time_slot_id?: string | null;
          status?: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          session_id?: string;
          time_slot_id?: string | null;
          status?: string;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "bookings_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "bookings_session_id_fkey";
            columns: ["session_id"];
            isOneToOne: false;
            referencedRelation: "sessions";
            referencedColumns: ["id"];
          }
        ];
      };
      payments: {
        Row: {
          id: string;
          booking_id: string;
          user_id: string;
          amount: number;
          currency: string;
          method: string;
          gateway_txn_id: string | null;
          proof_url: string | null;
          status: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          booking_id: string;
          user_id: string;
          amount: number;
          currency?: string;
          method: string;
          gateway_txn_id?: string | null;
          proof_url?: string | null;
          status?: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          booking_id?: string;
          user_id?: string;
          amount?: number;
          currency?: string;
          method?: string;
          gateway_txn_id?: string | null;
          proof_url?: string | null;
          status?: string;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "payments_booking_id_fkey";
            columns: ["booking_id"];
            isOneToOne: false;
            referencedRelation: "bookings";
            referencedColumns: ["id"];
          }
        ];
      };
      discount_codes: {
        Row: {
          id: string;
          code: string;
          type: string;
          value: number;
          max_uses: number | null;
          used_count: number;
          expires_at: string | null;
          is_active: boolean;
        };
        Insert: {
          id?: string;
          code: string;
          type: string;
          value: number;
          max_uses?: number | null;
          used_count?: number;
          expires_at?: string | null;
          is_active?: boolean;
        };
        Update: {
          id?: string;
          code?: string;
          type?: string;
          value?: number;
          max_uses?: number | null;
          used_count?: number;
          expires_at?: string | null;
          is_active?: boolean;
        };
        Relationships: [];
      };
      announcements: {
        Row: {
          id: string;
          title_ar: string;
          title_en: string;
          body_ar: string;
          body_en: string;
          is_active: boolean;
          created_at: string;
        };
        Insert: {
          id?: string;
          title_ar: string;
          title_en: string;
          body_ar: string;
          body_en: string;
          is_active?: boolean;
          created_at?: string;
        };
        Update: {
          id?: string;
          title_ar?: string;
          title_en?: string;
          body_ar?: string;
          body_en?: string;
          is_active?: boolean;
          created_at?: string;
        };
        Relationships: [];
      };
      vlogs: {
        Row: {
          id: string;
          title_ar: string;
          title_en: string;
          description_ar: string;
          description_en: string;
          video_url: string;
          thumbnail_url: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          title_ar: string;
          title_en: string;
          description_ar?: string;
          description_en?: string;
          video_url: string;
          thumbnail_url?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          title_ar?: string;
          title_en?: string;
          description_ar?: string;
          description_en?: string;
          video_url?: string;
          thumbnail_url?: string | null;
          created_at?: string;
        };
        Relationships: [];
      };
      session_materials: {
        Row: {
          id: string;
          booking_id: string;
          session_id: string;
          title_ar: string;
          title_en: string;
          content_ar: string | null;
          content_en: string | null;
          file_url: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          booking_id: string;
          session_id: string;
          title_ar: string;
          title_en: string;
          content_ar?: string | null;
          content_en?: string | null;
          file_url?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          booking_id?: string;
          session_id?: string;
          title_ar?: string;
          title_en?: string;
          content_ar?: string | null;
          content_en?: string | null;
          file_url?: string | null;
          created_at?: string;
        };
        Relationships: [];
      };
      roadmap_progress: {
        Row: {
          id: string;
          user_id: string;
          xp: number;
          level: number;
          completed_count: number;
          badges: Badge[];
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          xp?: number;
          level?: number;
          completed_count?: number;
          badges?: Badge[];
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          xp?: number;
          level?: number;
          completed_count?: number;
          badges?: Badge[];
          created_at?: string;
        };
        Relationships: [];
      };
      assessments: {
        Row: {
          id: string;
          client_id: string | null;
          locale: string;
          completed_at: string | null;
          dimension_scores: Record<string, number> | null;
          happiness_score: number | null;
          recommended_type: string | null;
          recommended_workshop_id: string | null;
          result_snapshot: Record<string, unknown> | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          client_id?: string | null;
          locale?: string;
          completed_at?: string | null;
          dimension_scores?: Record<string, number> | null;
          happiness_score?: number | null;
          recommended_type?: string | null;
          recommended_workshop_id?: string | null;
          result_snapshot?: Record<string, unknown> | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          client_id?: string | null;
          locale?: string;
          completed_at?: string | null;
          dimension_scores?: Record<string, number> | null;
          happiness_score?: number | null;
          recommended_type?: string | null;
          recommended_workshop_id?: string | null;
          result_snapshot?: Record<string, unknown> | null;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "assessments_client_id_fkey";
            columns: ["client_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          }
        ];
      };
      skills: {
        Row: {
          id: string;
          dimension: string;
          name_ar: string;
          name_en: string;
          description_ar: string;
          description_en: string;
          is_active: boolean;
          sort_order: number;
          created_at: string;
        };
        Insert: {
          id?: string;
          dimension: string;
          name_ar: string;
          name_en: string;
          description_ar?: string;
          description_en?: string;
          is_active?: boolean;
          sort_order?: number;
          created_at?: string;
        };
        Update: {
          id?: string;
          dimension?: string;
          name_ar?: string;
          name_en?: string;
          description_ar?: string;
          description_en?: string;
          is_active?: boolean;
          sort_order?: number;
          created_at?: string;
        };
        Relationships: [];
      };
      client_skills: {
        Row: {
          id: string;
          client_id: string;
          skill_id: string;
          self_level: number | null;
          mentor_level: number | null;
          combined_level: number | null;
          last_self_at: string | null;
          last_mentor_at: string | null;
          updated_at: string;
        };
        Insert: {
          id?: string;
          client_id: string;
          skill_id: string;
          self_level?: number | null;
          mentor_level?: number | null;
          combined_level?: number | null;
          last_self_at?: string | null;
          last_mentor_at?: string | null;
          updated_at?: string;
        };
        Update: {
          id?: string;
          client_id?: string;
          skill_id?: string;
          self_level?: number | null;
          mentor_level?: number | null;
          combined_level?: number | null;
          last_self_at?: string | null;
          last_mentor_at?: string | null;
          updated_at?: string;
        };
        Relationships: [];
      };
      client_skill_history: {
        Row: {
          id: string;
          client_id: string;
          skill_id: string;
          source: string;
          level_type: string;
          value: number;
          assessment_id: string | null;
          booking_id: string | null;
          notes: string | null;
          recorded_at: string;
        };
        Insert: {
          id?: string;
          client_id: string;
          skill_id: string;
          source: string;
          level_type: string;
          value: number;
          assessment_id?: string | null;
          booking_id?: string | null;
          notes?: string | null;
          recorded_at?: string;
        };
        Update: {
          id?: string;
          client_id?: string;
          skill_id?: string;
          source?: string;
          level_type?: string;
          value?: number;
          assessment_id?: string | null;
          booking_id?: string | null;
          notes?: string | null;
          recorded_at?: string;
        };
        Relationships: [];
      };
      workshop_skills: {
        Row: { workshop_id: string; skill_id: string };
        Insert: { workshop_id: string; skill_id: string };
        Update: { workshop_id?: string; skill_id?: string };
        Relationships: [];
      };
      roadmap_milestones: {
        Row: {
          id: string;
          client_id: string;
          skill_id: string;
          target_level: number;
          recommended_workshop_id: string | null;
          recommended_session_type: string | null;
          title_ar: string;
          title_en: string;
          status: string;
          sort_order: number;
          assessment_id: string | null;
          completed_at: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          client_id: string;
          skill_id: string;
          target_level: number;
          recommended_workshop_id?: string | null;
          recommended_session_type?: string | null;
          title_ar: string;
          title_en: string;
          status?: string;
          sort_order?: number;
          assessment_id?: string | null;
          completed_at?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          client_id?: string;
          skill_id?: string;
          target_level?: number;
          recommended_workshop_id?: string | null;
          recommended_session_type?: string | null;
          title_ar?: string;
          title_en?: string;
          status?: string;
          sort_order?: number;
          assessment_id?: string | null;
          completed_at?: string | null;
          created_at?: string;
        };
        Relationships: [];
      };
      session_reflections: {
        Row: {
          id: string;
          booking_id: string;
          client_id: string;
          mentor_id: string;
          private_notes: string | null;
          encouragement_ar: string | null;
          encouragement_en: string | null;
          submitted_at: string;
        };
        Insert: {
          id?: string;
          booking_id: string;
          client_id: string;
          mentor_id: string;
          private_notes?: string | null;
          encouragement_ar?: string | null;
          encouragement_en?: string | null;
          submitted_at?: string;
        };
        Update: {
          id?: string;
          booking_id?: string;
          client_id?: string;
          mentor_id?: string;
          private_notes?: string | null;
          encouragement_ar?: string | null;
          encouragement_en?: string | null;
          submitted_at?: string;
        };
        Relationships: [];
      };
      session_reflection_skills: {
        Row: {
          id: string;
          reflection_id: string;
          skill_id: string;
          mentor_level: number;
        };
        Insert: {
          id?: string;
          reflection_id: string;
          skill_id: string;
          mentor_level: number;
        };
        Update: {
          id?: string;
          reflection_id?: string;
          skill_id?: string;
          mentor_level?: number;
        };
        Relationships: [];
      };
      session_reflection_milestones: {
        Row: { reflection_id: string; milestone_id: string };
        Insert: { reflection_id: string; milestone_id: string };
        Update: { reflection_id?: string; milestone_id?: string };
        Relationships: [];
      };
      skill_assessments: {
        Row: {
          id: string;
          client_id: string;
          created_at: string;
          [key: string]: unknown;
        };
        Insert: {
          id?: string;
          client_id: string;
          created_at?: string;
          [key: string]: unknown;
        };
        Update: {
          id?: string;
          client_id?: string;
          [key: string]: unknown;
        };
        Relationships: [
          {
            foreignKeyName: "skill_assessments_client_id_fkey";
            columns: ["client_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          }
        ];
      };
      skill_assessment_responses: {
        Row: {
          id: string;
          assessment_id: string;
          skill_id: string;
          created_at: string;
          [key: string]: unknown;
        };
        Insert: {
          id?: string;
          assessment_id: string;
          skill_id: string;
          created_at?: string;
          [key: string]: unknown;
        };
        Update: {
          id?: string;
          assessment_id?: string;
          skill_id?: string;
          [key: string]: unknown;
        };
        Relationships: [];
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      [_ in never]: never;
    };
    Enums: {
      [_ in never]: never;
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
};
