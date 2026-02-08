
-- Consolidating multi-tenant structure and fixing triggers

-- 1. Organizations table
CREATE TABLE IF NOT EXISTS public.organizations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- 2. Organization members table
CREATE TABLE IF NOT EXISTS public.organization_members (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE NOT NULL,
    role TEXT CHECK (role IN ('admin', 'member')) NOT NULL,
    created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
    UNIQUE (user_id, organization_id)
);

-- 3. Ensure profiles has organization_id
DO $$ 
BEGIN 
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='profiles' AND column_name='organization_id') THEN
        ALTER TABLE public.profiles ADD COLUMN organization_id UUID REFERENCES public.organizations(id);
    END IF;
END $$;

-- 4. Enable RLS
ALTER TABLE public.organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.organization_members ENABLE ROW LEVEL SECURITY;

-- 5. RLS Policies
DROP POLICY IF EXISTS "Users can view their own organization" ON public.organizations;
CREATE POLICY "Users can view their own organization"
    ON public.organizations FOR SELECT
    USING (id IN (
        SELECT organization_id FROM public.organization_members WHERE user_id = auth.uid()
    ));

DROP POLICY IF EXISTS "Members can view other members in their organization" ON public.organization_members;
CREATE POLICY "Members can view other members in their organization"
    ON public.organization_members FOR SELECT
    USING (organization_id IN (
        SELECT organization_id FROM public.organization_members WHERE user_id = auth.uid()
    ));

DROP POLICY IF EXISTS "Admins can manage members" ON public.organization_members;
CREATE POLICY "Admins can manage members"
    ON public.organization_members FOR ALL
    USING (organization_id IN (
        SELECT organization_id FROM public.organization_members WHERE user_id = auth.uid() AND role = 'admin'
    ));

-- 6. Updated handle_new_user trigger function
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
    
    -- 1. Create personal workspace
    INSERT INTO public.organizations (name)
    VALUES ('Workspace de ' || full_name)
    RETURNING id INTO new_org_id;

    -- 2. Add as admin member
    INSERT INTO public.organization_members (user_id, organization_id, role)
    VALUES (NEW.id, new_org_id, 'admin');

    -- 3. Create profile linked to org (upsert for resilience)
    INSERT INTO public.profiles (user_id, name, email, avatar, organization_id)
    VALUES (
        NEW.id,
        full_name,
        NEW.email,
        UPPER(LEFT(full_name, 1)) || UPPER(LEFT(COALESCE(SPLIT_PART(full_name, ' ', 2), ''), 1)),
        new_org_id
    )
    ON CONFLICT (user_id) DO UPDATE 
    SET organization_id = EXCLUDED.organization_id,
        name = EXCLUDED.name;

    -- 4. Set admin role in user_roles (Global role)
    INSERT INTO public.user_roles (user_id, role)
    VALUES (NEW.id, 'admin')
    ON CONFLICT (user_id) DO UPDATE SET role = 'admin';

    RETURN NEW;
END;
$$;
