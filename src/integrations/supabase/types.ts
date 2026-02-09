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
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      alert_rules: {
        Row: {
          created_at: string
          enabled: boolean
          id: string
          organization_id: string
          threshold_hours: number
          type: Database["public"]["Enums"]["alert_type"]
        }
        Insert: {
          created_at?: string
          enabled?: boolean
          id?: string
          organization_id: string
          threshold_hours?: number
          type: Database["public"]["Enums"]["alert_type"]
        }
        Update: {
          created_at?: string
          enabled?: boolean
          id?: string
          organization_id?: string
          threshold_hours?: number
          type?: Database["public"]["Enums"]["alert_type"]
        }
        Relationships: [
          {
            foreignKeyName: "alert_rules_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      alerts: {
        Row: {
          created_at: string
          id: string
          last_notified_at: string | null
          organization_id: string
          pull_request_id: string
          resolved_at: string | null
          severity: Database["public"]["Enums"]["alert_severity"]
          status: Database["public"]["Enums"]["alert_status"]
          type: Database["public"]["Enums"]["alert_type"]
        }
        Insert: {
          created_at?: string
          id?: string
          last_notified_at?: string | null
          organization_id: string
          pull_request_id: string
          resolved_at?: string | null
          severity?: Database["public"]["Enums"]["alert_severity"]
          status?: Database["public"]["Enums"]["alert_status"]
          type: Database["public"]["Enums"]["alert_type"]
        }
        Update: {
          created_at?: string
          id?: string
          last_notified_at?: string | null
          organization_id?: string
          pull_request_id?: string
          resolved_at?: string | null
          severity?: Database["public"]["Enums"]["alert_severity"]
          status?: Database["public"]["Enums"]["alert_status"]
          type?: Database["public"]["Enums"]["alert_type"]
        }
        Relationships: [
          {
            foreignKeyName: "alerts_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "alerts_pull_request_id_fkey"
            columns: ["pull_request_id"]
            isOneToOne: false
            referencedRelation: "pull_requests"
            referencedColumns: ["id"]
          },
        ]
      }
      audit_logs: {
        Row: {
          action: string
          created_at: string
          id: string
          ip_address: string | null
          organization_id: string
          user_id: string
        }
        Insert: {
          action: string
          created_at?: string
          id?: string
          ip_address?: string | null
          organization_id: string
          user_id: string
        }
        Update: {
          action?: string
          created_at?: string
          id?: string
          ip_address?: string | null
          organization_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "audit_logs_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      builds: {
        Row: {
          commit_sha: string
          created_at: string
          finished_at: string | null
          id: string
          pull_request_id: string
          started_at: string
          status: Database["public"]["Enums"]["build_status"]
        }
        Insert: {
          commit_sha: string
          created_at?: string
          finished_at?: string | null
          id?: string
          pull_request_id: string
          started_at?: string
          status?: Database["public"]["Enums"]["build_status"]
        }
        Update: {
          commit_sha?: string
          created_at?: string
          finished_at?: string | null
          id?: string
          pull_request_id?: string
          started_at?: string
          status?: Database["public"]["Enums"]["build_status"]
        }
        Relationships: [
          {
            foreignKeyName: "builds_pull_request_id_fkey"
            columns: ["pull_request_id"]
            isOneToOne: false
            referencedRelation: "pull_requests"
            referencedColumns: ["id"]
          },
        ]
      }
      integration_installations: {
        Row: {
          created_at: string
          external_installation_id: string
          id: string
          integration_id: string
          metadata: Json | null
        }
        Insert: {
          created_at?: string
          external_installation_id: string
          id?: string
          integration_id: string
          metadata?: Json | null
        }
        Update: {
          created_at?: string
          external_installation_id?: string
          id?: string
          integration_id?: string
          metadata?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "integration_installations_integration_id_fkey"
            columns: ["integration_id"]
            isOneToOne: false
            referencedRelation: "integrations"
            referencedColumns: ["id"]
          },
        ]
      }
      integrations: {
        Row: {
          access_token: string
          created_at: string
          expires_at: string | null
          external_account_id: string | null
          id: string
          organization_id: string | null
          provider: string
          refresh_token: string | null
          scopes: string | null
          status: Database["public"]["Enums"]["integration_status"]
          type: Database["public"]["Enums"]["integration_type"] | null
          updated_at: string
          user_id: string
        }
        Insert: {
          access_token: string
          created_at?: string
          expires_at?: string | null
          external_account_id?: string | null
          id?: string
          organization_id?: string | null
          provider: string
          refresh_token?: string | null
          scopes?: string | null
          status?: Database["public"]["Enums"]["integration_status"]
          type?: Database["public"]["Enums"]["integration_type"] | null
          updated_at?: string
          user_id: string
        }
        Update: {
          access_token?: string
          created_at?: string
          expires_at?: string | null
          external_account_id?: string | null
          id?: string
          organization_id?: string | null
          provider?: string
          refresh_token?: string | null
          scopes?: string | null
          status?: Database["public"]["Enums"]["integration_status"]
          type?: Database["public"]["Enums"]["integration_type"] | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "integrations_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      jira_projects: {
        Row: {
          created_at: string
          id: string
          jira_project_key: string
          name: string
          organization_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          jira_project_key: string
          name: string
          organization_id: string
        }
        Update: {
          created_at?: string
          id?: string
          jira_project_key?: string
          name?: string
          organization_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "jira_projects_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications_log: {
        Row: {
          alert_id: string
          channel: string
          id: string
          sent_at: string
          status: Database["public"]["Enums"]["notification_status"]
        }
        Insert: {
          alert_id: string
          channel?: string
          id?: string
          sent_at?: string
          status?: Database["public"]["Enums"]["notification_status"]
        }
        Update: {
          alert_id?: string
          channel?: string
          id?: string
          sent_at?: string
          status?: Database["public"]["Enums"]["notification_status"]
        }
        Relationships: [
          {
            foreignKeyName: "notifications_log_alert_id_fkey"
            columns: ["alert_id"]
            isOneToOne: false
            referencedRelation: "alerts"
            referencedColumns: ["id"]
          },
        ]
      }
      oauth_states: {
        Row: {
          created_at: string
          expires_at: string
          id: string
          organization_id: string
          provider: string
          state_token: string
        }
        Insert: {
          created_at?: string
          expires_at: string
          id?: string
          organization_id: string
          provider: string
          state_token: string
        }
        Update: {
          created_at?: string
          expires_at?: string
          id?: string
          organization_id?: string
          provider?: string
          state_token?: string
        }
        Relationships: [
          {
            foreignKeyName: "oauth_states_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      organizations: {
        Row: {
          created_at: string
          id: string
          name: string
          timezone: string
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
          timezone?: string
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
          timezone?: string
        }
        Relationships: []
      }
      pr_events: {
        Row: {
          created_at: string
          id: string
          pull_request_id: string
          type: Database["public"]["Enums"]["pr_event_type"]
        }
        Insert: {
          created_at?: string
          id?: string
          pull_request_id: string
          type: Database["public"]["Enums"]["pr_event_type"]
        }
        Update: {
          created_at?: string
          id?: string
          pull_request_id?: string
          type?: Database["public"]["Enums"]["pr_event_type"]
        }
        Relationships: [
          {
            foreignKeyName: "pr_events_pull_request_id_fkey"
            columns: ["pull_request_id"]
            isOneToOne: false
            referencedRelation: "pull_requests"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar: string
          created_at: string
          email: string
          id: string
          name: string
          organization_id: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          avatar?: string
          created_at?: string
          email: string
          id?: string
          name: string
          organization_id?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          avatar?: string
          created_at?: string
          email?: string
          id?: string
          name?: string
          organization_id?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "profiles_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      pull_requests: {
        Row: {
          approvals_count: number
          author_id: string | null
          closed_at: string | null
          created_at: string
          github_pr_id: string
          id: string
          is_blocked: boolean
          jira_issue_key: string | null
          last_activity_at: string
          last_notified_at: string | null
          merged_at: string | null
          organization_id: string
          ready_for_merge: boolean
          repository_id: string
          status: Database["public"]["Enums"]["pr_status"]
          title: string
        }
        Insert: {
          approvals_count?: number
          author_id?: string | null
          closed_at?: string | null
          created_at?: string
          github_pr_id: string
          id?: string
          is_blocked?: boolean
          jira_issue_key?: string | null
          last_activity_at?: string
          last_notified_at?: string | null
          merged_at?: string | null
          organization_id: string
          ready_for_merge?: boolean
          repository_id: string
          status?: Database["public"]["Enums"]["pr_status"]
          title: string
        }
        Update: {
          approvals_count?: number
          author_id?: string | null
          closed_at?: string | null
          created_at?: string
          github_pr_id?: string
          id?: string
          is_blocked?: boolean
          jira_issue_key?: string | null
          last_activity_at?: string
          last_notified_at?: string | null
          merged_at?: string | null
          organization_id?: string
          ready_for_merge?: boolean
          repository_id?: string
          status?: Database["public"]["Enums"]["pr_status"]
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "pull_requests_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pull_requests_repository_id_fkey"
            columns: ["repository_id"]
            isOneToOne: false
            referencedRelation: "repositories"
            referencedColumns: ["id"]
          },
        ]
      }
      repositories: {
        Row: {
          active: boolean
          created_at: string
          github_repo_id: string
          id: string
          name: string
          organization_id: string
        }
        Insert: {
          active?: boolean
          created_at?: string
          github_repo_id: string
          id?: string
          name: string
          organization_id: string
        }
        Update: {
          active?: boolean
          created_at?: string
          github_repo_id?: string
          id?: string
          name?: string
          organization_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "repositories_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      slack_channels: {
        Row: {
          channel_id: string
          channel_name: string
          created_at: string
          id: string
          integration_id: string
          is_default: boolean
        }
        Insert: {
          channel_id: string
          channel_name: string
          created_at?: string
          id?: string
          integration_id: string
          is_default?: boolean
        }
        Update: {
          channel_id?: string
          channel_name?: string
          created_at?: string
          id?: string
          integration_id?: string
          is_default?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "slack_channels_integration_id_fkey"
            columns: ["integration_id"]
            isOneToOne: false
            referencedRelation: "integrations"
            referencedColumns: ["id"]
          },
        ]
      }
      user_invitations: {
        Row: {
          created_at: string
          email: string
          expires_at: string
          id: string
          invited_by: string
          organization_id: string
          role: Database["public"]["Enums"]["app_role"]
          status: Database["public"]["Enums"]["invitation_status"]
          token: string
        }
        Insert: {
          created_at?: string
          email: string
          expires_at: string
          id?: string
          invited_by: string
          organization_id: string
          role?: Database["public"]["Enums"]["app_role"]
          status?: Database["public"]["Enums"]["invitation_status"]
          token: string
        }
        Update: {
          created_at?: string
          email?: string
          expires_at?: string
          id?: string
          invited_by?: string
          organization_id?: string
          role?: Database["public"]["Enums"]["app_role"]
          status?: Database["public"]["Enums"]["invitation_status"]
          token?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_invitations_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      user_notification_preferences: {
        Row: {
          created_at: string
          notify_build_failed: boolean
          notify_pr_inactive: boolean
          notify_pr_no_task: boolean
          user_id: string
        }
        Insert: {
          created_at?: string
          notify_build_failed?: boolean
          notify_pr_inactive?: boolean
          notify_pr_no_task?: boolean
          user_id: string
        }
        Update: {
          created_at?: string
          notify_build_failed?: boolean
          notify_pr_inactive?: boolean
          notify_pr_no_task?: boolean
          user_id?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      user_org_id: { Args: { _user_id: string }; Returns: string }
    }
    Enums: {
      alert_severity: "NORMAL" | "CRITICAL"
      alert_status: "OPEN" | "RESOLVED"
      alert_type:
        | "PR_INACTIVE"
        | "PR_APPROVED_NO_MERGE"
        | "BUILD_FAILED"
        | "NO_JIRA_TASK"
      app_role: "admin" | "lead" | "developer"
      build_status: "SUCCESS" | "FAILED" | "RUNNING"
      integration_status: "CONNECTED" | "ERROR"
      integration_type: "GITHUB" | "JIRA" | "SLACK"
      invitation_status: "PENDING" | "ACCEPTED" | "EXPIRED"
      notification_status: "SENT" | "FAILED"
      pr_event_type:
        | "OPENED"
        | "COMMIT"
        | "REVIEW"
        | "APPROVED"
        | "BUILD_SUCCESS"
        | "BUILD_FAILED"
        | "MERGED"
      pr_status: "OPEN" | "MERGED" | "CLOSED"
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
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
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
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
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
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
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
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
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
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      alert_severity: ["NORMAL", "CRITICAL"],
      alert_status: ["OPEN", "RESOLVED"],
      alert_type: [
        "PR_INACTIVE",
        "PR_APPROVED_NO_MERGE",
        "BUILD_FAILED",
        "NO_JIRA_TASK",
      ],
      app_role: ["admin", "lead", "developer"],
      build_status: ["SUCCESS", "FAILED", "RUNNING"],
      integration_status: ["CONNECTED", "ERROR"],
      integration_type: ["GITHUB", "JIRA", "SLACK"],
      invitation_status: ["PENDING", "ACCEPTED", "EXPIRED"],
      notification_status: ["SENT", "FAILED"],
      pr_event_type: [
        "OPENED",
        "COMMIT",
        "REVIEW",
        "APPROVED",
        "BUILD_SUCCESS",
        "BUILD_FAILED",
        "MERGED",
      ],
      pr_status: ["OPEN", "MERGED", "CLOSED"],
    },
  },
} as const
