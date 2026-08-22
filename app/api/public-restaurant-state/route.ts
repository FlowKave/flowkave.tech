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
  for (const item of incoming || []) if (item?.id) byId.set(String(item.id), item);
  return Array.from(byId.values());
}

function mergePublicRestaurantState(existingState: any, incomingState: any) {
  if (!existingState || typeof existingState !== 'object') return incomingState;
  const merged = { ...existingState, ...incomingState };
  for (const key of ['orders', 'shifts', 'ledger', 'restaurantTables']) {
    merged[key] = mergeArrayById(Array.isArray(existingState?.[key]) ? existingState[key] : [], Array.isArray(incomingState?.[key]) ? incomingState[key] : []);
  }
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
    const requestedVersion = Number(body?.updatedAt || Date.now() / 1000);
    const version = Number.isFinite(requestedVersion) && requestedVersion > 0 ? requestedVersion : Date.now() / 1000;
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
