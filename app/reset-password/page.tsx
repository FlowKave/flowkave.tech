'use client';

import { useActionState } from 'react';
import { resetPasswordAction } from '../auth/actions';

export default function ResetPasswordPage() {
  const [state, formAction, pending] = useActionState(resetPasswordAction, {});

  return (
    <main dir="rtl" className="min-h-screen px-5 py-12 text-white">
      <div className="noise" />
      <section className="relative z-10 mx-auto max-w-md rounded-[2rem] border border-white/10 bg-[#070a13]/90 p-7 shadow-2xl">
        <h1 className="display-font text-4xl font-black">تنظیم رمز جدید</h1>
        <p className="mt-3 leading-8 text-slate-300">بعد از کلیک روی لینک ایمیل، رمز جدید را اینجا ذخیره کن.</p>

        {state.message && <p className="mt-5 rounded-2xl border border-rose-300/25 bg-rose-300/10 p-4 text-sm font-bold text-rose-100">{state.message}</p>}

        <form action={formAction} className="mt-7 grid gap-4">
          <label className="grid gap-2 text-sm font-bold text-slate-200">رمز جدید<input required minLength={8} name="password" type="password" className="rounded-2xl border border-white/10 bg-white/[.06] px-4 py-3 text-white outline-none focus:border-cyan-200" /></label>
          <button disabled={pending} className="rounded-2xl bg-cyan-200 px-5 py-4 font-black text-[#05070d] transition hover:bg-white disabled:opacity-60">{pending ? 'در حال ذخیره...' : 'ذخیره رمز جدید'}</button>
        </form>
      </section>
    </main>
  );
}
