import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { env } from '../config/env';

let supabaseServer: SupabaseClient | null = null;

export function getSupabaseAdmin(): SupabaseClient | null {
  if (!env.hasSupabase) return null;
  if (!supabaseServer) {
    supabaseServer = createClient(env.SUPABASE_URL, env.SUPABASE_KEY, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });
  }
  return supabaseServer;
}

export async function safeSupabaseRun<T>(
  fn: (sb: SupabaseClient) => PromiseLike<T>,
): Promise<T | null> {
  const sb = getSupabaseAdmin();
  if (!sb) return null;
  try {
    return await fn(sb);
  } catch {
    return null;
  }
}

export async function checkSupabaseTablesReady(): Promise<{
  connected: boolean;
  tablesReady: boolean;
  error?: string;
}> {
  const sb = getSupabaseAdmin();
  if (!sb) {
    return { connected: false, tablesReady: false, error: 'Supabase not configured' };
  }
  try {
    const { error } = await sb.from('trips').select('id', { count: 'exact', head: true });
    if (error) {
      return { connected: true, tablesReady: false, error: error.message };
    }
    const { error: expErr } = await sb
      .from('expenses')
      .select('id', { count: 'exact', head: true });
    if (expErr) {
      return { connected: true, tablesReady: false, error: expErr.message };
    }
    return { connected: true, tablesReady: true };
  } catch (err) {
    return {
      connected: false,
      tablesReady: false,
      error: err instanceof Error ? err.message : 'Supabase probe failed',
    };
  }
}
