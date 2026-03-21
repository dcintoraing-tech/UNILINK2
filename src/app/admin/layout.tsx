import Link from 'next/link';
import { Users, Book, BarChart, DatabaseBackup } from 'lucide-react';
import { Logo } from '@/components/logo';
import { LogoutButton } from '@/components/logout-button';

export default function AdminLayout({ children }: { children: React.ReactNode; }) {
  return (
    <div className="flex min-h-screen w-full">
      <aside className="hidden w-64 flex-col border-r bg-background p-4 sm:flex">
        <div className="flex items-center gap-2 mb-8">
          <Logo className="h-8 w-8" />
          <h1 className="text-xl font-semibold">Admin UniLink</h1>
        </div>
        <nav className="flex flex-col gap-2 flex-1">
          <Link href="/admin/users" className="flex items-center gap-3 rounded-lg px-3 py-2 text-muted-foreground transition-all hover:text-primary">
            <Users className="h-4 w-4" />
            Gestión de Usuarios
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
            <div className="flex-1 sm:flex-grow-0">
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
