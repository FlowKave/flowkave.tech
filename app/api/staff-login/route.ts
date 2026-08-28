import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '../../../lib/supabase/admin';
import { setStaffSession } from '../../../lib/restaurant/staff-session';

export const dynamic = 'force-dynamic';
const STAFF_LOGIN_VERSION = 'staff-login-tenant-96';

type RestaurantStateRow = {
  tenant_id: string;
  state: any;
  version: number | string | null;
  updated_at?: string | null;
};

function jsonError(error: string, status = 400) {
  return NextResponse.json({ error, version: STAFF_LOGIN_VERSION }, { status });
}

function toEnglishDigits(value: unknown) {
  const source = String(value || '').trim();
  return source.replace(/[۰-۹]/g, (d) => String('۰۱۲۳۴۵۶۷۸۹'.indexOf(d))).replace(/[٠-٩]/g, (d) => String('٠١٢٣٤٥٦٧٨٩'.indexOf(d)));
}

function normalizePersonnelCode(value: unknown) {
  return toEnglishDigits(value).replace(/[\s\-]/g, '').trim();
}

function prototypePasswordDigest(password: string, salt: string) {
  const source = `${salt}:${password}`;
  let hash = 2166136261;
  for (let i = 0; i < source.length; i += 1) {
    hash ^= source.charCodeAt(i);
    hash = Math.imul(hash, 16777619) >>> 0;
  }
  return hash.toString(16).padStart(8, '0');
}

function verifyPasswordRecord(account: any, password: string) {
  if (!account || !password) return false;
  if (account.passwordHash && account.passwordSalt) {
    return account.passwordHash === `نمونه:${account.passwordSalt}:${prototypePasswordDigest(password, account.passwordSalt)}`;
  }
  return account.password === password || account.pin === password;
}

function staffName(staff: any) {
  return String(staff?.name || `${staff?.firstName || ''} ${staff?.lastName || ''}`.trim() || 'کارمند');
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}));
    const personnelCode = normalizePersonnelCode(body?.personnelCode);
    const pin = toEnglishDigits(body?.pin);
    if (!personnelCode || !pin) return jsonError('STAFF_CODE_AND_PIN_REQUIRED');

    const admin = createAdminClient();
    if (!admin) return jsonError('SERVICE_ROLE_NOT_CONFIGURED', 500);

    const { data, error } = await admin
      .from('restaurant_states')
      .select('tenant_id,state,version,updated_at')
      .order('updated_at', { ascending: false })
      .limit(1000);
    if (error) throw new Error(error.message);

    const rows = (data || []) as RestaurantStateRow[];
    const tenantIds = [...new Set(rows.map((row) => row.tenant_id).filter(Boolean))];
    const tenantNames = new Map<string, string>();
    const restaurantNames = new Map<string, string>();
    if (tenantIds.length) {
      const tenants = await admin.from('tenants').select('id,name').in('id', tenantIds);
      if (!tenants.error) for (const tenant of tenants.data || []) tenantNames.set(String(tenant.id), String(tenant.name || '').trim());
      const restaurants = await admin.from('restaurants').select('tenant_id,name').in('tenant_id', tenantIds);
      if (!restaurants.error) for (const restaurant of restaurants.data || []) restaurantNames.set(String(restaurant.tenant_id), String(restaurant.name || '').trim());
    }

    for (const row of rows) {
      const state = row.state;
      const staffUsers = Array.isArray(state?.staffUsers) ? state.staffUsers : [];
      const customers = Array.isArray(state?.customers) ? state.customers : [];
      const staff = staffUsers.find((user: any) => user?.active !== false && user?.accessActive !== false && normalizePersonnelCode(user.personnelCode) === personnelCode && verifyPasswordRecord(user, pin));
      if (!staff) continue;
      const tenantCustomer = customers.find((item: any) => item.portalTenantId === row.tenant_id);
      const staffCustomer = customers.find((item: any) => item.id === staff.customerId);
      const customer = tenantCustomer || staffCustomer || customers[0];
      const restaurantName = String(restaurantNames.get(row.tenant_id) || tenantNames.get(row.tenant_id) || customer?.businessName || customer?.name || 'رستوران').trim() || 'رستوران';
      await setStaffSession({
        tenantId: row.tenant_id,
        customerId: String(customer?.id || staff.customerId || ''),
        staffUserId: String(staff.id || ''),
        restaurantName,
        staffName: staffName(staff),
        personnelCode,
      });
      return NextResponse.json({
        ok: true,
        version: STAFF_LOGIN_VERSION,
        tenantId: row.tenant_id,
        customerId: String(customer?.id || staff.customerId || ''),
        tenant: { id: row.tenant_id, name: restaurantName, slug: row.tenant_id },
        businessName: restaurantName,
        ownerName: staffName(staff),
        ownerEmail: String(staff.email || ''),
        phone: '',
        tenantChoices: [],
        exists: true,
        data: state,
        updatedAt: row.version ? Number(row.version) : 0,
        staff: { id: staff.id, customerId: String(customer?.id || staff.customerId || ''), name: staffName(staff), personnelCode, role: staff.role || 'cashier' },
      });
    }

    return jsonError('STAFF_LOGIN_INVALID', 401);
  } catch (error) {
    return jsonError(error instanceof Error ? error.message : 'STAFF_LOGIN_FAILED', 500);
  }
}
