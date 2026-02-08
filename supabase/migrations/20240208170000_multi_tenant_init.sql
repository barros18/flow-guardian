
-- 1. Create organizations table
CREATE TABLE public.organizations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- 2. Create organization_members table
CREATE TABLE public.organization_members (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE NOT NULL,
    role TEXT CHECK (role IN ('admin', 'member')) NOT NULL,
    created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
    UNIQUE (user_id, organization_id)
);

-- 3. Update profiles table to include organization_id
ALTER TABLE public.profiles ADD COLUMN organization_id UUID REFERENCES public.organizations(id);

-- 4. Update integrations table to include organization_id
ALTER TABLE public.integrations ADD COLUMN organization_id UUID REFERENCES public.organizations(id);

-- 5. Enable RLS on new tables
ALTER TABLE public.organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.organization_members ENABLE ROW LEVEL SECURITY;

-- 6. RLS Policies for Organizations
CREATE POLICY "Users can view their own organization"
    ON public.organizations FOR SELECT
    USING (id IN (
        SELECT organization_id FROM public.organization_members WHERE user_id = auth.uid()
    ));

-- 7. RLS Policies for Organization Members
CREATE POLICY "Members can view other members in their organization"
    ON public.organization_members FOR SELECT
    USING (organization_id IN (
        SELECT organization_id FROM public.organization_members WHERE user_id = auth.uid()
    ));

-- 8. RLS Policies for Profiles (updated for multi-tenant)
DROP POLICY IF EXISTS "Users can view all profiles" ON public.profiles;
CREATE POLICY "Users can view profiles in their organization"
    ON public.profiles FOR SELECT
    USING (organization_id IN (
        SELECT organization_id FROM public.organization_members WHERE user_id = auth.uid()
    ));

-- 9. RLS Policies for Integrations (updated for multi-tenant)
-- We'll keep the user-specific check but ensure it's bound by organization if needed
-- Actually, for integrations, organization-wide visibility might be desired for admins, 
-- but let's stick to the prompt's isolation.
DROP POLICY IF EXISTS "Users can view their own integrations" ON public.integrations;
CREATE POLICY "Users can view integrations in their organization"
    ON public.integrations FOR SELECT
    USING (organization_id IN (
        SELECT organization_id FROM public.organization_members WHERE user_id = auth.uid()
    ));

-- 10. Update Handle New User Function
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    new_org_id UUID;
    full_name TEXT;
BEGIN
    full_name := COALESCE(NEW.raw_user_meta_data->>'name', split_part(NEW.email, '@', 1));
    
    -- Create personal workspace
    INSERT INTO public.organizations (name)
    VALUES ('Workspace de ' || full_name)
    RETURNING id INTO new_org_id;

    -- Add as admin member
    INSERT INTO public.organization_members (user_id, organization_id, role)
    VALUES (NEW.id, new_org_id, 'admin');

    -- Create profile linked to org
    INSERT INTO public.profiles (user_id, name, email, avatar, organization_id)
    VALUES (
        NEW.id,
        full_name,
        NEW.email,
        UPPER(LEFT(full_name, 1)) || UPPER(LEFT(SPLIT_PART(full_name, ' ', 2), 1)),
        new_org_id
    );

    -- Default app role (admin for the first user of the workspace)
    INSERT INTO public.user_roles (user_id, role)
    VALUES (NEW.id, 'admin');

    RETURN NEW;
END;
$$;

-- Note: user_roles migration already exists, we'll just ensure it interacts well.
-- We might want to link user_roles to organization_id too later, but for now this isolations works.
