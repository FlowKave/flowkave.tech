import { NextResponse } from 'next/server';
import { createClient } from '../../../lib/supabase/server';
import { clearManagerSession } from '../../../lib/restaurant/manager-session';
import { clearStaffSession } from '../../../lib/restaurant/staff-session';
import { clearOwnerTenantSelection } from '../../../lib/restaurant/tenant';

export const dynamic = 'force-dynamic';

export async function POST() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  await clearManagerSession();
  await clearStaffSession();
  await clearOwnerTenantSelection();
  return NextResponse.json({ ok: true, redirectTo: '/login' });
}
