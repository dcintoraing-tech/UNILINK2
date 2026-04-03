"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import * as z from "zod";
import { useRouter } from "next/navigation";
import { Lock, User as UserIcon } from "lucide-react";
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
import { Logo } from '@/components/logo';

const formSchema = z.object({
  username: z.string().min(1, {
    message: "El usuario es requerido.",
  }),
  password: z.string().min(1, {
    message: "La contraseña es requerida.",
  }),
});

export default function JefeLoginPage() {
  const router = useRouter();
  const { toast } = useToast();

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      username: "",
      password: "",
    },
  });

  async function onSubmit(values: z.infer<typeof formSchema>) {
    if (values.username === 'jefe' && values.password === 'jefe') {
      const userProfile = {
        uid: 'jefe-user',
        name: 'Jefe de Grupo',
        role: 'Jefe',
      };
      sessionStorage.setItem('unilink-jefe-user', JSON.stringify(userProfile));
      toast({
          title: "Inicio de sesión exitoso",
          description: "Redirigiendo al dashboard de jefe...",
      });
      router.push("/jefe/dashboard");
    } else {
      toast({
          variant: "destructive",
          title: "Error de inicio de sesión",
          description: "Credenciales incorrectas.",
      });
    }
  }

  return (
    <main className="flex min-h-screen w-full flex-col items-center justify-center p-4 bg-muted/40">
        <div className="w-full max-w-sm">
            <div className="mb-8 flex justify-center">
                <Logo className="h-20 w-20" />
            </div>
            <Card className="w-full shadow-lg">
            <CardHeader>
                <CardTitle className="text-2xl font-bold tracking-tight text-center">
                Acceso para Jefes
                </CardTitle>
                <CardDescription className="text-center">
                Ingresa tus credenciales de jefe para continuar
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
                        <FormLabel>Usuario</FormLabel>
                        <div className="relative">
                            <UserIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                            <FormControl>
                            <Input placeholder="jefe" {...field} className="pl-10"/>
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
                            <Input type="password" placeholder="••••••••" {...field} className="pl-10" />
                            </FormControl>
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
        </div>
    </main>
  );
}
