'use client';

import { useMemo, useState } from 'react';
import { copy, languages, type Lang } from '../lib/copy';

const dashboardRows = [
  ['New B2B leads', '24', '+18%'],
  ['Quotes waiting follow-up', '7', 'today'],
  ['Pipeline value', '$46k', 'demo'],
  ['Weekly tasks automated', '31', '+9']
];

export default function Home() {
  const [lang, setLang] = useState<Lang>('en');
  const t = copy[lang];
  const dir = useMemo(() => languages.find((l) => l.code === lang)?.dir ?? 'ltr', [lang]);

  return (
    <main dir={dir} className="min-h-screen overflow-hidden text-white">
      <div className="noise" />
      <div className="orb orb-a" />
      <div className="orb orb-b" />

      <nav className="sticky top-0 z-40 border-b border-white/10 bg-[#05070d]/75 backdrop-blur-2xl">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-5 px-5 py-4">
          <a href="#top" className="group flex items-center gap-3">
            <span className="grid h-11 w-11 place-items-center rounded-2xl bg-cyan-200 text-sm font-black text-[#05070d] shadow-[0_0_35px_rgba(103,232,249,.25)] transition group-hover:scale-105">FK</span>
            <span className="display-font text-2xl font-black tracking-[-.04em]">FlowKave</span>
          </a>
          <div className="hidden items-center gap-7 text-sm font-semibold text-slate-300 lg:flex">
            {t.nav.map((item, i) => (
              <a key={item} href={['#offer', '#demo', '#process', '#pricing', '#contact'][i]} className="transition hover:text-cyan-200">{item}</a>
            ))}
          </div>
          <div className="flex rounded-full border border-white/10 bg-white/[.06] p-1 shadow-inner shadow-white/5">
            {languages.map((l) => (
              <button key={l.code} onClick={() => setLang(l.code)} className={`rounded-full px-3.5 py-1.5 text-xs font-black transition ${lang === l.code ? 'bg-cyan-200 text-[#05070d]' : 'text-slate-300 hover:text-white'}`}>{l.label}</button>
            ))}
          </div>
        </div>
      </nav>

      <section id="top" className="relative z-10 mx-auto grid max-w-7xl gap-12 px-5 pb-16 pt-14 md:grid-cols-[1.02fr_.98fr] md:pb-24 md:pt-20">
        <div>
          <p className="mb-6 inline-flex items-center gap-2 rounded-full border border-cyan-300/25 bg-cyan-300/10 px-4 py-2 text-sm font-bold text-cyan-100 shadow-[0_0_35px_rgba(34,211,238,.12)]">
            <span className="h-2 w-2 rounded-full bg-cyan-300" />
            {t.heroKicker}
          </p>
          <h1 className="display-font max-w-5xl text-5xl font-black leading-[0.95] tracking-[-.065em] text-white md:text-7xl lg:text-8xl">
            {t.heroTitle}
          </h1>
          <p className="mt-8 max-w-2xl text-lg leading-9 text-slate-300 md:text-xl">{t.heroBody}</p>
          <div className="mt-10 flex flex-col gap-3 sm:flex-row">
            <a href={t.auditHref} className="rounded-2xl bg-cyan-200 px-6 py-4 text-center font-black text-[#05070d] shadow-[0_18px_60px_rgba(103,232,249,.22)] transition hover:-translate-y-1 hover:bg-white">{t.primaryCta}</a>
            <a href="#demo" className="rounded-2xl border border-white/15 bg-white/[.06] px-6 py-4 text-center font-black text-white transition hover:-translate-y-1 hover:border-cyan-200/50 hover:bg-white/[.1]">{t.secondaryCta}</a>
          </div>
          <div className="mt-10 grid gap-3 sm:grid-cols-3">
            {t.proof.map((p) => <div key={p} className="glass rounded-2xl p-4 text-sm font-semibold text-slate-200"><span className="text-cyan-200">✦</span> {p}</div>)}
          </div>
        </div>

        <div className="glass relative rounded-[2.25rem] p-4">
          <div className="rounded-[1.7rem] border border-white/10 bg-[#070a13] p-5 shadow-2xl">
            <div className="mb-6 flex items-center justify-between">
              <div className="flex gap-2"><span className="h-3 w-3 rounded-full bg-[#ff6b6b]" /><span className="h-3 w-3 rounded-full bg-[#ffd166]" /><span className="h-3 w-3 rounded-full bg-[#06d6a0]" /></div>
              <span className="rounded-full border border-emerald-300/20 bg-emerald-300/10 px-3 py-1 text-xs font-black text-emerald-100">Managed pipeline</span>
            </div>
            <p className="display-font text-3xl font-black tracking-[-.04em]">Revenue Workflow OS</p>
            <p className="mt-2 text-sm leading-6 text-slate-400">A client-ready dashboard for leads, quotes, follow-ups, tasks, and reports — managed by FlowKave, verified by Hermes.</p>
            <div className="my-6 grid gap-3">
              {dashboardRows.map(([label, value, note]) => (
                <div key={label} className="flex items-center justify-between rounded-2xl border border-white/10 bg-white/[.04] p-4">
                  <div>
                    <p className="text-sm font-bold text-slate-100">{label}</p>
                    <p className="text-xs font-semibold text-slate-500">FlowKave demo metric</p>
                  </div>
                  <div className="text-right">
                    <p className="text-2xl font-black text-cyan-200">{value}</p>
                    <p className="text-xs font-bold text-emerald-200">{note}</p>
                  </div>
                </div>
              ))}
            </div>
            <div className="rounded-2xl border border-cyan-300/15 bg-gradient-to-r from-cyan-300/10 to-violet-400/10 p-5 text-sm font-semibold leading-7 text-slate-100">
              Built for businesses where every missed follow-up or slow quote costs real money.
            </div>
          </div>
        </div>
      </section>

      <section className="relative z-10 mx-auto max-w-7xl px-5 pb-16">
        <div className="grid gap-4 md:grid-cols-3">
          {t.statCards.map(([num, label]) => (
            <div key={num} className="rounded-[1.7rem] border border-white/10 bg-white/[.045] p-6">
              <p className="display-font text-4xl font-black tracking-[-.05em] text-cyan-200">{num}</p>
              <p className="mt-2 font-semibold leading-7 text-slate-300">{label}</p>
            </div>
          ))}
        </div>
      </section>

      <div className="hairline mx-auto max-w-7xl" />

      <section id="offer" className="relative z-10 mx-auto max-w-7xl px-5 py-20">
        <div className="max-w-3xl">
          <p className="text-sm font-black uppercase tracking-[.35em] text-cyan-200">Offer</p>
          <h2 className="display-font mt-4 text-4xl font-black tracking-[-.055em] md:text-6xl">{t.servicesTitle}</h2>
          <p className="mt-5 text-lg leading-9 text-slate-300">{t.servicesSubtitle}</p>
        </div>
        <div className="mt-10 grid gap-5 md:grid-cols-3">
          {t.services.map(([title, body], i) => (
            <article key={title} className="glass group rounded-[1.9rem] p-7 transition hover:-translate-y-1 hover:border-cyan-200/30">
              <p className="text-sm font-black text-cyan-200">0{i + 1}</p>
              <h3 className="display-font mt-5 text-3xl font-black tracking-[-.04em]">{title}</h3>
              <p className="mt-4 leading-8 text-slate-300">{body}</p>
            </article>
          ))}
        </div>
      </section>

      <section id="demo" className="relative z-10 mx-auto max-w-7xl px-5 py-20">
        <div className="grid gap-7 md:grid-cols-[.9fr_1.1fr]">
          <div className="rounded-[2.25rem] border border-cyan-200/20 bg-gradient-to-br from-cyan-300/16 via-white/[.055] to-violet-500/16 p-8 shadow-2xl md:p-10">
            <p className="text-sm font-black uppercase tracking-[.35em] text-cyan-200">Demo case study</p>
            <h2 className="display-font mt-5 text-4xl font-black tracking-[-.055em] md:text-6xl">{t.demoTitle}</h2>
            <p className="mt-6 text-lg leading-9 text-slate-200">{t.demoBody}</p>
            <a href="/demos/coffee-equipment" className="mt-9 inline-flex rounded-2xl bg-white px-5 py-3 font-black text-[#05070d] transition hover:-translate-y-1 hover:bg-cyan-200">{t.demoCta}</a>
          </div>
          <div className="glass rounded-[2.25rem] p-6">
            <div className="grid gap-3">
              {t.demoSteps.map((step, i) => <div key={step} className="flex items-center gap-4 rounded-2xl border border-white/10 bg-[#070a13]/80 p-4"><span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-cyan-200 text-sm font-black text-[#05070d]">{i + 1}</span><span className="font-bold text-slate-100">{step}</span></div>)}
            </div>
          </div>
        </div>
      </section>

      <section id="process" className="relative z-10 mx-auto max-w-7xl px-5 py-20">
        <p className="text-sm font-black uppercase tracking-[.35em] text-violet-200">Process</p>
        <h2 className="display-font mt-4 max-w-4xl text-4xl font-black tracking-[-.055em] md:text-6xl">{t.processTitle}</h2>
        <div className="mt-10 grid gap-5 md:grid-cols-3">
          {t.process.map(([title, body]) => (
            <article key={title} className="rounded-[1.9rem] border border-white/10 bg-[#070a13]/85 p-7 shadow-2xl">
              <h3 className="display-font text-3xl font-black tracking-[-.04em] text-cyan-100">{title}</h3>
              <p className="mt-5 leading-8 text-slate-300">{body}</p>
            </article>
          ))}
        </div>
      </section>

      <section id="pricing" className="relative z-10 mx-auto max-w-7xl px-5 py-20">
        <p className="text-sm font-black uppercase tracking-[.35em] text-cyan-200">Pricing</p>
        <h2 className="display-font mt-4 text-4xl font-black tracking-[-.055em] md:text-6xl">{t.packagesTitle}</h2>
        <div className="mt-10 grid gap-5 md:grid-cols-3">
          {t.packages.map(([name, price, body], i) => <article key={name} className={`rounded-[1.9rem] border p-7 shadow-2xl transition hover:-translate-y-1 ${i === 1 ? 'border-cyan-200/40 bg-cyan-200 text-[#05070d]' : 'border-white/10 bg-[#070a13]/85 hover:border-cyan-200/30'}`}><h3 className="display-font text-3xl font-black tracking-[-.04em]">{name}</h3><p className={`mt-4 text-2xl font-black ${i === 1 ? 'text-[#05070d]' : 'text-cyan-200'}`}>{price}</p><p className={`mt-5 leading-8 ${i === 1 ? 'text-slate-900' : 'text-slate-300'}`}>{body}</p></article>)}
        </div>
      </section>

      <section id="contact" className="relative z-10 mx-auto max-w-7xl px-5 py-24">
        <div className="rounded-[2.5rem] border border-cyan-200/25 bg-gradient-to-br from-cyan-300/18 via-white/[.07] to-violet-500/20 p-8 text-center shadow-[0_30px_120px_rgba(34,211,238,.12)] md:p-16">
          <h2 className="display-font text-4xl font-black tracking-[-.06em] md:text-7xl">{t.contactTitle}</h2>
          <p className="mx-auto mt-6 max-w-3xl text-lg leading-9 text-slate-200">{t.contactBody}</p>
          <div className="mt-9 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <a href={t.auditHref} className="inline-flex rounded-2xl bg-cyan-200 px-7 py-4 font-black text-[#05070d] transition hover:-translate-y-1 hover:bg-white">{t.primaryCta}</a>
            <a href={`mailto:${t.email}`} className="inline-flex rounded-2xl border border-white/15 px-7 py-4 font-black text-white transition hover:-translate-y-1 hover:bg-white/10">{t.email}</a>
          </div>
        </div>
      </section>

      <footer className="relative z-10 border-t border-white/10 px-5 py-8 text-center text-sm font-semibold text-slate-400">© 2026 FlowKave — Managed AI automation and growth workflow systems.</footer>
    </main>
  );
}
