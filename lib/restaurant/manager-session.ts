import { cookies } from 'next/headers';
import { createHmac, timingSafeEqual } from 'crypto';
import { createAdminClient } from '../supabase/admin';
import { getSupabaseServiceRoleKey } from '../supabase/config';

export const MANAGER_SESSION_COOKIE = 'flowkave_manager_session';
export const MANAGER_PENDING_COOKIE = 'flowkave_manager_pending';
const COOKIE_TTL_SECONDS = 60 * 60 * 12;
const PENDING_TTL_SECONDS = 60 * 10;

type RestaurantStateRow = {
  tenant_id: string;
  state: any;
  version: number | string | null;
};

export type ManagerRestaurantChoice = {
  tenantId: string;
  customerId: string;
  staffUserId: string;
  restaurantName: string;
  managerName: string;
  email: string;
};

export type ManagerTenantChoice = { tenantId: string; restaurantName: string; managerName: string; email: string };

export type ManagerSession = ManagerRestaurantChoice & {
  role: 'manager';
  createdAt: number;
  tenantChoices: ManagerTenantChoice[];
  availableChoices: ManagerRestaurantChoice[];
};

function signingSecret() {
  const secret = getSupabaseServiceRoleKey();
  if (!secret) throw new Error('SUPABASE_SERVICE_ROLE_KEY is not configured');
  return secret;
}

function base64url(input: string) {
  return Buffer.from(input, 'utf8').toString('base64url');
}

function unbase64url(input: string) {
  return Buffer.from(input, 'base64url').toString('utf8');
}

function signPayload(payload: string) {
  return createHmac('sha256', signingSecret()).update(payload).digest('base64url');
}

function encodeSigned(value: unknown) {
  const payload = base64url(JSON.stringify(value));
  return `${payload}.${signPayload(payload)}`;
}

function decodeSigned<T>(raw = ''): T | null {
  const [payload, signature] = raw.split('.');
  if (!payload || !signature) return null;
  const expected = signPayload(payload);
  const actualBuffer = Buffer.from(signature);
  const expectedBuffer = Buffer.from(expected);
  if (actualBuffer.length !== expectedBuffer.length || !timingSafeEqual(actualBuffer, expectedBuffer)) return null;
  return JSON.parse(unbase64url(payload)) as T;
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

function normalizeEmail(email: string) {
  return String(email || '').trim().toLowerCase();
}

function isManager(user: any) {
  return user?.role === 'manager' && user.active !== false && user.accessActive !== false;
}

async function collectManagerRestaurantChoices(email: string, pin = ''): Promise<ManagerRestaurantChoice[]> {
  const admin = createAdminClient();
  if (!admin) throw new Error('SUPABASE_SERVICE_ROLE_KEY is not configured');
  const normalizedEmail = normalizeEmail(email);
  if (!normalizedEmail) return [];

  const { data, error } = await admin
    .from('restaurant_states')
    .select('tenant_id,state,version')
    .order('updated_at', { ascending: false })
    .limit(1000);
  if (error) throw new Error(error.message);

  const tenantIds = [...new Set(((data || []) as RestaurantStateRow[]).map((row) => row.tenant_id).filter(Boolean))];
  const tenantNames = new Map<string, string>();
  const restaurantNames = new Map<string, string>();
  if (tenantIds.length) {
    const tenants = await admin.from('tenants').select('id,name').in('id', tenantIds);
    if (!tenants.error) {
      for (const tenant of tenants.data || []) tenantNames.set(String(tenant.id), String(tenant.name || '').trim());
    }
    const restaurants = await admin.from('restaurants').select('tenant_id,name').in('tenant_id', tenantIds);
    if (!restaurants.error) {
      for (const restaurant of restaurants.data || []) restaurantNames.set(String(restaurant.tenant_id), String(restaurant.name || '').trim());
    }
  }

  const choices: ManagerRestaurantChoice[] = [];
  for (const row of (data || []) as RestaurantStateRow[]) {
    const state = row.state;
    const staffUsers = Array.isArray(state?.staffUsers) ? state.staffUsers : [];
    const customers = Array.isArray(state?.customers) ? state.customers : [];
    for (const staff of staffUsers) {
      if (normalizeEmail(staff.email) !== normalizedEmail) continue;
      if (!isManager(staff)) continue;
      if (pin && !verifyPasswordRecord(staff, pin)) continue;
      const tenantCustomer = customers.find((item: any) => item.portalTenantId === row.tenant_id);
      const staffCustomer = customers.find((item: any) => item.id === staff.customerId);
      const customer = tenantCustomer || staffCustomer || customers[0];
      const restaurantName = String(restaurantNames.get(row.tenant_id) || tenantNames.get(row.tenant_id) || customer?.businessName || customer?.name || 'رستوران').trim() || 'رستوران';
      choices.push({
        tenantId: row.tenant_id,
        customerId: String(customer?.id || staff.customerId || ''),
        staffUserId: String(staff.id || ''),
        restaurantName,
        managerName: String(staff.name || `${staff.firstName || ''} ${staff.lastName || ''}`.trim() || 'مدیر'),
        email: normalizedEmail,
      });
    }
  }

  const unique = new Map<string, ManagerRestaurantChoice>();
  for (const choice of choices) unique.set(`${choice.tenantId}:${choice.staffUserId}`, choice);
  return [...unique.values()];
}

export async function findManagerRestaurantChoices(email: string, pin: string): Promise<ManagerRestaurantChoice[]> {
  if (!pin) return [];
  const authenticatedChoices = await collectManagerRestaurantChoices(email, pin);
  if (!authenticatedChoices.length) return [];
  return collectManagerRestaurantChoices(email);
}

export async function refreshManagerRestaurantChoices(session: ManagerSession): Promise<ManagerRestaurantChoice[]> {
  return collectManagerRestaurantChoices(session.email);
}

function publicManagerChoices(choices: ManagerRestaurantChoice[]): ManagerTenantChoice[] {
  return choices.map(({ tenantId, restaurantName, managerName, email }) => ({ tenantId, restaurantName, managerName, email }));
}

export async function setManagerSession(choice: ManagerRestaurantChoice, availableChoices: ManagerRestaurantChoice[] = [choice]) {
  const cookieStore = await cookies();
  const session: ManagerSession = { ...choice, role: 'manager', createdAt: Date.now(), tenantChoices: publicManagerChoices(availableChoices), availableChoices };
  cookieStore.set(MANAGER_SESSION_COOKIE, encodeSigned(session), {
    httpOnly: true,
    sameSite: 'lax',
    secure: true,
    path: '/',
    maxAge: COOKIE_TTL_SECONDS,
  });
  cookieStore.delete(MANAGER_PENDING_COOKIE);
  cookieStore.delete('flowkave_owner_tenant');
}

export async function setPendingManagerChoices(choices: ManagerRestaurantChoice[]) {
  const cookieStore = await cookies();
  cookieStore.set(MANAGER_PENDING_COOKIE, encodeSigned({ createdAt: Date.now(), choices }), {
    httpOnly: true,
    sameSite: 'lax',
    secure: true,
    path: '/',
    maxAge: PENDING_TTL_SECONDS,
  });
}

export async function getPendingManagerChoices() {
  const cookieStore = await cookies();
  const raw = cookieStore.get(MANAGER_PENDING_COOKIE)?.value || '';
  const pending = decodeSigned<{ createdAt: number; choices: ManagerRestaurantChoice[] }>(raw);
  if (!pending || Date.now() - pending.createdAt > PENDING_TTL_SECONDS * 1000) return [];
  return Array.isArray(pending.choices) ? pending.choices : [];
}

export async function choosePendingManagerRestaurant(tenantId: string) {
  const choices = await getPendingManagerChoices();
  const choice = choices.find((item) => item.tenantId === tenantId) || null;
  return choice ? { choice, choices } : null;
}

export async function switchManagerRestaurant(tenantId: string) {
  const session = await getManagerSession();
  if (!session) return false;
  const availableChoices = Array.isArray(session.availableChoices) ? session.availableChoices : [];
  const next = availableChoices.find((choice) => choice.tenantId === tenantId);
  if (!next) return false;
  await setManagerSession(next, availableChoices);
  return true;
}

export async function getManagerSession() {
  const cookieStore = await cookies();
  const raw = cookieStore.get(MANAGER_SESSION_COOKIE)?.value || '';
  const session = decodeSigned<ManagerSession>(raw);
  if (!session || session.role !== 'manager' || Date.now() - session.createdAt > COOKIE_TTL_SECONDS * 1000) return null;
  try {
    const refreshedChoices = await refreshManagerRestaurantChoices(session);
    if (refreshedChoices.length) {
      const activeChoice = refreshedChoices.find((choice) => choice.tenantId === session.tenantId && choice.staffUserId === session.staffUserId)
        || refreshedChoices.find((choice) => choice.tenantId === session.tenantId)
        || refreshedChoices[0];
      const refreshedSession: ManagerSession = {
        ...activeChoice,
        role: 'manager',
        createdAt: session.createdAt,
        tenantChoices: publicManagerChoices(refreshedChoices),
        availableChoices: refreshedChoices,
      };
      if (JSON.stringify(refreshedSession.tenantChoices) !== JSON.stringify(session.tenantChoices || []) || refreshedSession.restaurantName !== session.restaurantName) {
        await setManagerSession(activeChoice, refreshedChoices);
      }
      return refreshedSession;
    }
  } catch {
    // Keep the signed session usable if Supabase is temporarily unavailable.
  }
  return session;
}

export async function clearManagerSession() {
  const cookieStore = await cookies();
  cookieStore.delete(MANAGER_SESSION_COOKIE);
  cookieStore.delete(MANAGER_PENDING_COOKIE);
}
