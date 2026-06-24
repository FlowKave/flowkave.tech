import type { Metadata } from 'next';
import { Inter, Space_Grotesk, Vazirmatn } from 'next/font/google';
import './globals.css';

const inter = Inter({ subsets: ['latin'], variable: '--font-inter' });
const spaceGrotesk = Space_Grotesk({ subsets: ['latin'], variable: '--font-display' });
const vazirmatn = Vazirmatn({ subsets: ['arabic'], variable: '--font-fa' });

export const metadata: Metadata = {
  title: 'FlowKave — AI-Agent Workflows for Business Growth',
  description: 'FlowKave builds managed AI-agent workflows for content, leads, follow-up, and business operations.',
  metadataBase: new URL('https://flowkave.tech'),
  openGraph: {
    title: 'FlowKave — AI-Agent Workflows',
    description: 'Turn messy business work into repeatable AI-assisted systems.',
    url: 'https://flowkave.tech',
    siteName: 'FlowKave',
    type: 'website'
  }
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${inter.variable} ${spaceGrotesk.variable} ${vazirmatn.variable}`}>
      <body>{children}</body>
    </html>
  );
}
