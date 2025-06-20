import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import { Providers } from '@/components/providers';
import { Navigation } from '@/components/navigation';
import { Toaster } from 'react-hot-toast';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'DevX Platform - Developer Portal',
  description: 'Accelerate your development with DevX Platform',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark">
      <body className={inter.className}>
        <Providers>
          <div className="min-h-screen bg-dark-bg">
            <Navigation />
            <main className="flex-1">
              {children}
            </main>
          </div>
          <Toaster
            position="bottom-right"
            toastOptions={{
              className: 'glass-card',
              style: {
                background: '#1a1a1a',
                color: '#e5e5e5',
                border: '1px solid #262626',
              },
              success: {
                iconTheme: {
                  primary: '#3b82f6',
                  secondary: '#e5e5e5',
                },
              },
              error: {
                iconTheme: {
                  primary: '#ef4444',
                  secondary: '#e5e5e5',
                },
              },
            }}
          />
        </Providers>
      </body>
    </html>
  );
}