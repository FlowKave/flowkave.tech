export type Lang = 'en' | 'fa' | 'sv';

export const languages: { code: Lang; label: string; dir: 'ltr' | 'rtl' }[] = [
  { code: 'en', label: 'EN', dir: 'ltr' },
  { code: 'fa', label: 'FA', dir: 'rtl' },
  { code: 'sv', label: 'SV', dir: 'ltr' }
];

export const copy = {
  en: {
    nav: ['Offer', 'Demo', 'Process', 'Pricing', 'Contact'],
    heroKicker: 'Productized AI automation for small B2B teams',
    heroTitle: 'We turn your lead, quote, and follow-up chaos into a managed growth system.',
    heroBody: 'FlowKave builds practical AI-assisted workflows for businesses that lose money in spreadsheets, slow replies, messy quotes, and forgotten follow-ups. Start with a focused 7-day implementation, then keep improving with monthly managed operations.',
    primaryCta: 'Book a free workflow audit',
    secondaryCta: 'See the coffee equipment demo',
    auditHref: 'mailto:flowkave@gmail.com?subject=Free%20FlowKave%20workflow%20audit&body=Hi%20FlowKave%2C%0A%0AI%20want%20a%20free%20workflow%20audit.%0AWebsite%3A%20%0ABusiness%3A%20%0AThe%20repetitive%20process%20we%20want%20to%20systemize%3A%20',
    proof: ['7-day implementation sprint', 'Human QA before anything goes live', 'Built around your real sales workflow'],
    statCards: [
      ['7 days', 'to a working client-ready prototype'],
      ['2–4 pilots', 'can validate the first $2k/month goal'],
      ['1 dashboard', 'for leads, quotes, follow-ups, and reports']
    ],
    servicesTitle: 'A clear offer clients can understand in 30 seconds',
    servicesSubtitle: 'We do not sell generic AI tools. We install and run a repeatable business workflow.',
    services: [
      ['Lead pipeline system', 'Capture prospects, score opportunities, assign next actions, and stop losing deals because nobody followed up.'],
      ['Quote & proposal workflow', 'Turn product/service needs into structured quotes, summaries, and approval-ready proposal drafts.'],
      ['Follow-up operations', 'Weekly next-action lists, outreach drafts, reminders, and reports managed by FlowKave with QA gates.']
    ],
    demoTitle: 'Demo: coffee equipment sales CRM',
    demoBody: 'The first public case study shows a B2B coffee-shop equipment workflow: leads, qualification, quotes, projects, and follow-ups. This is the kind of system FlowKave can customize for a real client quickly.',
    demoSteps: ['Lead board', 'Customer details', 'Quote builder', 'Project stages', 'Follow-up queue', 'Weekly report'],
    demoCta: 'Open full demo case →',
    processTitle: 'How we get to revenue fast',
    process: [
      ['1. Audit', 'We map one painful workflow and identify where money is leaking.'],
      ['2. Build', 'We create a working dashboard/prototype using AI-assisted builders plus Hermes QA.'],
      ['3. Operate', 'We run or improve the workflow weekly until it becomes a reliable system.']
    ],
    packagesTitle: 'Starter packages designed for fast cashflow',
    packages: [
      ['Free Workflow Audit', '$0', 'A short audit of your lead/quote/follow-up process and a concrete automation map.'],
      ['7-Day Setup Sprint', '$750–$1,500', 'A working CRM/workflow prototype with dashboard, client review, and handoff.'],
      ['Managed Workflow Ops', '$500–$2,000/mo', 'Monthly improvements, follow-up operations, reports, and new automations.']
    ],
    contactTitle: 'Want the first version of your workflow in 7 days?',
    contactBody: 'Send your website, your product/service, and the repetitive sales or operations task you want FlowKave to systemize. We will reply with the first workflow audit questions.',
    email: 'flowkave@gmail.com'
  },
  fa: {
    nav: ['آفر', 'دمو', 'فرآیند', 'قیمت', 'تماس'],
    heroKicker: 'اتوماسیون AI محصول‌سازی‌شده برای تیم‌های کوچک B2B',
    heroTitle: 'لید، قیمت‌دهی و پیگیری‌های شلوغ شما را به سیستم رشد مدیریت‌شده تبدیل می‌کنیم.',
    heroBody: 'FlowKave برای کسب‌وکارهایی ساخته شده که در اکسل، پاسخ دیر، quote نامنظم و follow-up فراموش‌شده پول از دست می‌دهند. با یک اجرای متمرکز ۷ روزه شروع می‌کنیم و بعد با عملیات ماهانه بهترش می‌کنیم.',
    primaryCta: 'درخواست audit رایگان',
    secondaryCta: 'دیدن دموی تجهیزات قهوه',
    auditHref: 'mailto:flowkave@gmail.com?subject=Free%20FlowKave%20workflow%20audit&body=Hi%20FlowKave%2C%0A%0AI%20want%20a%20free%20workflow%20audit.%0AWebsite%3A%20%0ABusiness%3A%20%0AThe%20repetitive%20process%20we%20want%20to%20systemize%3A%20',
    proof: ['اجرای ۷ روزه', 'QA انسانی قبل از تحویل', 'بر اساس فروش واقعی شما'],
    statCards: [
      ['۷ روز', 'تا یک نمونه قابل نمایش به مشتری'],
      ['۲–۴ پایلوت', 'برای validate کردن هدف اول $2k/month'],
      ['۱ داشبورد', 'برای لید، quote، پیگیری و گزارش']
    ],
    servicesTitle: 'آفری که مشتری در ۳۰ ثانیه می‌فهمد',
    servicesSubtitle: 'ما ابزار AI خام نمی‌فروشیم؛ یک workflow واقعی نصب و مدیریت می‌کنیم.',
    services: [
      ['سیستم لید و pipeline', 'لیدها، اولویت‌ها، اقدام بعدی و وضعیت dealها را یک‌جا می‌آوریم تا فرصت‌ها گم نشوند.'],
      ['سیستم quote و proposal', 'نیاز مشتری را به quote ساختاریافته، خلاصه قابل ارسال و draft proposal تبدیل می‌کنیم.'],
      ['عملیات follow-up', 'لیست اقدام هفتگی، draft پیام‌ها، reminderها و گزارش‌ها با QA FlowKave مدیریت می‌شود.']
    ],
    demoTitle: 'دمو: CRM فروش تجهیزات قهوه',
    demoBody: 'اولین نمونه‌کار عمومی یک workflow فروش تجهیزات coffee-shop است: لید، qualification، quote، پروژه و follow-up. همین مدل را می‌شود سریع برای مشتری واقعی customize کرد.',
    demoSteps: ['برد لیدها', 'جزئیات مشتری', 'Quote builder', 'مراحل پروژه', 'صف پیگیری', 'گزارش هفتگی'],
    demoCta: 'باز کردن case demo کامل →',
    processTitle: 'چطور سریع به درآمد می‌رسیم',
    process: [
      ['۱. Audit', 'یک workflow دردناک را map می‌کنیم و مشخص می‌کنیم پول کجا از دست می‌رود.'],
      ['۲. Build', 'با AI builderها و QA هرمس یک داشبورد/prototype واقعی می‌سازیم.'],
      ['۳. Operate', 'هر هفته workflow را اجرا/بهبود می‌دهیم تا تبدیل به سیستم قابل اعتماد شود.']
    ],
    packagesTitle: 'پکیج‌های شروع برای cashflow سریع',
    packages: [
      ['Workflow Audit رایگان', '$0', 'بررسی کوتاه فرآیند لید/quote/follow-up و نقشه اتوماسیون.'],
      ['Setup Sprint هفت‌روزه', '$750–$1,500', 'CRM/workflow آماده با dashboard، review مشتری و handoff.'],
      ['Managed Workflow Ops', '$500–$2,000/mo', 'بهبود ماهانه، عملیات follow-up، گزارش و اتوماسیون‌های جدید.']
    ],
    contactTitle: 'می‌خواهی نسخه اول workflow تو ۷ روز آماده شود؟',
    contactBody: 'سایت، محصول/خدمت و یک کار تکراری فروش یا عملیات را بفرست. FlowKave با سؤال‌های audit اولیه جواب می‌دهد.',
    email: 'flowkave@gmail.com'
  },
  sv: {
    nav: ['Erbjudande', 'Demo', 'Process', 'Pris', 'Kontakt'],
    heroKicker: 'Produktiserad AI-automation för små B2B-team',
    heroTitle: 'Vi gör röriga leads, offerter och uppföljningar till ett hanterat tillväxtsystem.',
    heroBody: 'FlowKave bygger praktiska AI-stödda arbetsflöden för företag som tappar pengar i kalkylark, långsamma svar, röriga offerter och missade uppföljningar.',
    primaryCta: 'Boka gratis workflow-audit',
    secondaryCta: 'Se demo för kaffeutrustning',
    auditHref: 'mailto:flowkave@gmail.com?subject=Free%20FlowKave%20workflow%20audit&body=Hi%20FlowKave%2C%0A%0AI%20want%20a%20free%20workflow%20audit.%0AWebsite%3A%20%0ABusiness%3A%20%0AThe%20repetitive%20process%20we%20want%20to%20systemize%3A%20',
    proof: ['7-dagars implementation', 'Mänsklig QA före leverans', 'Byggt runt ert riktiga säljflöde'],
    statCards: [
      ['7 dagar', 'till en fungerande kunddemo'],
      ['2–4 piloter', 'kan validera första $2k/mån'],
      ['1 dashboard', 'för leads, offerter, uppföljning och rapporter']
    ],
    servicesTitle: 'Ett erbjudande kunder förstår på 30 sekunder',
    servicesSubtitle: 'Vi säljer inte generiska AI-verktyg. Vi installerar och driver ett repeterbart arbetsflöde.',
    services: [
      ['Lead pipeline-system', 'Samla prospects, prioritera möjligheter, tilldela nästa steg och sluta tappa affärer.'],
      ['Offertflöde', 'Gör behov till strukturerade offerter, sammanfattningar och proposal-utkast.'],
      ['Uppföljningsdrift', 'Veckolistor, outreach-utkast, påminnelser och rapporter med FlowKave QA.']
    ],
    demoTitle: 'Demo: CRM för kaffeutrustning',
    demoBody: 'Första caset visar ett B2B-flöde för kaffeutrustning: leads, kvalificering, offerter, projekt och uppföljning.',
    demoSteps: ['Lead board', 'Kunddetaljer', 'Offertbyggare', 'Projektsteg', 'Uppföljningskö', 'Veckorapport'],
    demoCta: 'Öppna full demo →',
    processTitle: 'Så når vi intäkter snabbt',
    process: [
      ['1. Audit', 'Vi kartlägger ett smärtsamt flöde och hittar var pengar läcker.'],
      ['2. Build', 'Vi skapar en fungerande dashboard/prototyp med AI-byggare och Hermes QA.'],
      ['3. Operate', 'Vi driver eller förbättrar flödet varje vecka tills det blir stabilt.']
    ],
    packagesTitle: 'Startpaket för snabb cashflow',
    packages: [
      ['Gratis Workflow Audit', '$0', 'Kort analys och konkret automationskarta.'],
      ['7-Day Setup Sprint', '$750–$1,500', 'Fungerande CRM/workflow-prototyp med dashboard och handoff.'],
      ['Managed Workflow Ops', '$500–$2,000/mån', 'Månadsvis förbättring, uppföljning, rapporter och nya automationer.']
    ],
    contactTitle: 'Vill du ha första versionen på 7 dagar?',
    contactBody: 'Skicka webbplats, produkt/tjänst och den repetitiva process ni vill systematisera.',
    email: 'flowkave@gmail.com'
  }
};
