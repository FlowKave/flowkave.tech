export type Lang = 'en' | 'fa' | 'sv';

export const languages: { code: Lang; label: string; dir: 'ltr' | 'rtl' }[] = [
  { code: 'en', label: 'EN', dir: 'ltr' },
  { code: 'fa', label: 'FA', dir: 'rtl' },
  { code: 'sv', label: 'SV', dir: 'ltr' }
];

export const copy = {
  en: {
    nav: ['Services', 'Demo', 'Portal', 'Contact'],
    heroKicker: 'Managed AI-agent workflows for real businesses',
    heroTitle: 'Turn messy business work into repeatable growth systems.',
    heroBody: 'FlowKave designs and operates AI-assisted workflows for content, lead tracking, customer follow-up, and weekly reporting — starting with a coffee-shop equipment sales demo built for a real Iranian business.',
    primaryCta: 'View coffee equipment demo',
    secondaryCta: 'Request a free workflow audit',
    proof: ['No-code friendly client interface', 'FlowKave-controlled backend', 'Human QA before delivery'],
    servicesTitle: 'What FlowKave builds',
    services: [
      ['Content engine', 'Weekly posts, captions, reels scripts, product comparisons, and publishing calendars based on the client website and products.'],
      ['Lead & follow-up workflow', 'Prospect lists, lead scoring, outreach drafts, follow-up status, and next-action reports.'],
      ['Managed AI operations', 'A FlowKave-run backend using Hermes agents, QA gates, dashboards, and reports so clients get outcomes instead of raw tools.']
    ],
    demoTitle: 'Demo case: coffee-shop equipment seller',
    demoBody: 'A free first case study for a family business in Iran: turn their website/products into a content, lead, outreach, and reporting workflow.',
    demoSteps: ['Website/product scan', 'Product knowledge base', 'Content calendar', 'Lead finder', 'Outreach drafts', 'Follow-up tracker', 'Weekly report'],
    portalTitle: 'Client portal under flowkave.tech',
    portalBody: 'The first version gives every client a simple dashboard: workflow status, deliverables, lead tracker links, approval queue, and reports. The agents stay managed by FlowKave until a workflow is stable enough to hand over.',
    packagesTitle: 'Starter packages',
    packages: [
      ['Workflow Audit', '$0 first demo / then $100+', 'Find bottlenecks and propose a workflow map.'],
      ['Managed Workflow Setup', '$500–$1,500', 'Build content + lead + follow-up workflow with dashboard.'],
      ['Monthly Workflow Ops', '$300–$1,000/mo', 'Run weekly content, leads, follow-ups, and reporting.']
    ],
    contactTitle: 'Start with a free workflow audit',
    contactBody: 'Email flowkave@gmail.com or use the future contact form. Tell us the website, product/service, and one repetitive task you want FlowKave to systemize.',
    email: 'flowkave@gmail.com'
  },
  fa: {
    nav: ['خدمات', 'دمو', 'پنل', 'تماس'],
    heroKicker: 'ورک‌فلوهای AI Agent مدیریت‌شده برای کسب‌وکار واقعی',
    heroTitle: 'کارهای شلوغ و تکراری کسب‌وکار را به سیستم رشد قابل تکرار تبدیل می‌کنیم.',
    heroBody: 'FlowKave برای تولید محتوا، ردیابی لید، پیگیری مشتری و گزارش هفتگی، ورک‌فلوهای AI-assisted طراحی و مدیریت می‌کند — شروع با دموی فروشنده تجهیزات کافی‌شاپ برای یک کسب‌وکار واقعی در ایران.',
    primaryCta: 'دیدن دموی تجهیزات کافی‌شاپ',
    secondaryCta: 'درخواست audit رایگان',
    proof: ['رابط ساده برای مشتری', 'بک‌اند تحت کنترل FlowKave', 'کنترل انسانی کیفیت قبل از تحویل'],
    servicesTitle: 'FlowKave چه می‌سازد؟',
    services: [
      ['موتور تولید محتوا', 'پست هفتگی، کپشن، اسکریپت ریلز، مقایسه محصول و تقویم انتشار بر اساس سایت و محصولات مشتری.'],
      ['ورک‌فلو لید و پیگیری', 'لیست مشتریان احتمالی، امتیازدهی لید، پیام‌های outreach، وضعیت follow-up و گزارش اقدام بعدی.'],
      ['عملیات AI مدیریت‌شده', 'بک‌اند FlowKave با Hermes agents، گیت‌های QA، داشبورد و گزارش؛ مشتری نتیجه می‌گیرد نه ابزار خام.']
    ],
    demoTitle: 'نمونه‌کار: فروشنده تجهیزات راه‌اندازی کافی‌شاپ',
    demoBody: 'اولین کیس‌استادی رایگان برای کسب‌وکار خانوادگی در ایران: تبدیل سایت و محصولات به سیستم محتوا، لید، پیام فروش و گزارش.',
    demoSteps: ['اسکن سایت و محصولات', 'دانش‌نامه محصول', 'تقویم محتوا', 'پیدا کردن لید', 'پیش‌نویس پیام فروش', 'ردیابی پیگیری‌ها', 'گزارش هفتگی'],
    portalTitle: 'پنل مشتری زیر دامنه flowkave.tech',
    portalBody: 'نسخه اول برای هر مشتری یک داشبورد ساده دارد: وضعیت ورک‌فلو، خروجی‌ها، لینک lead tracker، صف تایید و گزارش‌ها. ایجنت‌ها تا وقتی workflow کاملاً پایدار نشده، تحت مدیریت FlowKave می‌مانند.',
    packagesTitle: 'پکیج‌های شروع',
    packages: [
      ['Workflow Audit', 'دموی اول رایگان / بعداً $100+', 'پیدا کردن گلوگاه‌ها و پیشنهاد نقشه ورک‌فلو.'],
      ['Managed Workflow Setup', '$500–$1,500', 'ساخت workflow محتوا + لید + follow-up با داشبورد.'],
      ['Monthly Workflow Ops', '$300–$1,000 ماهانه', 'اجرای هفتگی محتوا، لید، پیگیری و گزارش.']
    ],
    contactTitle: 'با audit رایگان شروع کنیم',
    contactBody: 'به flowkave@gmail.com ایمیل بزنید یا از فرم آینده استفاده کنید. سایت، محصول/خدمت و یک کار تکراری که می‌خواهید سیستم شود را بفرستید.',
    email: 'flowkave@gmail.com'
  },
  sv: {
    nav: ['Tjänster', 'Demo', 'Portal', 'Kontakt'],
    heroKicker: 'Hanterade AI-agentflöden för riktiga företag',
    heroTitle: 'Gör rörigt affärsarbete till repeterbara tillväxtsystem.',
    heroBody: 'FlowKave designar och driver AI-stödda arbetsflöden för innehåll, leadspårning, kunduppföljning och veckorapporter — med en demo för kaffebarsutrustning som första case.',
    primaryCta: 'Se demo för kaffebarsutrustning',
    secondaryCta: 'Begär gratis workflow-audit',
    proof: ['Enkel kundvy', 'FlowKave-kontrollerad backend', 'Mänsklig QA före leverans'],
    servicesTitle: 'Vad FlowKave bygger',
    services: [
      ['Innehållsmotor', 'Veckoinlägg, captions, reels-manus, produktjämförelser och publiceringskalendrar baserat på kundens webbplats.'],
      ['Lead- och uppföljningsflöde', 'Prospektlistor, lead scoring, outreach-utkast, uppföljningsstatus och nästa steg.'],
      ['Hanterad AI-drift', 'En FlowKave-driven backend med Hermes-agenter, QA-gates, dashboards och rapporter så kunden får resultat, inte råa verktyg.']
    ],
    demoTitle: 'Demo: säljare av kaffebarsutrustning',
    demoBody: 'Ett gratis första case för ett familjeföretag i Iran: gör deras webbplats och produkter till ett arbetsflöde för innehåll, leads, outreach och rapportering.',
    demoSteps: ['Webbplats-/produktskanning', 'Produktkunskapsbas', 'Innehållskalender', 'Lead finder', 'Outreach-utkast', 'Uppföljning', 'Veckorapport'],
    portalTitle: 'Kundportal under flowkave.tech',
    portalBody: 'Första versionen ger varje kund en enkel dashboard: workflow-status, leveranser, lead tracker-länkar, godkännandekö och rapporter. Agenterna hanteras av FlowKave tills flödet är stabilt nog att lämnas över.',
    packagesTitle: 'Startpaket',
    packages: [
      ['Workflow Audit', '$0 första demo / sedan $100+', 'Hitta flaskhalsar och föreslå en workflow-karta.'],
      ['Managed Workflow Setup', '$500–$1,500', 'Bygg innehåll + leads + uppföljning med dashboard.'],
      ['Monthly Workflow Ops', '$300–$1,000/mån', 'Driv veckovis innehåll, leads, uppföljning och rapportering.']
    ],
    contactTitle: 'Börja med en gratis workflow-audit',
    contactBody: 'Maila flowkave@gmail.com. Skicka webbplatsen, produkten/tjänsten och en repetitiv process ni vill systematisera.',
    email: 'flowkave@gmail.com'
  }
};
