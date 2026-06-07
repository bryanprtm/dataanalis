
REVOKE EXECUTE ON FUNCTION public.has_role(UUID, app_role) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.is_admin(UUID) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.touch_updated_at() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.has_role(UUID, app_role) TO service_role;
GRANT EXECUTE ON FUNCTION public.is_admin(UUID) TO service_role;

-- tighten ai_analyses insert
DROP POLICY IF EXISTS "ai_analyses_insert_auth" ON public.ai_analyses;
CREATE POLICY "ai_analyses_insert_auth" ON public.ai_analyses FOR INSERT TO authenticated
  WITH CHECK (auth.uid() IS NOT NULL);
