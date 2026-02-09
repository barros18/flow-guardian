import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";

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
      const { data: session } = await supabase.auth.getSession();
      if (!session?.session) {
        setLoading(false);
        return;
      }

      const res = await fetch(
        `https://iaucpiiptenjomzmseiv.supabase.co/functions/v1/integrations-data?action=status`,
        {
          headers: {
            Authorization: `Bearer ${session.session.access_token}`,
            apikey: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImlhdWNwaWlwdGVuam9tem1zZWl2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzAzODY5ODcsImV4cCI6MjA4NTk2Mjk4N30.nGqF1j2fnsLkFX_i3vC67RMCoWXIekwOfy4xw6PYfC8",
          },
        }
      );
      if (res.ok) {
        const result = await res.json();
        if (result.status) {
          setStatus(result.status);
        }
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

  const initiateOAuth = useCallback(async (provider: "github" | "slack" | "jira") => {
    const { data: session } = await supabase.auth.getSession();
    if (!session?.session) {
      throw new Error("Not authenticated");
    }

    const appUrl = window.location.origin;
    const res = await fetch(
      `https://iaucpiiptenjomzmseiv.supabase.co/functions/v1/oauth-init?provider=${provider}&app_url=${encodeURIComponent(appUrl)}`,
      {
        headers: {
          Authorization: `Bearer ${session.session.access_token}`,
          apikey: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImlhdWNwaWlwdGVuam9tem1zZWl2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzAzODY5ODcsImV4cCI6MjA4NTk2Mjk4N30.nGqF1j2fnsLkFX_i3vC67RMCoWXIekwOfy4xw6PYfC8",
        },
      }
    );

    if (!res.ok) {
      const errBody = await res.json().catch(() => ({ error: `HTTP ${res.status}` }));
      throw new Error(errBody.error || `Failed to initiate OAuth: ${res.status}`);
    }

    const { url } = await res.json();
    return url as string;
  }, []);

  const fetchProviderData = useCallback(async (provider: "github" | "slack" | "jira") => {
    try {
      const { data: session } = await supabase.auth.getSession();
      if (!session?.session) return { connected: false, data: [], error: "Not authenticated" };

      const res = await fetch(
        `https://iaucpiiptenjomzmseiv.supabase.co/functions/v1/integrations-data?action=data&provider=${provider}`,
        {
          headers: {
            Authorization: `Bearer ${session.session.access_token}`,
            apikey: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImlhdWNwaWlwdGVuam9tem1zZWl2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzAzODY5ODcsImV4cCI6MjA4NTk2Mjk4N30.nGqF1j2fnsLkFX_i3vC67RMCoWXIekwOfy4xw6PYfC8",
          },
        }
      );
      if (!res.ok) {
        const errBody = await res.json().catch(() => ({ error: `HTTP ${res.status}` }));
        return { connected: false, data: [], error: errBody.error || `HTTP ${res.status}` };
      }
      return await res.json();
    } catch (err) {
      console.error(`Failed to fetch ${provider} data:`, err);
      return { connected: false, data: [], error: "Network error" };
    }
  }, []);

  return { status, loading, fetchStatus, initiateOAuth, fetchProviderData };
}
