export type Json =
    | string
    | number
    | boolean
    | null
    | { [key: string]: Json | undefined }
    | Json[];

export type Database = {
    // Allows to automatically instantiate createClient with right options
    // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
    __InternalSupabase: {
        PostgrestVersion: "13.0.5";
    };
    graphql_public: {
        Tables: {
            [_ in never]: never;
        };
        Views: {
            [_ in never]: never;
        };
        Functions: {
            graphql: {
                Args: {
                    extensions?: Json;
                    operationName?: string;
                    query?: string;
                    variables?: Json;
                };
                Returns: Json;
            };
        };
        Enums: {
            [_ in never]: never;
        };
        CompositeTypes: {
            [_ in never]: never;
        };
    };
    public: {
        Tables: {
            cvs: {
                Row: {
                    id: string;
                    user_id: string;
                    pdf_url: string;
                    original_score: number;
                    final_score: number;
                    job_title: string;
                    jobs_summary: string;
                    anonymized_cv_text: string | null;
                    created_at: string;
                };
                Insert: {
                    id?: string;
                    user_id: string;
                    pdf_url: string;
                    original_score: number;
                    final_score: number;
                    job_title: string;
                    jobs_summary: string;
                    anonymized_cv_text?: string | null;
                    created_at?: string;
                };
                Update: {
                    id?: string;
                    user_id?: string;
                    pdf_url?: string;
                    original_score?: number;
                    final_score?: number;
                    job_title?: string;
                    jobs_summary?: string;
                    anonymized_cv_text?: string | null;
                    created_at?: string;
                };
                Relationships: [
                    {
                        foreignKeyName: "cvs_user_id_fkey";
                        columns: ["user_id"];
                        isOneToOne: false;
                        referencedRelation: "profiles";
                        referencedColumns: ["id"];
                    }
                ];
            };
            profiles: {
                Row: {
                    achievements: string[] | null;
                    avatar_url: string | null;
                    birthday: string | null;
                    created_at: string | null;
                    deactivated_at: string | null;
                    education: string[] | null;
                    email: string | null;
                    experiences: string[] | null;
                    github_url: string | null;
                    id: string;
                    is_deactivated: boolean | null;
                    is_verified: boolean | null;
                    last_login: string | null;
                    linkedin_url: string | null;
                    location: string | null;
                    name: string | null;
                    organization: string | null;
                    profile_completion: number | null;
                    skills: string[] | null;
                    subscription:
                        | Database["public"]["Enums"]["subscription_plan"]
                        | null;
                    subscription_end_date: string | null;
                    targeted_role: string | null;
                    twitter_url: string | null;
                    updated_at: string | null;
                };
                Insert: {
                    achievements?: string[] | null;
                    avatar_url?: string | null;
                    birthday?: string | null;
                    created_at?: string | null;
                    deactivated_at?: string | null;
                    education?: string[] | null;
                    email?: string | null;
                    experiences?: string[] | null;
                    github_url?: string | null;
                    id: string;
                    is_deactivated?: boolean | null;
                    is_verified?: boolean | null;
                    last_login?: string | null;
                    linkedin_url?: string | null;
                    location?: string | null;
                    name?: string | null;
                    organization?: string | null;
                    profile_completion?: number | null;
                    skills?: string[] | null;
                    subscription?:
                        | Database["public"]["Enums"]["subscription_plan"]
                        | null;
                    subscription_end_date?: string | null;
                    targeted_role?: string | null;
                    twitter_url?: string | null;
                    updated_at?: string | null;
                };
                Update: {
                    achievements?: string[] | null;
                    avatar_url?: string | null;
                    birthday?: string | null;
                    created_at?: string | null;
                    deactivated_at?: string | null;
                    education?: string[] | null;
                    email?: string | null;
                    experiences?: string[] | null;
                    github_url?: string | null;
                    id?: string;
                    is_deactivated?: boolean | null;
                    is_verified?: boolean | null;
                    last_login?: string | null;
                    linkedin_url?: string | null;
                    location?: string | null;
                    name?: string | null;
                    organization?: string | null;
                    profile_completion?: number | null;
                    skills?: string[] | null;
                    subscription?:
                        | Database["public"]["Enums"]["subscription_plan"]
                        | null;
                    subscription_end_date?: string | null;
                    targeted_role?: string | null;
                    twitter_url?: string | null;
                    updated_at?: string | null;
                };
                Relationships: [];
            };
        };
        Views: {
            [_ in never]: never;
        };
        Functions: {
            calculate_profile_completion: {
                Args: { profile_id: string };
                Returns: number;
            };
        };
        Enums: {
            subscription_plan: "Starter" | "Achiever" | "Expert";
        };
        CompositeTypes: {
            [_ in never]: never;
        };
    };
};

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">;

type DefaultSchema = DatabaseWithoutInternals[Extract<
    keyof Database,
    "public"
>];

export type Tables<
    DefaultSchemaTableNameOrOptions extends
        | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
        | { schema: keyof DatabaseWithoutInternals },
    TableName extends DefaultSchemaTableNameOrOptions extends {
        schema: keyof DatabaseWithoutInternals;
    }
        ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
              DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
        : never = never
> = DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
}
    ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
          DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
          Row: infer R;
      }
        ? R
        : never
    : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
          DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
          DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
          Row: infer R;
      }
        ? R
        : never
    : never;

export type TablesInsert<
    DefaultSchemaTableNameOrOptions extends
        | keyof DefaultSchema["Tables"]
        | { schema: keyof DatabaseWithoutInternals },
    TableName extends DefaultSchemaTableNameOrOptions extends {
        schema: keyof DatabaseWithoutInternals;
    }
        ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
        : never = never
> = DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
}
    ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
          Insert: infer I;
      }
        ? I
        : never
    : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
          Insert: infer I;
      }
        ? I
        : never
    : never;

export type TablesUpdate<
    DefaultSchemaTableNameOrOptions extends
        | keyof DefaultSchema["Tables"]
        | { schema: keyof DatabaseWithoutInternals },
    TableName extends DefaultSchemaTableNameOrOptions extends {
        schema: keyof DatabaseWithoutInternals;
    }
        ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
        : never = never
> = DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
}
    ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
          Update: infer U;
      }
        ? U
        : never
    : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
          Update: infer U;
      }
        ? U
        : never
    : never;

export type Enums<
    DefaultSchemaEnumNameOrOptions extends
        | keyof DefaultSchema["Enums"]
        | { schema: keyof DatabaseWithoutInternals },
    EnumName extends DefaultSchemaEnumNameOrOptions extends {
        schema: keyof DatabaseWithoutInternals;
    }
        ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
        : never = never
> = DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
}
    ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
    : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never;

export type CompositeTypes<
    PublicCompositeTypeNameOrOptions extends
        | keyof DefaultSchema["CompositeTypes"]
        | { schema: keyof DatabaseWithoutInternals },
    CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
        schema: keyof DatabaseWithoutInternals;
    }
        ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
        : never = never
> = PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
}
    ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
    : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never;

export const Constants = {
    graphql_public: {
        Enums: {},
    },
    public: {
        Enums: {
            subscription_plan: ["Starter", "Achiever", "Expert"],
        },
    },
} as const;
