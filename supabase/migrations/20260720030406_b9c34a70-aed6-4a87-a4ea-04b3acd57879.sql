
-- Stripe international payments support (BlogAI Pro v1.1)
UPDATE public.plans SET price_usd_cents = 990 WHERE id = 'pro' AND price_usd_cents IS NULL;
UPDATE public.plans SET price_usd_cents = 2490 WHERE id = 'premium' AND price_usd_cents IS NULL;
UPDATE public.plans SET price_usd_cents = 100 WHERE id = 'teste' AND price_usd_cents IS NULL;

ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS stripe_customer_id text;
ALTER TABLE public.subscriptions ADD COLUMN IF NOT EXISTS stripe_subscription_id text;
CREATE INDEX IF NOT EXISTS idx_subscriptions_stripe_sub ON public.subscriptions(stripe_subscription_id);
CREATE INDEX IF NOT EXISTS idx_profiles_stripe_customer ON public.profiles(stripe_customer_id);
