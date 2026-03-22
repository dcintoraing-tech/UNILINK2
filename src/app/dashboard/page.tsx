"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { LogoutButton } from "@/components/logout-button";
import { Logo } from "@/components/logo";
import { PlaceHolderImages } from "@/lib/placeholder-images";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";

interface User {
  name: string;
  email: string;
  role: 'Docente' | 'Admin';
}

export default function DashboardPage() {
  const [user, setUser] = useState<User | null>(null);
  const router = useRouter();

  useEffect(() => {
    try {
      const storedUser = sessionStorage.getItem('unilink-user');
      if (storedUser) {
        const parsedUser = JSON.parse(storedUser);
        if (parsedUser.role === 'Admin') {
          router.replace('/admin/dashboard');
        } else {
          setUser(parsedUser);
        }
      } else {
        router.replace('/login');
      }
    } catch (error) {
      console.error("Failed to access sessionStorage:", error);
      router.replace('/login');
    }
  }, [router]);

  const userAvatar = PlaceHolderImages.find(p => p.id === 'user-avatar');

  if (!user) {
    return (
      <div className="flex min-h-screen w-full flex-col items-center justify-center">
        <p>Cargando...</p>
      </div>
    );
  }

  const initials = user.name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();

  return (
    <div className="flex min-h-screen w-full flex-col">
      <header className="sticky top-0 z-30 flex h-16 items-center justify-between gap-4 border-b bg-background px-4 sm:px-6">
        <div className="flex items-center gap-2">
          <Logo className="h-8 w-8" />
          <h1 className="text-xl font-semibold">Panel de UniLink</h1>
        </div>
        <div className="flex items-center gap-4">
          <div className="hidden sm:block text-right">
            <p className="font-semibold">{user.name}</p>
            <p className="text-xs text-muted-foreground">{user.role}</p>
          </div>
          <LogoutButton />
        </div>
      </header>
      <main className="flex flex-1 flex-col gap-4 p-4 md:gap-8 md:p-6">
        <div className="mx-auto grid w-full max-w-6xl gap-2">
          <h1 className="text-3xl font-semibold">¡Bienvenido, {user.name}!</h1>
        </div>
        <div className="mx-auto grid w-full max-w-6xl items-start gap-6 md:grid-cols-[180px_1fr] lg:grid-cols-[250px_1fr]">
          <nav className="grid gap-4 text-sm text-muted-foreground">
            <a href="#" className="font-semibold text-primary">
              Perfil
            </a>
            <a href="#" className="hover:text-primary">Configuración</a>
            <a href="#" className="hover:text-primary">Soporte</a>
          </nav>
          <div className="grid gap-6">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-lg font-medium">Tu perfil</CardTitle>
              </CardHeader>
              <CardContent className="flex items-center gap-4 pt-4">
                <Avatar className="h-16 w-16">
                  {userAvatar && <AvatarImage src={userAvatar.imageUrl} alt={user.name} data-ai-hint={userAvatar.imageHint} />}
                  <AvatarFallback>{initials}</AvatarFallback>
                </Avatar>
                <div className="grid gap-1">
                  <p className="text-lg font-medium leading-none">{user.name}</p>
                  <p className="text-sm text-muted-foreground">{user.email}</p>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle>Novedades</CardTitle>
                <CardDescription>Últimas actualizaciones y características de UniLink.</CardDescription>
              </CardHeader>
              <CardContent>
                <p>¡Bienvenido al nuevo y mejorado panel de UniLink Access! Estamos emocionados de tenerte aquí.</p>
              </CardContent>
            </Card>
          </div>
        </div>
      </main>
    </div>
  );
}
