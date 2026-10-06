CREATE TABLE public.workspace_state (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  app_state jsonb NOT NULL DEFAULT '{}'::jsonb,
  runtime_config jsonb NOT NULL DEFAULT '{}'::jsonb,
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.workspace_state TO authenticated;
GRANT ALL ON public.workspace_state TO service_role;
ALTER TABLE public.workspace_state ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Own workspace state" ON public.workspace_state FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE TABLE public.ai_changes (
  id text NOT NULL,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  kind text NOT NULL,
  title text NOT NULL,
  target text,
  file_path text,
  before jsonb,
  after jsonb,
  code text,
  status text NOT NULL DEFAULT 'pending',
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.ai_changes TO authenticated;
GRANT ALL ON public.ai_changes TO service_role;
ALTER TABLE public.ai_changes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Own AI changes" ON public.ai_changes FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);