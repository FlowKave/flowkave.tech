const modules = [
  ['صندوق و ثبت سفارش', 'فروش سالن، دلیوری، فیش باز، انتخاب میز، آیتم‌های منو و تسویه در یک صفحه قابل کنترل.'],
  ['منوی دیجیتال', 'ساخت منو، دسته‌بندی، آیتم‌های فعال، جزئیات غذا و آماده‌سازی برای نمایش عمومی.'],
  ['رسپی و قیمت تمام‌شده', 'ثبت مواد اولیه هر آیتم، مقدار مصرف، مراحل آماده‌سازی و محاسبه قیمت تمام‌شده.'],
  ['انبار و فاکتور خرید', 'موجودی مواد، هشدار کمبود، ثبت فاکتور خرید و ارتباط مستقیم با رسپی‌ها.'],
  ['حسابداری پایه', 'حساب‌ها، هزینه‌ها، چک‌ها، دفتر مالی و گزارش سود تقریبی برای مدیریت روزانه.'],
  ['بانک مشتریان', 'ثبت مشتری، سابقه خرید، سگمنت‌بندی و مسیر آماده برای کمپین بازگشت مشتری.']
];

const benefits = [
  ['دید عملیاتی واضح', 'مدیر به جای چند دفتر و فایل پراکنده، فروش، انبار، رسپی و حسابداری را در یک سامانه می‌بیند.'],
  ['مناسب کافه و رستوران واقعی', 'سناریوها بر اساس میز سالن، صندوق، فاکتور خرید، مواد اولیه، رسپی و پرداخت طراحی شده‌اند.'],
  ['آماده توسعه محلی و ابری', 'مسیر نسخه محلی داخل رستوران، کار روی شبکه داخلی و همگام‌سازی آینده در طراحی دیده شده است.']
];

function WindowShell({ title, tag, children }: { title: string; tag: string; children: React.ReactNode }) {
  return (
    <div className="rounded-[2rem] border border-white/10 bg-[#07101d]/95 p-4 shadow-2xl">
      <div className="mb-4 flex items-center justify-between gap-3">
        <div className="flex gap-1.5"><span className="h-2.5 w-2.5 rounded-full bg-rose-400" /><span className="h-2.5 w-2.5 rounded-full bg-amber-300" /><span className="h-2.5 w-2.5 rounded-full bg-emerald-300" /></div>
        <div className="text-left">
          <p className="text-xs font-black text-cyan-200">{tag}</p>
          <h3 className="mt-1 text-xl font-black text-white">{title}</h3>
        </div>
      </div>
      {children}
    </div>
  );
}

function CashierSlide() {
  const items = ['لاته', 'کاپوچینو', 'موکا', 'چیزکیک', 'املت ویژه', 'سالاد سزار', 'آیس لاته', 'براونی'];
  return (
    <WindowShell title="صفحه صندوق و فروش سالن" tag="اسلاید عملیاتی">
      <div className="grid gap-4 lg:grid-cols-[1.25fr_.75fr]">
        <div className="rounded-3xl border border-white/10 bg-white/[.045] p-4">
          <div className="mb-3 flex items-center justify-between">
            <span className="rounded-2xl bg-cyan-200 px-3 py-2 text-xs font-black text-[#06111f]">میز ۱۲ انتخاب شده</span>
            <span className="text-sm font-black text-slate-300">دسته‌بندی آیتم‌ها</span>
          </div>
          <div className="mb-4 flex flex-wrap gap-2 text-xs font-black text-slate-200">
            {['نوشیدنی گرم', 'نوشیدنی سرد', 'صبحانه', 'غذای اصلی', 'دسر'].map((x, i) => <span key={x} className={`rounded-full px-3 py-2 ${i === 0 ? 'bg-cyan-200 text-[#06111f]' : 'bg-white/[.07]'}`}>{x}</span>)}
          </div>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {items.map((item, i) => (
              <div key={item} className="rounded-2xl border border-white/10 bg-[#0d1828] p-3 text-center shadow-lg">
                <p className="truncate text-base font-black text-white">{item}</p>
                <p className="mt-1 text-sm font-bold text-cyan-200">{['۹۵٬۰۰۰','۱۱۰٬۰۰۰','۱۲۵٬۰۰۰','۱۴۰٬۰۰۰'][i % 4]} تومان</p>
              </div>
            ))}
          </div>
          <p className="mt-4 rounded-2xl border border-emerald-200/20 bg-emerald-200/10 p-3 text-sm font-bold leading-7 text-emerald-100">با کلیک روی هر آیتم، همان لحظه به فیش سمت چپ اضافه می‌شود و صندوق‌دار قبل از پرداخت همه اقلام را می‌بیند.</p>
        </div>
        <div className="rounded-3xl border border-cyan-200/20 bg-cyan-200/10 p-4">
          <p className="text-lg font-black text-cyan-100">فیش باز میز ۱۲</p>
          <div className="mt-4 grid gap-3">
            {['لاته × ۳', 'چیزکیک × ۱', 'موکا × ۲'].map((x, i) => <div key={x} className="flex items-center justify-between rounded-2xl bg-[#07101d]/85 p-3"><b>{x}</b><span className="text-cyan-200">{['۲۸۵٬۰۰۰','۱۴۰٬۰۰۰','۲۵۰٬۰۰۰'][i]}</span></div>)}
          </div>
          <div className="mt-4 rounded-2xl bg-white p-4 text-[#06111f]">
            <div className="flex justify-between text-sm font-bold"><span>جمع پرداخت</span><span>۶۷۵٬۰۰۰ تومان</span></div>
            <button className="mt-4 w-full rounded-2xl bg-[#06111f] py-3 font-black text-white">پرداخت اقلام انتخاب‌شده</button>
          </div>
        </div>
      </div>
    </WindowShell>
  );
}

function RecipeSlide() {
  return (
    <WindowShell title="صفحه رسپی و قیمت تمام‌شده" tag="اسلاید رسپی">
      <div className="grid gap-4 lg:grid-cols-2">
        <div className="rounded-3xl border border-white/10 bg-emerald-200/10 p-4">
          <p className="text-lg font-black text-emerald-100">ایجاد رسپی جدید</p>
          {['نام آیتم: لاته', 'دسته‌بندی: نوشیدنی گرم', 'مواد اولیه: شیر، قهوه', 'مراحل آماده‌سازی'].map((x) => <div key={x} className="mt-3 rounded-2xl bg-[#07101d]/85 p-3 text-sm font-bold text-slate-200">{x}</div>)}
          <div className="mt-3 rounded-2xl border border-cyan-200/20 bg-cyan-200/10 p-3 text-sm font-bold leading-7 text-cyan-100">قیمت تمام‌شده هر پرس: ۵۴٬۰۰۰ تومان</div>
        </div>
        <div className="rounded-3xl border border-white/10 bg-white/[.045] p-4">
          <p className="text-lg font-black text-white">رسپی‌های ثبت‌شده</p>
          {['لاته — ۵۴٬۰۰۰ تومان', 'کاپوچینو — ۴۸٬۰۰۰ تومان', 'املت ویژه — ۶۹٬۰۰۰ تومان'].map((x) => <div key={x} className="mt-3 flex items-center justify-between rounded-2xl bg-[#0d1828] p-3"><span className="font-bold">{x}</span><span className="text-cyan-200">ویرایش</span></div>)}
        </div>
      </div>
    </WindowShell>
  );
}

function InventorySlide() {
  return (
    <WindowShell title="صفحه انبار و فاکتور خرید" tag="اسلاید انبار">
      <div className="grid gap-4 lg:grid-cols-[.9fr_1.1fr]">
        <div className="rounded-3xl border border-white/10 bg-white/[.045] p-4">
          <p className="text-lg font-black text-white">موجودی انبار</p>
          {['شیر: ۵ لیتر', 'قهوه: ۱ کیلوگرم', 'تخم‌مرغ: ۶۰ عدد', 'گوجه: ۸ کیلوگرم'].map((x, i) => <div key={x} className="mt-3 grid grid-cols-[1fr_auto] rounded-2xl bg-[#0d1828] p-3 text-sm font-bold"><span>{x}</span><span className={i === 1 ? 'text-amber-200' : 'text-emerald-200'}>{i === 1 ? 'نزدیک هشدار' : 'موجود'}</span></div>)}
        </div>
        <div className="rounded-3xl border border-cyan-200/20 bg-cyan-200/10 p-4">
          <p className="text-lg font-black text-cyan-100">ثبت فاکتور خرید</p>
          <div className="mt-3 grid grid-cols-2 gap-3 text-sm font-bold"><span className="rounded-2xl bg-[#07101d]/85 p-3">تأمین‌کننده</span><span className="rounded-2xl bg-[#07101d]/85 p-3">مبلغ فاکتور</span><span className="rounded-2xl bg-[#07101d]/85 p-3">روش پرداخت</span><span className="rounded-2xl bg-[#07101d]/85 p-3">حساب پرداخت‌کننده</span></div>
          <div className="mt-4 rounded-2xl bg-white p-4 text-[#06111f]"><b>آیتم‌های فاکتور:</b><p className="mt-2 text-sm font-bold">شیر × ۱۰ لیتر، قهوه × ۲ کیلوگرم، شکر × ۵ کیلوگرم</p></div>
        </div>
      </div>
    </WindowShell>
  );
}

function AccountingSlide() {
  return (
    <WindowShell title="صفحه حسابداری و گزارش" tag="اسلاید مدیریت مالی">
      <div className="grid gap-4 lg:grid-cols-3">
        {['حساب‌ها', 'هزینه‌ها', 'چک‌ها'].map((title, i) => <div key={title} className="rounded-3xl border border-white/10 bg-white/[.045] p-4"><p className="text-lg font-black text-cyan-100">{title}</p><p className="mt-4 text-3xl font-black">{['۱۴٬۵۰۰٬۰۰۰','۲٬۳۰۰٬۰۰۰','۳ مورد'][i]}</p><p className="mt-2 text-sm font-bold text-slate-400">نمای مدیریتی روزانه</p></div>)}
      </div>
    </WindowShell>
  );
}

export default function Home() {
  return (
    <main dir="rtl" className="min-h-screen overflow-hidden text-white">
      <div className="noise" />
      <div className="orb orb-a" />
      <div className="orb orb-b" />

      <nav className="sticky top-0 z-40 border-b border-white/10 bg-[#05070d]/80 backdrop-blur-2xl">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-5 px-5 py-4">
          <a href="#top" className="group flex items-center gap-3">
            <span className="grid h-11 w-11 place-items-center rounded-2xl bg-cyan-200 text-sm font-black text-[#05070d] shadow-[0_0_35px_rgba(103,232,249,.25)] transition group-hover:scale-105">فک</span>
            <span className="text-2xl font-black">فلوکیو</span>
          </a>
          <div className="hidden items-center gap-7 text-sm font-bold text-slate-300 lg:flex">
            <a href="#features" className="transition hover:text-cyan-200">قابلیت‌ها</a>
            <a href="#screens" className="transition hover:text-cyan-200">نمای سامانه</a>
            <a href="#benefits" className="transition hover:text-cyan-200">مزیت‌ها</a>
            <a href="https://app.flowkave.tech/signup" className="transition hover:text-cyan-200">ساخت حساب</a>
          </div>
          <a href="https://app.flowkave.tech" className="rounded-2xl bg-cyan-200 px-5 py-3 text-sm font-black text-[#05070d] shadow-[0_16px_45px_rgba(103,232,249,.22)] transition hover:-translate-y-0.5 hover:bg-white">ورود به سامانه</a>
        </div>
      </nav>

      <section id="top" className="relative z-10 mx-auto grid max-w-7xl gap-12 px-5 pb-16 pt-14 md:grid-cols-[.95fr_1.05fr] md:pb-24 md:pt-20">
        <div>
          <p className="mb-6 inline-flex items-center gap-2 rounded-full border border-cyan-300/25 bg-cyan-300/10 px-4 py-2 text-sm font-bold text-cyan-100 shadow-[0_0_35px_rgba(34,211,238,.12)]">
            <span className="h-2 w-2 rounded-full bg-cyan-300" />
            سامانه عملیاتی رستوران و کافه
          </p>
          <h1 className="max-w-5xl text-5xl font-black leading-[1.08] tracking-[-.045em] text-white md:text-7xl">
            از سفارش و صندوق تا انبار، رسپی و حسابداری؛ همه در یک سامانه قابل لمس.
          </h1>
          <p className="mt-8 max-w-2xl text-lg leading-9 text-slate-300 md:text-xl">
            فلوکیو برای رستوران‌ها و کافه‌هایی ساخته شده که می‌خواهند عملیات روزانه‌شان شفاف، قابل کنترل و آماده رشد باشد؛ بدون اینکه بین دفتر فروش، فایل انبار، حسابداری دستی و پیام‌های پراکنده گم شوند.
          </p>
          <div className="mt-10 flex flex-col gap-3 sm:flex-row">
            <a href="https://app.flowkave.tech" className="rounded-2xl bg-cyan-200 px-7 py-4 text-center font-black text-[#05070d] shadow-[0_18px_60px_rgba(103,232,249,.22)] transition hover:-translate-y-1 hover:bg-white">ورود به سامانه</a>
            <a href="https://app.flowkave.tech/signup" className="rounded-2xl border border-emerald-200/50 bg-emerald-200/10 px-7 py-4 text-center font-black text-emerald-100 transition hover:-translate-y-1 hover:bg-emerald-200 hover:text-[#05070d]">ساخت حساب در سامانه</a>
            <a href="#screens" className="rounded-2xl border border-cyan-200/40 bg-cyan-200/10 px-7 py-4 text-center font-black text-cyan-100 transition hover:-translate-y-1 hover:bg-cyan-200 hover:text-[#05070d]">دیدن بخش‌های سامانه</a>
          </div>
          <div className="mt-10 grid gap-3 sm:grid-cols-3">
            {['صندوق و سفارش', 'انبار و رسپی', 'حسابداری و گزارش'].map((p) => <div key={p} className="glass rounded-2xl p-4 text-sm font-semibold text-slate-200"><span className="text-cyan-200">✦</span> {p}</div>)}
          </div>
        </div>

        <div className="glass relative rounded-[2.25rem] p-4">
          <WindowShell title="داشبورد عملیاتی رستوران" tag="نمای مدیریتی">
            <div className="grid gap-3 sm:grid-cols-2">
              {[
                ['درآمد امروز', '۱۲٬۸۵۰٬۰۰۰ تومان'],
                ['فیش‌های باز', '۷ میز'],
                ['هشدار انبار', '۴ ماده'],
                ['چک نزدیک', '۲ مورد']
              ].map(([label, value]) => <div key={label} className="rounded-2xl border border-white/10 bg-white/[.045] p-4"><p className="text-xs font-bold text-slate-500">{label}</p><p className="mt-2 text-xl font-black text-cyan-200">{value}</p></div>)}
            </div>
            <div className="mt-4 rounded-2xl border border-cyan-300/15 bg-gradient-to-r from-cyan-300/10 to-violet-400/10 p-5 text-sm font-semibold leading-7 text-slate-100">مشتری دقیقاً می‌بیند سامانه چه چیزی را در کار روزانه رستوران ساده‌تر می‌کند.</div>
          </WindowShell>
        </div>
      </section>

      <section id="features" className="relative z-10 mx-auto max-w-7xl px-5 py-20">
        <div className="max-w-3xl">
          <p className="text-sm font-black tracking-[.2em] text-cyan-200">قابلیت‌های اصلی</p>
          <h2 className="mt-4 text-4xl font-black tracking-[-.035em] md:text-6xl">سامانه فقط یک صندوق ساده نیست؛ ستون فقرات عملیات رستوران است.</h2>
          <p className="mt-5 text-lg leading-9 text-slate-300">هر بخش برای یک مسئله واقعی طراحی شده: فروش، مواد اولیه، قیمت تمام‌شده، پرداخت‌ها، مشتریان و گزارش مدیریتی.</p>
        </div>
        <div className="mt-10 grid gap-5 md:grid-cols-3">
          {modules.map(([title, body]) => <article key={title} className="glass rounded-[1.9rem] p-7 transition hover:-translate-y-1 hover:border-cyan-200/30"><h3 className="text-2xl font-black text-cyan-100">{title}</h3><p className="mt-4 leading-8 text-slate-300">{body}</p></article>)}
        </div>
      </section>

      <div className="hairline mx-auto max-w-7xl" />

      <section id="screens" className="relative z-10 mx-auto max-w-7xl px-5 py-20">
        <div className="mb-10 max-w-4xl">
          <p className="text-sm font-black tracking-[.2em] text-violet-200">نمای ملموس برای مشتری</p>
          <h2 className="mt-4 text-4xl font-black tracking-[-.035em] md:text-6xl">اسلایدهای تصویری از محیط واقعی سامانه</h2>
          <p className="mt-6 text-lg leading-9 text-slate-300">در این بخش، هر قسمت مثل یک اسلاید پاورپوینت نمایش داده می‌شود تا مشتری دقیقاً ببیند در صندوق، رسپی، انبار و حسابداری چه اتفاقی می‌افتد.</p>
        </div>
        <div className="grid gap-8">
          <CashierSlide />
          <RecipeSlide />
          <InventorySlide />
          <AccountingSlide />
        </div>
      </section>

      <section id="benefits" className="relative z-10 mx-auto max-w-7xl px-5 py-20">
        <p className="text-sm font-black tracking-[.2em] text-cyan-200">چرا برای فروش جذاب است؟</p>
        <h2 className="mt-4 max-w-4xl text-4xl font-black tracking-[-.035em] md:text-6xl">به جای وعده کلی، مسئله‌های روزانه رستوران را نشان می‌دهد.</h2>
        <div className="mt-10 grid gap-5 md:grid-cols-3">
          {benefits.map(([title, body]) => <article key={title} className="rounded-[1.9rem] border border-white/10 bg-[#070a13]/85 p-7 shadow-2xl"><h3 className="text-3xl font-black text-cyan-100">{title}</h3><p className="mt-5 leading-8 text-slate-300">{body}</p></article>)}
        </div>
      </section>

      <footer className="relative z-10 border-t border-white/10 px-5 py-8 text-center text-sm font-semibold text-slate-400">فلوکیو — سامانه مدیریت رستوران و کافه</footer>
    </main>
  );
}
