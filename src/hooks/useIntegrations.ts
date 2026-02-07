import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";

const SUPABASE_URL = "https://iaucpiiptenjomzmseiv.supabase.co";

export interface IntegrationStatus {
  github: boolean;
  slack: boolean;
  jira: boolean;
}

export function useIntegrations() {
  const [status, setStatus] = useState<IntegrationStatus>({ github: false, slack: false, jira: false });
  const [loading, setLoading] = useState(true);

  const fetchStatus = useCallback(async () => {
    try {
      const { data, error } = await supabase.functions.invoke("integrations-data", {
        body: null,
        headers: { "Content-Type": "application/json" },
      });
      // Use query params approach via GET-like invocation
      const { data: session } = await supabase.auth.getSession();
      if (!session?.session) {
        setLoading(false);
        return;
      }

      const res = await fetch(`${SUPABASE_URL}/functions/v1/integrations-data?action=status`, {
        headers: {
          Authorization: `Bearer ${session.session.access_token}`,
          apikey: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImlhdWNwaWlwdGVuam9tem1zZWl2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzAzODY5ODcsImV4cCI6MjA4NTk2Mjk4N30.nGqF1j2fnsLkFX_i3vC67RMCoWXIekwOfy4xw6PYfC8",
        },
      });
      const result = await res.json();
      if (result.status) {
        setStatus(result.status);
      }
    } catch (err) {
      console.error("Failed to fetch integration status:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchStatus();
  }, [fetchStatus]);

  const getOAuthUrl = useCallback((provider: "github" | "slack" | "jira", userId: string) => {
    const callbackUrl = `${SUPABASE_URL}/functions/v1/oauth-callback`;
    const appUrl = window.location.origin;
    const redirectUri = `${callbackUrl}?provider=${provider}&user_id=${userId}&app_url=${encodeURIComponent(appUrl)}`;

    switch (provider) {
      case "github":
        return `https://github.com/login/oauth/authorize?client_id=${import.meta.env.VITE_GITHUB_CLIENT_ID || ""}&redirect_uri=${encodeURIComponent(redirectUri)}&scope=repo,read:user`;
      case "slack":
        return `https://slack.com/oauth/v2/authorize?client_id=${import.meta.env.VITE_SLACK_CLIENT_ID || ""}&redirect_uri=${encodeURIComponent(redirectUri)}&scope=channels:read,chat:write&user_scope=`;
      case "jira":
        return `https://auth.atlassian.com/authorize?audience=api.atlassian.com&client_id=${import.meta.env.VITE_JIRA_CLIENT_ID || ""}&scope=read:jira-work%20read:jira-user&redirect_uri=${encodeURIComponent(redirectUri)}&response_type=code&prompt=consent`;
      default:
        return "";
    }
  }, []);

  const fetchProviderData = useCallback(async (provider: "github" | "slack" | "jira") => {
    const { data: session } = await supabase.auth.getSession();
    if (!session?.session) return { connected: false, data: [], error: "Not authenticated" };

    const res = await fetch(`${SUPABASE_URL}/functions/v1/integrations-data?action=data&provider=${provider}`, {
      headers: {
        Authorization: `Bearer ${session.session.access_token}`,
        apikey: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImlhdWNwaWlwdGVuam9tem1zZWl2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzAzODY5ODcsImV4cCI6MjA4NTk2Mjk4N30.nGqF1j2fnsLkFX_i3vC67RMCoWXIekwOfy4xw6PYfC8",
      },
    });
    return await res.json();
  }, []);

  return { status, loading, fetchStatus, getOAuthUrl, fetchProviderData };
}
