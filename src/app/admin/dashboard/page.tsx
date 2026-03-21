import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default function AdminDashboardPage() {
  return (
    <div>
        <div className="grid gap-2 mb-4">
          <h1 className="text-3xl font-semibold">¡Bienvenido, Administrador!</h1>
          <p className="text-muted-foreground">Este es el centro para todas las tareas administrativas.</p>
        </div>
        <Card>
            <CardHeader>
            <CardTitle>Resumen</CardTitle>
            <CardDescription>Una vista rápida de tu sistema.</CardDescription>
            </CardHeader>
            <CardContent>
            <p>Aquí verás estadísticas y métricas importantes.</p>
            </CardContent>
        </Card>
    </div>
  );
}
