import { redirect } from 'next/navigation';
import { createClient } from '../../../lib/supabase/server';

type DashboardProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

export const dynamic = 'force-dynamic';

export default async function DashboardPage({ searchParams }: DashboardProps) {
  const params = await searchParams;
  const supabase = await createClient();
  const { data: authData, error: authError } = await supabase.auth.getUser();

  if (authError || !authData.user) redirect('/login');

  const staffLogin = params?.staffLogin === '1' || params?.staff === '1';
  const iframeSrc = `/restaurant-system/index.html?portal=1${staffLogin ? '&staffLogin=1' : ''}&v=staff-invite-accept-64`;

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
