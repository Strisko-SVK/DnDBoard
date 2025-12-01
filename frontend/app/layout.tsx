import './globals.css';
import React from 'react';
import { AppProviders } from './providers';
import { Cinzel_Decorative, Inter } from 'next/font/google';

const displayFont = Cinzel_Decorative({
  weight: ['400', '700'],
  subsets: ['latin'],
  variable: '--font-display',
  display: 'swap',
});

const bodyFont = Inter({
  weight: ['400', '500', '600', '700'],
  subsets: ['latin'],
  variable: '--font-body',
  display: 'swap',
});

export const metadata = {
  title: 'DnD Quest Board',
  description: 'Collaborative quest board for DMs & Players'
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${displayFont.variable} ${bodyFont.variable}`}>
      <body className="min-h-screen flex flex-col font-body">
        <AppProviders>
          <div className="flex-1 flex flex-col">{children}</div>
        </AppProviders>
      </body>
    </html>
  );
}

