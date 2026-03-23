"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import * as z from "zod";
import { useRouter } from "next/navigation";
import { Lock, Eye, EyeOff, User as UserIcon } from "lucide-react";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";


const formSchema = z.object({
  username: z.string().min(1, {
    message: "Por favor, introduce tu usuario o correo.",
  }),
  password: z.string().min(1, {
    message: "La contraseña es requerida.",
  }),
});

export default function LoginPage() {
  const router = useRouter();
  const { toast } = useToast();
  const [showPassword, setShowPassword] = useState(false);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      username: "",
      password: "",
    },
  });

  async function onSubmit(values: z.infer<typeof formSchema>) {
    try {
      if (typeof window !== 'undefined') {
        const storedUsersRaw = window.localStorage.getItem('unilink-users');
        const users = storedUsersRaw ? JSON.parse(storedUsersRaw) : [];
        let userToSession;

        if (values.username === 'admin' && values.password === 'admin') {
          // Hardcoded super-admin login
          const adminUser = users.find((u: any) => u.role === 'Admin');
          if (adminUser) {
            // If an admin exists, use their profile for the session
            userToSession = adminUser;
          } else {
            // If no admin exists, create a default admin profile for the session
            userToSession = {
              id: 'superuser',
              name: 'Admin',
              email: 'admin@unilink.com',
              role: 'Admin',
            };
          }
        } else {
          // Logic for regular users
          const foundUser = users.find((u: any) => (u.email === values.username || u.name === values.username));

          // For demo, we are not checking passwords for regular users.
          // But we must ensure the admin can only log in with admin/admin.
          if (foundUser && foundUser.role !== 'Admin') {
            userToSession = foundUser;
          }
        }
        
        if (!userToSession) {
           throw new Error("Credenciales incorrectas. Por favor, verifica tu usuario y contraseña.");
        }

        const userProfile = {
          uid: userToSession.id,
          name: userToSession.name,
          email: userToSession.email,
          role: userToSession.role,
        };

        sessionStorage.setItem('unilink-user', JSON.stringify(userProfile));
        
        toast({
            title: "Inicio de sesión exitoso",
            description: "Redirigiendo a tu panel de control...",
        });

        if (userProfile.role === 'Admin') {
            router.push("/admin/dashboard");
        } else {
            router.push("/dashboard");
        }
      }
    } catch (error: any) {
      console.error("Login failed", error);
      toast({
          variant: "destructive",
          title: "Error de inicio de sesión",
          description: error.message || "Ocurrió un error inesperado.",
      });
    }
  }

  return (
    <Card className="w-full shadow-lg">
      <CardHeader>
        <CardTitle className="text-2xl font-bold tracking-tight text-center">
          Bienvenido de nuevo
        </CardTitle>
        <CardDescription className="text-center">
          Ingresa tus credenciales para acceder a tu cuenta
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <FormField
              control={form.control}
              name="username"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Usuario o Correo Electrónico</FormLabel>
                  <div className="relative">
                    <UserIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <FormControl>
                      <Input placeholder="tu@ejemplo.com" {...field} className="pl-10"/>
                    </FormControl>
                  </div>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="password"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Contraseña</FormLabel>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <FormControl>
                      <Input type={showPassword ? "text" : "password"} placeholder="••••••••" {...field} className="pl-10" />
                    </FormControl>
                    <Button 
                        type="button" 
                        variant="ghost" 
                        size="icon" 
                        className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7 text-muted-foreground"
                        onClick={() => setShowPassword(!showPassword)}
                    >
                        {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        <span className="sr-only">{showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}</span>
                    </Button>
                  </div>
                  <FormMessage />
                </FormItem>
              )}
            />
            <Button type="submit" className="w-full">
              Iniciar sesión
            </Button>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}
