import { NextRequest, NextResponse } from 'next/server';
import { createClient as createSupabaseJsClient } from '@supabase/supabase-js';
import { createClient } from '../../../lib/supabase/server';
import { createAdminClient } from '../../../lib/supabase/admin';
import { getAppBaseUrl, getSupabaseEnv } from '../../../lib/supabase/config';

export const dynamic = 'force-dynamic';
const STAFF_INVITE_EMAIL_VERSION = 'staff-invite-email-69';

type InviteEmailBody = {
  email?: unknown;
  name?: unknown;
  role?: unknown;
  inviteToken?: unknown;
  inviteLink?: unknown;
  personnelCode?: unknown;
  jobTitle?: unknown;
};

function text(value: unknown, max = 240) {
  return typeof value === 'string' ? value.trim().slice(0, max) : '';
}

function validEmail(email: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function safeInviteLink(rawLink: string, rawToken: string) {
  const appBase = getAppBaseUrl();
  const token = encodeURIComponent(rawToken);
  const fallback = `${appBase}/restaurant-system/index.html?portal=1&inviteToken=${token}`;
  if (!rawLink) return fallback;
  try {
    const url = new URL(rawLink);
    const allowed = new URL(appBase);
    if (url.origin !== allowed.origin) return fallback;
    if (!url.pathname.startsWith('/restaurant-system/')) return fallback;
    if (rawToken && !url.searchParams.get('inviteToken') && !url.hash.includes(rawToken)) {
      url.searchParams.set('inviteToken', rawToken);
    }
    return url.toString();
  } catch {
    return fallback;
  }
}

function authRedirectLink(inviteLink: string) {
  const appBase = getAppBaseUrl();
  const callback = new URL('/auth/callback', appBase);
  callback.searchParams.set('next', inviteLink);
  return callback.toString();
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: userData, error: userError } = await supabase.auth.getUser();
    if (userError || !userData.user) {
      return NextResponse.json({ error: 'UNAUTHENTICATED', version: STAFF_INVITE_EMAIL_VERSION }, { status: 401 });
    }

    const body = (await request.json()) as InviteEmailBody;
    const email = text(body.email, 320).toLowerCase();
    const name = text(body.name, 120);
    const role = text(body.role, 80);
    const personnelCode = text(body.personnelCode, 80);
    const jobTitle = text(body.jobTitle, 160);
    const inviteToken = text(body.inviteToken, 180);
    if (!validEmail(email) || !inviteToken) {
      return NextResponse.json({ error: 'INVALID_INVITATION_EMAIL' }, { status: 400 });
    }

    const inviteLink = safeInviteLink(text(body.inviteLink, 800), inviteToken);
    const redirectTo = authRedirectLink(inviteLink);

    const inviteData = {
      invited_by: userData.user.id,
      staff_invite_token: inviteToken,
      staff_invite_name: name,
      staff_invite_role: role,
      staff_invite_personnel_code: personnelCode,
      staff_invite_job_title: jobTitle,
    };

    // Prefer Supabase Admin's real invitation email when the deployment has the
    // service-role key. It uses the same hosted SMTP/Auth delivery as password
    // recovery but emits an actual invite email to the staff address instead of
    // relying on the owner's logged-in auth client to start another sign-in flow.
    const admin = createAdminClient();
    const adminResult = admin
      ? await admin.auth.admin.inviteUserByEmail(email, {
          redirectTo,
          data: inviteData,
        })
      : null;

    // If the address already exists in Supabase Auth, inviteUserByEmail may
    // reject it. In that case fall back to an OTP/magic-link email so existing
    // test users can still receive the staff invitation link.
    const existingAuthUser = Boolean(adminResult?.error && /already|registered|exists/i.test(adminResult.error.message || ''));
    const shouldFallbackToOtp =
      !adminResult ||
      existingAuthUser;

    const { url: supabaseUrl, publishableKey } = getSupabaseEnv();
    const publicAuth = createSupabaseJsClient(supabaseUrl, publishableKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    const otpResult = shouldFallbackToOtp
      ? await publicAuth.auth.signInWithOtp({
          email,
          options: {
            shouldCreateUser: !existingAuthUser,
            emailRedirectTo: redirectTo,
            data: inviteData,
          },
        })
      : null;

    const error = adminResult?.error && !shouldFallbackToOtp ? adminResult.error : otpResult?.error;

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 502 });
    }

    return NextResponse.json({
      ok: true,
      emailSent: true,
      inviteLink,
      redirectTo,
      version: STAFF_INVITE_EMAIL_VERSION,
      method: adminResult && !otpResult ? 'supabase-admin-invite' : 'supabase-otp',
    });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'STAFF_INVITE_EMAIL_FAILED' }, { status: 500 });
  }
}
