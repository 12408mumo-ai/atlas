import { createClient, type SupabaseClient } from "@supabase/supabase-js";

export type AtlasCloudRow = {
  world_state: Record<string, unknown>;
  memories_state: Record<string, unknown>;
  assistant_chat: unknown[];
  assistant_preferences: Record<string, unknown>;
};

let browserClient: SupabaseClient | null = null;

/** Supabase's publishable/anon key is safe in browser code when RLS is enabled. */
export function getSupabaseBrowserClient(): SupabaseClient | null {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anonKey) return null;
  if (!browserClient) {
    browserClient = createClient(url, anonKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
      },
    });
  }
  return browserClient;
}

export async function loadAtlasCloudRow(): Promise<{ userId: string; row: AtlasCloudRow | null } | null> {
  const supabase = getSupabaseBrowserClient();
  if (!supabase) return null;

  const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
  if (sessionError) throw sessionError;
  const user = sessionData.session?.user;
  if (!user) return null;

  const { data, error } = await supabase
    .from("atlas_user_data")
    .select("world_state, memories_state, assistant_chat, assistant_preferences")
    .eq("user_id", user.id)
    .maybeSingle();
  if (error) throw error;
  return { userId: user.id, row: data as AtlasCloudRow | null };
}

async function verifyExpectedUser(userId?: string): Promise<boolean> {
  const supabase = getSupabaseBrowserClient();
  if (!supabase) return false;
  const { data, error } = await supabase.auth.getSession();
  if (error) throw error;
  const currentId = data.session?.user.id;
  if (!currentId) return false;
  if (userId && userId !== currentId) return false;
  return true;
}

export async function saveAtlasWorldState(state: Record<string, unknown>, userId?: string): Promise<void> {
  const supabase = getSupabaseBrowserClient();
  if (!supabase || !(await verifyExpectedUser(userId))) return;
  const { error } = await supabase.rpc("save_atlas_world_state", { p_state: state });
  if (error) throw error;
}

export async function saveAtlasMemoriesState(state: Record<string, unknown>, userId?: string): Promise<void> {
  const supabase = getSupabaseBrowserClient();
  if (!supabase || !(await verifyExpectedUser(userId))) return;
  const { error } = await supabase.rpc("save_atlas_memories_state", { p_state: state });
  if (error) throw error;
}

export async function saveAtlasAssistantChat(chat: unknown[], userId?: string): Promise<void> {
  const supabase = getSupabaseBrowserClient();
  if (!supabase || !(await verifyExpectedUser(userId))) return;
  const { error } = await supabase.rpc("save_atlas_assistant_chat", { p_chat: chat });
  if (error) throw error;
}

export async function saveAtlasAssistantPreferences(
  preferences: Record<string, unknown>,
  userId?: string
): Promise<void> {
  const supabase = getSupabaseBrowserClient();
  if (!supabase || !(await verifyExpectedUser(userId))) return;
  const { error } = await supabase.rpc("save_atlas_assistant_preferences", { p_preferences: preferences });
  if (error) throw error;
}
