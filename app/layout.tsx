import type { Metadata } from 'next';
import './globals.css';

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
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
