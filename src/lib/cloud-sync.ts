import { useEffect, useState } from "react";
import type { Session } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import { applyRuntimeConfig, readRuntimeConfig, RUNTIME_EVENT } from "@/lib/ai-hema-runtime";
import { getAppState, setAppState } from "@/lib/app-state";
import { loadCloudChanges } from "@/lib/ai-changes";

/** Keeps workspace settings and AI Hema's change history in the backend for the signed-in user. */
export function useSession() {
  const [session, setSession] = useState<Session | null>(null);
  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSession(data.session));
    const { data } = supabase.auth.onAuthStateChange((_e, s) => setSession(s));
    return () => data.subscription.unsubscribe();
  }, []);
  return session;
}

let timer: ReturnType<typeof setTimeout> | undefined;
let loading = false;

async function save(uid: string) {
  const { error } = await supabase.from("workspace_state").upsert({ user_id: uid, app_state: getAppState() as never, runtime_config: readRuntimeConfig() as never, updated_at: new Date().toISOString() });
  if (error) console.error("[workspace_state] save failed", error.message);
}

export function startCloudSync(uid: string) {
  const queue = () => { if (loading) return; clearTimeout(timer); timer = setTimeout(() => void save(uid), 800); };
  loading = true;
  void (async () => {
    const { data, error } = await supabase.from("workspace_state").select("app_state, runtime_config").eq("user_id", uid).maybeSingle();
    if (error) console.error("[workspace_state] load failed", error.message);
    if (data) {
      setAppState(data.app_state as never);
      applyRuntimeConfig({ ...readRuntimeConfig(), ...(data.runtime_config as object) });
    }
    await loadCloudChanges();
    loading = false;
    if (!data) void save(uid);
  })();
  window.addEventListener("hema-gogo-app-state-change", queue);
  window.addEventListener(RUNTIME_EVENT, queue);
  return () => {
    window.removeEventListener("hema-gogo-app-state-change", queue);
    window.removeEventListener(RUNTIME_EVENT, queue);
  };
}

export function useCloudSync() {
  const session = useSession();
  const uid = session?.user.id;
  useEffect(() => (uid ? startCloudSync(uid) : undefined), [uid]);
  return session;
}
