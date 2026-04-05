"use client";

import Link from 'next/link';
import { UserCog, GraduationCap, Book, BarChart, DatabaseBackup, UserCheck, Settings, Menu, ChevronDown, FileCheck } from 'lucide-react';
import { Logo } from '@/components/logo';
import { LogoutButton } from '@/components/logout-button';
import { useState, useEffect } from 'react';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { useRouter } from 'next/navigation';

const AdminNavContent = () => (
  <nav className="flex flex-1 flex-col gap-2">
    <Link href="/admin/dashboard" className="flex items-center gap-3 rounded-lg px-3 py-2 text-muted-foreground transition-all hover:text-primary">
        <BarChart className="h-4 w-4" />
        Dashboard
      </Link>
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
    <Link href="/admin/attendance" className="flex items-center gap-3 rounded-lg px-3 py-2 text-muted-foreground transition-all hover:text-primary">
      <UserCheck className="h-4 w-4" />
      Asistencia
    </Link>
    <Link href="/admin/reports" className="flex items-center gap-3 rounded-lg px-3 py-2 text-muted-foreground transition-all hover:text-primary">
      <BarChart className="h-4 w-4" />
      Reportes
    </Link>
    <Link href="/admin/settings" className="flex items-center gap-3 rounded-lg px-3 py-2 text-muted-foreground transition-all hover:text-primary">
      <Settings className="h-4 w-4" />
      Configuración
    </Link>
    <Link href="/admin/backup" className="flex items-center gap-3 rounded-lg px-3 py-2 text-muted-foreground transition-all hover:text-primary">
      <DatabaseBackup className="h-4 w-4" />
      Respaldo
    </Link>
  </nav>
);

const JefeCarreraNavContent = () => (
    <nav className="flex flex-1 flex-col gap-2">
        <Link href="/admin/dashboard" className="flex items-center gap-3 rounded-lg px-3 py-2 text-muted-foreground transition-all hover:text-primary">
            <BarChart className="h-4 w-4" />
            Dashboard
        </Link>
        <Link href="/admin/reports" className="flex items-center gap-3 rounded-lg px-3 py-2 text-muted-foreground transition-all hover:text-primary">
            <BarChart className="h-4 w-4" />
            Reportes
        </Link>
        <Link href="/admin/attendance" className="flex items-center gap-3 rounded-lg px-3 py-2 text-muted-foreground transition-all hover:text-primary">
            <UserCheck className="h-4 w-4" />
            Asistencia General
        </Link>
        <Link href="/admin/justificaciones" className="flex items-center gap-3 rounded-lg px-3 py-2 text-muted-foreground transition-all hover:text-primary">
            <FileCheck className="h-4 w-4" />
            Justificaciones
        </Link>
    </nav>
);

const NavContent = ({ activeRole }: { activeRole: string }) => (
  <>
    {activeRole === 'Jefe de carrera' ? <JefeCarreraNavContent /> : <AdminNavContent />}
    <div className="mt-auto">
      <LogoutButton />
    </div>
  </>
);

export default function AdminLayout({ children }: { children: React.ReactNode; }) {
  const { toast } = useToast();
  const router = useRouter();
  const [userName, setUserName] = useState('');
  const [userRole, setUserRole] = useState('');
  const [activeRole, setActiveRole] = useState('Admin');

  const [isSwitchingRole, setIsSwitchingRole] = useState(false);
  const [password, setPassword] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [targetRole, setTargetRole] = useState('');
  
  useEffect(() => {
    try {
      const storedUser = sessionStorage.getItem('unilink-user');
      if (storedUser) {
        const user = JSON.parse(storedUser);
        if (user.role !== 'Admin') {
            router.replace('/dashboard');
            return;
        }
        setUserName(user.name);
        setUserRole(user.role);
        
        const storedActiveRole = sessionStorage.getItem('unilink-active-role');
        const activeRoleForCheck = storedActiveRole || user.role;
        
        if (activeRoleForCheck === 'Docente' || activeRoleForCheck === 'Super Docente') {
            router.replace('/dashboard');
            return;
        }
        if (activeRoleForCheck === 'Alumno') {
            router.replace('/student/dashboard');
            return;
        }
        
        setActiveRole(activeRoleForCheck);

      } else {
        router.replace('/login');
      }
    } catch (error) {
        console.error("Failed to read user from session storage", error);
        router.replace('/login');
    }
  }, [router]);

  const handleSwitchRole = () => {
    if (password === '1234') {
        setActiveRole(targetRole);
        sessionStorage.setItem('unilink-active-role', targetRole);
        toast({
            title: "Perfil Cambiado",
            description: `Ahora estás viendo el panel como ${targetRole}.`
        });
        setIsSwitchingRole(false);
        setPassword('');
        setPasswordError('');

        if (targetRole === 'Docente' || targetRole === 'Super Docente') {
            router.push('/dashboard');
        } else if (targetRole === 'Alumno') {
            router.push('/student/dashboard');
        } else {
            router.push('/admin/dashboard'); 
        }
        router.refresh();
    } else {
        setPasswordError("Contraseña incorrecta. Inténtalo de nuevo.");
    }
  };
  
  const openSwitchRoleDialog = (role: string) => {
    setTargetRole(role);
    setIsSwitchingRole(true);
    setPassword('');
    setPasswordError('');
  }

  return (
    <div className="flex min-h-screen w-full">
      <aside className="hidden w-64 flex-col border-r bg-background p-4 sm:flex">
        <div className="mb-8 flex items-center gap-2">
          <Logo className="h-8 w-8" />
          <h1 className="text-xl font-semibold">UniLink</h1>
        </div>
        <NavContent activeRole={activeRole} />
      </aside>
      <div className="flex flex-1 flex-col">
        <header className="flex h-14 items-center justify-between border-b bg-background px-4 sm:justify-end sm:px-6 lg:h-20">
            <div className="sm:hidden">
                <Sheet>
                    <SheetTrigger asChild>
                        <Button variant="outline" size="icon">
                            <Menu className="h-5 w-5" />
                            <span className="sr-only">Abrir menú de navegación</span>
                        </Button>
                    </SheetTrigger>
                    <SheetContent side="left" className="flex w-full max-w-[280px] flex-col p-4">
                       <div className="mb-8 flex items-center gap-2">
                          <Logo className="h-8 w-8" />
                          <h1 className="text-xl font-semibold">UniLink</h1>
                        </div>
                        <NavContent activeRole={activeRole} />
                    </SheetContent>
                </Sheet>
            </div>
            <div className="flex items-center gap-4">
                {userName && (
                    <div className="text-right">
                        <p className="font-semibold">{userName}</p>
                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="sm" className="h-auto p-0 text-xs text-muted-foreground">
                                    {activeRole}
                                    <ChevronDown className="ml-1 h-3 w-3" />
                                </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent>
                                {['Admin', 'Jefe de carrera', 'Docente', 'Super Docente', 'Alumno'].filter(role => role !== activeRole).map(role => (
                                    <DropdownMenuItem key={role} onSelect={() => openSwitchRoleDialog(role)}>
                                        Cambiar a {role}
                                    </DropdownMenuItem>
                                ))}
                            </DropdownMenuContent>
                        </DropdownMenu>
                    </div>
                )}
                <LogoutButton />
            </div>
        </header>
        <main className="flex-1 bg-muted/40 p-4 md:p-6">
            {children}
        </main>
      </div>

      <Dialog open={isSwitchingRole} onOpenChange={setIsSwitchingRole}>
        <DialogContent>
            <DialogHeader>
                <DialogTitle>Cambiar a perfil de {targetRole}</DialogTitle>
                <DialogDescription>
                    Para cambiar tu vista de perfil, por favor ingresa la contraseña de autorización.
                </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
                <div className="grid gap-2">
                    <Label htmlFor="password">Contraseña</Label>
                    <Input 
                        id="password" 
                        type="password" 
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && handleSwitchRole()}
                    />
                    {passwordError && <p className="text-sm text-destructive">{passwordError}</p>}
                </div>
            </div>
            <DialogFooter>
                <Button variant="ghost" onClick={() => setIsSwitchingRole(false)}>Cancelar</Button>
                <Button onClick={handleSwitchRole}>Confirmar</Button>
            </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
