import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import { AuthProvider } from '@/contexts/AuthContext';
import { LanguageProvider } from '@/contexts/LanguageContext';
import { Toaster } from 'sonner';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'Admin Panel',
  description: 'Admin Panel for GEN-HUB',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="vi">
      <body className={inter.className}>
        <AuthProvider>
          <LanguageProvider>
            {children}
            <Toaster
              position="top-right"
              theme="dark"
              closeButton
              richColors
              toastOptions={{
                style: {
                  background: 'var(--background-tertiary)',
                  border: '1px solid var(--border-primary)',
                  color: 'var(--text-primary)',
                },
              }}
            />
          </LanguageProvider>
        </AuthProvider>
      </body>
    </html>
  );
}

