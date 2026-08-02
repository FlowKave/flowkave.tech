import { SupabaseClient, User } from '@supabase/supabase-js';

type TenantRow = { id: string; name: string; slug: string; owner_id: string };

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

export async function ensureTenantForUser(supabase: SupabaseClient, user: User) {
  const owned = await supabase
    .from('tenants')
    .select('id,name,slug,owner_id')
    .eq('owner_id', user.id)
    .order('created_at', { ascending: true })
    .limit(1)
    .maybeSingle<TenantRow>();

  if (owned.error) throw new Error(owned.error.message);
  if (owned.data) return owned.data;

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

  return tenant;
}

export function portalIdentityFor(user: User, tenant: TenantRow) {
  return {
    tenantId: tenant.id,
    tenant: { id: tenant.id, name: tenant.name, slug: tenant.slug },
    businessName: tenant.name || userBusinessName(user),
    ownerName: userOwnerName(user),
    ownerEmail: user.email || '',
    phone: String(user.user_metadata?.phone || ''),
  };
}
