import { redirect } from 'next/navigation';
import { createClient } from '../../../lib/supabase/server';
import { getManagerSession } from '../../../lib/restaurant/manager-session';

type DashboardProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

export const dynamic = 'force-dynamic';

export default async function DashboardPage({ searchParams }: DashboardProps) {
  const params = await searchParams;
  const managerSession = await getManagerSession();
  const supabase = await createClient();
  const { data: authData, error: authError } = await supabase.auth.getUser();
  const staffLogin = params?.staffLogin === '1' || params?.staff === '1';

  if ((authError || !authData.user) && !managerSession && !staffLogin) redirect('/login');

  const iframeSrc = `/restaurant-system/index.html?portal=1${staffLogin ? '&staffLogin=1' : ''}&v=table-qr-test-104`;

  return (
    <main dir="rtl" className="min-h-screen bg-[#05070d] text-white">
      {/* Online dashboard must not add a second top bar above the restaurant system.
          The embedded restaurant app owns the single fixed authenticated header. */}
      <iframe
        title="سامانه رستوران FlowKave"
        src={iframeSrc}
        className="block h-screen w-full border-0 bg-white"
      />
    </main>
  );
}
