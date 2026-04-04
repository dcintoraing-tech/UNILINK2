"use client";

import { useRouter } from "next/navigation";
import { ArrowRight } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Logo } from "@/components/logo";

export default function JefeLoginPage() {
  const router = useRouter();
  const { toast } = useToast();

  const handleLogin = () => {
    try {
      const userProfile = {
        uid: "jefe-user",
        name: "Jefe de Grupo",
        role: "Jefe",
      };
      
      if (typeof window !== "undefined") {
        sessionStorage.setItem("unilink-jefe-user", JSON.stringify(userProfile));
        toast({
          title: "Inicio de sesión exitoso",
          description: "Redirigiendo al dashboard de jefe...",
        });
        router.push("/jefe/dashboard");
      } else {
        throw new Error("El entorno del navegador no está disponible.");
      }

    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Error de inicio de sesión",
        description: error.message || "No se pudo iniciar sesión. Por favor, intenta de nuevo.",
      });
    }
  };

  return (
    <main className="flex min-h-screen w-full flex-col items-center justify-center p-4 bg-muted/40">
      <div className="w-full max-w-sm">
        <div className="mb-8 flex justify-center">
          <Logo className="h-20 w-20" />
        </div>
        <Card className="w-full shadow-lg">
          <CardHeader className="text-center">
            <CardTitle className="text-2xl font-bold tracking-tight">
              Acceso para Jefes de Grupo
            </CardTitle>
            <CardDescription>
              Haz clic en el botón para entrar directamente a tu panel de control.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={handleLogin} className="w-full justify-between" size="lg">
              <span>Entrar como Jefe de Grupo</span>
              <ArrowRight className="h-5 w-5" />
            </Button>
          </CardContent>
        </Card>
      </div>
    </main>
  );
}
