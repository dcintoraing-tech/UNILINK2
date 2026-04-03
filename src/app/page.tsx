import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Logo } from "@/components/logo";
import Link from "next/link";
import { ArrowRight } from "lucide-react";

export default function Home() {
  return (
    <main className="flex min-h-screen w-full flex-col items-center justify-center p-4 bg-muted/40">
      <div className="w-full max-w-md">
        <div className="mb-8 flex justify-center">
            <Logo className="h-24 w-24" />
        </div>
        <Card className="w-full shadow-lg">
          <CardHeader className="text-center">
            <CardTitle className="text-3xl font-bold tracking-tight">Bienvenido a UniLink Access</CardTitle>
            <CardDescription>Selecciona tu tipo de acceso para continuar.</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4">
              <Link href="/login" passHref>
                <Button className="w-full justify-between" size="lg">
                    <span>Acceso Personal (Docentes / Admin)</span>
                    <ArrowRight className="h-5 w-5" />
                </Button>
              </Link>
              <Link href="/jefe/login" passHref>
                <Button className="w-full justify-between" size="lg" variant="secondary">
                   <span>Acceso Jefe de Grupo</span>
                   <ArrowRight className="h-5 w-5" />
                </Button>
              </Link>
          </CardContent>
        </Card>
      </div>
    </main>
  );
}
