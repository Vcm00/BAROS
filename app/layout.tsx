import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = { title: 'BAROS — Gestión inteligente para bares', description: 'Gestiona recetas, costes y stock de tu carta de cócteles.' };

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="es"><body>{children}</body></html>;
}