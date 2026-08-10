import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '../../../lib/supabase/admin';

export const dynamic = 'force-dynamic';

type RestaurantStateRow = {
  tenant_id: string;
  state: any;
  version: number | string | null;
};

function normalizeEmail(email: unknown) {
  return String(email || '').trim().toLowerCase();
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

function createPasswordRecord(password: string, salt = `salt-${crypto.randomUUID()}`) {
  return { passwordSalt: salt, passwordHash: `نمونه:${salt}:${prototypePasswordDigest(password, salt)}` };
}

function isManagerStaff(staff: any, email: string) {
  return normalizeEmail(staff?.email) === email && staff?.role === 'manager' && staff?.active !== false && staff?.accessActive !== false;
}

export async function POST(request: NextRequest) {
  const admin = createAdminClient();
  if (!admin) return NextResponse.json({ error: 'SUPABASE_ADMIN_NOT_CONFIGURED' }, { status: 500 });

  const authorization = request.headers.get('authorization') || '';
  const token = authorization.replace(/^Bearer\s+/i, '').trim();
  if (!token) return NextResponse.json({ error: 'AUTH_TOKEN_REQUIRED' }, { status: 401 });

  const { data: userData, error: userError } = await admin.auth.getUser(token);
  const email = normalizeEmail(userData.user?.email);
  if (userError || !email) return NextResponse.json({ error: 'INVALID_AUTH_TOKEN' }, { status: 401 });

  const body = await request.json().catch(() => ({}));
  const password = String(body?.password || '');
  if (password.length < 8) return NextResponse.json({ error: 'PASSWORD_TOO_SHORT' }, { status: 400 });

  const { data, error } = await admin
    .from('restaurant_states')
    .select('tenant_id,state,version')
    .order('updated_at', { ascending: false })
    .limit(1000);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  let updatedRestaurants = 0;
  let updatedManagers = 0;
  const now = Date.now();

  for (const row of (data || []) as RestaurantStateRow[]) {
    const state = row.state || {};
    const staffUsers = Array.isArray(state.staffUsers) ? state.staffUsers : [];
    let changed = false;
    const nextStaffUsers = staffUsers.map((staff: any) => {
      if (!isManagerStaff(staff, email)) return staff;
      changed = true;
      updatedManagers += 1;
      const passwordRecord = createPasswordRecord(password);
      return {
        ...staff,
        ...passwordRecord,
        password: '',
        pin: '',
        passwordUpdatedAt: new Date(now).toISOString(),
      };
    });

    if (!changed) continue;
    const nextState = { ...state, staffUsers: nextStaffUsers };
    delete nextState.sessions;
    const { error: upsertError } = await admin
      .from('restaurant_states')
      .upsert({
        tenant_id: row.tenant_id,
        state: nextState,
        version: now,
        updated_at: new Date(now).toISOString(),
        updated_by: email,
        device_id: 'manager-password-reset',
      }, { onConflict: 'tenant_id' });
    if (upsertError) return NextResponse.json({ error: upsertError.message }, { status: 500 });
    updatedRestaurants += 1;
  }

  return NextResponse.json({ ok: true, email, updatedRestaurants, updatedManagers });
}
