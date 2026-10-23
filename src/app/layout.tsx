import type { Metadata } from 'next';
import { Inter_Tight, Instrument_Serif } from 'next/font/google';
import './globals.css';

const interTight = Inter_Tight({
  subsets: ['latin'],
  variable: '--font-inter-tight',
  display: 'swap',
});

const instrumentSerif = Instrument_Serif({
  subsets: ['latin'],
  weight: '400',
  variable: '--font-instrument-serif',
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'AI Phone Case Studio | Kreator Etui na Telefon',
  description: 'Zaprojektuj unikalne etui z grafiką wygenerowaną przez sztuczną inteligencję lub własnym zdjęciem.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="pl" className={`h-full antialiased ${interTight.variable} ${instrumentSerif.variable}`}>
      <body className="min-h-full flex flex-col bg-[#FBF8F3] text-[#111111] antialiased">
        {children}
      </body>
    </html>
  );
}
