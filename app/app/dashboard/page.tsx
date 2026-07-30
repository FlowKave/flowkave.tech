import Link from 'next/link';
import { redirect } from 'next/navigation';
import { createClient } from '../../../lib/supabase/server';
import { createTenantAction, signOutAction } from '../../auth/actions';

export const dynamic = 'force-dynamic';

export default async function DashboardPage() {
  const supabase = await createClient();
  const { data: authData, error: authError } = await supabase.auth.getUser();

  if (authError || !authData.user) redirect('/login');

  const { data: memberships } = await supabase
    .from('tenant_members')
    .select('role, tenants(id, name, slug, created_at, subscriptions(status, plan_code, coupon_code, discount_percent, amount_toman), restaurants(name, city))')
    .eq('user_id', authData.user.id);

  const hasTenant = Boolean(memberships?.length);

  return (
    <main dir="rtl" className="min-h-screen px-5 py-10 text-white">
      <div className="noise" />
      <section className="relative z-10 mx-auto max-w-6xl">
        <header className="flex flex-col gap-4 rounded-[2rem] border border-white/10 bg-[#070a13]/90 p-6 shadow-2xl md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-sm font-black text-cyan-200">app.flowkave.tech / SaaS test</p>
            <h1 className="display-font mt-2 text-4xl font-black">داشبورد مشتری تستی</h1>
            <p className="mt-2 text-sm font-bold text-slate-400">کاربر وارد شده: {authData.user.email}</p>
          </div>
          <form action={signOutAction}>
            <button className="rounded-2xl border border-white/15 px-5 py-3 font-black text-slate-100 transition hover:bg-white/10">خروج</button>
          </form>
        </header>

        {!hasTenant && (
          <section className="mt-6 rounded-[2rem] border border-cyan-200/20 bg-cyan-300/10 p-6 shadow-2xl">
            <h2 className="display-font text-3xl font-black">ساخت tenant رستوران تستی</h2>
            <p className="mt-3 leading-8 text-slate-200">اینجا همان سناریوی خرید/فعال‌سازی را تست می‌کنیم: پلن کامل با کد تخفیف ۱۰۰٪ و مبلغ صفر تومان.</p>
            <form action={createTenantAction} className="mt-6 grid gap-4 md:grid-cols-[1fr_1fr_auto]">
              <input required name="restaurantName" className="rounded-2xl border border-white/10 bg-white/[.07] px-4 py-3 text-white outline-none focus:border-cyan-200" placeholder="نام رستوران تستی" />
              <input name="city" className="rounded-2xl border border-white/10 bg-white/[.07] px-4 py-3 text-white outline-none focus:border-cyan-200" placeholder="شهر" />
              <button className="rounded-2xl bg-cyan-200 px-6 py-3 font-black text-[#05070d] transition hover:bg-white">فعال‌سازی با FLOWKAVE100</button>
            </form>
          </section>
        )}

        <section className="mt-6 grid gap-5 md:grid-cols-3">
          <article className="rounded-[1.7rem] border border-white/10 bg-white/[.045] p-6">
            <p className="text-sm font-black text-slate-400">Auth</p>
            <p className="mt-2 text-2xl font-black text-emerald-200">فعال</p>
            <p className="mt-2 text-sm leading-6 text-slate-300">ایمیل/پسورد و session واقعی Supabase.</p>
          </article>
          <article className="rounded-[1.7rem] border border-white/10 bg-white/[.045] p-6">
            <p className="text-sm font-black text-slate-400">Subscription test</p>
            <p className="mt-2 text-2xl font-black text-cyan-200">FLOWKAVE100</p>
            <p className="mt-2 text-sm leading-6 text-slate-300">۱۰۰٪ تخفیف، مبلغ پرداختی صفر تومان.</p>
          </article>
          <article className="rounded-[1.7rem] border border-white/10 bg-white/[.045] p-6">
            <p className="text-sm font-black text-slate-400">Offline-first phase</p>
            <p className="mt-2 text-2xl font-black text-violet-200">بعدی</p>
            <p className="mt-2 text-sm leading-6 text-slate-300">بعد از auth/tenant، sync local hub را تست می‌کنیم.</p>
          </article>
        </section>

        <section className="mt-6 rounded-[2rem] border border-white/10 bg-[#070a13]/90 p-6 shadow-2xl">
          <h2 className="display-font text-3xl font-black">Tenantهای این کاربر</h2>
          <div className="mt-5 grid gap-4">
            {memberships?.length ? memberships.map((membership: any) => {
              const tenant = membership.tenants;
              const subscription = tenant?.subscriptions?.[0];
              const restaurant = tenant?.restaurants?.[0];
              return (
                <div key={tenant.id} className="rounded-2xl border border-white/10 bg-white/[.045] p-5">
                  <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                    <div>
                      <p className="text-2xl font-black text-cyan-100">{tenant.name}</p>
                      <p className="mt-1 text-sm font-bold text-slate-400">slug: {tenant.slug} · نقش: {membership.role}</p>
                      <p className="mt-1 text-sm font-bold text-slate-400">رستوران: {restaurant?.name ?? '—'} · شهر: {restaurant?.city ?? '—'}</p>
                    </div>
                    <div className="rounded-2xl border border-emerald-300/20 bg-emerald-300/10 px-4 py-3 text-sm font-black text-emerald-100">
                      {subscription?.status ?? 'active'} · {subscription?.coupon_code ?? 'FLOWKAVE100'} · {subscription?.amount_toman ?? 0} تومان
                    </div>
                  </div>
                </div>
              );
            }) : <p className="rounded-2xl border border-white/10 bg-white/[.045] p-5 text-slate-300">هنوز tenant ساخته نشده.</p>}
          </div>
        </section>

        <p className="mt-8 text-center text-sm font-bold text-slate-500"><Link className="text-cyan-200" href="/">برگشت به سایت برند</Link></p>
      </section>
    </main>
  );
}
