import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '../../../lib/supabase/admin';

export const dynamic = 'force-dynamic';
const STAFF_INVITATION_VERSION = 'staff-invite-accept-63';

type RestaurantStateRow = {
  tenant_id: string;
  state: any;
  version: number | string | null;
};

function jsonError(error: string, status = 400) {
  return NextResponse.json({ error, version: STAFF_INVITATION_VERSION }, { status });
}

function uid(prefix: string) {
  const rand = Math.random().toString(36).slice(2, 9);
  const time = Date.now().toString(36);
  return `${prefix}_${rand}_${time}`;
}

function text(value: unknown, max = 240) {
  return typeof value === 'string' ? value.trim().slice(0, max) : '';
}

function normalizePersonnelCode(value = '') {
  return String(value || '').replace(/[\s\-]/g, '').trim();
}

function normalizeRole(role: unknown) {
  return String(role || '') === 'manager' ? 'manager' : 'cashier';
}

function roleLabel(role: unknown) {
  return normalizeRole(role) === 'manager' ? 'مدیر' : 'صندوق‌دار';
}

function invitationStatus(invitation: any, now = new Date()) {
  if (!invitation) return 'missing';
  if (invitation.cancelledAt) return 'cancelled';
  if (invitation.acceptedAt) return 'accepted';
  if (new Date(invitation.expiresAt).getTime() <= now.getTime()) return 'expired';
  return 'pending';
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

function createPasswordRecord(password: string, salt = uid('salt')) {
  return { passwordSalt: salt, passwordHash: `نمونه:${salt}:${prototypePasswordDigest(password, salt)}` };
}

function nextPersonnelCode(state: any, customerId: string) {
  const used = new Set((state.staffUsers || []).filter((user: any) => user.customerId === customerId).map((user: any) => normalizePersonnelCode(user.personnelCode)));
  for (let code = 1001; code < 9999; code += 1) {
    const candidate = String(code);
    if (!used.has(candidate)) return candidate;
  }
  return String(Date.now()).slice(-6);
}

function publicInvitation(invitation: any) {
  return {
    name: String(invitation.name || roleLabel(invitation.role)),
    email: String(invitation.email || ''),
    role: normalizeRole(invitation.role),
    roleLabel: roleLabel(invitation.role),
    status: invitationStatus(invitation),
    expiresAt: invitation.expiresAt || '',
  };
}

async function findInvitationByToken(token: string) {
  const admin = createAdminClient();
  if (!admin) throw new Error('SERVICE_ROLE_NOT_CONFIGURED');

  const { data, error } = await admin
    .from('restaurant_states')
    .select('tenant_id,state,version')
    .order('updated_at', { ascending: false })
    .limit(1000);

  if (error) {
    if (/permission denied/i.test(error.message || '')) throw new Error('SUPABASE_SERVICE_ROLE_KEY_INVALID_OR_NO_PERMISSION');
    throw new Error(error.message);
  }

  for (const row of (data || []) as RestaurantStateRow[]) {
    const state = row.state;
    const invitation = Array.isArray(state?.staffInvitations)
      ? state.staffInvitations.find((item: any) => item?.token === token)
      : null;
    if (invitation) return { admin, row, state, invitation };
  }
  return { admin, row: null, state: null, invitation: null };
}

export async function GET(request: NextRequest) {
  try {
    const token = text(new URL(request.url).searchParams.get('token'), 180);
    if (!token) return jsonError('INVITATION_TOKEN_REQUIRED');
    const { invitation } = await findInvitationByToken(token);
    if (!invitation) return jsonError('INVITATION_NOT_FOUND', 404);
    return NextResponse.json({ ok: true, version: STAFF_INVITATION_VERSION, invitation: publicInvitation(invitation) });
  } catch (error) {
    return jsonError(error instanceof Error ? error.message : 'INVITATION_LOAD_FAILED', 500);
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}));
    const token = text(body?.token, 180);
    const pin = text(body?.pin, 80);
    if (!token) return jsonError('INVITATION_TOKEN_REQUIRED');
    if (!pin) return jsonError('STAFF_LOGIN_REQUIRED');

    const { admin, row, state, invitation } = await findInvitationByToken(token);
    if (!row || !state || !invitation) return jsonError('INVITATION_NOT_FOUND', 404);
    if (invitationStatus(invitation) !== 'pending') return jsonError('INVITATION_NOT_PENDING');

    if (!Array.isArray(state.staffUsers)) state.staffUsers = [];
    if (!Array.isArray(state.securityEvents)) state.securityEvents = [];
    if (!Array.isArray(state.sessions)) state.sessions = [];
    const customerId = String(invitation.customerId || '');
    const personnelCode = normalizePersonnelCode(invitation.personnelCode || '') || nextPersonnelCode(state, customerId);
    if (state.staffUsers.some((user: any) => user.customerId === customerId && normalizePersonnelCode(user.personnelCode) === personnelCode)) {
      return jsonError('STAFF_CODE_ALREADY_EXISTS');
    }

    const nowIso = new Date().toISOString();
    const passwordRecord = createPasswordRecord(pin);
    const staffUser = {
      id: uid('usr'),
      customerId,
      name: String(invitation.name || roleLabel(invitation.role)),
      firstName: String(invitation.name || roleLabel(invitation.role)),
      lastName: '',
      fatherName: '',
      nationalId: '',
      mobile: '',
      email: String(invitation.email || '').trim(),
      address: '',
      jobTitle: roleLabel(invitation.role),
      hourlyWage: 0,
      personnelCode,
      role: normalizeRole(invitation.role),
      active: true,
      accessActive: true,
      createdAt: nowIso,
      ...passwordRecord,
    };

    state.staffUsers.push(staffUser);
    invitation.acceptedAt = nowIso;
    invitation.status = 'accepted';
    invitation.staffUserId = staffUser.id;
    state.securityEvents.push({
      id: uid('sec'),
      customerId,
      type: 'staff-invitation-accepted',
      targetName: staffUser.name,
      targetEmail: staffUser.email,
      detail: '',
      sourceId: invitation.id || '',
      createdAt: nowIso,
    });

    const version = Date.now() / 1000;
    const { error } = await admin
      .from('restaurant_states')
      .upsert({
        tenant_id: row.tenant_id,
        state,
        version,
        updated_by: null,
        device_id: 'staff-invitation-public-api',
        updated_at: nowIso,
      }, { onConflict: 'tenant_id' });

    if (error) throw new Error(error.message);
    await admin.from('sync_events').insert({
      tenant_id: row.tenant_id,
      local_device_id: 'staff-invitation-public-api',
      event_type: 'staff_invitation_accepted',
      payload: { version, staffUserId: staffUser.id, invitationId: invitation.id || '' },
    });

    return NextResponse.json({
      ok: true,
      version: STAFF_INVITATION_VERSION,
      staff: { name: staffUser.name, personnelCode: staffUser.personnelCode, role: staffUser.role, roleLabel: roleLabel(staffUser.role) },
    });
  } catch (error) {
    return jsonError(error instanceof Error ? error.message : 'INVITATION_ACCEPT_FAILED', 500);
  }
}
