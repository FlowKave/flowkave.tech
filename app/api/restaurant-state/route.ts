import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '../../../lib/supabase/server';
import { createAdminClient } from '../../../lib/supabase/admin';
import { getManagerSession } from '../../../lib/restaurant/manager-session';
import { getStaffSession } from '../../../lib/restaurant/staff-session';
import { ensureTenantForUser, getOwnerTenantChoices, ownerTenantChoicesFor, portalIdentityFor } from '../../../lib/restaurant/tenant';

export const dynamic = 'force-dynamic';

type RestaurantStateRow = {
  tenant_id: string;
  state: unknown;
  version: number | string;
  updated_at: string;
  updated_by: string | null;
  device_id: string | null;
};

async function authContext() {
  const supabase = await createClient();
  const manager = await getManagerSession();
  if (manager) {
    const admin = createAdminClient();
    if (!admin) return { supabase, user: null, tenant: null, identity: null, manager: null };
    return {
      supabase: admin,
      user: { id: manager.staffUserId },
      tenant: { id: manager.tenantId, name: manager.restaurantName, slug: manager.tenantId, owner_id: manager.staffUserId },
      identity: {
        tenantId: manager.tenantId,
        tenant: { id: manager.tenantId, name: manager.restaurantName, slug: manager.tenantId },
        businessName: manager.restaurantName,
        ownerName: manager.managerName,
        ownerEmail: manager.email,
        phone: '',
        tenantChoices: manager.tenantChoices || [],
      },
      manager,
    };
  }
  const staff = await getStaffSession();
  if (staff) {
    const admin = createAdminClient();
    if (!admin) return { supabase, user: null, tenant: null, identity: null, manager: null };
    return {
      supabase: admin,
      user: { id: staff.staffUserId },
      tenant: { id: staff.tenantId, name: staff.restaurantName, slug: staff.tenantId, owner_id: staff.staffUserId },
      identity: {
        tenantId: staff.tenantId,
        tenant: { id: staff.tenantId, name: staff.restaurantName, slug: staff.tenantId },
        businessName: staff.restaurantName,
        ownerName: staff.staffName,
        ownerEmail: '',
        phone: '',
        tenantChoices: [],
      },
      manager: null,
      staff,
    };
  }
  const { data, error } = await supabase.auth.getUser();
  if (error || !data.user) return { supabase, user: null, tenant: null, identity: null };
  const tenant = await ensureTenantForUser(supabase, data.user);
  const ownerTenants = await getOwnerTenantChoices(supabase, data.user);
  return { supabase, user: data.user, tenant, identity: portalIdentityFor(data.user, tenant, ownerTenantChoicesFor(ownerTenants)), manager: null, staff: null };
}

function unauthorized() {
  return NextResponse.json({ error: 'UNAUTHENTICATED' }, { status: 401 });
}

function normalizeEmail(email: unknown) {
  return String(email || '').trim().toLowerCase();
}

function hasManagerPassword(staff: any) {
  return Boolean(staff?.passwordHash && staff?.passwordSalt);
}

function isActiveManager(staff: any, email = '') {
  const matchesEmail = !email || normalizeEmail(staff?.email) === email;
  return matchesEmail && staff?.role === 'manager' && staff?.active !== false;
}

async function hydrateExistingManagerCredentials(sharedState: any, currentTenantId: string) {
  const staffUsers = Array.isArray(sharedState?.staffUsers) ? sharedState.staffUsers : [];
  const managerEmailsNeedingCredentials = [...new Set(staffUsers
    .filter((staff: any) => isActiveManager(staff) && normalizeEmail(staff.email) && !hasManagerPassword(staff))
    .map((staff: any) => normalizeEmail(staff.email)))];
  if (!managerEmailsNeedingCredentials.length) return sharedState;

  const admin = createAdminClient();
  if (!admin) return sharedState;
  const { data, error } = await admin
    .from('restaurant_states')
    .select('tenant_id,state')
    .neq('tenant_id', currentTenantId)
    .limit(1000);
  if (error) throw new Error(error.message);

  const credentialByEmail = new Map<string, { passwordHash: string; passwordSalt: string }>();
  for (const row of data || []) {
    const remoteStaffUsers = Array.isArray((row as any).state?.staffUsers) ? (row as any).state.staffUsers : [];
    for (const staff of remoteStaffUsers) {
      const email = normalizeEmail(staff?.email);
      if (!managerEmailsNeedingCredentials.includes(email)) continue;
      if (!isActiveManager(staff, email) || staff.accessActive === false || !hasManagerPassword(staff)) continue;
      if (!credentialByEmail.has(email)) credentialByEmail.set(email, { passwordHash: staff.passwordHash, passwordSalt: staff.passwordSalt });
    }
  }

  if (!credentialByEmail.size) return sharedState;
  sharedState.staffUsers = staffUsers.map((staff: any) => {
    const email = normalizeEmail(staff?.email);
    const credential = credentialByEmail.get(email);
    if (!credential || !isActiveManager(staff, email) || hasManagerPassword(staff)) return staff;
    const next = { ...staff, ...credential, accessActive: true, linkedExistingManagerAccount: true };
    delete next.password;
    delete next.pin;
    return next;
  });
  return sharedState;
}


function mergeArrayById(existing: any[] = [], incoming: any[] = []) {
  const byId = new Map<string, any>();
  for (const item of existing || []) if (item?.id) byId.set(String(item.id), item);
  for (const item of incoming || []) if (item?.id) byId.set(String(item.id), { ...(byId.get(String(item.id)) || {}), ...item });
  return Array.from(byId.values());
}

function timeValue(value: any) {
  const ms = new Date(value || 0).getTime();
  return Number.isFinite(ms) ? ms : 0;
}

function orderFreshness(order: any) {
  return Math.max(
    timeValue(order?.updatedAt),
    timeValue(order?.statusUpdatedAt),
    timeValue(order?.completedAt),
    timeValue(order?.paidAt),
    ...(Array.isArray(order?.payments) ? order.payments.map((payment: any) => timeValue(payment?.confirmedAt || payment?.createdAt)) : [0]),
    timeValue(order?.createdAt),
  );
}

function mergeOrder(existing: any, incoming: any) {
  if (!existing) return incoming;
  if (!incoming) return existing;
  const existingPaid = existing?.posStatus === 'paid' || Number(existing?.remainingTotal || 0) === 0;
  const incomingPaid = incoming?.posStatus === 'paid' || Number(incoming?.remainingTotal || 0) === 0;
  const preferIncoming = (incomingPaid && !existingPaid) || orderFreshness(incoming) >= orderFreshness(existing);
  const base = preferIncoming ? { ...existing, ...incoming } : { ...incoming, ...existing };
  base.lines = mergeArrayById(existing.lines || [], incoming.lines || []);
  base.payments = mergeArrayById(existing.payments || [], incoming.payments || []);
  base.paymentAllocations = mergeArrayById(existing.paymentAllocations || [], incoming.paymentAllocations || []);
  if (incomingPaid || existingPaid) {
    base.posStatus = 'paid';
    base.remainingTotal = 0;
    base.status = 'completed';
    base.completedAt = incoming.completedAt || existing.completedAt || incoming.statusUpdatedAt || existing.statusUpdatedAt || new Date().toISOString();
  }
  return base;
}

function inferMissingDeletedOrderIds(existingState: any, incomingState: any) {
  if (!Array.isArray(existingState?.orders) || !Array.isArray(incomingState?.orders)) return [];
  const incomingOrderIds = new Set(incomingState.orders.map((order: any) => String(order?.id || '')).filter(Boolean));
  const incomingCustomerIds = new Set((incomingState.customers || []).map((customer: any) => String(customer?.id || '')).filter(Boolean));
  return existingState.orders
    .filter((order: any) => order?.id && incomingCustomerIds.has(String(order.customerId || '')) && !incomingOrderIds.has(String(order.id)))
    .map((order: any) => String(order.id));
}

function mergedDeletedOrderIds(existingState: any, incomingState: any) {
  return [...new Set([
    ...(Array.isArray(existingState?.deletedOrderIds) ? existingState.deletedOrderIds : []),
    ...(Array.isArray(incomingState?.deletedOrderIds) ? incomingState.deletedOrderIds : []),
    ...inferMissingDeletedOrderIds(existingState, incomingState),
  ].map((id: any) => String(id || '').trim()).filter(Boolean))];
}

function mergeOrders(existing: any[] = [], incoming: any[] = [], deletedOrderIds: string[] = []) {
  const deleted = new Set((deletedOrderIds || []).map((id) => String(id)));
  const byId = new Map<string, any>();
  for (const order of existing || []) if (order?.id && !deleted.has(String(order.id))) byId.set(String(order.id), order);
  for (const order of incoming || []) if (order?.id && !deleted.has(String(order.id))) byId.set(String(order.id), mergeOrder(byId.get(String(order.id)), order));
  return Array.from(byId.values());
}

function mergeRestaurantState(existingState: any, incomingState: any) {
  if (!existingState || typeof existingState !== 'object') return incomingState;
  const merged = { ...existingState, ...incomingState };
  const deletedOrderIds = mergedDeletedOrderIds(existingState, incomingState);
  merged.deletedOrderIds = deletedOrderIds;
  merged.orders = mergeOrders(Array.isArray(existingState?.orders) ? existingState.orders : [], Array.isArray(incomingState?.orders) ? incomingState.orders : [], deletedOrderIds);
  for (const key of ['shifts', 'ledger', 'restaurantTables']) {
    merged[key] = mergeArrayById(Array.isArray(existingState?.[key]) ? existingState[key] : [], Array.isArray(incomingState?.[key]) ? incomingState[key] : []);
  }
  delete merged.sessions;
  return merged;
}

export async function GET() {
  try {
    const { supabase, user, tenant, identity } = await authContext();
    if (!user || !tenant || !identity) return unauthorized();

    const { data, error } = await supabase
      .from('restaurant_states')
      .select('tenant_id,state,version,updated_at,updated_by,device_id')
      .eq('tenant_id', tenant.id)
      .maybeSingle<RestaurantStateRow>();

    if (error) throw new Error(error.message);

    return NextResponse.json({
      ...identity,
      exists: Boolean(data),
      data: data?.state ?? null,
      updatedAt: data?.version ? Number(data.version) : 0,
      updatedIso: data?.updated_at ?? null,
      updatedBy: data?.updated_by ?? null,
      deviceId: data?.device_id ?? null,
    });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'STATE_LOAD_FAILED' }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const { supabase, user, tenant, identity, manager, staff } = await authContext();
    if (!user || !tenant || !identity) return unauthorized();

    const body = await request.json();
    const state = body?.data;
    if (!state || typeof state !== 'object' || !Array.isArray(state.customers)) {
      return NextResponse.json({ error: 'INVALID_RESTAURANT_STATE' }, { status: 400 });
    }

    // Authenticated tablets can also hold stale local revisions; always mint a
    // fresh server revision and merge with current server state instead of blind overwrite.
    const version = Date.now();
    const deviceId = typeof body?.deviceId === 'string' ? body.deviceId.slice(0, 120) : null;
    const { data: existingRow, error: existingError } = await supabase
      .from('restaurant_states')
      .select('state')
      .eq('tenant_id', tenant.id)
      .maybeSingle<{ state: any }>();
    if (existingError) throw new Error(existingError.message);
    const mergedState = mergeRestaurantState(existingRow?.state, { ...state });
    const sharedState = await hydrateExistingManagerCredentials(mergedState, tenant.id);
    delete (sharedState as any).sessions;

    const { data, error } = await supabase
      .from('restaurant_states')
      .upsert({
        tenant_id: tenant.id,
        state: sharedState,
        version,
        updated_by: manager || staff ? null : user.id,
        device_id: deviceId,
        updated_at: new Date().toISOString(),
      }, { onConflict: 'tenant_id' })
      .select('version,updated_at')
      .single<{ version: number | string; updated_at: string }>();

    if (error) throw new Error(error.message);

    await supabase.from('sync_events').insert({
      tenant_id: tenant.id,
      local_device_id: deviceId,
      event_type: 'restaurant_state_upsert',
      payload: { version: data?.version ?? version },
    });

    return NextResponse.json({
      ...identity,
      ok: true,
      exists: true,
      updatedAt: data?.version ? Number(data.version) : version,
      updatedIso: data?.updated_at ?? null,
    });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'STATE_SAVE_FAILED' }, { status: 500 });
  }
}
