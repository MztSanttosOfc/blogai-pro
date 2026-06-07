INSERT INTO public.plans (id, name, price_cents, monthly_credits, is_unlimited, features, sort_order, active)
VALUES ('teste', 'Teste', 100, 10, false, '["Plano de teste de integração de pagamento"]'::jsonb, 99, true)
ON CONFLICT (id) DO UPDATE
  SET name = EXCLUDED.name,
      price_cents = EXCLUDED.price_cents,
      monthly_credits = EXCLUDED.monthly_credits,
      is_unlimited = EXCLUDED.is_unlimited,
      active = EXCLUDED.active,
      updated_at = now();