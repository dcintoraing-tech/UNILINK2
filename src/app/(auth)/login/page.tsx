
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
        // Fallback for admin login
        if (values.username === 'admin' && values.password === 'Prueb@01#7') {
            const userProfile = {
                uid: "admin-fallback-user",
                name: "Administrador",
                role: "Admin",
            };
            if (typeof window !== 'undefined') {
                sessionStorage.setItem("unilink-user", JSON.stringify(userProfile));
            }
            toast({
                title: "Inicio de sesión exitoso",
                description: "Redirigiendo al dashboard de administrador...",
            });
            router.push("/admin/dashboard");
            return;
        }

        // Fallback for student login
        if (values.username === 'alumno' && values.password === 'alumno') {
            const userProfile = {
                uid: "student-fallback-user",
                name: "Estudiante de Prueba",
                role: "Alumno",
            };
            if (typeof window !== 'undefined') {
                sessionStorage.setItem("unilink-user", JSON.stringify(userProfile));
            }
            toast({
                title: "Inicio de sesión exitoso",
                description: "Redirigiendo a tu panel de estudiante...",
            });
            router.push("/student/dashboard");
            return;
        }


        // Logic for all other users (Admin, Docente, Jefe de carrera) from localStorage
        if (typeof window !== 'undefined') {
            const storedUsersRaw = window.localStorage.getItem('unilink-users');
            const users = storedUsersRaw ? JSON.parse(storedUsersRaw) : [];
            
            const foundUser = users.find((u: any) => (u.email === values.username || u.name === values.username));

            if (foundUser && foundUser.password === values.password) {
                const userProfile: any = {
                    uid: foundUser.id,
                    name: foundUser.name,
                    email: foundUser.email,
                    role: foundUser.role,
                };

                if (foundUser.role === 'Jefe de carrera' && foundUser.carreraId) {
                    userProfile.carreraId = foundUser.carreraId;
                }

                sessionStorage.setItem('unilink-user', JSON.stringify(userProfile));
                toast({
                    title: "Inicio de sesión exitoso",
                    description: "Redirigiendo a tu panel de control...",
                });

                if (foundUser.role === 'Admin' || foundUser.role === 'Jefe de carrera') {
                    router.push("/admin/dashboard");
                } else if (foundUser.role === 'Docente') {
                    router.push("/dashboard");
                } else if (foundUser.role === 'Alumno') {
                    router.push("/student/dashboard");
                } else {
                    router.push("/dashboard");
                }
                return;
            }
        }
      
        // If no user was found after all checks
        throw new Error("Credenciales incorrectas. Por favor, verifica tu usuario y contraseña.");

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
                      <Input placeholder="tu@ejemplo.com o 'admin'" {...field} className="pl-10"/>
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
