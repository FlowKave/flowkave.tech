'use client';

import { FormEvent, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '../../lib/supabase/client';


function readableResetError(message: string) {
  const lower = String(message || '').toLowerCase();
  if (lower.includes('auth session missing') || lower.includes('invalid login credentials') || lower.includes('invalid') || lower.includes('expired')) {
    return 'لینک بازیابی معتبر نیست یا منقضی شده است. دوباره از فراموشی رمز لینک جدید بگیر و همان لینک را مستقیم در همین مرورگر باز کن.';
  }
  if (lower.includes('same password') || lower.includes('different from')) {
    return 'رمز جدید باید با رمز قبلی فرق داشته باشد.';
  }
  return message || 'ذخیره رمز جدید ناموفق بود.';
}

export default function ResetPasswordPage() {
  const router = useRouter();
  const [password, setPassword] = useState('');
  const [message, setMessage] = useState('');
  const [pending, setPending] = useState(false);
  const [recoveryReady, setRecoveryReady] = useState(false);

  useEffect(() => {
    let cancelled = false;
    async function hydrateRecoverySession() {
      const supabase = createClient();
      const hash = new URLSearchParams(window.location.hash.replace(/^#/, ''));
      const query = new URLSearchParams(window.location.search);
      const accessToken = hash.get('access_token');
      const refreshToken = hash.get('refresh_token');
      const code = query.get('code');
      const linkError = query.get('error_description') || hash.get('error_description');

      if (linkError) {
        if (!cancelled) setMessage(decodeURIComponent(linkError));
        return;
      }

      if (accessToken && refreshToken) {
        const { error } = await supabase.auth.setSession({ access_token: accessToken, refresh_token: refreshToken });
        window.history.replaceState(null, '', window.location.pathname);
        if (!cancelled && error) setMessage(readableResetError(error.message));
      } else if (code) {
        const { error } = await supabase.auth.exchangeCodeForSession(code);
        window.history.replaceState(null, '', window.location.pathname);
        if (!cancelled && error) setMessage(readableResetError(error.message));
      }

      const { data } = await supabase.auth.getSession();
      if (!cancelled) setRecoveryReady(Boolean(data.session));
    }
    hydrateRecoverySession();
    return () => { cancelled = true; };
  }, []);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setMessage('');
    try {
      const supabase = createClient();
      const { data } = await supabase.auth.getSession();
      if (!data.session) {
        setMessage('لینک بازیابی منقضی شده یا در همین مرورگر کامل باز نشده است. دوباره از فراموشی رمز لینک جدید بگیر و همان لینک را مستقیم باز کن.');
        return;
      }
      const { error } = await supabase.auth.updateUser({ password });
      if (error) {
        setMessage(readableResetError(error.message));
        return;
      }
      const currentSession = (await supabase.auth.getSession()).data.session;
      if (currentSession?.access_token) {
        const syncResponse = await fetch('/api/manager-password-sync', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${currentSession.access_token}`,
          },
          body: JSON.stringify({ password }),
        });
        if (!syncResponse.ok) {
          const payload = await syncResponse.json().catch(() => ({}));
          setMessage(readableResetError(payload.error || 'رمز مالک ذخیره شد، اما همگام‌سازی رمز مدیر ناموفق بود.'));
          return;
        }
      }
      await supabase.auth.signOut();
      router.push('/login?reset=1');
    } catch (error) {
      setMessage(error instanceof Error ? readableResetError(error.message) : 'ذخیره رمز جدید ناموفق بود.');
    } finally {
      setPending(false);
    }
  }

  return (
    <main dir="rtl" className="min-h-screen px-5 py-12 text-white">
      <div className="noise" />
      <section className="relative z-10 mx-auto max-w-md rounded-[2rem] border border-white/10 bg-[#070a13]/90 p-7 shadow-2xl">
        <h1 className="display-font text-4xl font-black">تنظیم رمز جدید</h1>
        <p className="mt-3 leading-8 text-slate-300">بعد از کلیک روی لینک ایمیل، رمز جدید را اینجا ذخیره کن.</p>

        {message && <p className="mt-5 rounded-2xl border border-rose-300/25 bg-rose-300/10 p-4 text-sm font-bold text-rose-100">{message}</p>}
        {!message && !recoveryReady && <p className="mt-5 rounded-2xl border border-cyan-300/25 bg-cyan-300/10 p-4 text-sm font-bold text-cyan-100">در حال آماده‌سازی لینک بازیابی...</p>}

        <form onSubmit={handleSubmit} className="mt-7 grid gap-4">
          <label className="grid gap-2 text-sm font-bold text-slate-200">رمز جدید<input required minLength={8} name="password" type="password" value={password} onChange={(event) => setPassword(event.target.value)} className="rounded-2xl border border-white/10 bg-white/[.06] px-4 py-3 text-white outline-none focus:border-cyan-200" /></label>
          <button disabled={pending} className="rounded-2xl bg-cyan-200 px-5 py-4 font-black text-[#05070d] transition hover:bg-white disabled:opacity-60">{pending ? 'در حال ذخیره...' : 'ذخیره رمز جدید'}</button>
        </form>
      </section>
    </main>
  );
}
