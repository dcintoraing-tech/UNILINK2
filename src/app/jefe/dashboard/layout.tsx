"use client";

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { Home, Users, CheckCircle, FileText, BarChart2 } from 'lucide-react';
import { Logo } from '@/components/logo';
import { JefeLogoutButton } from '@/components/jefe-logout-button';
import { useState, useEffect } from 'react';
import { cn } from '@/lib/utils';

export default function JefeDashboardLayout({ children }: { children: React.ReactNode; }) {
  const [userName, setUserName] = useState('');
  const [isCheckingAuth, setIsCheckingAuth] = useState(true);
  const pathname = usePathname();
  const router = useRouter();

  useEffect(() => {
    try {
      const storedUser = sessionStorage.getItem('unilink-jefe-user');
      if (storedUser) {
        const user = JSON.parse(storedUser);
        setUserName(user.name);
      } else {
        router.replace('/jefe/login');
      }
    } catch (error) {
        console.error("Failed to read user from session storage", error);
        router.replace('/jefe/login');
    } finally {
        setIsCheckingAuth(false);
    }
  }, [router]);

  const navLinks = [
    { href: "/jefe/dashboard", label: "Dashboard", icon: Home },
    { href: "/jefe/dashboard/grupos", label: "Grupos", icon: Users },
    { href: "/jefe/dashboard/asistencia", label: "Asistencia", icon: CheckCircle },
    { href: "/jefe/dashboard/justificaciones", label: "Justificaciones", icon: FileText },
    { href: "/jefe/dashboard/reportes", label: "Reportes", icon: BarChart2 },
  ];

  if (isCheckingAuth) {
    return (
        <div className="flex min-h-screen w-full items-center justify-center">
            <p>Verificando acceso...</p>
        </div>
    );
  }

  return (
    <div className="flex min-h-screen w-full">
      <aside className="hidden w-64 flex-col border-r bg-background p-4 sm:flex">
        <div className="flex items-center gap-2 mb-8">
          <Logo className="h-8 w-8" />
          <h1 className="text-xl font-semibold">Jefe de Grupo</h1>
        </div>
        <nav className="flex flex-col gap-2 flex-1">
          {navLinks.map((link) => (
            <Link 
              key={link.href} 
              href={link.href} 
              className={cn(
                "flex items-center gap-3 rounded-lg px-3 py-2 text-muted-foreground transition-all hover:text-primary",
                pathname === link.href && "bg-muted text-primary"
              )}
            >
              <link.icon className="h-4 w-4" />
              {link.label}
            </Link>
          ))}
        </nav>
        <div className="mt-auto">
          <JefeLogoutButton />
        </div>
      </aside>
      <div className="flex flex-1 flex-col">
        <header className="flex h-14 items-center justify-between border-b bg-background px-6 lg:h-20 sm:justify-end">
            <div className='sm:hidden'>
                <Logo className="h-8 w-8" />
            </div>
            <div className="flex items-center gap-4">
                {userName && (
                    <div className="hidden text-right sm:block">
                        <p className="font-semibold">{userName}</p>
                        <p className="text-xs text-muted-foreground">Jefe de Grupo</p>
                    </div>
                )}
                <JefeLogoutButton />
            </div>
        </header>
        <main className="flex-1 p-6 bg-muted/40">
            {children}
        </main>
      </div>
    </div>
  );
}
