-- Restaura GRANTs faltantes em public.profiles.
-- RLS continua ativa; policies existentes (auth.uid() = id) garantem que
-- cada usuário só acesse a própria linha. service_role mantém acesso total
-- para webhooks e operações administrativas.
GRANT SELECT, INSERT, UPDATE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;