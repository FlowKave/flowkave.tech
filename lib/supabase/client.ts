import { createBrowserClient } from '@supabase/ssr';
import { getSupabaseEnv } from './config';

export function createClient() {
  const { url, publishableKey } = getSupabaseEnv();

  if (!url || !publishableKey) {
    throw new Error('Supabase is not configured. Add NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY to .env.local.');
  }

  return createBrowserClient(url, publishableKey);
}
