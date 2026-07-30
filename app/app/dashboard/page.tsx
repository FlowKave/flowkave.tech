import { redirect } from 'next/navigation';
import { createClient } from '../../../lib/supabase/server';
import { signOutAction } from '../../auth/actions';

export const dynamic = 'force-dynamic';

export default async function DashboardPage() {
  const supabase = await createClient();
  const { data: authData, error: authError } = await supabase.auth.getUser();

  if (authError || !authData.user) redirect('/login');

  return (
    <main dir="rtl" className="min-h-screen bg-[#05070d] text-white">
      <header className="sticky top-0 z-30 flex items-center justify-between gap-4 border-b border-white/10 bg-[#05070d]/90 px-5 py-3 backdrop-blur-xl">
        <div>
          <p className="text-xs font-black text-cyan-200">app.flowkave.tech / سامانه عملیاتی</p>
          <h1 className="text-xl font-black">سامانه رستوران و کافه</h1>
        </div>
        <div className="flex items-center gap-3 text-xs font-bold text-slate-300">
          <span className="hidden sm:inline">کاربر وارد شده: {authData.user.email}</span>
          <form action={signOutAction}>
            <button className="rounded-xl border border-white/15 px-4 py-2 font-black text-slate-100 transition hover:bg-white/10">خروج</button>
          </form>
        </div>
      </header>
      <iframe
        title="سامانه رستوران FlowKave"
        src="/restaurant-system/index.html?portal=1"
        className="block h-[calc(100vh-69px)] w-full border-0 bg-white"
      />
    </main>
  );
}
