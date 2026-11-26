import type { Metadata, Viewport } from 'next';
import PwaRegistration from './pwa-registration';
import './globals.css';

export const metadata: Metadata = {
  title: 'AaronOS',
  description: 'Your AI Powered Life Operating System',
  manifest: '/manifest.webmanifest',
  icons: { apple: '/pwa-icon/180' },
  appleWebApp: { capable: true, statusBarStyle: 'black-translucent', title: 'AaronOS' },
};

export const viewport: Viewport = { themeColor: '#101212', viewportFit: 'cover' };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html
      lang="en"
      className="h-full antialiased dark"
    >
      <body className="min-h-full flex flex-col">
        {children}
        <PwaRegistration />
      </body>
    </html>
  );
}
