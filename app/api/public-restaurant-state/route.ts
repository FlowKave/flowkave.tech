import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '../../../lib/supabase/admin';

export const dynamic = 'force-dynamic';

type RestaurantStateRow = {
  tenant_id: string;
  state: any;
  version: number | string;
  updated_at: string;
  device_id: string | null;
};

function tenantIdFrom(request: NextRequest) {
  return String(request.nextUrl.searchParams.get('tenantId') || '').trim();
}

function badRequest(error: string) {
  return NextResponse.json({ error }, { status: 400 });
}

function mergeArrayById(existing: any[] = [], incoming: any[] = []) {
  const byId = new Map<string, any>();
  for (const item of existing || []) if (item?.id) byId.set(String(item.id), item);
  for (const item of incoming || []) if (item?.id) byId.set(String(item.id), { ...(byId.get(String(item.id)) || {}), ...item });
  return Array.from(byId.values());
}


function hallLockTime(lock: any) {
  return Math.max(timeValue(lock?.updatedAt), timeValue(lock?.releasedAt), timeValue(lock?.lockedAt), timeValue(lock?.expiresAt));
}

function isActiveHallLock(lock: any) {
  if (!lock?.id || lock.active === false || lock.releasedAt) return false;
  return !lock.expiresAt || timeValue(lock.expiresAt) > Date.now();
}

function hallLockReleaseTime(lock: any) {
  return Math.max(timeValue(lock?.releasedAt), timeValue(lock?.updatedAt));
}

function mergeHallTableLock(existing: any, incoming: any) {
  if (!existing) return incoming;
  if (!incoming) return existing;
  const existingActive = isActiveHallLock(existing);
  const incomingActive = isActiveHallLock(incoming);
  if (existingActive && !incomingActive) return hallLockReleaseTime(incoming) >= timeValue(existing.lockedAt) ? incoming : existing;
  if (incomingActive && !existingActive) return hallLockReleaseTime(existing) >= timeValue(incoming.lockedAt) ? existing : incoming;
  return hallLockTime(incoming) >= hallLockTime(existing) ? { ...existing, ...incoming } : { ...incoming, ...existing };
}

function mergeHallTableLocks(existing: any[] = [], incoming: any[] = []) {
  const byId = new Map<string, any>();
  for (const lock of existing || []) if (lock?.id) byId.set(String(lock.id), lock);
  for (const lock of incoming || []) if (lock?.id) byId.set(String(lock.id), mergeHallTableLock(byId.get(String(lock.id)), lock));
  return Array.from(byId.values());
}

function openHallOrderTableIds(orders: any[] = []) {
  return new Set((orders || [])
    .filter((order: any) => order?.hallSale === true && order?.tableId && !['paid', 'cancelled'].includes(String(order?.posStatus || 'submitted')))
    .map((order: any) => String(order.tableId)));
}

function tableMatchesHallSettings(table: any, settings: any, activeOrderTableIds: Set<string>) {
  if (!table?.id || !settings || typeof settings !== 'object') return true;
  if (activeOrderTableIds.has(String(table.id))) return true;
  const customNames = Array.isArray(settings.customNames) ? settings.customNames.map((item: any) => String(item || '').trim()).filter(Boolean) : [];
  const count = Math.max(1, Math.min(80, Math.floor(Number(settings.count || 8))));
  const startNumber = Math.max(1, Math.floor(Number(settings.startNumber || 1)));
  const tableName = String(table.name || '').trim();
  if (customNames.includes(tableName)) return true;
  const tableNumber = Math.floor(Number(table.number || 0));
  return tableNumber >= startNumber && tableNumber < startNumber + count && !customNames.includes(tableName);
}

function mergeRestaurantTables(existingTables: any[] = [], incomingTables: any[] = [], customers: any[] = [], orders: any[] = []) {
  const mergedTables = mergeArrayById(existingTables, incomingTables);
  const activeOrderTableIds = openHallOrderTableIds(orders);
  const settingsByCustomer = new Map<string, any>();
  for (const customer of customers || []) {
    if (customer?.id && customer?.hallTableSettings) settingsByCustomer.set(String(customer.id), customer.hallTableSettings);
  }
  return mergedTables.filter((table: any) => tableMatchesHallSettings(table, settingsByCustomer.get(String(table?.customerId || '')), activeOrderTableIds));
}

function timeValue(value: any) {
  const ms = new Date(value || 0).getTime();
  return Number.isFinite(ms) ? ms : 0;
}


function mergeCustomer(existing: any, incoming: any) {
  if (!existing) return incoming;
  if (!incoming) return existing;
  const merged = { ...existing, ...incoming };
  const existingLayoutTime = timeValue(existing?.hallTableSettingsUpdatedAt);
  const incomingLayoutTime = timeValue(incoming?.hallTableSettingsUpdatedAt);
  if (existing?.hallTableSettings && existingLayoutTime > incomingLayoutTime) {
    merged.hallTableSettings = existing.hallTableSettings;
    merged.hallTableSettingsUpdatedAt = existing.hallTableSettingsUpdatedAt;
  }
  return merged;
}

function mergeCustomers(existing: any[] = [], incoming: any[] = []) {
  const byId = new Map<string, any>();
  for (const customer of existing || []) if (customer?.id) byId.set(String(customer.id), customer);
  for (const customer of incoming || []) if (customer?.id) byId.set(String(customer.id), mergeCustomer(byId.get(String(customer.id)), customer));
  return Array.from(byId.values());
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

function mergePublicRestaurantState(existingState: any, incomingState: any) {
  if (!existingState || typeof existingState !== 'object') return incomingState;
  const merged = { ...existingState, ...incomingState };
  const deletedOrderIds = mergedDeletedOrderIds(existingState, incomingState);
  merged.deletedOrderIds = deletedOrderIds;
  merged.customers = mergeCustomers(Array.isArray(existingState?.customers) ? existingState.customers : [], Array.isArray(incomingState?.customers) ? incomingState.customers : []);
  merged.orders = mergeOrders(Array.isArray(existingState?.orders) ? existingState.orders : [], Array.isArray(incomingState?.orders) ? incomingState.orders : [], deletedOrderIds);
  for (const key of ['shifts', 'ledger']) {
    merged[key] = mergeArrayById(Array.isArray(existingState?.[key]) ? existingState[key] : [], Array.isArray(incomingState?.[key]) ? incomingState[key] : []);
  }
  merged.restaurantTables = mergeRestaurantTables(Array.isArray(existingState?.restaurantTables) ? existingState.restaurantTables : [], Array.isArray(incomingState?.restaurantTables) ? incomingState.restaurantTables : [], Array.isArray(merged.customers) ? merged.customers : [], Array.isArray(merged.orders) ? merged.orders : []);
  merged.hallTableLocks = mergeHallTableLocks(Array.isArray(existingState?.hallTableLocks) ? existingState.hallTableLocks : [], Array.isArray(incomingState?.hallTableLocks) ? incomingState.hallTableLocks : []);
  delete merged.sessions;
  return merged;
}


export async function GET(request: NextRequest) {
  try {
    const tenantId = tenantIdFrom(request);
    if (!tenantId) return badRequest('TENANT_REQUIRED');
    const admin = createAdminClient();
    if (!admin) return NextResponse.json({ error: 'ADMIN_CLIENT_UNAVAILABLE' }, { status: 500 });

    const { data, error } = await admin
      .from('restaurant_states')
      .select('tenant_id,state,version,updated_at,device_id')
      .eq('tenant_id', tenantId)
      .maybeSingle<RestaurantStateRow>();

    if (error) throw new Error(error.message);
    const customer = Array.isArray(data?.state?.customers)
      ? data?.state?.customers.find((item: any) => item.portalTenantId === tenantId) || data?.state?.customers[0]
      : null;

    return NextResponse.json({
      tenantId,
      businessName: customer?.businessName || 'رستوران',
      ownerName: customer?.ownerName || '',
      ownerEmail: customer?.email || '',
      phone: customer?.phone || '',
      exists: Boolean(data),
      data: data?.state ?? null,
      updatedAt: data?.version ? Number(data.version) : 0,
      updatedIso: data?.updated_at ?? null,
      deviceId: data?.device_id ?? null,
    });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'PUBLIC_STATE_LOAD_FAILED' }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const tenantId = tenantIdFrom(request);
    if (!tenantId) return badRequest('TENANT_REQUIRED');
    const body = await request.json();
    const state = body?.data;
    if (!state || typeof state !== 'object' || !Array.isArray(state.customers)) {
      return NextResponse.json({ error: 'INVALID_RESTAURANT_STATE' }, { status: 400 });
    }
    const admin = createAdminClient();
    if (!admin) return NextResponse.json({ error: 'ADMIN_CLIENT_UNAVAILABLE' }, { status: 500 });
    // Public QR/tablet clients can hold stale local revisions; always mint
    // a fresh server revision so cashier tablets pull paid-status/table changes.
    const version = Date.now();
    const deviceId = typeof body?.deviceId === 'string' ? body.deviceId.slice(0, 120) : null;
    const { data: existingRow, error: existingError } = await admin
      .from('restaurant_states')
      .select('state')
      .eq('tenant_id', tenantId)
      .maybeSingle<{ state: any }>();
    if (existingError) throw new Error(existingError.message);
    const sharedState = mergePublicRestaurantState(existingRow?.state, { ...state });

    const { data, error } = await admin
      .from('restaurant_states')
      .upsert({
        tenant_id: tenantId,
        state: sharedState,
        version,
        updated_by: null,
        device_id: deviceId,
        updated_at: new Date().toISOString(),
      }, { onConflict: 'tenant_id' })
      .select('version,updated_at')
      .single<{ version: number | string; updated_at: string }>();

    if (error) throw new Error(error.message);
    return NextResponse.json({
      tenantId,
      ok: true,
      exists: true,
      updatedAt: data?.version ? Number(data.version) : version,
      updatedIso: data?.updated_at ?? null,
    });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'PUBLIC_STATE_SAVE_FAILED' }, { status: 500 });
  }
}
