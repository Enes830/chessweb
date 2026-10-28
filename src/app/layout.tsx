import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'RewindBoard | Chess Game Review & Analysis',
  description:
    'Full Chess.com-style Game Review running 100% client-side in your browser with Stockfish 19 WebAssembly. Zero ads, zero tracking, instant accuracy and move classification.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark">
      <body className="min-h-screen bg-slate-950 text-slate-100 antialiased selection:bg-sky-500/30 selection:text-sky-200">
        {children}
      </body>
    </html>
  );
}
