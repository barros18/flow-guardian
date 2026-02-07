import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

async function getIntegration(userId: string, provider: string) {
  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)
  const { data, error } = await supabase
    .from('integrations')
    .select('*')
    .eq('user_id', userId)
    .eq('provider', provider)
    .maybeSingle()

  if (error) throw new Error(`Failed to fetch integration: ${error.message}`)
  return data
}

async function refreshJiraToken(refreshToken: string, userId: string) {
  const res = await fetch('https://auth.atlassian.com/oauth/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      grant_type: 'refresh_token',
      client_id: Deno.env.get('JIRA_CLIENT_ID'),
      client_secret: Deno.env.get('JIRA_CLIENT_SECRET'),
      refresh_token: refreshToken,
    }),
  })
  const data = await res.json()
  if (data.error) throw new Error(`Jira token refresh failed: ${data.error}`)

  // Update tokens in DB
  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)
  await supabase
    .from('integrations')
    .update({
      access_token: data.access_token,
      refresh_token: data.refresh_token || refreshToken,
      expires_at: new Date(Date.now() + data.expires_in * 1000).toISOString(),
    })
    .eq('user_id', userId)
    .eq('provider', 'jira')

  return data.access_token
}

async function getGithubRepos(accessToken: string) {
  const res = await fetch('https://api.github.com/user/repos?sort=updated&per_page=30', {
    headers: { Authorization: `Bearer ${accessToken}`, 'User-Agent': 'DevSync' },
  })
  if (!res.ok) {
    const body = await res.text()
    throw new Error(`GitHub API error [${res.status}]: ${body}`)
  }
  const repos = await res.json()
  return repos.map((r: any) => ({
    name: r.name,
    full_name: r.full_name,
    description: r.description,
    visibility: r.private ? 'private' : 'public',
    url: r.html_url,
    language: r.language,
    updated_at: r.updated_at,
  }))
}

async function getSlackChannels(accessToken: string) {
  const res = await fetch('https://slack.com/api/conversations.list?types=public_channel,private_channel&limit=100', {
    headers: { Authorization: `Bearer ${accessToken}` },
  })
  const data = await res.json()
  if (!data.ok) throw new Error(`Slack API error: ${data.error}`)
  return data.channels.map((c: any) => ({
    id: c.id,
    name: c.name,
    is_private: c.is_private,
    num_members: c.num_members,
  }))
}

async function getJiraProjects(accessToken: string, cloudId: string) {
  const res = await fetch(`https://api.atlassian.com/ex/jira/${cloudId}/rest/api/3/project`, {
    headers: { Authorization: `Bearer ${accessToken}`, Accept: 'application/json' },
  })
  if (!res.ok) {
    const body = await res.text()
    throw new Error(`Jira API error [${res.status}]: ${body}`)
  }
  const projects = await res.json()
  return projects.map((p: any) => ({
    key: p.key,
    name: p.name,
    projectTypeKey: p.projectTypeKey,
    avatarUrl: p.avatarUrls?.['48x48'],
  }))
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Authenticate user
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Missing authorization header' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const supabase = createClient(SUPABASE_URL, Deno.env.get('SUPABASE_PUBLISHABLE_KEY')!, {
      global: { headers: { Authorization: authHeader } },
    })
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const url = new URL(req.url)
    const action = url.searchParams.get('action')
    const provider = url.searchParams.get('provider')

    // Check integration status
    if (action === 'status') {
      const adminSupabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)
      const { data: integrations } = await adminSupabase
        .from('integrations')
        .select('provider, external_account_id, scopes, created_at')
        .eq('user_id', user.id)

      const status: Record<string, boolean> = { github: false, slack: false, jira: false }
      for (const i of integrations || []) {
        status[i.provider] = true
      }
      return new Response(JSON.stringify({ status, integrations }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // Fetch data from provider
    if (action === 'data' && provider) {
      const integration = await getIntegration(user.id, provider)
      if (!integration) {
        return new Response(JSON.stringify({ error: `No ${provider} integration found`, connected: false }), {
          status: 404,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })
      }

      let accessToken = integration.access_token

      // Check if token expired and refresh if possible
      if (integration.expires_at && new Date(integration.expires_at) < new Date()) {
        if (integration.refresh_token && provider === 'jira') {
          console.log('Refreshing expired Jira token')
          accessToken = await refreshJiraToken(integration.refresh_token, user.id)
        } else {
          return new Response(JSON.stringify({ error: 'Token expired, please reconnect', connected: false }), {
            status: 401,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          })
        }
      }

      let data: any
      switch (provider) {
        case 'github':
          data = await getGithubRepos(accessToken)
          break
        case 'slack':
          data = await getSlackChannels(accessToken)
          break
        case 'jira':
          if (!integration.external_account_id) {
            throw new Error('Jira cloudId not found')
          }
          data = await getJiraProjects(accessToken, integration.external_account_id)
          break
        default:
          throw new Error(`Unknown provider: ${provider}`)
      }

      return new Response(JSON.stringify({ data, connected: true }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    return new Response(JSON.stringify({ error: 'Invalid action' }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (error) {
    console.error('Error:', error)
    const message = error instanceof Error ? error.message : 'Unknown error'
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
