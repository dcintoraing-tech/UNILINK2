"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import * as z from "zod";
import { useRouter } from "next/navigation";
import { Mail, Lock, Shield } from "lucide-react";

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

// Simulación de la base de datos de usuarios.
// En una aplicación real, esto vendría de tu backend/base de datos.
const users = [
    {
        name: 'Ana Gómez',
        email: 'ana.gomez@example.com',
        password: 'password123',
        role: 'Docente',
    },
    {
        name: 'Luis Fernandez',
        email: 'luis.fernandez@example.com',
        password: 'password123',
        role: 'Admin',
    }
]


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

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      email: "",
      password: "",
    },
  });

  function onSubmit(values: z.infer<typeof formSchema>) {
    if (values.email === "Admin" && values.password === "admin" && values.role === "Admin") {
      toast({
          title: "Acceso de administrador concedido",
          description: "Redirigiendo al panel de control...",
      });
      setTimeout(() => {
          router.push("/admin/dashboard");
      }, 1000);
      return;
    }
    
    const authenticatedUser = users.find(
      user => user.email === values.email && user.password === values.password && user.role === values.role
    );

    if (authenticatedUser) {
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
                      <Input type="password" placeholder="admin" {...field} className="pl-10" />
                    </FormControl>
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
