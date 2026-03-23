
"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import * as z from "zod";
import { useRouter } from "next/navigation";
import { Mail, Lock, Shield, Eye, EyeOff } from "lucide-react";
import { useState, useMemo } from "react";
import { signInAnonymously } from 'firebase/auth';

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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useAuth, useCollection, useFirestore, useMemoFirebase } from '@/firebase';
import { collection } from "firebase/firestore";


const formSchema = z.object({
  email: z.string().min(1, {
    message: "Por favor, introduce tu correo o usuario.",
  }),
  password: z.string().min(1, {
    message: "Por favor, introduce tu contraseña.",
  }),
  role: z.enum(["Docente", "Admin"], {
    required_error: "Por favor, selecciona un rol.",
  }),
});

export default function LoginPage() {
  const router = useRouter();
  const { toast } = useToast();
  const [showPassword, setShowPassword] = useState(false);
  const auth = useAuth();
  const firestore = useFirestore();

  const usersQuery = useMemoFirebase(() => collection(firestore, 'users'), [firestore]);
  const { data: users } = useCollection<any>(usersQuery);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      email: "",
      password: "",
    },
  });

  async function onSubmit(values: z.infer<typeof formSchema>) {
    if (values.email === "Admin" && values.password === "admin" && values.role === "Admin") {
      const adminUser = { name: 'Super Admin', email: 'admin@unilink.com', role: 'Admin' };
      
      if (!auth.currentUser) {
          try {
              await signInAnonymously(auth);
          } catch (error) {
              console.error("Anonymous sign-in failed", error);
              toast({
                  variant: "destructive",
                  title: "Error de autenticación",
                  description: "No se pudo iniciar la sesión de Firebase. Contacta al soporte.",
              });
              return;
          }
      }

      sessionStorage.setItem('unilink-user', JSON.stringify(adminUser));
      toast({
          title: "Acceso de administrador concedido",
          description: "Redirigiendo al panel de control...",
      });
      setTimeout(() => {
          router.push("/admin/dashboard");
      }, 1000);
      return;
    }
    
    const authenticatedUser = users?.find(
      user => (user.email === values.email || user.name === values.email) && user.password === values.password && user.role === values.role
    );

    if (authenticatedUser) {
        if (!auth.currentUser) {
            try {
                await signInAnonymously(auth);
            } catch (error) {
                console.error("Anonymous sign-in failed", error);
                toast({
                    variant: "destructive",
                    title: "Error de autenticación",
                    description: "No se pudo iniciar la sesión de Firebase. Contacta al soporte.",
                });
                return;
            }
        }
        sessionStorage.setItem('unilink-user', JSON.stringify(authenticatedUser));
        toast({
            title: "Inicio de sesión exitoso",
            description: "Redirigiendo a tu panel de control...",
        });
        setTimeout(() => {
            if (values.role === 'Admin') {
                router.push("/admin/dashboard");
            } else {
                router.push("/dashboard");
            }
        }, 1000);
    } else {
        toast({
            variant: "destructive",
            title: "Credenciales incorrectas",
            description: "El correo, la contraseña o el rol no son correctos. Por favor, inténtalo de nuevo.",
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
          Selecciona tu rol para acceder a tu cuenta
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Correo o Usuario</FormLabel>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <FormControl>
                      <Input placeholder="Admin" {...field} className="pl-10"/>
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
                      <Input type={showPassword ? "text" : "password"} placeholder="admin" {...field} className="pl-10" />
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
             <FormField
              control={form.control}
              name="role"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Rol</FormLabel>
                  <div className="relative">
                    <Shield className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground z-10" />
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger className="pl-10">
                          <SelectValue placeholder="Selecciona un rol" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="Docente">Docente</SelectItem>
                        <SelectItem value="Admin">Administrador</SelectItem>
                      </SelectContent>
                    </Select>
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

    