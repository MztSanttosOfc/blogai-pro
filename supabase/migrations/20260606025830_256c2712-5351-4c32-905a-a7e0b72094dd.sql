CREATE POLICY "Users can view own blogger connection"
ON public.blogger_connections
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own blogger connection"
ON public.blogger_connections
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own blogger connection"
ON public.blogger_connections
FOR UPDATE
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own blogger connection"
ON public.blogger_connections
FOR DELETE
TO authenticated
USING (auth.uid() = user_id);

DROP TRIGGER IF EXISTS update_blogger_connections_updated_at ON public.blogger_connections;
CREATE TRIGGER update_blogger_connections_updated_at
BEFORE UPDATE ON public.blogger_connections
FOR EACH ROW
EXECUTE FUNCTION public.handle_updated_at();