
-- Fix integrations_safe view: use org-scoped filtering instead of just user_id
-- This also resolves the SECURITY DEFINER view warning by using explicit WHERE filtering
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
WHERE organization_id IN (
  SELECT organization_id FROM public.profiles WHERE user_id = auth.uid()
)
OR (organization_id IS NULL AND user_id = auth.uid());

GRANT SELECT ON public.integrations_safe TO authenticated;
