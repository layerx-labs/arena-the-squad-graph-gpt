import './globals.css';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'SquadGraph Explorer',
  description: 'World Cup 2026 club-history teammate graph explorer',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return <html lang="en"><body>{children}</body></html>;
}
