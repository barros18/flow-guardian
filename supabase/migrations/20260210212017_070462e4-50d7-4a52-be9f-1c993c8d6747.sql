
-- 1. Drop the SELECT policy that exposes tokens
DROP POLICY IF EXISTS "Users can view their own integrations" ON public.integrations;

-- 2. Create a secure view that excludes sensitive fields
CREATE OR REPLACE VIEW public.integrations_safe
WITH (security_invoker = on) AS
SELECT
  id,
  user_id,
  organization_id,
  provider,
  type,
  status,
  external_account_id,
  scopes,
  created_at,
  updated_at,
  expires_at
FROM public.integrations;

-- 3. Add a restrictive SELECT policy on base table (deny all client SELECT)
CREATE POLICY "No direct SELECT on integrations"
  ON public.integrations FOR SELECT
  USING (false);

-- 4. Grant SELECT on the view to authenticated users
GRANT SELECT ON public.integrations_safe TO authenticated;

-- 5. Add RLS-like filtering via the view (security_invoker means caller's RLS applies,
--    but since base table SELECT is denied, we need a separate approach)
-- Actually with security_invoker=on AND base table SELECT USING(false), the view won't work.
-- Instead, use security_definer view with its own filtering:
DROP VIEW IF EXISTS public.integrations_safe;

CREATE OR REPLACE VIEW public.integrations_safe
WITH (security_invoker = off) AS
SELECT
  id,
  user_id,
  organization_id,
  provider,
  type,
  status,
  external_account_id,
  scopes,
  created_at,
  updated_at,
  expires_at
FROM public.integrations;

-- The view owner (postgres) bypasses RLS. We need row filtering in the view itself:
DROP VIEW IF EXISTS public.integrations_safe;

CREATE VIEW public.integrations_safe AS
SELECT
  id,
  user_id,
  organization_id,
  provider,
  type,
  status,
  external_account_id,
  scopes,
  created_at,
  updated_at,
  expires_at
FROM public.integrations
WHERE user_id = auth.uid();

GRANT SELECT ON public.integrations_safe TO authenticated;
