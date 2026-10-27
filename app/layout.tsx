import type { Metadata } from 'next';
import './globals.css';
import { BRAND_NAME, BRAND_TAGLINE } from '@/lib/types';

export const metadata: Metadata = {
  title: {
    default: `${BRAND_NAME} — Sistem Undangan & Penerimaan Tamu Pernikahan`,
    template: `%s | ${BRAND_NAME}`,
  },
  description: BRAND_TAGLINE,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="id">
      <body className="min-h-screen bg-ivory text-ink flex flex-col">
        {children}
      </body>
    </html>
  );
}
