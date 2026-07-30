const FALLBACK_SUPABASE_URL = 'https://iupukpcsobzlbgsawruu.supabase.co';
const FALLBACK_SUPABASE_PUBLISHABLE_KEY = 'sb_publishable_b68vTmuM9FlyJtUAuuLGWw_wwNMlcp3';
const FALLBACK_APP_URL = 'https://app.flowkave.tech';

export function getSupabaseEnv() {
  return {
    url: process.env.NEXT_PUBLIC_SUPABASE_URL ?? FALLBACK_SUPABASE_URL,
    publishableKey:
      process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ??
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ??
      FALLBACK_SUPABASE_PUBLISHABLE_KEY
  };
}

export function isSupabaseConfigured() {
  const env = getSupabaseEnv();
  return Boolean(env.url && env.publishableKey);
}

export function getAppBaseUrl() {
  return (
    process.env.NEXT_PUBLIC_APP_URL ??
    process.env.NEXT_PUBLIC_SITE_URL ??
    FALLBACK_APP_URL
  ).replace(/\/$/, '');
}
