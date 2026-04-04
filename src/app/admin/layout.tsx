"use client";

import Link from 'next/link';
import { UserCog, GraduationCap, Book, BarChart, DatabaseBackup } from 'lucide-react';
import { Logo } from '@/components/logo';
import { LogoutButton } from '@/components/logout-button';
import { useState, useEffect } from 'react';

export default function AdminLayout({ children }: { children: React.ReactNode; }) {
  const [userName, setUserName] = useState('');

  useEffect(() => {
    try {
      const storedUser = sessionStorage.getItem('unilink-user');
      if (storedUser) {
        const user = JSON.parse(storedUser);
        setUserName(user.name);
      }
    } catch (error) {
        console.error("Failed to read user from session storage", error);
    }
  }, []);

  return (
    <div className="flex min-h-screen w-full">
      <aside className="hidden w-64 flex-col border-r bg-background p-4 sm:flex">
        <div className="flex items-center gap-2 mb-8">
          <Logo className="h-8 w-8" />
          <h1 className="text-xl font-semibold">Admin UniLink</h1>
        </div>
        <nav className="flex flex-col gap-2 flex-1">
          <Link href="/admin/users" className="flex items-center gap-3 rounded-lg px-3 py-2 text-muted-foreground transition-all hover:text-primary">
            <UserCog className="h-4 w-4" />
            Gestión de Usuarios
          </Link>
          <Link href="/admin/students" className="flex items-center gap-3 rounded-lg px-3 py-2 text-muted-foreground transition-all hover:text-primary">
            <GraduationCap className="h-4 w-4" />
            Registro de Estudiantes
          </Link>
          <Link href="/admin/catalogs" className="flex items-center gap-3 rounded-lg px-3 py-2 text-muted-foreground transition-all hover:text-primary">
            <Book className="h-4 w-4" />
            Catálogos
          </Link>
          <Link href="/admin/reports" className="flex items-center gap-3 rounded-lg px-3 py-2 text-muted-foreground transition-all hover:text-primary">
            <BarChart className="h-4 w-4" />
            Reportes
          </Link>
          <Link href="/admin/backup" className="flex items-center gap-3 rounded-lg px-3 py-2 text-muted-foreground transition-all hover:text-primary">
            <DatabaseBackup className="h-4 w-4" />
            Respaldo
          </Link>
        </nav>
        <div className="mt-auto">
          <LogoutButton />
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
                        <p className="text-xs text-muted-foreground">Administrador</p>
                    </div>
                )}
                <LogoutButton />
            </div>
        </header>
        <main className="flex-1 p-6 bg-muted/40">
            {children}
        </main>
      </div>
    </div>
  );
}
