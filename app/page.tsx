const modules = [
  {
    title: 'صندوق و ثبت سفارش',
    body: 'ثبت سفارش سالن، دلیوری و اسنپ‌فود با انتخاب میز، فیش باز، تسویه کامل یا مرحله‌ای و چاپ رسید.',
    color: 'from-cyan-300/24 to-emerald-400/10',
    rows: ['میز ۱۲ · فیش باز', 'لاته × ۳', 'تسویه اقلام باقی‌مانده']
  },
  {
    title: 'منوی دیجیتال',
    body: 'ساخت منو، دسته‌بندی غذا و نوشیدنی، انتشار منوی قابل مشاهده برای مشتری و کنترل آیتم‌های فعال.',
    color: 'from-violet-300/24 to-cyan-400/10',
    rows: ['نوشیدنی گرم', 'دسر', 'انتشار منو']
  },
  {
    title: 'رسپی و قیمت تمام‌شده',
    body: 'ثبت رسپی هر آیتم، مصرف مواد اولیه، محاسبه قیمت تمام‌شده و آماده‌سازی برای تصمیم قیمت‌گذاری.',
    color: 'from-amber-300/24 to-rose-400/10',
    rows: ['شیر: ۱۸۰ میلی‌لیتر', 'قهوه: ۱۸ گرم', 'قیمت تمام‌شده هر پرس']
  },
  {
    title: 'انبار و فاکتور خرید',
    body: 'کنترل موجودی مواد اولیه، هشدار کمبود، ورود فاکتور خرید و اثر خودکار روی انبار.',
    color: 'from-emerald-300/24 to-teal-400/10',
    rows: ['موجودی شیر', 'حداقل هشدار', 'ثبت فاکتور خرید']
  },
  {
    title: 'حسابداری پایه',
    body: 'حساب‌های بانکی و نقدی، هزینه عملیاتی، چک‌ها، دفتر مالی و گزارش سود تقریبی در یک محیط ساده.',
    color: 'from-blue-300/24 to-violet-400/10',
    rows: ['حساب‌ها', 'هزینه‌ها', 'چک‌ها']
  },
  {
    title: 'بانک مشتریان',
    body: 'ثبت مشتری، سگمنت‌ها، سابقه خرید، مشتریان غیرفعال و پیشنهاد کمپین برگشت مشتری.',
    color: 'from-pink-300/24 to-orange-400/10',
    rows: ['مشتری وفادار', 'پرخرج', 'کمپین بازگشت']
  }
];

const benefits = [
  ['دید عملیاتی واضح', 'مدیر به جای چند دفتر و فایل پراکنده، فروش، انبار، رسپی و حسابداری را در یک سامانه می‌بیند.'],
  ['مناسب کافه و رستوران واقعی', 'سناریوها بر اساس میز سالن، صندوق، فاکتور خرید، مواد اولیه، رسپی و پرداخت طراحی شده‌اند.'],
  ['آماده توسعه محلی و ابری', 'برای تست روی وب آماده است و مسیر نسخه محلی داخل رستوران و همگام‌سازی آینده هم در طراحی دیده شده.']
];

const screenshots = [
  { label: 'داشبورد مدیریتی', title: 'نمای کلی وضعیت روز', stats: ['درآمد امروز', 'هزینه‌ها', 'سود تقریبی', 'هشدار انبار'] },
  { label: 'صندوق', title: 'ثبت سفارش میز و تسویه', stats: ['انتخاب میز', 'افزودن آیتم', 'تقسیم پرداخت', 'چاپ رسید'] },
  { label: 'حسابداری', title: 'هزینه، چک و دفتر مالی', stats: ['ثبت هزینه', 'فاکتور خرید', 'چک‌های نزدیک', 'گزارش‌ها'] }
];

function ProductMockup({ title, rows, color }: { title: string; rows: string[]; color: string }) {
  return (
    <div className={`rounded-[1.75rem] border border-white/10 bg-gradient-to-br ${color} p-4 shadow-2xl`}>
      <div className="rounded-[1.35rem] border border-white/10 bg-[#07101d]/92 p-4">
        <div className="mb-4 flex items-center justify-between">
          <div className="flex gap-1.5"><span className="h-2.5 w-2.5 rounded-full bg-rose-400" /><span className="h-2.5 w-2.5 rounded-full bg-amber-300" /><span className="h-2.5 w-2.5 rounded-full bg-emerald-300" /></div>
          <span className="rounded-full border border-cyan-200/20 bg-cyan-200/10 px-3 py-1 text-[11px] font-black text-cyan-100">{title}</span>
        </div>
        <div className="grid gap-3">
          {rows.map((row, index) => (
            <div key={row} className="grid grid-cols-[1fr_auto] items-center gap-3 rounded-2xl border border-white/10 bg-white/[.055] p-3">
              <div>
                <p className="text-sm font-black text-slate-100">{row}</p>
                <p className="mt-1 text-xs font-bold text-slate-500">نمونه از صفحه سامانه</p>
              </div>
              <span className="grid h-9 w-9 place-items-center rounded-xl bg-cyan-200 text-xs font-black text-[#06111f]">{index + 1}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
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
            <a href="#contact" className="transition hover:text-cyan-200">شروع تست</a>
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
            <a href="#screens" className="rounded-2xl border border-cyan-200/40 bg-cyan-200/10 px-7 py-4 text-center font-black text-cyan-100 transition hover:-translate-y-1 hover:bg-cyan-200 hover:text-[#05070d]">دیدن بخش‌های سامانه</a>
          </div>
          <div className="mt-10 grid gap-3 sm:grid-cols-3">
            {['صندوق و سفارش', 'انبار و رسپی', 'حسابداری و گزارش'].map((p) => <div key={p} className="glass rounded-2xl p-4 text-sm font-semibold text-slate-200"><span className="text-cyan-200">✦</span> {p}</div>)}
          </div>
        </div>

        <div className="glass relative rounded-[2.25rem] p-4">
          <div className="rounded-[1.7rem] border border-white/10 bg-[#070a13] p-5 shadow-2xl">
            <div className="mb-6 flex items-center justify-between">
              <span className="rounded-full border border-emerald-300/20 bg-emerald-300/10 px-3 py-1 text-xs font-black text-emerald-100">نمونه نمای مدیریتی</span>
              <div className="flex gap-2"><span className="h-3 w-3 rounded-full bg-[#ff6b6b]" /><span className="h-3 w-3 rounded-full bg-[#ffd166]" /><span className="h-3 w-3 rounded-full bg-[#06d6a0]" /></div>
            </div>
            <p className="text-3xl font-black">داشبورد عملیاتی رستوران</p>
            <p className="mt-2 text-sm leading-6 text-slate-400">مدیر در یک نگاه می‌بیند امروز چه فروخته، چه هزینه‌ای ثبت شده، کدام مواد رو به اتمام است و کدام سفارش‌ها باز هستند.</p>
            <div className="my-6 grid gap-3 sm:grid-cols-2">
              {[
                ['درآمد امروز', '۱۲٬۸۵۰٬۰۰۰ تومان'],
                ['فیش‌های باز', '۷ میز'],
                ['هشدار انبار', '۴ ماده'],
                ['چک نزدیک', '۲ مورد']
              ].map(([label, value]) => (
                <div key={label} className="rounded-2xl border border-white/10 bg-white/[.045] p-4">
                  <p className="text-xs font-bold text-slate-500">{label}</p>
                  <p className="mt-2 text-xl font-black text-cyan-200">{value}</p>
                </div>
              ))}
            </div>
            <div className="rounded-2xl border border-cyan-300/15 bg-gradient-to-r from-cyan-300/10 to-violet-400/10 p-5 text-sm font-semibold leading-7 text-slate-100">
              هدف: مشتری قبل از خرید، دقیقاً بفهمد سامانه چه چیزی را در کار روزانه‌اش ساده‌تر می‌کند.
            </div>
          </div>
        </div>
      </section>

      <section id="features" className="relative z-10 mx-auto max-w-7xl px-5 py-20">
        <div className="max-w-3xl">
          <p className="text-sm font-black tracking-[.2em] text-cyan-200">قابلیت‌های اصلی</p>
          <h2 className="mt-4 text-4xl font-black tracking-[-.035em] md:text-6xl">سامانه فقط یک صندوق ساده نیست؛ ستون فقرات عملیات رستوران است.</h2>
          <p className="mt-5 text-lg leading-9 text-slate-300">هر بخش برای یک مسئله واقعی طراحی شده: فروش، مواد اولیه، قیمت تمام‌شده، پرداخت‌ها، مشتریان و گزارش مدیریتی.</p>
        </div>
        <div className="mt-10 grid gap-5 md:grid-cols-3">
          {modules.map((module) => (
            <article key={module.title} className="glass rounded-[1.9rem] p-5 transition hover:-translate-y-1 hover:border-cyan-200/30">
              <ProductMockup title={module.title} rows={module.rows} color={module.color} />
              <h3 className="mt-6 text-2xl font-black">{module.title}</h3>
              <p className="mt-3 leading-8 text-slate-300">{module.body}</p>
            </article>
          ))}
        </div>
      </section>

      <div className="hairline mx-auto max-w-7xl" />

      <section id="screens" className="relative z-10 mx-auto max-w-7xl px-5 py-20">
        <div className="grid gap-10 lg:grid-cols-[.85fr_1.15fr]">
          <div>
            <p className="text-sm font-black tracking-[.2em] text-violet-200">نمای ملموس برای مشتری</p>
            <h2 className="mt-4 text-4xl font-black tracking-[-.035em] md:text-6xl">قبل از خرید، صفحه‌ها را ببیند و کاربرد را حس کند.</h2>
            <p className="mt-6 text-lg leading-9 text-slate-300">این بخش‌ها برای فروش مهم‌اند: مشتری باید ببیند سامانه واقعاً در سالن، صندوق، آشپزخانه، انبار و حسابداری چه کمکی می‌کند.</p>
          </div>
          <div className="grid gap-5">
            {screenshots.map((screen) => (
              <div key={screen.title} className="rounded-[2rem] border border-white/10 bg-[#07101d]/90 p-5 shadow-2xl">
                <div className="mb-4 flex items-center justify-between gap-3">
                  <h3 className="text-2xl font-black text-cyan-100">{screen.title}</h3>
                  <span className="rounded-full bg-white/[.07] px-3 py-1 text-xs font-black text-slate-300">{screen.label}</span>
                </div>
                <div className="grid gap-3 sm:grid-cols-4">
                  {screen.stats.map((item) => <div key={item} className="rounded-2xl border border-white/10 bg-white/[.045] p-4 text-center text-sm font-black text-slate-200">{item}</div>)}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section id="benefits" className="relative z-10 mx-auto max-w-7xl px-5 py-20">
        <p className="text-sm font-black tracking-[.2em] text-cyan-200">چرا برای فروش جذاب است؟</p>
        <h2 className="mt-4 max-w-4xl text-4xl font-black tracking-[-.035em] md:text-6xl">به جای وعده کلی، مسئله‌های روزانه رستوران را نشان می‌دهد.</h2>
        <div className="mt-10 grid gap-5 md:grid-cols-3">
          {benefits.map(([title, body]) => (
            <article key={title} className="rounded-[1.9rem] border border-white/10 bg-[#070a13]/85 p-7 shadow-2xl">
              <h3 className="text-3xl font-black text-cyan-100">{title}</h3>
              <p className="mt-5 leading-8 text-slate-300">{body}</p>
            </article>
          ))}
        </div>
      </section>

      <section id="contact" className="relative z-10 mx-auto max-w-7xl px-5 py-24">
        <div className="rounded-[2.5rem] border border-cyan-200/25 bg-gradient-to-br from-cyan-300/18 via-white/[.07] to-violet-500/20 p-8 text-center shadow-[0_30px_120px_rgba(34,211,238,.12)] md:p-16">
          <h2 className="text-4xl font-black tracking-[-.04em] md:text-7xl">سامانه را ببینید، بعد برای خرید تصمیم بگیرید.</h2>
          <p className="mx-auto mt-6 max-w-3xl text-lg leading-9 text-slate-200">ورود به سامانه تستی از طریق app.flowkave.tech انجام می‌شود. مسیر خرید نهایی می‌تواند بعد از مشاهده دموی واقعی و تنظیم پکیج مناسب رستوران فعال شود.</p>
          <div className="mt-9 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <a href="https://app.flowkave.tech" className="inline-flex rounded-2xl bg-cyan-200 px-8 py-4 font-black text-[#05070d] transition hover:-translate-y-1 hover:bg-white">ورود به سامانه</a>
            <a href="https://app.flowkave.tech/signup" className="inline-flex rounded-2xl border border-white/15 px-8 py-4 font-black text-white transition hover:-translate-y-1 hover:bg-white/10">ساخت حساب تستی</a>
          </div>
        </div>
      </section>

      <footer className="relative z-10 border-t border-white/10 px-5 py-8 text-center text-sm font-semibold text-slate-400">فلوکیو — سامانه مدیریت رستوران و کافه</footer>
    </main>
  );
}
