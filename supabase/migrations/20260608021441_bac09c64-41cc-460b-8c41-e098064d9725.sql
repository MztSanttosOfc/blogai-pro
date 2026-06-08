-- profiles: restrict client writes to safe columns only (no plan/credits escalation).
REVOKE INSERT, UPDATE, DELETE ON public.profiles FROM authenticated;
REVOKE INSERT, UPDATE, DELETE ON public.profiles FROM anon;
GRANT INSERT (id, email, full_name) ON public.profiles TO authenticated;
GRANT UPDATE (full_name) ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;

-- Financial tables: no client-side writes; managed exclusively by the server.
REVOKE INSERT, UPDATE, DELETE ON public.payments FROM authenticated, anon;
REVOKE INSERT, UPDATE, DELETE ON public.subscriptions FROM authenticated, anon;
REVOKE INSERT, UPDATE, DELETE ON public.credit_transactions FROM authenticated, anon;
GRANT ALL ON public.payments TO service_role;
GRANT ALL ON public.subscriptions TO service_role;
GRANT ALL ON public.credit_transactions TO service_role;

-- Defense-in-depth: explicit restrictive policies documenting that clients
-- may never write to these financial tables (reads stay scoped to the owner).
CREATE POLICY "No client writes to payments"
  ON public.payments AS RESTRICTIVE FOR INSERT TO authenticated, anon WITH CHECK (false);
CREATE POLICY "No client updates to payments"
  ON public.payments AS RESTRICTIVE FOR UPDATE TO authenticated, anon USING (false);
CREATE POLICY "No client deletes to payments"
  ON public.payments AS RESTRICTIVE FOR DELETE TO authenticated, anon USING (false);

CREATE POLICY "No client writes to subscriptions"
  ON public.subscriptions AS RESTRICTIVE FOR INSERT TO authenticated, anon WITH CHECK (false);
CREATE POLICY "No client updates to subscriptions"
  ON public.subscriptions AS RESTRICTIVE FOR UPDATE TO authenticated, anon USING (false);
CREATE POLICY "No client deletes to subscriptions"
  ON public.subscriptions AS RESTRICTIVE FOR DELETE TO authenticated, anon USING (false);

CREATE POLICY "No client writes to credit_transactions"
  ON public.credit_transactions AS RESTRICTIVE FOR INSERT TO authenticated, anon WITH CHECK (false);
CREATE POLICY "No client updates to credit_transactions"
  ON public.credit_transactions AS RESTRICTIVE FOR UPDATE TO authenticated, anon USING (false);
CREATE POLICY "No client deletes to credit_transactions"
  ON public.credit_transactions AS RESTRICTIVE FOR DELETE TO authenticated, anon USING (false);