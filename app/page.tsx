'use client';

import { useMemo, useState } from 'react';
import { copy, languages, type Lang } from '../lib/copy';

const workflowCards = [
  { title: '01', body: 'Website and product catalog intake' },
  { title: '02', body: 'AI-assisted knowledge base and offer map' },
  { title: '03', body: 'Content, leads, outreach, follow-up, report' }
];

export default function Home() {
  const [lang, setLang] = useState<Lang>('en');
  const t = copy[lang];
  const dir = useMemo(() => languages.find((l) => l.code === lang)?.dir ?? 'ltr', [lang]);

  return (
    <main dir={dir} className="min-h-screen overflow-hidden bg-[#05070d] text-white">
      <div className="orb orb-a" />
      <div className="orb orb-b" />

      <nav className="sticky top-0 z-40 border-b border-white/10 bg-[#05070d]/75 backdrop-blur-xl">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-5 py-4">
          <a href="#top" className="flex items-center gap-3">
            <span className="grid h-10 w-10 place-items-center rounded-2xl bg-gradient-to-br from-cyan-300 to-violet-500 font-black text-[#05070d]">FK</span>
            <span className="text-xl font-black tracking-tight">FlowKave</span>
          </a>
          <div className="hidden items-center gap-6 text-sm text-slate-300 md:flex">
            {t.nav.map((item, i) => (
              <a key={item} href={['#services', '#demo', '#portal', '#contact'][i]} className="hover:text-white">{item}</a>
            ))}
          </div>
          <div className="flex rounded-full border border-white/10 bg-white/5 p-1">
            {languages.map((l) => (
              <button key={l.code} onClick={() => setLang(l.code)} className={`rounded-full px-3 py-1 text-xs font-bold transition ${lang === l.code ? 'bg-white text-[#05070d]' : 'text-slate-300 hover:text-white'}`}>{l.label}</button>
            ))}
          </div>
        </div>
      </nav>

      <section id="top" className="relative mx-auto grid max-w-7xl gap-12 px-5 py-20 md:grid-cols-[1.1fr_.9fr] md:py-28">
        <div className="relative z-10">
          <p className="mb-5 inline-flex rounded-full border border-cyan-300/30 bg-cyan-300/10 px-4 py-2 text-sm font-semibold text-cyan-100">{t.heroKicker}</p>
          <h1 className="max-w-4xl text-5xl font-black leading-[1.02] tracking-tight md:text-7xl">{t.heroTitle}</h1>
          <p className="mt-7 max-w-2xl text-lg leading-8 text-slate-300 md:text-xl">{t.heroBody}</p>
          <div className="mt-9 flex flex-col gap-3 sm:flex-row">
            <a href="#demo" className="rounded-2xl bg-white px-6 py-4 text-center font-black text-[#05070d] shadow-[0_0_40px_rgba(255,255,255,.2)] transition hover:-translate-y-1">{t.primaryCta}</a>
            <a href="#contact" className="rounded-2xl border border-white/15 bg-white/5 px-6 py-4 text-center font-bold text-white transition hover:-translate-y-1 hover:bg-white/10">{t.secondaryCta}</a>
          </div>
          <div className="mt-9 grid gap-3 sm:grid-cols-3">
            {t.proof.map((p) => <div key={p} className="rounded-2xl border border-white/10 bg-white/[.04] p-4 text-sm text-slate-200">✓ {p}</div>)}
          </div>
        </div>
        <div className="relative z-10 rounded-[2rem] border border-white/10 bg-white/[.06] p-5 shadow-2xl backdrop-blur-xl">
          <div className="rounded-[1.5rem] bg-[#080b14] p-5">
            <div className="mb-4 flex gap-2"><span className="h-3 w-3 rounded-full bg-red-400" /><span className="h-3 w-3 rounded-full bg-yellow-400" /><span className="h-3 w-3 rounded-full bg-green-400" /></div>
            <p className="text-sm text-slate-400">FlowKave / workflow run</p>
            <div className="mt-5 space-y-4">
              {workflowCards.map((card) => (
                <div key={card.title} className="rounded-2xl border border-cyan-300/15 bg-gradient-to-r from-cyan-300/10 to-violet-400/10 p-5">
                  <p className="text-sm font-black text-cyan-200">{card.title}</p>
                  <p className="mt-2 font-semibold">{card.body}</p>
                </div>
              ))}
            </div>
            <div className="mt-5 rounded-2xl border border-emerald-300/20 bg-emerald-300/10 p-4 text-sm text-emerald-100">Managed backend: Hermes agents + human QA + client-ready dashboard</div>
          </div>
        </div>
      </section>

      <section id="services" className="mx-auto max-w-7xl px-5 py-16">
        <h2 className="text-4xl font-black md:text-5xl">{t.servicesTitle}</h2>
        <div className="mt-8 grid gap-5 md:grid-cols-3">
          {t.services.map(([title, body]) => <article key={title} className="rounded-[1.75rem] border border-white/10 bg-white/[.055] p-7"><h3 className="text-2xl font-black">{title}</h3><p className="mt-4 leading-7 text-slate-300">{body}</p></article>)}
        </div>
      </section>

      <section id="demo" className="mx-auto max-w-7xl px-5 py-16">
        <div className="grid gap-7 md:grid-cols-[.85fr_1.15fr]">
          <div className="rounded-[2rem] border border-white/10 bg-gradient-to-br from-violet-500/20 to-cyan-400/10 p-8">
            <p className="text-sm font-black uppercase tracking-[.25em] text-cyan-200">Demo case study</p>
            <h2 className="mt-4 text-4xl font-black md:text-5xl">{t.demoTitle}</h2>
            <p className="mt-5 leading-8 text-slate-200">{t.demoBody}</p>
            <a href="/demos/coffee-equipment" className="mt-8 inline-flex rounded-2xl bg-cyan-300 px-5 py-3 font-black text-[#05070d]">Open full demo →</a>
          </div>
          <div className="rounded-[2rem] border border-white/10 bg-white/[.05] p-6">
            <div className="grid gap-3">
              {t.demoSteps.map((step, i) => <div key={step} className="flex items-center gap-4 rounded-2xl border border-white/10 bg-[#080b14] p-4"><span className="grid h-9 w-9 place-items-center rounded-xl bg-white text-sm font-black text-[#05070d]">{i + 1}</span><span className="font-bold">{step}</span></div>)}
            </div>
          </div>
        </div>
      </section>

      <section id="portal" className="mx-auto max-w-7xl px-5 py-16">
        <div className="rounded-[2rem] border border-white/10 bg-white/[.055] p-8 md:p-12">
          <h2 className="text-4xl font-black md:text-5xl">{t.portalTitle}</h2>
          <p className="mt-5 max-w-4xl text-lg leading-8 text-slate-300">{t.portalBody}</p>
          <a href="/client/coffee-demo" className="mt-8 inline-flex rounded-2xl border border-white/15 px-5 py-3 font-black hover:bg-white/10">Preview demo client portal →</a>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-5 py-16">
        <h2 className="text-4xl font-black md:text-5xl">{t.packagesTitle}</h2>
        <div className="mt-8 grid gap-5 md:grid-cols-3">
          {t.packages.map(([name, price, body]) => <article key={name} className="rounded-[1.75rem] border border-white/10 bg-[#080b14] p-7"><h3 className="text-2xl font-black">{name}</h3><p className="mt-3 text-xl font-black text-cyan-200">{price}</p><p className="mt-4 leading-7 text-slate-300">{body}</p></article>)}
        </div>
      </section>

      <section id="contact" className="mx-auto max-w-7xl px-5 py-20">
        <div className="rounded-[2rem] border border-cyan-300/20 bg-gradient-to-br from-cyan-300/15 to-violet-500/15 p-8 text-center md:p-14">
          <h2 className="text-4xl font-black md:text-6xl">{t.contactTitle}</h2>
          <p className="mx-auto mt-5 max-w-3xl text-lg leading-8 text-slate-200">{t.contactBody}</p>
          <a href={`mailto:${t.email}`} className="mt-8 inline-flex rounded-2xl bg-white px-6 py-4 font-black text-[#05070d]">{t.email}</a>
        </div>
      </section>

      <footer className="border-t border-white/10 px-5 py-8 text-center text-sm text-slate-400">© 2026 FlowKave — Managed AI-agent workflow systems.</footer>
    </main>
  );
}
