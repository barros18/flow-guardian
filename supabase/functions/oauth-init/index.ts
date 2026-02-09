import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

async function hmacSign(data: string, secret: string): Promise<string> {
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const sig = await crypto.subtle.sign("HMAC", key, encoder.encode(data));
  return btoa(String.fromCharCode(...new Uint8Array(sig)))
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const token = authHeader.replace("Bearer ", "");
    const { data: claimsData, error: claimsError } = await supabase.auth.getClaims(token);
    if (claimsError || !claimsData?.claims) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const userId = claimsData.claims.sub as string;

    const url = new URL(req.url);
    const provider = url.searchParams.get("provider");

    if (!provider || !["github", "slack", "jira"].includes(provider)) {
      return new Response(JSON.stringify({ error: "Invalid provider" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Check admin role
    const serviceClient = createClient(supabaseUrl, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    const { data: roleData } = await serviceClient
      .from("user_roles")
      .select("role")
      .eq("user_id", userId)
      .single();

    if (roleData?.role !== "admin") {
      return new Response(JSON.stringify({ error: "Only admins can connect integrations" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Generate signed state: base64url(payload).signature
    const nonce = crypto.randomUUID();
    const payload = JSON.stringify({
      uid: userId,
      ts: Date.now(),
      nonce,
      provider,
    });
    const payloadB64 = btoa(payload)
      .replace(/\+/g, "-")
      .replace(/\//g, "_")
      .replace(/=+$/, "");

    const secret = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const signature = await hmacSign(payloadB64, secret);
    const state = `${payloadB64}.${signature}`;

    // Build OAuth URL
    const callbackUrl = `${supabaseUrl}/functions/v1/oauth-callback`;
    const appUrl = url.searchParams.get("app_url") || "https://id-preview--6da3db0c-d5ac-4b44-b40b-c1ff6ab25a16.lovable.app";

    let oauthUrl: string;
    const redirectUri = `${callbackUrl}?provider=${provider}&app_url=${encodeURIComponent(appUrl)}`;

    switch (provider) {
      case "github":
        oauthUrl = `https://github.com/login/oauth/authorize?client_id=${Deno.env.get("GITHUB_CLIENT_ID")}&redirect_uri=${encodeURIComponent(redirectUri)}&scope=repo,read:user&state=${state}`;
        break;
      case "slack":
        oauthUrl = `https://slack.com/oauth/v2/authorize?client_id=${Deno.env.get("SLACK_CLIENT_ID")}&redirect_uri=${encodeURIComponent(redirectUri)}&scope=channels:read,chat:write&user_scope=&state=${state}`;
        break;
      case "jira":
        oauthUrl = `https://auth.atlassian.com/authorize?audience=api.atlassian.com&client_id=${Deno.env.get("JIRA_CLIENT_ID")}&scope=read:jira-work%20read:jira-user&redirect_uri=${encodeURIComponent(redirectUri)}&response_type=code&prompt=consent&state=${state}`;
        break;
      default:
        return new Response(JSON.stringify({ error: "Invalid provider" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
    }

    console.log(`Generated OAuth URL for provider=${provider}, user=${userId}`);

    return new Response(JSON.stringify({ url: oauthUrl }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("oauth-init error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Internal error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
