import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

async function hmacVerify(
  payloadB64: string,
  signature: string,
  secret: string
): Promise<boolean> {
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const sig = await crypto.subtle.sign("HMAC", key, encoder.encode(payloadB64));
  const expected = btoa(String.fromCharCode(...new Uint8Array(sig)))
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
  return expected === signature;
}

function parseState(
  stateParam: string
): { uid: string; ts: number; provider: string } | null {
  try {
    const [payloadB64, signature] = stateParam.split(".");
    if (!payloadB64 || !signature) return null;
    // We'll verify async in the caller
    const padded =
      payloadB64.replace(/-/g, "+").replace(/_/g, "/") +
      "=".repeat((4 - (payloadB64.length % 4)) % 4);
    const json = atob(padded);
    return JSON.parse(json);
  } catch {
    return null;
  }
}

interface OAuthTokenResponse {
  access_token: string;
  refresh_token?: string;
  expires_in?: number;
  token_type?: string;
  scope?: string;
}

async function exchangeGithubCode(
  code: string
): Promise<{
  token: OAuthTokenResponse;
  externalId: string;
  scopes: string;
}> {
  const res = await fetch("https://github.com/login/oauth/access_token", {
    method: "POST",
    headers: { "Content-Type": "application/json", Accept: "application/json" },
    body: JSON.stringify({
      client_id: Deno.env.get("GITHUB_CLIENT_ID"),
      client_secret: Deno.env.get("GITHUB_CLIENT_SECRET"),
      code,
    }),
  });
  const data = await res.json();
  if (data.error)
    throw new Error(
      `GitHub OAuth error: ${data.error_description || data.error}`
    );
  if (!data.access_token) throw new Error("GitHub returned no access token");

  const userRes = await fetch("https://api.github.com/user", {
    headers: {
      Authorization: `Bearer ${data.access_token}`,
      "User-Agent": "DevSync",
    },
  });
  const user = await userRes.json();
  if (!user.id) throw new Error("Failed to get GitHub user ID");

  return {
    token: { access_token: data.access_token, scope: data.scope },
    externalId: String(user.id),
    scopes: data.scope || "",
  };
}

async function exchangeSlackCode(
  code: string,
  redirectUri: string
): Promise<{
  token: OAuthTokenResponse;
  externalId: string;
  scopes: string;
}> {
  const params = new URLSearchParams({
    client_id: Deno.env.get("SLACK_CLIENT_ID")!,
    client_secret: Deno.env.get("SLACK_CLIENT_SECRET")!,
    code,
    redirect_uri: redirectUri,
  });
  const res = await fetch("https://slack.com/api/oauth.v2.access", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: params.toString(),
  });
  const data = await res.json();
  if (!data.ok) throw new Error(`Slack OAuth error: ${data.error}`);

  return {
    token: {
      access_token: data.access_token,
      refresh_token: data.refresh_token,
    },
    externalId: data.team?.id || data.enterprise?.id || "",
    scopes: data.scope || "",
  };
}

async function exchangeJiraCode(
  code: string,
  redirectUri: string
): Promise<{
  token: OAuthTokenResponse;
  externalId: string;
  scopes: string;
}> {
  const res = await fetch("https://auth.atlassian.com/oauth/token", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      grant_type: "authorization_code",
      client_id: Deno.env.get("JIRA_CLIENT_ID"),
      client_secret: Deno.env.get("JIRA_CLIENT_SECRET"),
      code,
      redirect_uri: redirectUri,
    }),
  });
  const data = await res.json();
  if (data.error)
    throw new Error(
      `Jira OAuth error: ${data.error_description || data.error}`
    );

  const resourcesRes = await fetch(
    "https://api.atlassian.com/oauth/token/accessible-resources",
    { headers: { Authorization: `Bearer ${data.access_token}` } }
  );
  const resources = await resourcesRes.json();
  const cloudId = resources[0]?.id || "";

  return {
    token: {
      access_token: data.access_token,
      refresh_token: data.refresh_token,
      expires_in: data.expires_in,
    },
    externalId: cloudId,
    scopes: data.scope || "",
  };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    const code = url.searchParams.get("code");
    const provider = url.searchParams.get("provider");
    const stateParam = url.searchParams.get("state");
    const appUrl =
      url.searchParams.get("app_url") ||
      "https://id-preview--6da3db0c-d5ac-4b44-b40b-c1ff6ab25a16.lovable.app";

    if (!code || !provider) {
      return new Response(
        JSON.stringify({ error: "Missing code or provider" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Verify state parameter (CSRF protection + authenticated user_id)
    if (!stateParam) {
      return new Response(
        JSON.stringify({ error: "Missing state parameter" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const [payloadB64, signature] = stateParam.split(".");
    if (!payloadB64 || !signature) {
      return new Response(JSON.stringify({ error: "Invalid state format" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const valid = await hmacVerify(payloadB64, signature, SUPABASE_SERVICE_ROLE_KEY);
    if (!valid) {
      console.error("State signature verification failed");
      return new Response(
        JSON.stringify({ error: "Invalid state signature" }),
        {
          status: 403,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const stateData = parseState(stateParam);
    if (!stateData) {
      return new Response(JSON.stringify({ error: "Invalid state data" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Check state is not expired (10 min)
    if (Date.now() - stateData.ts > 10 * 60 * 1000) {
      return new Response(JSON.stringify({ error: "State expired" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Verify provider matches
    if (stateData.provider !== provider) {
      return new Response(
        JSON.stringify({ error: "Provider mismatch in state" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const userId = stateData.uid;
    console.log(
      `Processing OAuth callback for provider=${provider}, user=${userId} (verified via state)`
    );

    let tokenData: {
      token: OAuthTokenResponse;
      externalId: string;
      scopes: string;
    };

    switch (provider) {
      case "github":
        tokenData = await exchangeGithubCode(code);
        break;
      case "slack":
        tokenData = await exchangeSlackCode(code, "");
        break;
      case "jira":
        tokenData = await exchangeJiraCode(code, "");
        break;
      default:
        return new Response(
          JSON.stringify({ error: `Unknown provider: ${provider}` }),
          {
            status: 400,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          }
        );
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // Verify user is admin and get their org
    const [{ data: roleData }, { data: profileData }] = await Promise.all([
      supabase.from("user_roles").select("role").eq("user_id", userId).single(),
      supabase.from("profiles").select("organization_id").eq("user_id", userId).single(),
    ]);

    if (roleData?.role !== "admin") {
      return new Response(
        JSON.stringify({ error: "Only admins can manage integrations" }),
        {
          status: 403,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const orgId = profileData?.organization_id;

    const expiresAt = tokenData.token.expires_in
      ? new Date(
          Date.now() + tokenData.token.expires_in * 1000
        ).toISOString()
      : null;

    const { error: dbError } = await supabase.from("integrations").upsert(
      {
        user_id: userId,
        organization_id: orgId,
        provider,
        access_token: tokenData.token.access_token,
        refresh_token: tokenData.token.refresh_token || null,
        expires_at: expiresAt,
        external_account_id: tokenData.externalId,
        scopes: tokenData.scopes,
        status: "CONNECTED",
        type: provider.toUpperCase(),
      },
      { onConflict: "user_id,provider" }
    );

    if (dbError) {
      console.error("DB upsert error:", dbError);
      throw new Error(`Failed to save integration: ${dbError.message}`);
    }

    console.log(
      `Successfully saved ${provider} integration for user ${userId}`
    );

    return new Response(null, {
      status: 302,
      headers: {
        ...corsHeaders,
        Location: `${appUrl}/onboarding?connected=${provider}`,
      },
    });
  } catch (error) {
    console.error("OAuth callback error:", error);
    const appUrl = "https://id-preview--6da3db0c-d5ac-4b44-b40b-c1ff6ab25a16.lovable.app";
    return new Response(null, {
      status: 302,
      headers: {
        ...corsHeaders,
        Location: `${appUrl}/onboarding?error=oauth_failed`,
      },
    });
  }
});
