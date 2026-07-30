'use client';

import Link from 'next/link';
import { useActionState } from 'react';
import { forgotPasswordAction } from '../auth/actions';

export default function ForgotPasswordPage() {
  const [state, formAction, pending] = useActionState(forgotPasswordAction, {});

  return (
    <main dir="rtl" className="min-h-screen px-5 py-12 text-white">
      <div className="noise" />
      <section className="relative z-10 mx-auto max-w-md rounded-[2rem] border border-white/10 bg-[#070a13]/90 p-7 shadow-2xl">
        <Link href="/login" className="mb-8 inline-flex items-center gap-3 text-sm font-black text-cyan-200">← برگشت به ورود</Link>
        <h1 className="display-font text-4xl font-black">بازیابی رمز عبور</h1>
        <p className="mt-3 leading-8 text-slate-300">ایمیل را وارد کن تا Supabase لینک واقعی reset password بفرستد.</p>

        {state.message && <p className={`mt-5 rounded-2xl border p-4 text-sm font-bold ${state.ok ? 'border-emerald-300/25 bg-emerald-300/10 text-emerald-100' : 'border-rose-300/25 bg-rose-300/10 text-rose-100'}`}>{state.message}</p>}

        <form action={formAction} className="mt-7 grid gap-4">
          <label className="grid gap-2 text-sm font-bold text-slate-200">ایمیل<input required name="email" type="email" className="rounded-2xl border border-white/10 bg-white/[.06] px-4 py-3 text-left text-white outline-none focus:border-cyan-200" placeholder="owner@example.com" /></label>
          <button disabled={pending} className="rounded-2xl bg-cyan-200 px-5 py-4 font-black text-[#05070d] transition hover:bg-white disabled:opacity-60">{pending ? 'در حال ارسال...' : 'ارسال لینک بازیابی'}</button>
        </form>
      </section>
    </main>
  );
}
