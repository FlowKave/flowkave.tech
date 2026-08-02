import type { Metadata } from 'next';
import { Inter, Space_Grotesk, Vazirmatn } from 'next/font/google';
import './globals.css';

const inter = Inter({ subsets: ['latin'], variable: '--font-inter' });
const spaceGrotesk = Space_Grotesk({ subsets: ['latin'], variable: '--font-display' });
const vazirmatn = Vazirmatn({ subsets: ['arabic'], variable: '--font-fa' });

export const metadata: Metadata = {
  title: 'فلوکیو | سامانه مدیریت رستوران و کافه',
  description: 'سامانه فارسی مدیریت رستوران و کافه برای صندوق، سفارش، منوی دیجیتال، رسپی، انبار، حسابداری و بانک مشتریان.',
  metadataBase: new URL('https://flowkave.tech'),
  openGraph: {
    title: 'فلوکیو | سامانه مدیریت رستوران و کافه',
    description: 'یک سامانه عملیاتی برای کنترل فروش، سفارش، انبار، رسپی، حسابداری و مشتریان رستوران و کافه.',
    url: 'https://flowkave.tech',
    siteName: 'فلوکیو',
    type: 'website'
  }
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fa" dir="rtl" className={`${inter.variable} ${spaceGrotesk.variable} ${vazirmatn.variable}`}>
      <body>{children}</body>
    </html>
  );
}
