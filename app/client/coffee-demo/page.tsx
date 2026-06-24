export default function CoffeeDemoPortal() {
  const items = [
    ['Workflow status', 'Demo active — website scan and sample outputs ready'],
    ['Content calendar', '10 sample content ideas + 5 captions prepared'],
    ['Lead tracker', 'Sample prospect list and scoring model prepared'],
    ['Outreach drafts', '3 first-contact messages ready for approval'],
    ['Weekly report', 'Demo report: opportunities, next actions, bottlenecks']
  ];

  return (
    <main className="min-h-screen bg-[#05070d] px-5 py-10 text-white">
      <div className="mx-auto max-w-6xl">
        <a href="/" className="text-sm font-bold text-cyan-200">← FlowKave</a>
        <section className="mt-10 rounded-[2rem] border border-white/10 bg-white/[.055] p-8 md:p-12">
          <p className="text-sm font-black uppercase tracking-[.25em] text-cyan-200">Client portal preview</p>
          <h1 className="mt-4 text-5xl font-black tracking-tight">Coffee Equipment Demo Dashboard</h1>
          <p className="mt-5 max-w-3xl text-lg leading-8 text-slate-300">This is the kind of simple client-facing panel FlowKave can host under flowkave.tech while the actual agent workflow and QA remain controlled by FlowKave.</p>
        </section>
        <section className="mt-8 grid gap-4">
          {items.map(([title, body]) => <div key={title} className="flex flex-col justify-between gap-4 rounded-2xl border border-white/10 bg-white/[.05] p-5 md:flex-row md:items-center"><div><h2 className="text-xl font-black">{title}</h2><p className="mt-2 text-slate-300">{body}</p></div><span className="rounded-full bg-emerald-300/15 px-4 py-2 text-sm font-black text-emerald-100">Ready</span></div>)}
        </section>
        <section className="mt-8 rounded-[2rem] border border-white/10 bg-[#080b14] p-8">
          <h2 className="text-3xl font-black">Approval queue</h2>
          <p className="mt-4 text-slate-300">Future version: clients approve posts, outreach emails, and weekly reports here. MVP version can link to Google Sheets, Notion, Drive, or email drafts.</p>
        </section>
      </div>
    </main>
  );
}
