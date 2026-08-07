import { createClient } from '@supabase/supabase-js';
import { getSupabaseEnv, getSupabaseServiceRoleKey } from './config';

export function createAdminClient() {
  const { url } = getSupabaseEnv();
  const serviceRoleKey = getSupabaseServiceRoleKey();

  if (!url || !serviceRoleKey) return null;

  return createClient(url, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}
