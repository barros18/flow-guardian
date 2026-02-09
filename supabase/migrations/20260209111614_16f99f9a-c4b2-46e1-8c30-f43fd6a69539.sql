
-- =============================================
-- FULL BACKEND SCHEMA REBUILD
-- =============================================

-- 1. Create new enums
DO $$ BEGIN
  CREATE TYPE public.integration_type AS ENUM ('GITHUB', 'JIRA', 'SLACK');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE public.integration_status AS ENUM ('CONNECTED', 'ERROR');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE public.pr_status AS ENUM ('OPEN', 'MERGED', 'CLOSED');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE public.build_status AS ENUM ('SUCCESS', 'FAILED', 'RUNNING');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE public.pr_event_type AS ENUM ('OPENED', 'COMMIT', 'REVIEW', 'APPROVED', 'BUILD_SUCCESS', 'BUILD_FAILED', 'MERGED');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE public.alert_type AS ENUM ('PR_INACTIVE', 'PR_APPROVED_NO_MERGE', 'BUILD_FAILED', 'NO_JIRA_TASK');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE public.alert_severity AS ENUM ('NORMAL', 'CRITICAL');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE public.alert_status AS ENUM ('OPEN', 'RESOLVED');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE public.notification_status AS ENUM ('SENT', 'FAILED');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE public.invitation_status AS ENUM ('PENDING', 'ACCEPTED', 'EXPIRED');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- 2. Organizations table
CREATE TABLE IF NOT EXISTS public.organizations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  timezone text NOT NULL DEFAULT 'America/Sao_Paulo',
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.organizations ENABLE ROW LEVEL SECURITY;

-- 3. Add organization_id to profiles (if not exists)
DO $$ BEGIN
  ALTER TABLE public.profiles ADD COLUMN organization_id uuid REFERENCES public.organizations(id);
EXCEPTION WHEN duplicate_column THEN NULL;
END $$;

-- 4. Modify integrations table: add organization_id, type, status columns
DO $$ BEGIN
  ALTER TABLE public.integrations ADD COLUMN organization_id uuid REFERENCES public.organizations(id);
EXCEPTION WHEN duplicate_column THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE public.integrations ADD COLUMN type integration_type;
EXCEPTION WHEN duplicate_column THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE public.integrations ADD COLUMN status integration_status NOT NULL DEFAULT 'CONNECTED';
EXCEPTION WHEN duplicate_column THEN NULL;
END $$;

-- 5. Repositories
CREATE TABLE IF NOT EXISTS public.repositories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  github_repo_id text NOT NULL,
  name text NOT NULL,
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.repositories ENABLE ROW LEVEL SECURITY;

-- 6. Jira Projects
CREATE TABLE IF NOT EXISTS public.jira_projects (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  jira_project_key text NOT NULL,
  name text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.jira_projects ENABLE ROW LEVEL SECURITY;

-- 7. Pull Requests
CREATE TABLE IF NOT EXISTS public.pull_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  repository_id uuid NOT NULL REFERENCES public.repositories(id) ON DELETE CASCADE,
  github_pr_id text NOT NULL,
  title text NOT NULL,
  author_id uuid,
  jira_issue_key text,
  status pr_status NOT NULL DEFAULT 'OPEN',
  is_blocked boolean NOT NULL DEFAULT false,
  ready_for_merge boolean NOT NULL DEFAULT false,
  approvals_count int NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  merged_at timestamptz,
  closed_at timestamptz,
  last_activity_at timestamptz NOT NULL DEFAULT now(),
  last_notified_at timestamptz
);
ALTER TABLE public.pull_requests ENABLE ROW LEVEL SECURITY;

-- 8. Builds
CREATE TABLE IF NOT EXISTS public.builds (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  pull_request_id uuid NOT NULL REFERENCES public.pull_requests(id) ON DELETE CASCADE,
  status build_status NOT NULL DEFAULT 'RUNNING',
  commit_sha text NOT NULL,
  started_at timestamptz NOT NULL DEFAULT now(),
  finished_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.builds ENABLE ROW LEVEL SECURITY;

-- 9. PR Events (timeline)
CREATE TABLE IF NOT EXISTS public.pr_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  pull_request_id uuid NOT NULL REFERENCES public.pull_requests(id) ON DELETE CASCADE,
  type pr_event_type NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.pr_events ENABLE ROW LEVEL SECURITY;

-- 10. Alerts
CREATE TABLE IF NOT EXISTS public.alerts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  pull_request_id uuid NOT NULL REFERENCES public.pull_requests(id) ON DELETE CASCADE,
  type alert_type NOT NULL,
  severity alert_severity NOT NULL DEFAULT 'NORMAL',
  status alert_status NOT NULL DEFAULT 'OPEN',
  created_at timestamptz NOT NULL DEFAULT now(),
  resolved_at timestamptz,
  last_notified_at timestamptz
);
ALTER TABLE public.alerts ENABLE ROW LEVEL SECURITY;

-- 11. Alert Rules
CREATE TABLE IF NOT EXISTS public.alert_rules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  type alert_type NOT NULL,
  threshold_hours int NOT NULL DEFAULT 24,
  enabled boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(organization_id, type)
);
ALTER TABLE public.alert_rules ENABLE ROW LEVEL SECURITY;

-- 12. Notifications Log
CREATE TABLE IF NOT EXISTS public.notifications_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  alert_id uuid NOT NULL REFERENCES public.alerts(id) ON DELETE CASCADE,
  channel text NOT NULL DEFAULT 'SLACK',
  sent_at timestamptz NOT NULL DEFAULT now(),
  status notification_status NOT NULL DEFAULT 'SENT'
);
ALTER TABLE public.notifications_log ENABLE ROW LEVEL SECURITY;

-- 13. Audit Logs
CREATE TABLE IF NOT EXISTS public.audit_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  action text NOT NULL,
  ip_address text,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

-- 14. User Invitations
CREATE TABLE IF NOT EXISTS public.user_invitations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  email text NOT NULL,
  role public.app_role NOT NULL DEFAULT 'developer',
  token text NOT NULL UNIQUE,
  status invitation_status NOT NULL DEFAULT 'PENDING',
  expires_at timestamptz NOT NULL,
  invited_by uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.user_invitations ENABLE ROW LEVEL SECURITY;

-- 15. User Notification Preferences
CREATE TABLE IF NOT EXISTS public.user_notification_preferences (
  user_id uuid PRIMARY KEY,
  notify_pr_inactive boolean NOT NULL DEFAULT true,
  notify_build_failed boolean NOT NULL DEFAULT true,
  notify_pr_no_task boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.user_notification_preferences ENABLE ROW LEVEL SECURITY;

-- 16. Integration Installations
CREATE TABLE IF NOT EXISTS public.integration_installations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  integration_id uuid NOT NULL REFERENCES public.integrations(id) ON DELETE CASCADE,
  external_installation_id text NOT NULL,
  metadata jsonb DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.integration_installations ENABLE ROW LEVEL SECURITY;

-- 17. OAuth States
CREATE TABLE IF NOT EXISTS public.oauth_states (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  provider text NOT NULL,
  state_token text NOT NULL UNIQUE,
  expires_at timestamptz NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.oauth_states ENABLE ROW LEVEL SECURITY;

-- 18. Slack Channels
CREATE TABLE IF NOT EXISTS public.slack_channels (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  integration_id uuid NOT NULL REFERENCES public.integrations(id) ON DELETE CASCADE,
  channel_id text NOT NULL,
  channel_name text NOT NULL,
  is_default boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.slack_channels ENABLE ROW LEVEL SECURITY;

-- =============================================
-- INDEXES
-- =============================================
CREATE INDEX IF NOT EXISTS idx_profiles_org ON public.profiles(organization_id);
CREATE INDEX IF NOT EXISTS idx_integrations_org ON public.integrations(organization_id);
CREATE INDEX IF NOT EXISTS idx_repositories_org ON public.repositories(organization_id);
CREATE INDEX IF NOT EXISTS idx_pull_requests_org ON public.pull_requests(organization_id);
CREATE INDEX IF NOT EXISTS idx_pull_requests_repo ON public.pull_requests(repository_id);
CREATE INDEX IF NOT EXISTS idx_pull_requests_status ON public.pull_requests(status);
CREATE INDEX IF NOT EXISTS idx_pull_requests_activity ON public.pull_requests(last_activity_at);
CREATE INDEX IF NOT EXISTS idx_builds_pr ON public.builds(pull_request_id);
CREATE INDEX IF NOT EXISTS idx_pr_events_pr ON public.pr_events(pull_request_id);
CREATE INDEX IF NOT EXISTS idx_alerts_org ON public.alerts(organization_id);
CREATE INDEX IF NOT EXISTS idx_alerts_pr ON public.alerts(pull_request_id);
CREATE INDEX IF NOT EXISTS idx_alerts_status ON public.alerts(status);
CREATE INDEX IF NOT EXISTS idx_audit_logs_org ON public.audit_logs(organization_id);
CREATE INDEX IF NOT EXISTS idx_user_invitations_org ON public.user_invitations(organization_id);
CREATE INDEX IF NOT EXISTS idx_user_invitations_token ON public.user_invitations(token);
CREATE INDEX IF NOT EXISTS idx_oauth_states_token ON public.oauth_states(state_token);

-- =============================================
-- RLS POLICIES
-- =============================================

-- Helper: check user belongs to org
CREATE OR REPLACE FUNCTION public.user_org_id(_user_id uuid)
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT organization_id FROM public.profiles WHERE user_id = _user_id LIMIT 1
$$;

-- organizations: members can view their own org
CREATE POLICY "Users can view their organization"
  ON public.organizations FOR SELECT
  USING (id = public.user_org_id(auth.uid()));

CREATE POLICY "Service role manages organizations"
  ON public.organizations FOR ALL
  USING (auth.role() = 'service_role');

-- profiles: update existing SELECT policy to be org-scoped
DROP POLICY IF EXISTS "Users can view all profiles" ON public.profiles;
CREATE POLICY "Users can view profiles in their organization"
  ON public.profiles FOR SELECT
  USING (
    organization_id = public.user_org_id(auth.uid())
    OR auth.uid() = user_id
    OR organization_id IS NULL
  );

-- repositories
CREATE POLICY "Org members can view repositories"
  ON public.repositories FOR SELECT
  USING (organization_id = public.user_org_id(auth.uid()));

CREATE POLICY "Admins can manage repositories"
  ON public.repositories FOR ALL
  USING (
    organization_id = public.user_org_id(auth.uid())
    AND public.has_role(auth.uid(), 'admin')
  );

-- jira_projects
CREATE POLICY "Org members can view jira projects"
  ON public.jira_projects FOR SELECT
  USING (organization_id = public.user_org_id(auth.uid()));

CREATE POLICY "Admins can manage jira projects"
  ON public.jira_projects FOR ALL
  USING (
    organization_id = public.user_org_id(auth.uid())
    AND public.has_role(auth.uid(), 'admin')
  );

-- pull_requests
CREATE POLICY "Org members can view pull requests"
  ON public.pull_requests FOR SELECT
  USING (organization_id = public.user_org_id(auth.uid()));

CREATE POLICY "Service role manages pull requests"
  ON public.pull_requests FOR ALL
  USING (auth.role() = 'service_role');

-- builds
CREATE POLICY "Org members can view builds"
  ON public.builds FOR SELECT
  USING (
    pull_request_id IN (
      SELECT id FROM public.pull_requests WHERE organization_id = public.user_org_id(auth.uid())
    )
  );

CREATE POLICY "Service role manages builds"
  ON public.builds FOR ALL
  USING (auth.role() = 'service_role');

-- pr_events
CREATE POLICY "Org members can view pr events"
  ON public.pr_events FOR SELECT
  USING (
    pull_request_id IN (
      SELECT id FROM public.pull_requests WHERE organization_id = public.user_org_id(auth.uid())
    )
  );

CREATE POLICY "Service role manages pr events"
  ON public.pr_events FOR ALL
  USING (auth.role() = 'service_role');

-- alerts
CREATE POLICY "Org members can view alerts"
  ON public.alerts FOR SELECT
  USING (organization_id = public.user_org_id(auth.uid()));

CREATE POLICY "Service role manages alerts"
  ON public.alerts FOR ALL
  USING (auth.role() = 'service_role');

-- alert_rules
CREATE POLICY "Org members can view alert rules"
  ON public.alert_rules FOR SELECT
  USING (organization_id = public.user_org_id(auth.uid()));

CREATE POLICY "Leads and admins can manage alert rules"
  ON public.alert_rules FOR ALL
  USING (
    organization_id = public.user_org_id(auth.uid())
    AND (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'lead'))
  );

-- notifications_log
CREATE POLICY "Org members can view notification logs"
  ON public.notifications_log FOR SELECT
  USING (
    alert_id IN (
      SELECT id FROM public.alerts WHERE organization_id = public.user_org_id(auth.uid())
    )
  );

CREATE POLICY "Service role manages notifications"
  ON public.notifications_log FOR ALL
  USING (auth.role() = 'service_role');

-- audit_logs
CREATE POLICY "Org admins can view audit logs"
  ON public.audit_logs FOR SELECT
  USING (
    organization_id = public.user_org_id(auth.uid())
    AND public.has_role(auth.uid(), 'admin')
  );

CREATE POLICY "Service role manages audit logs"
  ON public.audit_logs FOR ALL
  USING (auth.role() = 'service_role');

-- user_invitations
CREATE POLICY "Org admins can manage invitations"
  ON public.user_invitations FOR ALL
  USING (
    organization_id = public.user_org_id(auth.uid())
    AND public.has_role(auth.uid(), 'admin')
  );

CREATE POLICY "Anyone can view invitation by token"
  ON public.user_invitations FOR SELECT
  USING (true);

-- user_notification_preferences
CREATE POLICY "Users can manage own preferences"
  ON public.user_notification_preferences FOR ALL
  USING (auth.uid() = user_id);

-- integration_installations
CREATE POLICY "Org admins can view installations"
  ON public.integration_installations FOR SELECT
  USING (
    integration_id IN (
      SELECT id FROM public.integrations WHERE organization_id = public.user_org_id(auth.uid())
    )
  );

CREATE POLICY "Service role manages installations"
  ON public.integration_installations FOR ALL
  USING (auth.role() = 'service_role');

-- oauth_states
CREATE POLICY "Service role manages oauth states"
  ON public.oauth_states FOR ALL
  USING (auth.role() = 'service_role');

-- slack_channels
CREATE POLICY "Org members can view slack channels"
  ON public.slack_channels FOR SELECT
  USING (
    integration_id IN (
      SELECT id FROM public.integrations WHERE organization_id = public.user_org_id(auth.uid())
    )
  );

CREATE POLICY "Admins can manage slack channels"
  ON public.slack_channels FOR ALL
  USING (
    integration_id IN (
      SELECT id FROM public.integrations 
      WHERE organization_id = public.user_org_id(auth.uid())
    )
    AND public.has_role(auth.uid(), 'admin')
  );

-- =============================================
-- UPDATE handle_new_user TRIGGER
-- =============================================
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (user_id, name, email, avatar)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'name', split_part(NEW.email, '@', 1)),
    NEW.email,
    UPPER(LEFT(COALESCE(NEW.raw_user_meta_data->>'name', split_part(NEW.email, '@', 1)), 1)) ||
    UPPER(LEFT(SPLIT_PART(COALESCE(NEW.raw_user_meta_data->>'name', split_part(NEW.email, '@', 1)), ' ', 2), 1))
  );
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, 'developer');
  RETURN NEW;
END;
$$;
