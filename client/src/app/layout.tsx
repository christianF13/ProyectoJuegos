import type { Metadata, Viewport } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Game Master AI',
  description: 'Plataforma de juegos de mesa asistidos por IA',
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es">
      <body className="bg-night text-white min-h-screen antialiased">{children}</body>
    </html>
  );
}
