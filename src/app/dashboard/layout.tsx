"use client";

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState, useEffect } from 'react';
import { Users, UserCheck, BarChart, Menu, ChevronDown, FileCheck } from 'lucide-react';
import { Logo } from '@/components/logo';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { LogoutButton } from '@/components/logout-button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { PlaceHolderImages } from '@/lib/placeholder-images';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';

interface User {
  name: string;
  email: string;
  role: 'Docente' | 'Admin' | 'Alumno' | 'Super Docente';
}

const NavContent = () => (
  <nav className="flex flex-1 flex-col gap-2">
    <Link href="/dashboard" className="flex items-center gap-3 rounded-lg px-3 py-2 text-muted-foreground transition-all hover:text-primary">
      <Users className="h-4 w-4" />
      Mis Grupos
    </Link>
    <Link href="/dashboard/asistencias" className="flex items-center gap-3 rounded-lg px-3 py-2 text-muted-foreground transition-all hover:text-primary">
      <UserCheck className="h-4 w-4" />
      Pase de Asistencia
    </Link>
    <Link href="/dashboard/reportes" className="flex items-center gap-3 rounded-lg px-3 py-2 text-muted-foreground transition-all hover:text-primary">
      <BarChart className="h-4 w-4" />
      Reportes de Asistencia
    </Link>
    <Link href="/dashboard/justificaciones" className="flex items-center gap-3 rounded-lg px-3 py-2 text-muted-foreground transition-all hover:text-primary">
      <FileCheck className="h-4 w-4" />
      Justificaciones
    </Link>
    <div className="mt-auto">
      <LogoutButton />
    </div>
  </nav>
);

export default function DashboardLayout({ children }: { children: React.ReactNode; }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();
  const { toast } = useToast();

  const [activeRole, setActiveRole] = useState('Docente');
  const [isSwitchingRole, setIsSwitchingRole] = useState(false);
  const [password, setPassword] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [targetRole, setTargetRole] = useState('');

  useEffect(() => {
    try {
      const storedUser = sessionStorage.getItem('unilink-user');
      if (storedUser) {
        const parsedUser = JSON.parse(storedUser);
        setUser(parsedUser);
        
        const storedActiveRole = sessionStorage.getItem('unilink-active-role');
        const activeRoleForCheck = storedActiveRole || parsedUser.role;

        if (activeRoleForCheck !== 'Docente' && activeRoleForCheck !== 'Super Docente') {
            if (activeRoleForCheck === 'Alumno') {
                router.replace('/student/dashboard');
            } else {
                router.replace('/admin/dashboard');
            }
            return;
        }
        setActiveRole(activeRoleForCheck);

      } else {
        router.replace('/login');
      }
    } catch (error) {
      console.error("Failed to access sessionStorage:", error);
      router.replace('/login');
    } finally {
        setIsLoading(false);
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

  const userAvatar = PlaceHolderImages.find(p => p.id === 'user-avatar');
  const initials = user?.name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();

  if (isLoading || !user) {
    return (
      <div className="flex min-h-screen w-full flex-col items-center justify-center">
        <p>Cargando panel de docente...</p>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen w-full">
      <aside className="hidden w-64 flex-col border-r bg-background p-4 sm:flex">
        <div className="mb-8 flex items-center gap-2">
          <Logo className="h-8 w-8" />
          <h1 className="text-xl font-semibold">UniLink</h1>
        </div>
        <NavContent />
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
                        <NavContent />
                    </SheetContent>
                </Sheet>
            </div>
            <div className="flex items-center gap-4">
                 <div className="text-right">
                    <p className="font-semibold">{user.name}</p>
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
                 <Avatar>
                    {userAvatar && <AvatarImage src={userAvatar.imageUrl} alt={user.name} />}
                    <AvatarFallback>{initials}</AvatarFallback>
                </Avatar>
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
