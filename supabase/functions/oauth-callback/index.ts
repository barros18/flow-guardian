import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

interface OAuthTokenResponse {
  access_token: string
  refresh_token?: string
  expires_in?: number
  token_type?: string
  scope?: string
}

async function exchangeGithubCode(code: string): Promise<{ token: OAuthTokenResponse; externalId: string; scopes: string }> {
  console.log('GitHub: Exchanging code for token...');
  const res = await fetch('https://github.com/login/oauth/access_token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify({
      client_id: Deno.env.get('GITHUB_CLIENT_ID'),
      client_secret: Deno.env.get('GITHUB_CLIENT_SECRET'),
      code,
    }),
  })
  const data = await res.json()
  console.log('GitHub token response:', JSON.stringify(data));

  if (data.error) throw new Error(`GitHub OAuth error: ${data.error_description || data.error}`)
  if (!data.access_token) throw new Error('GitHub returned no access token')

  // Get user info
  console.log('GitHub: Fetching user info...');
  const userRes = await fetch('https://api.github.com/user', {
    headers: { Authorization: `Bearer ${data.access_token}`, 'User-Agent': 'DevSync' },
  })
  const user = await userRes.json()
  console.log('GitHub user info:', JSON.stringify(user));

  if (!user.id) throw new Error('Failed to get GitHub user ID')

  return {
    token: { access_token: data.access_token, scope: data.scope },
    externalId: String(user.id),
    scopes: data.scope || '',
  }
}

async function exchangeSlackCode(code: string, redirectUri: string): Promise<{ token: OAuthTokenResponse; externalId: string; scopes: string }> {
  console.log('Slack: Exchanging code for token...');
  const params = new URLSearchParams({
    client_id: Deno.env.get('SLACK_CLIENT_ID')!,
    client_secret: Deno.env.get('SLACK_CLIENT_SECRET')!,
    code,
    redirect_uri: redirectUri,
  })
  const res = await fetch('https://slack.com/api/oauth.v2.access', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: params.toString(),
  })
  const data = await res.json()
  console.log('Slack token response:', JSON.stringify(data));
  if (!data.ok) throw new Error(`Slack OAuth error: ${data.error}`)

  return {
    token: { access_token: data.access_token, refresh_token: data.refresh_token },
    externalId: data.team?.id || data.enterprise?.id || '',
    scopes: data.scope || '',
  }
}

async function exchangeJiraCode(code: string, redirectUri: string): Promise<{ token: OAuthTokenResponse; externalId: string; scopes: string }> {
  console.log('Jira: Exchanging code for token...');
  const res = await fetch('https://auth.atlassian.com/oauth/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      grant_type: 'authorization_code',
      client_id: Deno.env.get('JIRA_CLIENT_ID'),
      client_secret: Deno.env.get('JIRA_CLIENT_SECRET'),
      code,
      redirect_uri: redirectUri,
    }),
  })
  const data = await res.json()
  console.log('Jira token response:', JSON.stringify(data));
  if (data.error) throw new Error(`Jira OAuth error: ${data.error_description || data.error}`)

  // Get accessible resources (cloudId)
  console.log('Jira: Fetching accessible resources...');
  const resourcesRes = await fetch('https://api.atlassian.com/oauth/token/accessible-resources', {
    headers: { Authorization: `Bearer ${data.access_token}` },
  })
  const resources = await resourcesRes.json()
  console.log('Jira resources:', JSON.stringify(resources));
  const cloudId = resources[0]?.id || ''

  return {
    token: {
      access_token: data.access_token,
      refresh_token: data.refresh_token,
      expires_in: data.expires_in,
    },
    externalId: cloudId,
    scopes: data.scope || '',
  }
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const url = new URL(req.url)
    const code = url.searchParams.get('code')
    const provider = url.searchParams.get('provider')
    const userId = url.searchParams.get('user_id')
    const redirectUri = url.searchParams.get('redirect_uri') || ''

    if (!code || !provider || !userId) {
      return new Response(JSON.stringify({ error: 'Missing code, provider, or user_id' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    console.log(`Processing OAuth callback for provider=${provider}, user=${userId}`)

    let tokenData: { token: OAuthTokenResponse; externalId: string; scopes: string }

    switch (provider) {
      case 'github':
        tokenData = await exchangeGithubCode(code)
        break
      case 'slack':
        tokenData = await exchangeSlackCode(code, redirectUri)
        break
      case 'jira':
        tokenData = await exchangeJiraCode(code, redirectUri)
        break
      default:
        return new Response(JSON.stringify({ error: `Unknown provider: ${provider}` }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })
    }

    // Upsert integration using service role
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

    const expiresAt = tokenData.token.expires_in
      ? new Date(Date.now() + tokenData.token.expires_in * 1000).toISOString()
      : null

    const { error: dbError } = await supabase
      .from('integrations')
      .upsert(
        {
          user_id: userId,
          provider,
          access_token: tokenData.token.access_token,
          refresh_token: tokenData.token.refresh_token || null,
          expires_at: expiresAt,
          external_account_id: tokenData.externalId,
          scopes: tokenData.scopes,
        },
        { onConflict: 'user_id,provider' }
      )

    if (dbError) {
      console.error('DB upsert error:', dbError)
      throw new Error(`Failed to save integration: ${dbError.message}`)
    }

    console.log(`Successfully saved ${provider} integration for user ${userId}`)

    // Redirect back to app
    const appUrl = url.searchParams.get('app_url') || 'https://id-preview--6da3db0c-d5ac-4b44-b40b-c1ff6ab25a16.lovable.app'
    return new Response(null, {
      status: 302,
      headers: {
        ...corsHeaders,
        Location: `${appUrl}/onboarding?connected=${provider}`,
      },
    })
  } catch (error) {
    console.error('OAuth callback error:', error)
    const message = error instanceof Error ? error.message : 'Unknown error'
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
