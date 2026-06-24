export default function CoffeeEquipmentDemo() {
  const leads = [
    ['Cafe newly opened in Tehran', 'High', 'Espresso machine + grinder consultation'],
    ['Restaurant upgrading coffee corner', 'Medium', 'Commercial grinder comparison'],
    ['Hotel breakfast bar', 'High', 'Full coffee equipment bundle']
  ];

  return (
    <main className="min-h-screen bg-[#05070d] px-5 py-10 text-white">
      <div className="mx-auto max-w-6xl">
        <a href="/" className="text-sm font-bold text-cyan-200">← FlowKave</a>
        <section className="mt-10 rounded-[2rem] border border-white/10 bg-white/[.055] p-8 md:p-12">
          <p className="text-sm font-black uppercase tracking-[.25em] text-cyan-200">Demo workflow</p>
          <h1 className="mt-4 text-5xl font-black tracking-tight">Coffee Equipment Seller Growth System</h1>
          <p className="mt-5 max-w-3xl text-lg leading-8 text-slate-300">A first free case study for a real family business in Iran: convert a coffee-shop equipment website into a managed workflow for content, prospecting, outreach, follow-up, and reporting.</p>
        </section>

        <section className="mt-8 grid gap-5 md:grid-cols-3">
          {[
            ['Business input', 'Website, product catalog, target customers, city/region, sales priorities.'],
            ['FlowKave backend', 'Hermes agents scan, structure, draft, QA, and prepare weekly outputs.'],
            ['Client output', 'Dashboard, content calendar, lead sheet, outreach drafts, weekly report.']
          ].map(([title, body]) => <article key={title} className="rounded-[1.75rem] border border-white/10 bg-white/[.05] p-7"><h2 className="text-2xl font-black">{title}</h2><p className="mt-4 leading-7 text-slate-300">{body}</p></article>)}
        </section>

        <section className="mt-8 rounded-[2rem] border border-white/10 bg-[#080b14] p-8">
          <h2 className="text-3xl font-black">Sample weekly deliverables</h2>
          <div className="mt-6 grid gap-4 md:grid-cols-2">
            <div className="rounded-2xl bg-white/[.04] p-5"><h3 className="font-black text-cyan-200">Content ideas</h3><ul className="mt-3 space-y-2 text-slate-300"><li>• 5 mistakes when buying a commercial espresso machine</li><li>• Single-group vs two-group espresso machine for small cafes</li><li>• How to choose a grinder for a high-volume coffee shop</li></ul></div>
            <div className="rounded-2xl bg-white/[.04] p-5"><h3 className="font-black text-cyan-200">Outreach drafts</h3><p className="mt-3 text-slate-300">Personalized messages for newly opened cafes, restaurants, hotels, and offices planning coffee corners.</p></div>
          </div>
        </section>

        <section className="mt-8 rounded-[2rem] border border-white/10 bg-white/[.05] p-8">
          <h2 className="text-3xl font-black">Sample lead tracker</h2>
          <div className="mt-5 overflow-hidden rounded-2xl border border-white/10">
            {leads.map(([lead, priority, next]) => <div key={lead} className="grid gap-2 border-b border-white/10 p-4 last:border-b-0 md:grid-cols-3"><strong>{lead}</strong><span className="text-cyan-200">{priority}</span><span className="text-slate-300">{next}</span></div>)}
          </div>
        </section>

        <section className="mt-8 rounded-[2rem] border border-emerald-300/20 bg-emerald-300/10 p-8">
          <h2 className="text-3xl font-black">Why this becomes a strong case study</h2>
          <p className="mt-4 leading-8 text-emerald-50">This demo is practical, niche-specific, and close to a real customer. It proves FlowKave can turn an ordinary website into an operating system for marketing and sales work — without giving raw agents directly to the client.</p>
        </section>
      </div>
    </main>
  );
}
