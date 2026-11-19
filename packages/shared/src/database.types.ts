export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.18"
  }
  graphql_public: {
    Tables: {
      [_ in never]: never
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      graphql: {
        Args: {
          extensions?: Json
          operationName?: string
          query?: string
          variables?: Json
        }
        Returns: Json
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
  public: {
    Tables: {
      answers: {
        Row: {
          answer: string
          based_on_answer_id: string | null
          category: string
          created_at: string
          id: string
          last_used_at: string | null
          question: string
          saved_from_application_id: string | null
          source: string
          updated_at: string
          user_id: string
        }
        Insert: {
          answer: string
          based_on_answer_id?: string | null
          category: string
          created_at?: string
          id?: string
          last_used_at?: string | null
          question: string
          saved_from_application_id?: string | null
          source: string
          updated_at?: string
          user_id?: string
        }
        Update: {
          answer?: string
          based_on_answer_id?: string | null
          category?: string
          created_at?: string
          id?: string
          last_used_at?: string | null
          question?: string
          saved_from_application_id?: string | null
          source?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "answers_based_on_owner_fk"
            columns: ["based_on_answer_id", "user_id"]
            isOneToOne: false
            referencedRelation: "answers"
            referencedColumns: ["id", "user_id"]
          },
          {
            foreignKeyName: "answers_saved_from_application_owner_fk"
            columns: ["saved_from_application_id", "user_id"]
            isOneToOne: false
            referencedRelation: "applications"
            referencedColumns: ["id", "user_id"]
          },
        ]
      }
      application_answers: {
        Row: {
          answer_id: string
          application_id: string
          created_at: string
          id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          answer_id: string
          application_id: string
          created_at?: string
          id?: string
          updated_at?: string
          user_id?: string
        }
        Update: {
          answer_id?: string
          application_id?: string
          created_at?: string
          id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "application_answers_answer_owner_fk"
            columns: ["answer_id", "user_id"]
            isOneToOne: false
            referencedRelation: "answers"
            referencedColumns: ["id", "user_id"]
          },
          {
            foreignKeyName: "application_answers_application_owner_fk"
            columns: ["application_id", "user_id"]
            isOneToOne: false
            referencedRelation: "applications"
            referencedColumns: ["id", "user_id"]
          },
        ]
      }
      applications: {
        Row: {
          application_url: string | null
          application_url_clean: string | null
          archived_at: string | null
          company: string
          created_at: string
          id: string
          job_description: string | null
          location: string | null
          notes: string | null
          offer_deadline: string | null
          offer_decision: string | null
          position: string
          posting_url: string | null
          posting_url_clean: string | null
          resume_id: string | null
          source: string | null
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          application_url?: string | null
          application_url_clean?: string | null
          archived_at?: string | null
          company: string
          created_at?: string
          id?: string
          job_description?: string | null
          location?: string | null
          notes?: string | null
          offer_deadline?: string | null
          offer_decision?: string | null
          position: string
          posting_url?: string | null
          posting_url_clean?: string | null
          resume_id?: string | null
          source?: string | null
          status?: string
          updated_at?: string
          user_id?: string
        }
        Update: {
          application_url?: string | null
          application_url_clean?: string | null
          archived_at?: string | null
          company?: string
          created_at?: string
          id?: string
          job_description?: string | null
          location?: string | null
          notes?: string | null
          offer_deadline?: string | null
          offer_decision?: string | null
          position?: string
          posting_url?: string | null
          posting_url_clean?: string | null
          resume_id?: string | null
          source?: string | null
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "applications_resume_owner_fk"
            columns: ["resume_id", "user_id"]
            isOneToOne: false
            referencedRelation: "resumes"
            referencedColumns: ["id", "user_id"]
          },
        ]
      }
      education: {
        Row: {
          created_at: string
          degree: string | null
          gpa: number | null
          graduation_date: string | null
          id: string
          major: string | null
          profile_id: string
          school: string
          sort_order: number
          start_date: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          degree?: string | null
          gpa?: number | null
          graduation_date?: string | null
          id?: string
          major?: string | null
          profile_id: string
          school: string
          sort_order?: number
          start_date?: string | null
          updated_at?: string
          user_id?: string
        }
        Update: {
          created_at?: string
          degree?: string | null
          gpa?: number | null
          graduation_date?: string | null
          id?: string
          major?: string | null
          profile_id?: string
          school?: string
          sort_order?: number
          start_date?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "education_profile_owner_fk"
            columns: ["profile_id", "user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id", "user_id"]
          },
        ]
      }
      interviews: {
        Row: {
          application_id: string
          created_at: string
          id: string
          interview_type: string
          interviewer: string | null
          notes: string | null
          outcome: string
          round: string
          scheduled_at: string
          updated_at: string
          user_id: string
        }
        Insert: {
          application_id: string
          created_at?: string
          id?: string
          interview_type: string
          interviewer?: string | null
          notes?: string | null
          outcome?: string
          round: string
          scheduled_at: string
          updated_at?: string
          user_id?: string
        }
        Update: {
          application_id?: string
          created_at?: string
          id?: string
          interview_type?: string
          interviewer?: string | null
          notes?: string | null
          outcome?: string
          round?: string
          scheduled_at?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "interviews_application_owner_fk"
            columns: ["application_id", "user_id"]
            isOneToOne: false
            referencedRelation: "applications"
            referencedColumns: ["id", "user_id"]
          },
        ]
      }
      jobs: {
        Row: {
          company: string
          created_at: string
          currently_work_here: boolean
          description: string | null
          end_date: string | null
          id: string
          job_title: string
          location: string | null
          profile_id: string
          sort_order: number
          start_date: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          company: string
          created_at?: string
          currently_work_here?: boolean
          description?: string | null
          end_date?: string | null
          id?: string
          job_title: string
          location?: string | null
          profile_id: string
          sort_order?: number
          start_date?: string | null
          updated_at?: string
          user_id?: string
        }
        Update: {
          company?: string
          created_at?: string
          currently_work_here?: boolean
          description?: string | null
          end_date?: string | null
          id?: string
          job_title?: string
          location?: string | null
          profile_id?: string
          sort_order?: number
          start_date?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "jobs_profile_owner_fk"
            columns: ["profile_id", "user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id", "user_id"]
          },
        ]
      }
      profiles: {
        Row: {
          address_city: string | null
          address_country: string | null
          address_state: string | null
          address_street: string | null
          address_zip: string | null
          authorized_to_work_us: boolean | null
          created_at: string
          earliest_start_date: string | null
          email: string | null
          first_name: string | null
          github_url: string | null
          id: string
          is_18_or_older: boolean | null
          last_name: string | null
          linkedin_url: string | null
          phone: string | null
          portfolio_url: string | null
          preferred_first_name: string | null
          preferred_work_setup: string | null
          requires_sponsorship: boolean | null
          salary_expectation: string | null
          updated_at: string
          user_id: string
          willing_to_relocate: boolean | null
        }
        Insert: {
          address_city?: string | null
          address_country?: string | null
          address_state?: string | null
          address_street?: string | null
          address_zip?: string | null
          authorized_to_work_us?: boolean | null
          created_at?: string
          earliest_start_date?: string | null
          email?: string | null
          first_name?: string | null
          github_url?: string | null
          id?: string
          is_18_or_older?: boolean | null
          last_name?: string | null
          linkedin_url?: string | null
          phone?: string | null
          portfolio_url?: string | null
          preferred_first_name?: string | null
          preferred_work_setup?: string | null
          requires_sponsorship?: boolean | null
          salary_expectation?: string | null
          updated_at?: string
          user_id?: string
          willing_to_relocate?: boolean | null
        }
        Update: {
          address_city?: string | null
          address_country?: string | null
          address_state?: string | null
          address_street?: string | null
          address_zip?: string | null
          authorized_to_work_us?: boolean | null
          created_at?: string
          earliest_start_date?: string | null
          email?: string | null
          first_name?: string | null
          github_url?: string | null
          id?: string
          is_18_or_older?: boolean | null
          last_name?: string | null
          linkedin_url?: string | null
          phone?: string | null
          portfolio_url?: string | null
          preferred_first_name?: string | null
          preferred_work_setup?: string | null
          requires_sponsorship?: boolean | null
          salary_expectation?: string | null
          updated_at?: string
          user_id?: string
          willing_to_relocate?: boolean | null
        }
        Relationships: []
      }
      projects: {
        Row: {
          created_at: string
          description: string | null
          end_date: string | null
          id: string
          profile_id: string
          project_link: string | null
          project_name: string
          role: string | null
          sort_order: number
          start_date: string | null
          technologies: string[]
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          end_date?: string | null
          id?: string
          profile_id: string
          project_link?: string | null
          project_name: string
          role?: string | null
          sort_order?: number
          start_date?: string | null
          technologies?: string[]
          updated_at?: string
          user_id?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          end_date?: string | null
          id?: string
          profile_id?: string
          project_link?: string | null
          project_name?: string
          role?: string | null
          sort_order?: number
          start_date?: string | null
          technologies?: string[]
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "projects_profile_owner_fk"
            columns: ["profile_id", "user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id", "user_id"]
          },
        ]
      }
      resumes: {
        Row: {
          archived_at: string | null
          created_at: string
          deleted_at: string | null
          file_size_bytes: number
          file_type: string
          id: string
          name: string
          storage_path: string
          updated_at: string
          user_id: string
        }
        Insert: {
          archived_at?: string | null
          created_at?: string
          deleted_at?: string | null
          file_size_bytes: number
          file_type: string
          id?: string
          name: string
          storage_path: string
          updated_at?: string
          user_id?: string
        }
        Update: {
          archived_at?: string | null
          created_at?: string
          deleted_at?: string | null
          file_size_bytes?: number
          file_type?: string
          id?: string
          name?: string
          storage_path?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      status_history: {
        Row: {
          application_id: string
          created_at: string
          id: string
          status: string
          status_date: string
          updated_at: string
          user_id: string
        }
        Insert: {
          application_id: string
          created_at?: string
          id?: string
          status: string
          status_date: string
          updated_at?: string
          user_id?: string
        }
        Update: {
          application_id?: string
          created_at?: string
          id?: string
          status?: string
          status_date?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "status_history_application_owner_fk"
            columns: ["application_id", "user_id"]
            isOneToOne: false
            referencedRelation: "applications"
            referencedColumns: ["id", "user_id"]
          },
        ]
      }
      user_settings: {
        Row: {
          created_at: string
          default_resume_id: string | null
          extension_last_connected_at: string | null
          hidden_board_columns: string[]
          id: string
          onboarding_checklist_hidden_at: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          default_resume_id?: string | null
          extension_last_connected_at?: string | null
          hidden_board_columns?: string[]
          id?: string
          onboarding_checklist_hidden_at?: string | null
          updated_at?: string
          user_id?: string
        }
        Update: {
          created_at?: string
          default_resume_id?: string | null
          extension_last_connected_at?: string | null
          hidden_board_columns?: string[]
          id?: string
          onboarding_checklist_hidden_at?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_settings_default_resume_fk"
            columns: ["default_resume_id", "user_id"]
            isOneToOne: false
            referencedRelation: "resumes"
            referencedColumns: ["id", "user_id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  graphql_public: {
    Enums: {},
  },
  public: {
    Enums: {},
  },
} as const
