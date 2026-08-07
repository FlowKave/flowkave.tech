import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '../../../lib/supabase/server';
import { getAppBaseUrl } from '../../../lib/supabase/config';

export const dynamic = 'force-dynamic';

type InviteEmailBody = {
  email?: unknown;
  name?: unknown;
  role?: unknown;
  inviteToken?: unknown;
  inviteLink?: unknown;
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

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: userData, error: userError } = await supabase.auth.getUser();
    if (userError || !userData.user) {
      return NextResponse.json({ error: 'UNAUTHENTICATED' }, { status: 401 });
    }

    const body = (await request.json()) as InviteEmailBody;
    const email = text(body.email, 320).toLowerCase();
    const name = text(body.name, 120);
    const role = text(body.role, 80);
    const inviteToken = text(body.inviteToken, 180);
    if (!validEmail(email) || !inviteToken) {
      return NextResponse.json({ error: 'INVALID_INVITATION_EMAIL' }, { status: 400 });
    }

    const inviteLink = safeInviteLink(text(body.inviteLink, 800), inviteToken);

    // Reuse Supabase Auth's configured email delivery — the same infrastructure
    // that already sends forgot-password emails for FlowKave. The email carries
    // a real hosted redirect back to the restaurant invitation acceptance URL.
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        shouldCreateUser: true,
        emailRedirectTo: inviteLink,
        data: {
          invited_by: userData.user.id,
          staff_invite_token: inviteToken,
          staff_invite_name: name,
          staff_invite_role: role,
        },
      },
    });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 502 });
    }

    return NextResponse.json({ ok: true, emailSent: true, inviteLink });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'STAFF_INVITE_EMAIL_FAILED' }, { status: 500 });
  }
}
