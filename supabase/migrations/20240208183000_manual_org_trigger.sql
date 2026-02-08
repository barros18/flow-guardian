
-- Disable automatic workspace creation in trigger

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    full_name TEXT;
BEGIN
    full_name := COALESCE(NEW.raw_user_meta_data->>'name', split_part(NEW.email, '@', 1));
    
    -- ONLY create profile. Organization will be created manually in Onboarding.
    INSERT INTO public.profiles (user_id, name, email, avatar, organization_id)
    VALUES (
        NEW.id,
        full_name,
        NEW.email,
        UPPER(LEFT(full_name, 1)) || UPPER(LEFT(COALESCE(SPLIT_PART(full_name, ' ', 2), ''), 1)),
        NULL -- No organization yet
    )
    ON CONFLICT (user_id) DO UPDATE 
    SET name = EXCLUDED.name;

    -- Set default role as member (or empty) until onboarding
    INSERT INTO public.user_roles (user_id, role)
    VALUES (NEW.id, 'member')
    ON CONFLICT (user_id) DO NOTHING;

    RETURN NEW;
END;
$$;
