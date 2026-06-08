import type { Metadata } from 'next';
import { Geist } from 'next/font/google';
import './globals.css';
import Sidebar from '@/components/layout/Sidebar';

const geist = Geist({ subsets: ['latin'], variable: '--font-geist' });

export const metadata: Metadata = {
  title: 'Fujii Admin',
  description: 'Intern admin-dashboard for Fujii',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="no" className={geist.variable}>
      <body className="flex h-screen bg-gray-50 font-sans antialiased overflow-hidden">
        <Sidebar />
        <div className="flex flex-col flex-1 min-w-0 overflow-y-auto">
          {children}
        </div>
      </body>
    </html>
  );
}
