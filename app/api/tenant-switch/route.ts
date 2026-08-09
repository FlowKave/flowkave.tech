import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '../../../lib/supabase/server';
import { chooseOwnerTenantForUser } from '../../../lib/restaurant/tenant';
import { switchManagerRestaurant } from '../../../lib/restaurant/manager-session';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}));
    const tenantId = String(body?.tenantId || '').trim();
    if (!tenantId) return NextResponse.json({ error: 'TENANT_REQUIRED' }, { status: 400 });

    const managerSwitched = await switchManagerRestaurant(tenantId);
    if (managerSwitched) return NextResponse.json({ ok: true, role: 'manager', tenantId });

    const supabase = await createClient();
    const { data, error } = await supabase.auth.getUser();
    if (!error && data.user) {
      const selected = await chooseOwnerTenantForUser(supabase, data.user, tenantId);
      if (selected) return NextResponse.json({ ok: true, role: 'owner', tenantId: selected.id });
    }

    return NextResponse.json({ error: 'TENANT_NOT_ALLOWED' }, { status: 403 });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'TENANT_SWITCH_FAILED' }, { status: 500 });
  }
}
