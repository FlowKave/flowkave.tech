import { cookies } from 'next/headers';
import { createHmac, timingSafeEqual } from 'crypto';
import { getSupabaseServiceRoleKey } from '../supabase/config';

export const STAFF_SESSION_COOKIE = 'flowkave_staff_session';
const COOKIE_TTL_SECONDS = 60 * 60 * 12;

export type StaffSession = {
  role: 'staff';
  tenantId: string;
  customerId: string;
  staffUserId: string;
  restaurantName: string;
  staffName: string;
  personnelCode: string;
  createdAt: number;
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

export async function setStaffSession(input: Omit<StaffSession, 'role' | 'createdAt'>) {
  const cookieStore = await cookies();
  const session: StaffSession = { ...input, role: 'staff', createdAt: Date.now() };
  cookieStore.set(STAFF_SESSION_COOKIE, encodeSigned(session), {
    httpOnly: true,
    sameSite: 'lax',
    secure: true,
    path: '/',
    maxAge: COOKIE_TTL_SECONDS,
  });
}

export async function getStaffSession() {
  const cookieStore = await cookies();
  const raw = cookieStore.get(STAFF_SESSION_COOKIE)?.value || '';
  const session = decodeSigned<StaffSession>(raw);
  if (!session || session.role !== 'staff' || Date.now() - session.createdAt > COOKIE_TTL_SECONDS * 1000) return null;
  return session;
}

export async function clearStaffSession() {
  const cookieStore = await cookies();
  cookieStore.delete(STAFF_SESSION_COOKIE);
}
