'use client';

import Link from 'next/link';
import { useActionState } from 'react';
import { chooseManagerRestaurantAction, chooseOwnerRestaurantAction, signInAction } from '../auth/actions';

export default function LoginPage() {
  const [state, formAction, pending] = useActionState(signInAction, {});
  const hasOwnerChoices = !!state.ownerChoices?.length;
  const hasManagerChoices = !!state.managerChoices?.length;
  const isRestaurantChoiceStep = hasOwnerChoices || hasManagerChoices;

  return (
    <main dir="rtl" className="min-h-screen px-5 py-12 text-white">
      <div className="noise" />
      <section className="relative z-10 mx-auto max-w-md rounded-[2rem] border border-white/10 bg-[#070a13]/90 p-7 shadow-2xl">
        <Link href="/" className="mb-8 inline-flex items-center gap-3 text-sm font-black text-cyan-200">← فلوکیو</Link>
        <h1 className="display-font text-4xl font-black">ورود به سامانه</h1>

        {isRestaurantChoiceStep ? (
          <>
            {hasOwnerChoices && (
              <form action={chooseOwnerRestaurantAction} className="mt-7 grid gap-3 rounded-2xl border border-emerald-200/25 bg-emerald-200/10 p-4">
                <label className="grid gap-2 text-sm font-bold text-emerald-50">انتخاب رستوران
                  <select name="tenantId" required className="rounded-2xl border border-white/10 bg-[#070a13] px-4 py-3 text-white outline-none focus:border-cyan-200">
                    {state.ownerChoices?.map((choice) => (
                      <option key={choice.tenantId} value={choice.tenantId}>{choice.restaurantName}</option>
                    ))}
                  </select>
                </label>
                <button className="rounded-2xl bg-emerald-200 px-5 py-3 font-black text-[#05070d] transition hover:bg-white">ورود به رستوران انتخاب‌شده</button>
              </form>
            )}

            {hasManagerChoices && (
              <form action={chooseManagerRestaurantAction} className="mt-7 grid gap-3 rounded-2xl border border-cyan-200/25 bg-cyan-200/10 p-4">
                <label className="grid gap-2 text-sm font-bold text-cyan-50">انتخاب رستوران
                  <select name="tenantId" required className="rounded-2xl border border-white/10 bg-[#070a13] px-4 py-3 text-white outline-none focus:border-cyan-200">
                    {state.managerChoices?.map((choice) => (
                      <option key={choice.tenantId} value={choice.tenantId}>{choice.restaurantName}</option>
                    ))}
                  </select>
                </label>
                <button className="rounded-2xl bg-cyan-200 px-5 py-3 font-black text-[#05070d] transition hover:bg-white">ورود به رستوران انتخاب‌شده</button>
              </form>
            )}
          </>
        ) : (
          <>
            {state.message && <p className={`mt-5 rounded-2xl border p-4 text-sm font-bold ${state.ok ? 'border-emerald-300/25 bg-emerald-300/10 text-emerald-100' : 'border-rose-300/25 bg-rose-300/10 text-rose-100'}`}>{state.message}</p>}

            <form action={formAction} className="mt-7 grid gap-4">
              <label className="grid gap-2 text-sm font-bold text-slate-200">ایمیل<input required name="email" type="email" className="rounded-2xl border border-white/10 bg-white/[.06] px-4 py-3 text-left text-white outline-none focus:border-cyan-200" placeholder="owner@example.com" /></label>
              <label className="grid gap-2 text-sm font-bold text-slate-200">رمز عبور مالک / پین مدیر<input required name="password" type="password" className="rounded-2xl border border-white/10 bg-white/[.06] px-4 py-3 text-white outline-none focus:border-cyan-200" /></label>
              <button disabled={pending} className="rounded-2xl bg-cyan-200 px-5 py-4 font-black text-[#05070d] transition hover:bg-white disabled:opacity-60">{pending ? 'در حال ورود...' : 'ورود'}</button>
            </form>

            <div className="mt-6 flex flex-wrap justify-between gap-3 text-sm font-bold text-slate-300">
              <Link className="hover:text-cyan-200" href="/forgot-password">فراموشی رمز</Link>
              <Link className="hover:text-cyan-200" href="/app/dashboard?staffLogin=1">ورود کارکنان</Link>
            </div>
          </>
        )}
      </section>
    </main>
  );
}
