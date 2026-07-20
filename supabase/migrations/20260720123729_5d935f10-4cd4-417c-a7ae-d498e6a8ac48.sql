-- Restore missing GRANTs on Onda 5 tables and re-grant user_roles for authenticated
GRANT SELECT ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.invite_codes TO authenticated;
GRANT ALL ON public.invite_codes TO service_role;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.invite_redemptions TO authenticated;
GRANT ALL ON public.invite_redemptions TO service_role;

GRANT SELECT, INSERT ON public.user_activity_logs TO authenticated;
GRANT ALL ON public.user_activity_logs TO service_role;

-- Fix mutable search_path on internal helper (no behavior change)
CREATE OR REPLACE FUNCTION public._generate_invite_code()
 RETURNS text
 LANGUAGE plpgsql
 SET search_path = public
AS $function$
DECLARE
  alphabet text := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  v_code text;
  i int;
  tries int := 0;
BEGIN
  LOOP
    v_code := '';
    FOR i IN 1..7 LOOP
      v_code := v_code || substr(alphabet, 1 + floor(random() * length(alphabet))::int, 1);
    END LOOP;
    IF NOT EXISTS (SELECT 1 FROM public.invite_codes WHERE code = v_code) THEN
      RETURN v_code;
    END IF;
    tries := tries + 1;
    IF tries > 10 THEN RETURN v_code || substr(md5(random()::text), 1, 4); END IF;
  END LOOP;
END;
$function$;