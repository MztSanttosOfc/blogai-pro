CREATE OR REPLACE FUNCTION public.admin_adjust_credits(p_user_id uuid, p_mode text, p_amount integer, p_reason text DEFAULT NULL::text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_admin uuid := auth.uid();
  v_old integer;
  v_new integer;
  v_delta integer;
  v_target_email text;
  v_admin_email text;
BEGIN
  IF NOT public.is_admin(v_admin) THEN
    RAISE EXCEPTION 'forbidden';
  END IF;
  IF p_mode NOT IN ('add','remove','set') THEN
    RAISE EXCEPTION 'invalid_mode';
  END IF;
  IF p_amount < 0 THEN
    RAISE EXCEPTION 'invalid_amount';
  END IF;

  SELECT credits, email INTO v_old, v_target_email FROM public.profiles WHERE id = p_user_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'user_not_found'; END IF;
  SELECT email INTO v_admin_email FROM public.profiles WHERE id = v_admin;

  v_new := CASE p_mode
    WHEN 'add' THEN v_old + p_amount
    WHEN 'remove' THEN GREATEST(0, v_old - p_amount)
    ELSE p_amount END;

  v_delta := v_new - v_old;

  UPDATE public.profiles SET credits = v_new, updated_at = now() WHERE id = p_user_id;

  -- Record the movement using VALID credit_txn_type enum values only
  -- (grant | consume | renewal | purchase | adjustment). Increases use 'grant'
  -- (positive amount); decreases use 'adjustment' (negative amount).
  INSERT INTO public.credit_transactions (user_id, type, amount, balance_after, description)
  VALUES (p_user_id,
          (CASE WHEN v_delta >= 0 THEN 'grant' ELSE 'adjustment' END)::credit_txn_type,
          v_delta, v_new,
          COALESCE(p_reason, 'Ajuste manual de créditos pelo administrador'));

  INSERT INTO public.admin_audit_logs (action, admin_id, admin_email, target_user_id, target_email, old_value, new_value, details)
  VALUES ('credits.adjust', v_admin, v_admin_email, p_user_id, v_target_email,
          jsonb_build_object('credits', v_old), jsonb_build_object('credits', v_new),
          COALESCE(p_reason, 'Ajuste manual (' || p_mode || ' ' || p_amount || ')'));

  RETURN jsonb_build_object('ok', true, 'credits', v_new, 'delta', v_delta);
END;
$function$;