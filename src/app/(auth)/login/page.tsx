"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import * as z from "zod";
import { useRouter } from "next/navigation";
import { Lock, Eye, EyeOff, User as UserIcon } from "lucide-react";
import { useState } from "react";
import { signInWithEmailAndPassword } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";
import Link from "next/link";

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
import { useAuth, useFirestore } from "@/firebase";


const formSchema = z.object({
  email: z.string().email({
    message: "Por favor, introduce un correo electrónico válido.",
  }),
  password: z.string().min(1, {
    message: "La contraseña es requerida.",
  }),
});

export default function LoginPage() {
  const router = useRouter();
  const { toast } = useToast();
  const auth = useAuth();
  const firestore = useFirestore();
  const [showPassword, setShowPassword] = useState(false);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      email: "",
      password: "",
    },
  });

  async function onSubmit(values: z.infer<typeof formSchema>) {
    try {
        const userCredential = await signInWithEmailAndPassword(auth, values.email, values.password);
        const user = userCredential.user;

        const userDocRef = doc(firestore, 'userProfiles', user.uid);
        const userDocSnap = await getDoc(userDocRef);

        if (!userDocSnap.exists()) {
            throw new Error("No se encontró el perfil de usuario. Contacta a soporte.");
        }
        
        const userProfile = userDocSnap.data();

        if (typeof window !== 'undefined') {
            sessionStorage.setItem("unilink-user", JSON.stringify(userProfile));
        }

        toast({
            title: "Inicio de sesión exitoso",
            description: "Redirigiendo a tu panel de control...",
        });

        if (userProfile.role === 'Admin' || userProfile.role === 'Jefe de carrera') {
            router.push("/admin/dashboard");
        } else if (userProfile.role === 'Docente') {
            router.push("/dashboard");
        } else if (userProfile.role === 'Alumno') {
            const studentId = userProfile.studentId || null;
            if (studentId) {
                sessionStorage.setItem('unilink-student-id', studentId);
            }
            router.push("/student/dashboard");
        } else {
            router.push("/dashboard");
        }

    } catch (error: any) {
      console.error("Login failed", error);
      let description = "Credenciales incorrectas. Por favor, verifica tu usuario y contraseña.";
      if (error.code === 'auth/user-not-found' || error.code === 'auth/wrong-password' || error.code === 'auth/invalid-credential') {
           description = "Credenciales incorrectas. Por favor, verifica tu correo y contraseña.";
      }
      toast({
          variant: "destructive",
          title: "Error de inicio de sesión",
          description: description,
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
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Correo Electrónico</FormLabel>
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
        <p className="mt-6 text-center text-sm text-muted-foreground">
          ¿No tienes una cuenta?{" "}
          <Link href="/signup" passHref>
            <Button variant="link" className="h-auto p-0">
              Crear cuenta
            </Button>
          </Link>
        </p>
      </CardContent>
    </Card>
  );
}
