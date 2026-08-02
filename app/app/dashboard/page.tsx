import { redirect } from 'next/navigation';
import { createClient } from '../../../lib/supabase/server';

export const dynamic = 'force-dynamic';

export default async function DashboardPage() {
  const supabase = await createClient();
  const { data: authData, error: authError } = await supabase.auth.getUser();

  if (authError || !authData.user) redirect('/login');

  return (
    <main dir="rtl" className="min-h-screen bg-[#05070d] text-white">
      {/* Online dashboard must not add a second top bar above the restaurant system.
          The embedded restaurant app owns the single fixed authenticated header. */}
      <iframe
        title="سامانه رستوران FlowKave"
        src="/restaurant-system/index.html?portal=1&v=pos-table-status-fixed-10"
        className="block h-screen w-full border-0 bg-white"
      />
    </main>
  );
}
