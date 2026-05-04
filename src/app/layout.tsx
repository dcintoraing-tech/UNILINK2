import type {Metadata} from 'next';
import './globals.css';
import { Toaster } from "@/components/ui/toaster";
import { FirebaseClientProvider } from '@/firebase/client-provider';

export const metadata: Metadata = {
  title: {
    default: 'SIBF - CAI',
    template: '%s | SIBF - CAI',
  },
  description: 'Sistema Integral de Gestión Académica con Reconocimiento Facial Biométrico.',
  icons: {
    icon: 'data:image/svg+xml,<svg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 24 24%22 fill=%22none%22 stroke=%22%23ff1a21%22 stroke-width=%222%22 stroke-linecap=%22round%22 stroke-linejoin=%22round%22><path d=%22M8 3H5a2 2 0 0 0-2 2v3%22/><path d=%22M16 3h3a2 2 0 0 1 2 2v3%22/><path d=%22M3 16v3a2 2 0 0 0 2 2h3%22/><path d=%22M21 16v3a2 2 0 0 1-2 2h-3%22/><circle cx=%2212%22 cy=%2210%22 r=%223%22/><path d=%22M7 20c0-3.3 2.7-6 5-6s5 2.7 5 6%22/></svg>',
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es" suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Poppins:wght@400;500;600;700&family=Montserrat:wght@400;500;600;700&family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet" />
      </head>
      <body className="font-body antialiased">
        <FirebaseClientProvider>
          {children}
        </FirebaseClientProvider>
        <Toaster />
      </body>
    </html>
  );
}
