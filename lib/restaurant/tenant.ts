import { cookies } from 'next/headers';
import { SupabaseClient, User } from '@supabase/supabase-js';

export type TenantRow = { id: string; name: string; slug: string; owner_id: string };
export type TenantChoice = { tenantId: string; restaurantName: string; role: 'owner' | 'manager' };

export const OWNER_TENANT_COOKIE = 'flowkave_owner_tenant';

function cleanSlug(value: string) {
  const ascii = value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
  return ascii || `restaurant-${Date.now().toString(36)}`;
}

function userBusinessName(user: User) {
  const meta = user.user_metadata || {};
  return String(meta.business_name || meta.restaurant_name || meta.full_name || user.email || 'رستوران جدید').trim();
}

function userOwnerName(user: User) {
  const meta = user.user_metadata || {};
  return String(meta.full_name || user.email || 'مالک پکیج').trim();
}

async function selectedOwnerTenantId() {
  const cookieStore = await cookies();
  return cookieStore.get(OWNER_TENANT_COOKIE)?.value || '';
}

export async function setOwnerTenantSelection(tenantId: string) {
  const cookieStore = await cookies();
  cookieStore.set(OWNER_TENANT_COOKIE, tenantId, {
    httpOnly: true,
    sameSite: 'lax',
    secure: true,
    path: '/',
    maxAge: 60 * 60 * 24 * 180,
  });
}

export async function clearOwnerTenantSelection() {
  const cookieStore = await cookies();
  cookieStore.delete(OWNER_TENANT_COOKIE);
}

export async function getOwnerTenantChoices(supabase: SupabaseClient, user: User): Promise<TenantRow[]> {
  const owned = await supabase
    .from('tenants')
    .select('id,name,slug,owner_id')
    .eq('owner_id', user.id)
    .order('created_at', { ascending: true });
  if (owned.error) throw new Error(owned.error.message);
  return (owned.data || []) as TenantRow[];
}

export function ownerTenantChoicesFor(tenants: TenantRow[]): TenantChoice[] {
  return tenants.map((tenant) => ({ tenantId: tenant.id, restaurantName: tenant.name || 'رستوران', role: 'owner' as const }));
}

export async function ensureTenantForUser(supabase: SupabaseClient, user: User) {
  const ownedTenants = await getOwnerTenantChoices(supabase, user);
  if (ownedTenants.length) {
    const selectedId = await selectedOwnerTenantId();
    const selected = ownedTenants.find((tenant) => tenant.id === selectedId) || ownedTenants[0];
    await setOwnerTenantSelection(selected.id);
    return selected;
  }

  const businessName = userBusinessName(user);
  const slug = `${cleanSlug(businessName)}-${crypto.randomUUID().slice(0, 8)}`;

  const created = await supabase
    .from('tenants')
    .insert({ name: businessName, slug, owner_id: user.id })
    .select('id,name,slug,owner_id')
    .single<TenantRow>();
  if (created.error) throw new Error(created.error.message);
  const tenant = created.data;

  const member = await supabase
    .from('tenant_members')
    .insert({ tenant_id: tenant.id, user_id: user.id, role: 'owner' });
  if (member.error) throw new Error(member.error.message);

  const restaurant = await supabase
    .from('restaurants')
    .insert({ tenant_id: tenant.id, name: businessName, city: '' });
  if (restaurant.error) throw new Error(restaurant.error.message);

  const subscription = await supabase.from('subscriptions').insert({
    tenant_id: tenant.id,
    plan_code: 'restaurant_full_test',
    status: 'active',
    coupon_code: 'FLOWKAVE100',
    discount_percent: 100,
    amount_toman: 0,
  });
  if (subscription.error) throw new Error(subscription.error.message);

  await setOwnerTenantSelection(tenant.id);
  return tenant;
}

export async function chooseOwnerTenantForUser(supabase: SupabaseClient, user: User, tenantId: string) {
  const choices = await getOwnerTenantChoices(supabase, user);
  const selected = choices.find((tenant) => tenant.id === tenantId);
  if (!selected) return null;
  await setOwnerTenantSelection(selected.id);
  return selected;
}

export function portalIdentityFor(user: User, tenant: TenantRow, tenantChoices: TenantChoice[] = []) {
  return {
    tenantId: tenant.id,
    tenant: { id: tenant.id, name: tenant.name, slug: tenant.slug },
    businessName: tenant.name || userBusinessName(user),
    ownerName: userOwnerName(user),
    ownerEmail: user.email || '',
    phone: String(user.user_metadata?.phone || ''),
    tenantChoices,
  };
}
