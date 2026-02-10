import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Helper function to safely get environment variables without throwing too early
const getEnv = (key: string) => {
  const value = Deno.env.get(key);
  if (!value) {
    console.warn(`Warning: Missing environment variable: ${key}`);
  }
  return value;
};

async function getIntegration(orgId: string | null, userId: string, provider: string) {
  const supabaseUrl = getEnv("SUPABASE_URL");
  const supabaseServiceRoleKey = getEnv("SUPABASE_SERVICE_ROLE_KEY");
  const supabase = createClient(supabaseUrl, supabaseServiceRoleKey);

  let query = supabase
    .from("integrations")
    .select("*")
    .eq("provider", provider);

  // Prefer org-scoped query, fall back to user-scoped
  if (orgId) {
    query = query.eq("organization_id", orgId);
  } else {
    query = query.eq("user_id", userId);
  }

  const { data, error } = await query.maybeSingle();

  if (error) {
    console.error(`Error fetching integration for ${provider}:`, error);
    throw new Error("Failed to fetch integration");
  }
  return data;
}

async function refreshJiraToken(refreshToken: string, orgId: string | null, userId: string) {
  try {
    const clientId = getEnv("JIRA_CLIENT_ID");
    const clientSecret = getEnv("JIRA_CLIENT_SECRET");

    const res = await fetch("https://auth.atlassian.com/oauth/token", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        grant_type: "refresh_token",
        client_id: clientId,
        client_secret: clientSecret,
        refresh_token: refreshToken,
      }),
    });

    if (!res.ok) {
      throw new Error(`Jira refresh failed`);
    }

    const data = await res.json();
    if (data.error) throw new Error(`Jira token refresh failed`);

    const supabaseUrl = getEnv("SUPABASE_URL");
    const supabaseServiceRoleKey = getEnv("SUPABASE_SERVICE_ROLE_KEY");
    const supabase = createClient(supabaseUrl, supabaseServiceRoleKey);

    let updateQuery = supabase
      .from("integrations")
      .update({
        access_token: data.access_token,
        refresh_token: data.refresh_token || refreshToken,
        expires_at: new Date(Date.now() + data.expires_in * 1000).toISOString(),
      })
      .eq("provider", "jira");

    if (orgId) {
      updateQuery = updateQuery.eq("organization_id", orgId);
    } else {
      updateQuery = updateQuery.eq("user_id", userId);
    }

    const { error: updateError } = await updateQuery;

    if (updateError) {
      console.error("Failed to update Jira token in DB:", updateError);
      // We still return the new access token so the request can proceed, 
      // even if saving it for next time failed.
    }

    return data.access_token;
  } catch (error) {
    console.error("Error refreshing Jira token:", error);
    throw error;
  }
}

async function getGithubRepos(accessToken: string) {
  if (!accessToken) throw new Error("GitHub access token is missing");

  try {
    console.log("Fetching GitHub repos...");
    const res = await fetch("https://api.github.com/user/repos?sort=updated&per_page=100&affiliation=owner,collaborator,organization_member", {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Accept": "application/vnd.github.v3+json",
        "User-Agent": "DevSync-FlowGuardian"
      },
    });

    if (!res.ok) {
      const errorText = await res.text();
      console.error(`GitHub API error [${res.status}]:`, errorText);
      throw new Error("GitHub API request failed");
    }

    const repos = await res.json();
    if (!Array.isArray(repos)) {
      console.error("GitHub returned non-array:", repos);
      throw new Error("GitHub API returned an invalid format");
    }

    return repos.map((r: any) => ({
      name: r.name,
      full_name: r.full_name,
      description: r.description,
      visibility: r.private ? "private" : "public",
      url: r.html_url,
      language: r.language,
      updated_at: r.updated_at,
    }));
  } catch (error: any) {
    console.error("Error in getGithubRepos:", error);
    throw new Error("Failed to fetch GitHub repositories");
  }
}

async function getSlackChannels(accessToken: string) {
  if (!accessToken) throw new Error("Slack access token is missing");

  try {
    console.log("Fetching Slack channels...");
    const res = await fetch(
      "https://slack.com/api/conversations.list?types=public_channel,private_channel&limit=100",
      {
        headers: { Authorization: `Bearer ${accessToken}` },
      }
    );

    const data = await res.json();
    if (!data.ok) {
      console.error("Slack API error:", data.error);
      throw new Error(`Slack error: ${data.error}`);
    }

    return data.channels.map((c: any) => ({
      id: c.id,
      name: c.name,
      is_private: c.is_private,
      num_members: c.num_members,
    }));
  } catch (error: any) {
    console.error("Error in getSlackChannels:", error);
    throw new Error("Failed to fetch Slack channels");
  }
}

async function getJiraProjects(accessToken: string, cloudId: string) {
  if (!accessToken) throw new Error("Jira access token is missing");
  if (!cloudId) throw new Error("Jira cloudId is missing");

  try {
    console.log(`Fetching Jira projects for cloudId ${cloudId}...`);
    const res = await fetch(
      `https://api.atlassian.com/ex/jira/${cloudId}/rest/api/3/project`,
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Accept": "application/json"
        },
      }
    );

    if (!res.ok) {
      const body = await res.text();
      console.error(`Jira API error [${res.status}]:`, body);
      throw new Error(`Jira error ${res.status}`);
    }

    const projects = await res.json();
    if (!Array.isArray(projects)) {
      console.error("Jira returned non-array:", projects);
      throw new Error("Jira API returned an invalid format");
    }

    return projects.map((p: any) => ({
      key: p.key,
      name: p.name,
      projectTypeKey: p.projectTypeKey,
      avatarUrl: p.avatarUrls?.["48x48"],
    }));
  } catch (error: any) {
    console.error("Error in getJiraProjects:", error);
    throw new Error("Failed to fetch Jira projects");
  }
}

// Helper: Get user Role - throws on DB error to prevent silent auth bypass
async function getUserRole(userId: string, supabaseClient: any): Promise<string> {
  const { data, error } = await supabaseClient
    .from("user_roles")
    .select("role")
    .eq("user_id", userId)
    .maybeSingle();

  if (error) {
    console.error("Error fetching user role:", error);
    throw new Error("Authorization check failed");
  }
  return data?.role || "developer";
}

// Helper: Safe error messages for clients - strips internal details
function getSafeProviderError(provider: string): string {
  const messages: Record<string, string> = {
    github: "Failed to fetch data from GitHub. Please try again or reconnect.",
    slack: "Failed to fetch data from Slack. Please try again or reconnect.",
    jira: "Failed to fetch data from Jira. Please try again or reconnect.",
  };
  return messages[provider] || "Failed to fetch data from the provider. Please try again.";
}

// Helper: Write audit log for sensitive admin actions
async function writeAuditLog(supabaseClient: any, userId: string, orgId: string | null, action: string) {
  try {
    if (!orgId) return;
    await supabaseClient.from("audit_logs").insert({
      user_id: userId,
      organization_id: orgId,
      action,
    });
  } catch (e) {
    console.error("Failed to write audit log:", e);
  }
}

Deno.serve(async (req) => {
  // Handle CORS
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseUrl = getEnv("SUPABASE_URL");
    const supabaseServiceRoleKey = getEnv("SUPABASE_SERVICE_ROLE_KEY");

    // Authenticate user
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Missing authorization header" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseAuthClient = createClient(
      supabaseUrl,
      getEnv("SUPABASE_PUBLISHABLE_KEY"),
      { global: { headers: { Authorization: authHeader } } }
    );

    const {
      data: { user },
      error: authError,
    } = await supabaseAuthClient.auth.getUser();

    if (authError || !user) {
      console.error("Auth error:", authError);
      return new Response(JSON.stringify({ error: "Unauthorized: Invalid or expired token" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // --- Access Control Check ---
    const adminSupabase = createClient(supabaseUrl, supabaseServiceRoleKey);
    const userRole = await getUserRole(user.id, adminSupabase);

    // Get user's organization_id from profile
    const { data: profile } = await adminSupabase
      .from("profiles")
      .select("organization_id")
      .eq("user_id", user.id)
      .single();

    const orgId = profile?.organization_id || null;

    const url = new URL(req.url);
    const action = url.searchParams.get("action");
    const provider = url.searchParams.get("provider");

    // --- Action: Status ---
    // --- Action: Status ---
    if (action === "status") {
      // ENFORCEMENT: Only ADMIN can view system status/connections
      if (userRole !== "admin") {
        return new Response(JSON.stringify({ error: "Forbidden: Only admins can view connection status." }), {
          status: 403,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      try {
        let statusQuery = adminSupabase
          .from("integrations")
          .select("provider, external_account_id, scopes, created_at, user_id");

        if (orgId) {
          statusQuery = statusQuery.eq("organization_id", orgId);
        } else {
          statusQuery = statusQuery.eq("user_id", user.id);
        }

        const { data: integrations, error: dbError } = await statusQuery;

        if (dbError) {
          console.error("Database error fetching integrations status:", dbError);
          return new Response(JSON.stringify({
            status: { github: false, slack: false, jira: false },
            integrations: [],
            error: "Failed to retrieve integration status from database."
          }), {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }

        const status: Record<string, boolean> = { github: false, slack: false, jira: false };
        for (const i of integrations || []) {
          if (i.provider) status[i.provider] = true;
        }

        return new Response(JSON.stringify({ status, integrations: integrations || [] }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });

      } catch (innerError) {
        console.error("Inner error in status action:", innerError);
        return new Response(JSON.stringify({
          status: { github: false, slack: false, jira: false },
          integrations: [],
          error: "Internal error processing status."
        }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    // --- Action: Delete Integration (Admin Only) ---
    if (action === "delete_integration" && provider) {
      if (userRole !== "admin") {
        return new Response(JSON.stringify({ error: "Forbidden: Only admins can remove integrations." }), {
          status: 403,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const { error: deleteError } = await adminSupabase
        .from("integrations")
        .delete()
        .eq("user_id", user.id)
        .eq("provider", provider);

      if (deleteError) {
        console.error("Error deleting integration:", deleteError);
        return new Response(JSON.stringify({ error: "Failed to delete integration." }), {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // --- Action: Update Role (Admin Only) ---
    if (action === "update_role") {
      if (userRole !== "admin") {
        return new Response(JSON.stringify({ error: "Forbidden: Only admins can manage user roles." }), {
          status: 403,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      try {
        const body = await req.json();
        const { targetUserId, newRole } = body;

        if (!targetUserId || !newRole || !["admin", "lead", "developer"].includes(newRole)) {
          return new Response(JSON.stringify({ error: "Invalid role update parameters." }), {
            status: 400,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }

        const { error: roleError } = await adminSupabase
          .from("user_roles")
          .upsert({ user_id: targetUserId, role: newRole })
          .select();

        if (roleError) {
          console.error("Error updating role:", roleError);
          return new Response(JSON.stringify({ error: "Failed to update user role." }), {
            status: 500,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }

        await writeAuditLog(adminSupabase, user.id, orgId, `Role changed for ${targetUserId} to ${newRole}`);
        return new Response(JSON.stringify({ success: true, role: newRole }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });

      } catch (e) {
        return new Response(JSON.stringify({ error: "Invalid JSON body for role update." }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    // --- Action: Delete Account (Admin Only) ---
    if (action === "delete_account") {
      if (userRole !== "admin") {
        return new Response(JSON.stringify({ error: "Forbidden: Only admins can delete the account." }), {
          status: 403,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const supabaseAuthClient = createClient(
        supabaseUrl,
        getEnv("SUPABASE_SERVICE_ROLE_KEY") // Need service role to delete user from Auth
      );

      const { error: deleteUserError } = await supabaseAuthClient.auth.admin.deleteUser(user.id);

      if (deleteUserError) {
        console.error("Error deleting account:", deleteUserError);
        return new Response(JSON.stringify({ error: "Failed to delete account." }), {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      await writeAuditLog(adminSupabase, user.id, orgId, `Account deleted: ${user.id}`);
      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // --- Action: Integration Logs (Admin Only) ---
    if (action === "logs") {
      if (userRole !== "admin") {
        return new Response(JSON.stringify({ error: "Forbidden: Only admins can view integration logs." }), {
          status: 403,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const limit = Number(url.searchParams.get("limit") || 50);

      try {
        // Assuming an 'integration_logs' table exists for tracking syncs/webhooks
        const { data: logs, error: logsError } = await adminSupabase
          .from("integration_logs")
          .select("*")
          .eq("user_id", user.id) // Or organization_id if applicable
          .order("created_at", { ascending: false })
          .limit(limit);

        if (logsError) {
          // Check if error is "relation does not exist" -> handle gracefully if table missing
          if (logsError.message?.includes("relation") && logsError.message?.includes("does not exist")) {
            return new Response(JSON.stringify({ logs: [], warning: "Logs table not initialized." }), {
              headers: { ...corsHeaders, "Content-Type": "application/json" },
            });
          }

          console.error("Error fetching logs:", logsError);
          return new Response(JSON.stringify({ error: "Failed to fetch logs." }), {
            status: 500,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }

        return new Response(JSON.stringify({ logs: logs || [] }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });

      } catch (e) {
        return new Response(JSON.stringify({ error: "Internal error fetching logs." }), {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    // --- Action: Connect (Admin Only) ---
    // Stores the initial OAuth tokens and metadata for a provider
    if (action === "connect") {
      if (userRole !== "admin") {
        return new Response(JSON.stringify({ error: "Forbidden: Only admins can connect integrations." }), {
          status: 403,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      try {
        const body = await req.json();
        const { provider, access_token, refresh_token, expires_in, external_account_id, scopes } = body;

        if (!provider || !access_token) {
          return new Response(JSON.stringify({ error: "Missing provider or access_token." }), {
            status: 400,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }

        const expiresAt = expires_in ? new Date(Date.now() + expires_in * 1000).toISOString() : null;

        const { error: upsertError } = await adminSupabase
          .from("integrations")
          .upsert({
            user_id: user.id, // Or org_id if shared
            provider,
            access_token,
            refresh_token,
            expires_at: expiresAt,
            external_account_id,
            scopes,
            updated_at: new Date().toISOString()
          }, { onConflict: 'user_id, provider' })
          .select();

        if (upsertError) {
          console.error("Error saving integration:", upsertError);
          return new Response(JSON.stringify({ error: "Failed to save integration connection." }), {
            status: 500,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }

        return new Response(JSON.stringify({ success: true }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });

      } catch (e) {
        return new Response(JSON.stringify({ error: "Invalid JSON body for connect." }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    // --- Action: Configure (Admin Only) ---
    // Selects which repositories or projects are monitored
    if (action === "configure") {
      if (userRole !== "admin") {
        return new Response(JSON.stringify({ error: "Forbidden: Only admins can configure integration settings." }), {
          status: 403,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      try {
        const body = await req.json();
        const { provider, selected_resources } = body;

        if (!provider || !selected_resources) {
          return new Response(JSON.stringify({ error: "Missing provider or selected_resources." }), {
            status: 400,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }

        // Fetch current settings to merge
        const { data: currentIntegration } = await adminSupabase
          .from("integrations")
          .select("settings")
          .eq("user_id", user.id)
          .eq("provider", provider)
          .single();

        const newSettings = { ...currentIntegration?.settings, monitored_resources: selected_resources };

        const { error: updateError } = await adminSupabase
          .from("integrations")
          .update({
            settings: newSettings,
            updated_at: new Date().toISOString()
          })
          .eq("user_id", user.id)
          .eq("provider", provider);

        if (updateError) {
          console.error("Error updating configuration:", updateError);
          return new Response(JSON.stringify({ error: "Failed to update configuration." }), {
            status: 500,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }

        return new Response(JSON.stringify({ success: true }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });

      } catch (e) {
        return new Response(JSON.stringify({ error: "Invalid JSON body for configure." }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    // --- Action: Update Alert Rules (Tech Lead & Admin) ---
    if (action === "update_alert_rules") {
      if (userRole !== "admin" && userRole !== "lead") {
        return new Response(JSON.stringify({ error: "Forbidden: Only Tech Leads and Admins can manage alerts." }), {
          status: 403,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      try {
        const body = await req.json();
        // Expecting: { rule_type: 'stale_pr', threshold_hours: 24, enabled: true }
        const { rule_type, threshold, enabled } = body;

        const { error: ruleError } = await adminSupabase
          .from("automation_rules")
          .upsert({
            user_id: user.id, // or org_id
            rule_type,
            threshold,
            enabled,
            updated_at: new Date().toISOString()
          }, { onConflict: 'user_id, rule_type' });

        if (ruleError) {
          console.error("Error updating alert rule:", ruleError);
          return new Response(JSON.stringify({ error: "Failed to update alert rules." }), {
            status: 500,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }

        return new Response(JSON.stringify({ success: true }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });

      } catch (e) {
        return new Response(JSON.stringify({ error: "Invalid JSON for alert rules." }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    // --- Action: Update Slack Channels (Tech Lead & Admin) ---
    if (action === "update_slack_channels") {
      if (userRole !== "admin" && userRole !== "lead") {
        return new Response(JSON.stringify({ error: "Forbidden: Only Tech Leads and Admins can manage notifications." }), {
          status: 403,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      try {
        const body = await req.json();
        const { channels } = body; // Array of channel IDs

        const { data: currentIntegration } = await adminSupabase
          .from("integrations")
          .select("settings")
          .eq("user_id", user.id)
          .eq("provider", "slack")
          .single();

        const newSettings = { ...currentIntegration?.settings, notification_channels: channels };

        const { error: updateError } = await adminSupabase
          .from("integrations")
          .update({
            settings: newSettings,
            updated_at: new Date().toISOString()
          })
          .eq("user_id", user.id)
          .eq("provider", "slack");

        if (updateError) {
          return new Response(JSON.stringify({ error: "Failed to update Slack channels." }), {
            status: 500,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }

        return new Response(JSON.stringify({ success: true }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });

      } catch (e) {
        return new Response(JSON.stringify({ error: "Invalid JSON for slack channels." }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    // --- Action: Toggle PR Block (Tech Lead & Admin) ---
    if (action === "toggle_pr_block") {
      if (userRole !== "admin" && userRole !== "lead") {
        return new Response(JSON.stringify({ error: "Forbidden: Only Tech Leads and Admins can block/unblock PRs." }), {
          status: 403,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      try {
        const body = await req.json();
        const { pr_id, is_blocked, reason } = body;

        const { error: prError } = await adminSupabase
          .from("pull_requests")
          .update({
            is_blocked,
            blocked_reason: reason,
            updated_at: new Date().toISOString()
          })
          .eq("id", pr_id);

        if (prError) {
          console.error("Error blocking PR:", prError);
          return new Response(JSON.stringify({ error: "Failed to update PR status." }), {
            status: 500,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }

        return new Response(JSON.stringify({ success: true }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });

      } catch (e) {
        return new Response(JSON.stringify({ error: "Invalid JSON for PR block." }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    // --- Action: Data ---
    // Allowed for all authenticated users (Developer, Tech Lead, Admin)
    // Developers need to read repositories/projects to link tasks.
    if (action === "data" && provider) {
      try {
        const integration = await getIntegration(orgId, user.id, provider);

        if (!integration || !integration.access_token) {
          console.warn(`No active ${provider} integration for user ${user.id}`);
          return new Response(
            JSON.stringify({
              error: `Sua conta ${provider} não está conectada ou o acesso expirou.`,
              connected: false
            }),
            {
              status: 404, // Use 404 or 200 with connected:false depending on frontend expectation
              headers: { ...corsHeaders, "Content-Type": "application/json" },
            }
          );
        }

        let accessToken = integration.access_token;

        // Check if token expired and refresh if possible
        if (integration.expires_at && new Date(integration.expires_at) < new Date()) {
          console.log(`Token for ${provider} expired at ${integration.expires_at}`);

          if (integration.refresh_token && provider === "jira") {
            console.log("Refreshing expired Jira token...");
            try {
              accessToken = await refreshJiraToken(integration.refresh_token, orgId, user.id);
            } catch (refreshError: any) {
              console.error("Failed to refresh Jira token:", refreshError);
              return new Response(JSON.stringify({
                error: "Sua sessão do Jira expirou e não pôde ser renovada. Por favor, reconecte.",
                connected: false
              }), {
                status: 401,
                headers: { ...corsHeaders, "Content-Type": "application/json" },
              });
            }
          } else {
            return new Response(
              JSON.stringify({
                error: `Sua conexão com ${provider} expirou. Por favor, conecte novamente.`,
                connected: false
              }),
              {
                status: 401,
                headers: { ...corsHeaders, "Content-Type": "application/json" },
              }
            );
          }
        }

        let data: any;
        switch (provider) {
          case "github":
            data = await getGithubRepos(accessToken);
            break;
          case "slack":
            data = await getSlackChannels(accessToken);
            break;
          case "jira":
            if (!integration.external_account_id) {
              throw new Error("ID da conta Jira não encontrado. Por favor, reconecte.");
            }
            data = await getJiraProjects(accessToken, integration.external_account_id);
            break;
          default:
            return new Response(JSON.stringify({ error: `Provedor desconhecido: ${provider}` }), {
              status: 400,
              headers: { ...corsHeaders, "Content-Type": "application/json" },
            });
        }

        return new Response(JSON.stringify({ data, connected: true }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });

      } catch (providerError: any) {
        console.error(`Data action error for ${provider}:`, providerError);
        return new Response(JSON.stringify({
          error: getSafeProviderError(provider || "unknown"),
          connected: true
        }), {
          status: 502,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    return new Response(JSON.stringify({ error: "Ação inválida ou parâmetros ausentes" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (error: any) {
    console.error("Global Handler Error:", error);
    return new Response(JSON.stringify({ error: "Erro interno no servidor" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
