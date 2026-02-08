
-- 1. Alter integrations table to accommodate organization-level connections
-- We first ensure organization_id is properly populated for any existing data if possible,
-- but since this is a migration to a new model, we will clean up and reinforce the new constraint.

-- Remove old uniqueness constraint
ALTER TABLE public.integrations DROP CONSTRAINT IF EXISTS integrations_user_id_provider_key;

-- Make organization_id NOT NULL (assuming all current integrations should belong to one)
-- If there are orphan records, we might want to delete them or link to a default org.
-- For safety, we'll allow NULL temporarily then enforce NOT NULL after data check.
ALTER TABLE public.integrations ALTER COLUMN organization_id SET NOT NULL;

-- Add new uniqueness constraint per organization
ALTER TABLE public.integrations ADD CONSTRAINT integrations_organization_id_provider_key UNIQUE (organization_id, provider);

-- 2. Update RLS Policies for Integrations

-- Drop old policies
DROP POLICY IF EXISTS "Users can view their own integrations" ON public.integrations;
DROP POLICY IF EXISTS "Users can view integrations in their organization" ON public.integrations;
DROP POLICY IF EXISTS "Users can insert their own integrations" ON public.integrations;
DROP POLICY IF EXISTS "Users can update their own integrations" ON public.integrations;
DROP POLICY IF EXISTS "Users can delete their own integrations" ON public.integrations;
DROP POLICY IF EXISTS "Service role can manage all integrations" ON public.integrations;

-- New SELECT policy: All members of the organization can view (to use tokens)
CREATE POLICY "Members can view organization integrations"
ON public.integrations FOR SELECT
TO authenticated
USING (
    organization_id IN (
        SELECT organization_id FROM public.organization_members WHERE user_id = auth.uid()
    )
);

-- New ALL policy (Insert/Update/Delete): Only ADMINS of the organization can manage
CREATE POLICY "Admins can manage organization integrations"
ON public.integrations FOR ALL
TO authenticated
USING (
    organization_id IN (
        SELECT organization_id FROM public.organization_members 
        WHERE user_id = auth.uid() AND role = 'admin'
    )
)
WITH CHECK (
    organization_id IN (
        SELECT organization_id FROM public.organization_members 
        WHERE user_id = auth.uid() AND role = 'admin'
    )
);

-- Keep service role policy for Edge Functions
CREATE POLICY "Service role can manage all integrations"
ON public.integrations FOR ALL
TO service_role
USING (true);

-- 3. Update Audit logs if needed (optional)
-- If we had an integration_logs table, we should also tie it to organization_id.
