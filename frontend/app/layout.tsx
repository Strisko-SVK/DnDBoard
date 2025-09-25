import './globals.css';
import React from 'react';
import { AppProviders } from './providers';

export const metadata = {
  title: 'DnD Quest Board',
  description: 'Collaborative quest board for DMs & Players'
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen flex flex-col">
        <AppProviders>
          <div className="flex-1 flex flex-col">{children}</div>
        </AppProviders>
      </body>
    </html>
  );
}

